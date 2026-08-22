# ============================================================================
# AUTH  —  hashing + JWT sessions (revocable) + current-user + org context + RBAC + MFA
# ============================================================================

import os
import uuid
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select
from db import engine, User, Membership, SessionRec, MfaSecret, Organization

# JWT signing key. Ye har session token sign karti hai — agar attacker ko pata chal jaye
# to wo KISI BHI user/org ka valid token bana sakta hai (poora auth bypass).
# Is liye: dev par fallback theek hai, lekin production (APP_ENV=production) mein
# asli key set karna LAAZMI hai — warna app start hi nahi hogi.
_DEV_SECRET = "dev-secret-change-me"
SECRET_KEY = os.getenv("APP_SECRET_KEY") or _DEV_SECRET
APP_ENV = os.getenv("APP_ENV", "development").strip().lower()

if APP_ENV == "production" and SECRET_KEY == _DEV_SECRET:
    raise SystemExit(
        "REFUSING TO START: APP_SECRET_KEY is not set, so tokens would be signed with the\n"
        "public default from the source. Anyone could forge a session for any user.\n"
        "Generate one and set it in the environment:\n"
        '  python -c "import secrets; print(secrets.token_urlsafe(64))"'
    )
if SECRET_KEY == _DEV_SECRET:
    print("WARNING: APP_SECRET_KEY not set — using the insecure dev default. Do not deploy like this.")

ALGORITHM = "HS256"
TOKEN_EXPIRE_MIN = 60 * 24

# ----------------------------------------------------------------------------
# PLATFORM OWNER — the single account that grants and revokes customer access.
# ----------------------------------------------------------------------------
# Set PLATFORM_OWNER_EMAIL in the environment. When that address signs up (or
# logs in) it is promoted to superadmin automatically, so there is no CLI step
# on a host where you cannot run scripts. Everyone else is a customer.
PLATFORM_OWNER_EMAIL = (os.getenv("PLATFORM_OWNER_EMAIL") or "").strip().lower()

# How a brand-new signup is treated:
#   approval (default) -> org is created "pending"; nobody can use it until you
#                         approve it. This is the mode for selling access.
#   open               -> org is active immediately (self-serve / demo).
SIGNUP_MODE = (os.getenv("HARMONY_SIGNUP_MODE") or "approval").strip().lower()


def is_platform_owner(email: str) -> bool:
    return bool(PLATFORM_OWNER_EMAIL) and (email or "").strip().lower() == PLATFORM_OWNER_EMAIL


def new_org_status() -> str:
    return "active" if SIGNUP_MODE == "open" else "pending"

pwd = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

ROLE_RANK = {"viewer": 1, "editor": 2, "reviewer": 3, "admin": 4, "owner": 5}


def hash_password(p: str) -> str:
    return pwd.hash(p)


def verify_password(p: str, h: str) -> bool:
    return pwd.verify(p, h)


def create_token(user_id: str, org_id: str | None = None, user_agent: str = "", ip: str = "") -> str:
    # ek session record banao (jti) taake baad mein revoke ho sake
    jti = str(uuid.uuid4())
    with Session(engine) as s:
        s.add(SessionRec(id=jti, user_id=user_id, org_id=org_id or "", user_agent=user_agent, ip=ip))
        s.commit()
    payload = {
        "sub": user_id, "org": org_id, "jti": jti,
        "exp": datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRE_MIN),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _decode(token: str) -> dict:
    err = HTTPException(status_code=401, detail="Invalid or expired session.")
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise err


def current_user(token: str = Depends(oauth2)) -> User:
    err = HTTPException(status_code=401, detail="Invalid or expired session.")
    payload = _decode(token)
    user_id = payload.get("sub")
    jti = payload.get("jti")
    with Session(engine) as s:
        # session revoke to nahi hui?
        sess = s.get(SessionRec, jti) if jti else None
        if not sess or sess.revoked:
            raise err
        sess.last_active = datetime.utcnow()
        s.add(sess); s.commit()
        user = s.get(User, user_id)
    if not user or not user.is_active:
        raise err
    return user


def org_id_unchecked(token: str = Depends(oauth2)) -> str:
    """Raw org id from the token, with NO access check.

    Only for endpoints a blocked customer must still reach — /api/auth/me and
    logout — so they can see why they are blocked instead of a bare 403 loop.
    """
    payload = _decode(token)
    return payload.get("org") or ""


def org_status(org_id: str) -> tuple[str, str]:
    if not org_id:
        return "missing", ""
    with Session(engine) as s:
        org = s.get(Organization, org_id)
    if not org:
        return "missing", ""
    return (org.status or "active"), (org.status_reason or "")


def current_org_id(token: str = Depends(oauth2), user: User = Depends(current_user)) -> str:
    """Org scope for every product route — and the licence gate.

    Placing the check here rather than on each route means a new endpoint is
    gated by default. Forgetting to add a guard is the usual way these leak.
    """
    payload = _decode(token)
    oid = payload.get("org") or ""

    # The platform owner is never locked out of anything — that is the whole
    # point of the account that does the unlocking.
    if user.is_superadmin:
        return oid

    status, reason = org_status(oid)
    if status == "active":
        return oid
    if status == "pending":
        raise HTTPException(
            status_code=403,
            detail="This workspace is awaiting activation by the Harmony team. "
                   "You will be notified as soon as it is approved.",
        )
    if status == "suspended":
        raise HTTPException(
            status_code=403,
            detail=reason or "Access to this workspace has been suspended. Contact your Harmony account manager.",
        )
    raise HTTPException(status_code=403, detail="No active workspace on this account.")


def user_membership(user_id: str, org_id: str | None = None) -> Membership | None:
    with Session(engine) as s:
        q = select(Membership).where(Membership.user_id == user_id)
        if org_id:
            q = q.where(Membership.org_id == org_id)
        return s.exec(q).first()


def require_role(min_role: str):
    # RBAC: min_role ya us se ooncha role zaroori
    def checker(user: User = Depends(current_user), org_id: str = Depends(current_org_id)) -> User:
        m = user_membership(user.id, org_id)
        role = m.role if m else None
        if not role or m.status != "active" or ROLE_RANK.get(role, 0) < ROLE_RANK.get(min_role, 99):
            raise HTTPException(status_code=403, detail=f"Requires '{min_role}' role or higher.")
        return user
    return checker


def require_superadmin(user: User = Depends(current_user)) -> User:
    # sirf platform owner (aap). Ye normal org RBAC se ALAG aur upar hai.
    if not user.is_superadmin:
        raise HTTPException(status_code=403, detail="Platform admin access required.")
    return user


# ---- MFA (TOTP) ----
def verify_totp(secret: str, code: str) -> bool:
    import pyotp
    return pyotp.TOTP(secret).verify(code, valid_window=1)
