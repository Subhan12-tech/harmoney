# ============================================================================
# BILLING — plans, current subscription, usage  (UI/data layer; no real Stripe)
# ============================================================================
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from db import engine, User, Subscription, Document
from auth import current_user, current_org_id, require_role
from routes_auth import audit

router = APIRouter(prefix="/api/billing", tags=["billing"])

PLANS = [
    {"id": "starter", "name": "Starter", "price": "$18k/yr", "seats": 5, "docs": 100},
    {"id": "business", "name": "Business", "price": "$45k/yr", "seats": 20, "docs": 1000},
    {"id": "enterprise", "name": "Enterprise", "price": "Custom", "seats": "Unlimited", "docs": "Unlimited",
     "cta": "Contact Sales"},
]


@router.get("/plans")
def plans():
    return {"plans": PLANS}


@router.get("/subscription")
def subscription(org_id: str = Depends(current_org_id), user: User = Depends(current_user)):
    with Session(engine) as s:
        sub = s.exec(select(Subscription).where(Subscription.org_id == org_id)).first()
        docs = len(s.exec(select(Document).where(Document.org_id == org_id)).all())
    if not sub:
        raise HTTPException(404, "No subscription found.")
    return {"plan": sub.plan, "seats": sub.seats, "docs_used": docs,
            "cycle_start": str(sub.cycle_start)}


class PlanChange(BaseModel):
    plan: str


@router.post("/change")
def change_plan(body: PlanChange, org_id: str = Depends(current_org_id),
                user: User = Depends(require_role("owner"))):
    if body.plan not in ("starter", "business", "enterprise"):
        raise HTTPException(400, "Invalid plan.")
    with Session(engine) as s:
        sub = s.exec(select(Subscription).where(Subscription.org_id == org_id)).first()
        if not sub:
            raise HTTPException(404, "No subscription.")
        sub.plan = body.plan; s.add(sub); s.commit()
    audit(org_id, user.id, "billing.plan_changed", body.plan)
    return {"status": "ok", "plan": body.plan}
