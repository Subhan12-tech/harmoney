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
from db import engine, User, Membership, SessionRec, MfaSecret

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


def current_org_id(token: str = Depends(oauth2)) -> str:
    # token se active org nikaalta hai (multi-tenant scope)
    payload = _decode(token)
    return payload.get("org") or ""


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
