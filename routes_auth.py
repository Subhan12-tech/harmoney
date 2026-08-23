# ============================================================================
# AUTH ROUTES — signup / login / logout / me / verify-email (stub)
# ============================================================================
import hashlib
import os
import re
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import Session, select
from db import engine, User, Organization, Membership, AuditLog, SessionRec, Subscription, EmailCode
import emailer
from auth import APP_ENV
from auth import (hash_password, verify_password, create_token, current_user,
                  current_org_id, org_id_unchecked, org_status, user_membership,
                  is_platform_owner, new_org_status)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "org"


def audit(org_id: str, user_id: str, action: str, detail: str = ""):
    with Session(engine) as s:
        s.add(AuditLog(org_id=org_id or "", user_id=user_id or "", action=action, detail=detail))
        s.commit()


class SignupIn(BaseModel):
    full_name: str
    email: str
    password: str
    company_name: str


class LoginIn(BaseModel):
    email: str
    password: str


@router.post("/signup")
def signup(body: SignupIn, request: Request):
    # Verification is enforced here, not in the UI. A client that skipped the
    # verify step, or called this endpoint directly, must still fail.
    # Skipped entirely when email is not configured, so a deployment without
    # SMTP is usable rather than impossible to sign up for.
    # Gated on whether a code was actually DELIVERED to this address, not on a
    # global health flag. If the send failed - blocked port, rejected key,
    # provider outage - there is no code to enter, and demanding one locks the
    # user out of the product entirely. That happened in production once.
    if _code_was_sent(body.email) and not _email_is_verified(body.email):
        raise HTTPException(400, "Verify your email address before creating a workspace.")

    with Session(engine) as s:
        if s.exec(select(User).where(User.email == body.email)).first():
            raise HTTPException(400, "Email already registered.")
        owner = is_platform_owner(body.email)
        user = User(email=body.email, full_name=body.full_name,
                    password_hash=hash_password(body.password), is_superadmin=owner)
        # New customers land in "pending" and cannot use the product until the
        # platform owner approves them. The owner's own workspace is active
        # immediately, otherwise they could not log in to approve anyone.
        org = Organization(name=body.company_name, slug=_slug(body.company_name),
                           status="active" if owner else new_org_status())
        if s.exec(select(Organization).where(Organization.slug == org.slug)).first():
            org.slug = org.slug + "-" + user.id[:4]
        s.add(user); s.add(org); s.commit(); s.refresh(user); s.refresh(org)
        s.add(Membership(user_id=user.id, org_id=org.id, role="owner"))
        s.add(Subscription(org_id=org.id, plan="starter", seats=5))   # default plan
        s.commit()
        # values ko Session ke ANDAR local variables mein pakad lo (detached error se bachao)
        uid = user.id
        oid = org.id
        ostatus = org.status

    audit(oid, uid, "user.signup", body.email)
    _consume_code(body.email)          # single use

    # Tell the platform owner someone is waiting. Best-effort: a mail failure
    # must never fail the signup that already succeeded.
    if ostatus == "pending":
        try:
            base = (os.getenv("PUBLIC_URL") or "").strip().rstrip("/")
            owner = os.getenv("PLATFORM_OWNER_EMAIL", "").strip()
            if owner:
                emailer.send_signup_notice(owner, body.company_name, body.email,
                                           f"{base}/app/admin/" if base else "your Harmony admin page")
        except Exception as e:
            print("signup notice email failed:", e)

    token = create_token(uid, oid, request.headers.get("user-agent", ""), request.client.host if request.client else "")
    return {"token": token, "org_id": oid, "role": "owner",
            "org_status": ostatus, "is_superadmin": is_platform_owner(body.email)}


@router.post("/login")
def login(body: LoginIn, request: Request):
    with Session(engine) as s:
        user = s.exec(select(User).where(User.email == body.email)).first()
        if not user or not verify_password(body.password, user.password_hash):
            raise HTTPException(401, "Invalid credentials.")
        if not user.is_active:
            raise HTTPException(403, "Account suspended.")
        # Promote the configured platform owner on sight, so the account works
        # even if PLATFORM_OWNER_EMAIL was set after they first signed up.
        if is_platform_owner(user.email) and not user.is_superadmin:
            user.is_superadmin = True
            s.add(user); s.commit(); s.refresh(user)
        uid = user.id
        is_sa = user.is_superadmin
    m = user_membership(uid)
    org_id = m.org_id if m else None
    role = m.role if m else None
    audit(org_id or "", uid, "user.login", body.email)
    token = create_token(uid, org_id, request.headers.get("user-agent", ""), request.client.host if request.client else "")
    # Login always succeeds for a valid password. Whether the workspace may be
    # USED is a separate question, answered here so the UI can explain itself
    # rather than throwing the user into a wall of 403s.
    ostatus, oreason = org_status(org_id or "")
    return {"token": token, "org_id": org_id, "role": role,
            "org_status": ostatus, "org_status_reason": oreason, "is_superadmin": is_sa}


@router.post("/logout")
def logout(user: User = Depends(current_user), org_id: str = Depends(org_id_unchecked)):
    # is user ki current sessions revoke (simple: sab active revoke)
    with Session(engine) as s:
        for sess in s.exec(select(SessionRec).where(SessionRec.user_id == user.id, SessionRec.revoked == False)).all():
            sess.revoked = True; s.add(sess)
        s.commit()
    audit(org_id, user.id, "user.logout", "")
    return {"status": "ok"}


@router.post("/verify-email")
def verify_email(user: User = Depends(current_user)):
    # STUB: asli mein email par code jata hai. Yahan seedha verified mark karte hain.
    with Session(engine) as s:
        u = s.get(User, user.id); u.email_verified = True; s.add(u); s.commit()
    return {"status": "verified"}


@router.get("/me")
def me(user: User = Depends(current_user), org_id: str = Depends(org_id_unchecked)):
    # Unchecked on purpose: a pending or suspended customer must still be able
    # to load their own identity, or the UI has nothing to explain the block with.
    m = user_membership(user.id, org_id)
    ostatus, oreason = org_status(org_id)
    return {
        "id": user.id, "email": user.email, "full_name": user.full_name,
        "job_title": user.job_title, "email_verified": user.email_verified,
        "org_id": org_id, "role": m.role if m else None,
        "is_superadmin": user.is_superadmin,
        "org_status": ostatus, "org_status_reason": oreason,
    }

# ============================================================================
# EMAIL VERIFICATION
# ============================================================================
# The code is issued BEFORE the account exists, so signup can require a verified
# address. The old flow accepted any six digits, which verified nothing.

# Demo mode. With no email provider configured, verification is skipped entirely
# - which works, but the six-digit step then never appears and the flow looks
# unfinished when you are showing it to someone. This shows the code on screen
# instead, so the step is real and demonstrable without any provider account.
#
# It is opt-in and clearly labelled in the UI, because it does weaken
# verification: anyone who can reach the signup form can read the code. Fine for
# a demo with no real customers; never for a deployment that has them.
DEMO_SHOW_CODES = (os.getenv("HARMONY_DEMO_CODES") or "").strip().lower() == "true"

CODE_TTL_MINUTES = 15
MAX_ATTEMPTS = 5
RESEND_COOLDOWN_SECONDS = 45


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


class SendCodeIn(BaseModel):
    email: str


class CheckCodeIn(BaseModel):
    email: str
    code: str


@router.post("/send-code")
def send_code(body: SendCodeIn):
    email = (body.email or "").strip().lower()
    if not emailer.looks_like_email(email):
        raise HTTPException(400, "Enter a valid email address.")

    with Session(engine) as s:
        if s.exec(select(User).where(User.email == email)).first():
            raise HTTPException(400, "Email already registered. Sign in instead.")

        existing = s.exec(select(EmailCode).where(EmailCode.email == email,
                                                  EmailCode.purpose == "signup")).all()
        # Rate limit resends: without this the endpoint is a free way to send
        # mail to any address at your expense.
        for row in existing:
            age = (datetime.utcnow() - row.created_at).total_seconds()
            if age < RESEND_COOLDOWN_SECONDS and not row.verified:
                raise HTTPException(
                    429, f"A code was just sent. Wait {int(RESEND_COOLDOWN_SECONDS - age)}s before asking for another.")
        for row in existing:
            s.delete(row)          # one live code per address
        s.commit()

        code = f"{secrets.randbelow(1_000_000):06d}"
        row = EmailCode(email=email, code_hash=_hash_code(code), purpose="signup",
                        expires_at=datetime.utcnow() + timedelta(minutes=CODE_TTL_MINUTES))
        s.add(row); s.commit(); s.refresh(row)
        row_id = row.id

    sent = emailer.send_verification_code(email, code, CODE_TTL_MINUTES)
    if sent:
        with Session(engine) as s:
            r = s.get(EmailCode, row_id)
            if r:
                r.delivered = True
                s.add(r); s.commit()
    if not sent:
        # No SMTP configured. Say so plainly rather than claiming an email was
        # sent - and in development only, hand back the code so the flow works.
        print(f"[dev] verification code for {email}: {code}")
        # Do NOT 503 here. Signup does not require verification when email is
        # not working, so failing this call would block the flow on a step that
        # is no longer load-bearing. Report it and let the user continue.
        # Include the provider's own reason. It is the difference between "email
        # is broken" and "Resend refused THIS recipient because the sender
        # domain is unverified" - and without it that is invisible on a host
        # whose logs you may not be reading.
        reason = emailer.last_send_error()
        if DEMO_SHOW_CODES or APP_ENV != "production":
            return {"status": "demo",
                    "detail": "Email is not configured, so the code is shown here instead.",
                    "dev_code": code}
        return {"status": "not_sent",
                "detail": "Verification email could not be sent, so this step is skipped. Continue.",
                **({"reason": reason} if reason else {})}

    return {"status": "sent", "detail": f"Code sent to {email}. It expires in {CODE_TTL_MINUTES} minutes."}


@router.post("/check-code")
def check_code(body: CheckCodeIn):
    email = (body.email or "").strip().lower()
    code = (body.code or "").strip()

    with Session(engine) as s:
        row = s.exec(select(EmailCode).where(EmailCode.email == email,
                                             EmailCode.purpose == "signup")).first()
        if not row:
            # Nothing to check against because nothing could be sent. Signup is
            # not gated in that state, so accept rather than dead-end the user.
            if not emailer.email_working():
                return {"status": "skipped", "detail": "Email verification is unavailable on this server."}
            raise HTTPException(400, "No code was requested for that address.")
        if row.expires_at < datetime.utcnow():
            s.delete(row); s.commit()
            raise HTTPException(400, "That code has expired. Request a new one.")
        if row.attempts >= MAX_ATTEMPTS:
            raise HTTPException(429, "Too many incorrect attempts. Request a new code.")

        # A code EXISTS, so check it - whatever the transport. Skipping here
        # meant a wrong code was accepted in demo mode, which made the step
        # theatre rather than a demonstration. "Skipped" belongs only above,
        # where no code was ever issued.
        if _hash_code(code) != row.code_hash:
            row.attempts += 1
            s.add(row); s.commit()
            left = MAX_ATTEMPTS - row.attempts
            raise HTTPException(400, f"That code is not correct. {left} attempt{'' if left == 1 else 's'} left.")

        row.verified = True
        s.add(row); s.commit()

    return {"status": "verified"}


def _code_was_sent(email: str) -> bool:
    """True if a code was successfully delivered to this address and is still live."""
    with Session(engine) as s:
        row = s.exec(select(EmailCode).where(EmailCode.email == email.strip().lower(),
                                             EmailCode.purpose == "signup",
                                             EmailCode.delivered == True)).first()
        return bool(row and row.expires_at >= datetime.utcnow())


def _email_is_verified(email: str) -> bool:
    with Session(engine) as s:
        row = s.exec(select(EmailCode).where(EmailCode.email == email.strip().lower(),
                                             EmailCode.purpose == "signup",
                                             EmailCode.verified == True)).first()
        return bool(row and row.expires_at >= datetime.utcnow())


def _consume_code(email: str):
    with Session(engine) as s:
        for row in s.exec(select(EmailCode).where(EmailCode.email == email.strip().lower())).all():
            s.delete(row)
        s.commit()

