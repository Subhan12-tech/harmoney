# ============================================================================
# AUTH ROUTES — signup / login / logout / me / verify-email (stub)
# ============================================================================
import re
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import Session, select
from db import engine, User, Organization, Membership, AuditLog, SessionRec, Subscription
from auth import (hash_password, verify_password, create_token, current_user,
                  current_org_id, user_membership)

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
    with Session(engine) as s:
        if s.exec(select(User).where(User.email == body.email)).first():
            raise HTTPException(400, "Email already registered.")
        user = User(email=body.email, full_name=body.full_name, password_hash=hash_password(body.password))
        org = Organization(name=body.company_name, slug=_slug(body.company_name))
        if s.exec(select(Organization).where(Organization.slug == org.slug)).first():
            org.slug = org.slug + "-" + user.id[:4]
        s.add(user); s.add(org); s.commit(); s.refresh(user); s.refresh(org)
        s.add(Membership(user_id=user.id, org_id=org.id, role="owner"))
        s.add(Subscription(org_id=org.id, plan="starter", seats=5))   # default plan
        s.commit()
        # values ko Session ke ANDAR local variables mein pakad lo (detached error se bachao)
        uid = user.id
        oid = org.id

    audit(oid, uid, "user.signup", body.email)
    token = create_token(uid, oid, request.headers.get("user-agent", ""), request.client.host if request.client else "")
    return {"token": token, "org_id": oid, "role": "owner"}


@router.post("/login")
def login(body: LoginIn, request: Request):
    with Session(engine) as s:
        user = s.exec(select(User).where(User.email == body.email)).first()
        if not user or not verify_password(body.password, user.password_hash):
            raise HTTPException(401, "Invalid credentials.")
        if not user.is_active:
            raise HTTPException(403, "Account suspended.")
        uid = user.id
    m = user_membership(uid)
    org_id = m.org_id if m else None
    role = m.role if m else None
    audit(org_id or "", uid, "user.login", body.email)
    token = create_token(uid, org_id, request.headers.get("user-agent", ""), request.client.host if request.client else "")
    return {"token": token, "org_id": org_id, "role": role}


@router.post("/logout")
def logout(user: User = Depends(current_user), org_id: str = Depends(current_org_id)):
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
def me(user: User = Depends(current_user), org_id: str = Depends(current_org_id)):
    m = user_membership(user.id, org_id)
    return {
        "id": user.id, "email": user.email, "full_name": user.full_name,
        "job_title": user.job_title, "email_verified": user.email_verified,
        "org_id": org_id, "role": m.role if m else None,
        "is_superadmin": user.is_superadmin,
    }
