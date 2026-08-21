# ============================================================================
# SSO CONFIG — enterprise SSO settings (config storage; no real IdP handshake)
# ============================================================================
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from db import engine, User, SsoConfig
from auth import current_user, current_org_id, require_role
from routes_auth import audit

router = APIRouter(prefix="/api/sso", tags=["sso"])


class SsoIn(BaseModel):
    provider: str | None = None
    entity_id: str | None = None
    sso_url: str | None = None
    certificate: str | None = None
    domain: str | None = None
    require_sso: bool | None = None
    enabled: bool | None = None


@router.get("/config")
def get_sso(org_id: str = Depends(current_org_id), user: User = Depends(require_role("admin"))):
    with Session(engine) as s:
        cfg = s.exec(select(SsoConfig).where(SsoConfig.org_id == org_id)).first()
    if not cfg:
        return {"configured": False}
    # certificate/secret expose nahi karte
    return {"configured": True, "provider": cfg.provider, "entity_id": cfg.entity_id,
            "sso_url": cfg.sso_url, "domain": cfg.domain, "domain_verified": cfg.domain_verified,
            "require_sso": cfg.require_sso, "enabled": cfg.enabled}


@router.put("/config")
def set_sso(body: SsoIn, org_id: str = Depends(current_org_id), user: User = Depends(require_role("admin"))):
    with Session(engine) as s:
        cfg = s.exec(select(SsoConfig).where(SsoConfig.org_id == org_id)).first()
        if not cfg:
            cfg = SsoConfig(org_id=org_id)
        for k, v in body.dict(exclude_none=True).items():
            setattr(cfg, k, v)
        s.add(cfg); s.commit()
    audit(org_id, user.id, "sso.updated", body.provider or "")
    return {"status": "ok"}


@router.post("/verify-domain")
def verify_domain(org_id: str = Depends(current_org_id), user: User = Depends(require_role("admin"))):
    # STUB: asli mein DNS TXT record check hota hai
    with Session(engine) as s:
        cfg = s.exec(select(SsoConfig).where(SsoConfig.org_id == org_id)).first()
        if not cfg:
            raise HTTPException(400, "Configure SSO first.")
        cfg.domain_verified = True; s.add(cfg); s.commit()
    audit(org_id, user.id, "sso.domain_verified", cfg.domain)
    return {"status": "verified"}
