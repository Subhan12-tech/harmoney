# ============================================================================
# ORGANIZATION ROUTES — org switcher, settings, members, invites, roles
# ============================================================================
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import Session, select
from db import engine, User, Organization, Membership, Invite
from auth import current_user, current_org_id, require_role, user_membership, create_token
from routes_auth import audit

router = APIRouter(prefix="/api/orgs", tags=["organizations"])


@router.get("/mine")
def my_orgs(user: User = Depends(current_user)):
    # org switcher ke liye: user ki saari organizations
    out = []
    with Session(engine) as s:
        for m in s.exec(select(Membership).where(Membership.user_id == user.id)).all():
            org = s.get(Organization, m.org_id)
            if org:
                out.append({"org_id": org.id, "name": org.name, "slug": org.slug, "role": m.role})
    return {"organizations": out}


@router.post("/switch/{org_id}")
def switch_org(org_id: str, request: Request, user: User = Depends(current_user)):
    # doosri org par switch -> naya token us org ke context mein
    m = user_membership(user.id, org_id)
    if not m:
        raise HTTPException(403, "You are not a member of this organization.")
    token = create_token(user.id, org_id, request.headers.get("user-agent", ""),
                         request.client.host if request.client else "")
    audit(org_id, user.id, "org.switch", org_id)
    return {"token": token, "org_id": org_id, "role": m.role}


class OrgUpdate(BaseModel):
    name: str | None = None
    website: str | None = None
    industry: str | None = None
    size: str | None = None


@router.get("/current")
def current_org(org_id: str = Depends(current_org_id), user: User = Depends(current_user)):
    with Session(engine) as s:
        org = s.get(Organization, org_id)
    if not org:
        raise HTTPException(404, "Organization not found.")
    return org


@router.patch("/current")
def update_org(body: OrgUpdate, org_id: str = Depends(current_org_id),
               user: User = Depends(require_role("admin"))):
    with Session(engine) as s:
        org = s.get(Organization, org_id)
        if not org:
            raise HTTPException(404, "Organization not found.")
        for k, v in body.dict(exclude_none=True).items():
            setattr(org, k, v)
        s.add(org); s.commit()
    audit(org_id, user.id, "org.updated", "")
    return {"status": "ok"}


# ---- members + roles ----
@router.get("/members")
def list_members(org_id: str = Depends(current_org_id), user: User = Depends(current_user)):
    out = []
    with Session(engine) as s:
        for m in s.exec(select(Membership).where(Membership.org_id == org_id)).all():
            u = s.get(User, m.user_id)
            if u:
                out.append({"user_id": u.id, "name": u.full_name, "email": u.email,
                            "role": m.role, "status": m.status})
    return {"members": out}


class InviteIn(BaseModel):
    email: str
    role: str = "viewer"


@router.post("/invite")
def invite_member(body: InviteIn, org_id: str = Depends(current_org_id),
                  user: User = Depends(require_role("admin"))):
    # STUB: asli mein email jata hai. Yahan invite record banta hai (token ke saath).
    with Session(engine) as s:
        inv = Invite(org_id=org_id, email=body.email, role=body.role)
        s.add(inv); s.commit(); s.refresh(inv)
    audit(org_id, user.id, "member.invited", body.email)
    return {"status": "ok", "invite_token": inv.token, "note": "Send this link to the invitee (email stub)."}


class RoleChange(BaseModel):
    user_id: str
    role: str


@router.post("/members/role")
def change_role(body: RoleChange, org_id: str = Depends(current_org_id),
                user: User = Depends(require_role("admin"))):
    if body.role not in ("viewer", "editor", "reviewer", "admin", "owner"):
        raise HTTPException(400, "Invalid role.")
    with Session(engine) as s:
        m = s.exec(select(Membership).where(Membership.user_id == body.user_id,
                                            Membership.org_id == org_id)).first()
        if not m:
            raise HTTPException(404, "Member not found.")
        m.role = body.role; s.add(m); s.commit()
    audit(org_id, user.id, "member.role_changed", f"{body.user_id}->{body.role}")
    return {"status": "ok"}


@router.post("/members/{target_user_id}/suspend")
def suspend_member(target_user_id: str, org_id: str = Depends(current_org_id),
                   user: User = Depends(require_role("admin"))):
    with Session(engine) as s:
        m = s.exec(select(Membership).where(Membership.user_id == target_user_id,
                                            Membership.org_id == org_id)).first()
        if not m:
            raise HTTPException(404, "Member not found.")
        m.status = "suspended"; s.add(m); s.commit()
    audit(org_id, user.id, "member.suspended", target_user_id)
    return {"status": "ok"}
