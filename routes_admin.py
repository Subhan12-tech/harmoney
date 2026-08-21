# ============================================================================
# PLATFORM ADMIN — sirf super-admin (aap/vendor). Saari companies ka overview.
# ============================================================================
from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from db import engine, User, Organization, Membership, Document, Review, Subscription
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
                "created_at": str(org.created_at),
            })
    return {"organizations": out}


@router.get("/users")
def all_users(admin: User = Depends(require_superadmin)):
    with Session(engine) as s:
        users = s.exec(select(User)).all()
    return {"users": [{"id": u.id, "email": u.email, "name": u.full_name,
                       "superadmin": u.is_superadmin, "active": u.is_active} for u in users]}
