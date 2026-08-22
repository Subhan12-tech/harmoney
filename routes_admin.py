# ============================================================================
# PLATFORM ADMIN — sirf super-admin (aap/vendor). Saari companies ka overview.
# ============================================================================
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from db import engine, User, Organization, Membership, Document, Review, Subscription, AuditLog
from auth import require_superadmin

router = APIRouter(prefix="/api/admin", tags=["platform-admin"])


@router.get("/stats")
def platform_stats(admin: User = Depends(require_superadmin)):
    with Session(engine) as s:
        orgs = len(s.exec(select(Organization)).all())
        users = len(s.exec(select(User)).all())
        docs = len(s.exec(select(Document)).all())
        reviews = len(s.exec(select(Review)).all())
    return {"organizations": orgs, "users": users, "documents": docs, "reviews": reviews}


@router.get("/orgs")
def all_orgs(admin: User = Depends(require_superadmin)):
    out = []
    with Session(engine) as s:
        for org in s.exec(select(Organization)).all():
            members = len(s.exec(select(Membership).where(Membership.org_id == org.id)).all())
            sub = s.exec(select(Subscription).where(Subscription.org_id == org.id)).first()
            out.append({
                "org_id": org.id, "name": org.name, "slug": org.slug,
                "members": members, "plan": sub.plan if sub else "-",
                "status": org.status or "active",
                "status_reason": org.status_reason or "",
                "activated_at": str(org.activated_at) if org.activated_at else None,
                "created_at": str(org.created_at),
            })
    # Pending first — those are the ones waiting on a decision from you.
    order = {"pending": 0, "active": 1, "suspended": 2}
    out.sort(key=lambda o: (order.get(o["status"], 9), o["created_at"]))
    return {"organizations": out}


@router.get("/users")
def all_users(admin: User = Depends(require_superadmin)):
    with Session(engine) as s:
        users = s.exec(select(User)).all()
    return {"users": [{"id": u.id, "email": u.email, "name": u.full_name,
                       "superadmin": u.is_superadmin, "active": u.is_active} for u in users]}


# ============================================================================
# ACCESS CONTROL — grant and revoke a customer's access to the product.
# ============================================================================
# Only the platform owner reaches these. Suspending never deletes anything:
# the workspace is frozen, and reactivating restores it exactly as it was.

class AccessIn(BaseModel):
    reason: str = ""


def _set_status(org_id: str, status: str, admin: User, reason: str = ""):
    with Session(engine) as s:
        org = s.get(Organization, org_id)
        if not org:
            raise HTTPException(404, "Organization not found.")
        previous = org.status or "active"
        org.status = status
        org.status_reason = reason
        if status == "active" and not org.activated_at:
            org.activated_at = datetime.utcnow()
            org.activated_by = admin.id
        s.add(org)
        s.add(AuditLog(org_id=org_id, user_id=admin.id,
                       action=f"platform.org_{status}",
                       detail=f"{previous} -> {status}" + (f": {reason}" if reason else "")))
        s.commit()
        return {"org_id": org.id, "name": org.name, "status": org.status,
                "status_reason": org.status_reason}


@router.post("/orgs/{org_id}/approve")
def approve_org(org_id: str, admin: User = Depends(require_superadmin)):
    """Grant access. The customer can use the product from the next request."""
    return _set_status(org_id, "active", admin)


@router.post("/orgs/{org_id}/suspend")
def suspend_org(org_id: str, body: AccessIn | None = None, admin: User = Depends(require_superadmin)):
    """Revoke access. Takes effect immediately — existing tokens stop working
    because the gate is checked per request, not at login.

    The reason is optional: cutting off access must never be blocked by a
    validation error over a message field.
    """
    return _set_status(org_id, "suspended", admin, (body.reason if body else "") or "")


@router.post("/orgs/{org_id}/reactivate")
def reactivate_org(org_id: str, admin: User = Depends(require_superadmin)):
    """Undo a suspension."""
    return _set_status(org_id, "active", admin)


@router.get("/pending")
def pending_orgs(admin: User = Depends(require_superadmin)):
    """The approval queue — everyone waiting on you."""
    out = []
    with Session(engine) as s:
        orgs = s.exec(select(Organization).where(Organization.status == "pending")
                      .order_by(Organization.created_at.asc())).all()
        for org in orgs:
            m = s.exec(select(Membership).where(Membership.org_id == org.id,
                                                Membership.role == "owner")).first()
            u = s.get(User, m.user_id) if m else None
            out.append({
                "org_id": org.id, "name": org.name,
                "requested_by": u.email if u else "unknown",
                "requested_by_name": u.full_name if u else "",
                "created_at": str(org.created_at),
            })
    return {"pending": out, "count": len(out)}
