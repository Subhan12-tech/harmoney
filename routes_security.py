# ============================================================================
# SECURITY CENTER — sessions, security activity, API keys, MFA (TOTP)
# ============================================================================
import os
import json
import uuid
import hashlib
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from db import engine, User, SessionRec, ApiKey, MfaSecret, AuditLog
from auth import current_user, current_org_id, require_role, hash_password, verify_password, verify_totp
from routes_auth import audit

router = APIRouter(prefix="/api/security", tags=["security"])


# ---- active sessions ----
@router.get("/sessions")
def list_sessions(user: User = Depends(current_user)):
    with Session(engine) as s:
        rows = s.exec(select(SessionRec).where(SessionRec.user_id == user.id, SessionRec.revoked == False)
                      .order_by(SessionRec.last_active.desc())).all()
    return {"sessions": [{"id": r.id, "user_agent": r.user_agent, "ip": r.ip,
                          "created_at": str(r.created_at), "last_active": str(r.last_active)} for r in rows]}


@router.post("/sessions/{jti}/revoke")
def revoke_session(jti: str, user: User = Depends(current_user), org_id: str = Depends(current_org_id)):
    with Session(engine) as s:
        sess = s.get(SessionRec, jti)
        if not sess or sess.user_id != user.id:
            raise HTTPException(404, "Session not found.")
        sess.revoked = True; s.add(sess); s.commit()
    audit(org_id, user.id, "session.revoked", jti)
    return {"status": "ok"}


# ---- security activity (audit filtered to security events) ----
@router.get("/activity")
def security_activity(user: User = Depends(current_user), org_id: str = Depends(current_org_id)):
    sec_actions = ("user.login", "user.logout", "user.signup", "session.revoked",
                   "mfa.enabled", "mfa.disabled", "apikey.created", "apikey.revoked", "sso.updated")
    with Session(engine) as s:
        rows = s.exec(select(AuditLog).where(AuditLog.org_id == org_id)
                      .order_by(AuditLog.created_at.desc()).limit(200)).all()
    return {"activity": [{"action": r.action, "detail": r.detail, "user_id": r.user_id,
                          "at": str(r.created_at)} for r in rows if r.action in sec_actions]}


# ---- API keys ----
class ApiKeyIn(BaseModel):
    name: str


@router.get("/api-keys")
def list_keys(org_id: str = Depends(current_org_id), user: User = Depends(require_role("admin"))):
    with Session(engine) as s:
        rows = s.exec(select(ApiKey).where(ApiKey.org_id == org_id, ApiKey.revoked == False)).all()
    return {"keys": [{"id": k.id, "name": k.name, "prefix": k.prefix,
                      "created_at": str(k.created_at), "last_used": str(k.last_used) if k.last_used else None} for k in rows]}


@router.post("/api-keys")
def create_key(body: ApiKeyIn, org_id: str = Depends(current_org_id), user: User = Depends(require_role("admin"))):
    raw = "hm_" + uuid.uuid4().hex + uuid.uuid4().hex          # sirf ab dikhega, dobara nahi
    prefix = raw[:8]
    key_hash = hashlib.sha256(raw.encode()).hexdigest()
    with Session(engine) as s:
        k = ApiKey(org_id=org_id, name=body.name, prefix=prefix, key_hash=key_hash, created_by=user.id)
        s.add(k); s.commit()
    audit(org_id, user.id, "apikey.created", body.name)
    return {"api_key": raw, "prefix": prefix,
            "warning": "Store this key securely. You won't be able to view it again."}


@router.post("/api-keys/{key_id}/revoke")
def revoke_key(key_id: str, org_id: str = Depends(current_org_id), user: User = Depends(require_role("admin"))):
    with Session(engine) as s:
        k = s.get(ApiKey, key_id)
        if not k or k.org_id != org_id:
            raise HTTPException(404, "Key not found.")
        k.revoked = True; s.add(k); s.commit()
    audit(org_id, user.id, "apikey.revoked", key_id)
    return {"status": "ok"}


# ---- MFA (TOTP) ----
@router.get("/mfa/status")
def mfa_status(user: User = Depends(current_user)):
    # read-only — safe to call anytime (unlike /mfa/setup, which rotates the secret)
    with Session(engine) as s:
        rec = s.exec(select(MfaSecret).where(MfaSecret.user_id == user.id)).first()
    return {"enabled": bool(rec and rec.enabled)}


@router.post("/mfa/setup")
def mfa_setup(user: User = Depends(current_user)):
    import pyotp
    secret = pyotp.random_base32()
    with Session(engine) as s:
        existing = s.exec(select(MfaSecret).where(MfaSecret.user_id == user.id)).first()
        if existing:
            existing.secret = secret; existing.enabled = False; s.add(existing)
        else:
            s.add(MfaSecret(user_id=user.id, secret=secret, enabled=False))
        s.commit()
    # otpauth URI -> frontend QR bana lega (koi image dependency nahi)
    uri = pyotp.TOTP(secret).provisioning_uri(name=user.email, issuer_name="Harmony")
    return {"secret": secret, "otpauth_uri": uri}


class MfaVerifyIn(BaseModel):
    code: str


@router.post("/mfa/enable")
def mfa_enable(body: MfaVerifyIn, user: User = Depends(current_user), org_id: str = Depends(current_org_id)):
    import secrets
    with Session(engine) as s:
        rec = s.exec(select(MfaSecret).where(MfaSecret.user_id == user.id)).first()
        if not rec:
            raise HTTPException(400, "Run MFA setup first.")
        if not verify_totp(rec.secret, body.code):
            raise HTTPException(400, "Invalid verification code.")
        # backup codes banao (hashed store, plain sirf ab return)
        plain_codes = [secrets.token_hex(4) for _ in range(8)]
        rec.backup_codes = json.dumps([hashlib.sha256(c.encode()).hexdigest() for c in plain_codes])
        rec.enabled = True
        s.add(rec); s.commit()
    audit(org_id, user.id, "mfa.enabled", "")
    return {"status": "enabled", "backup_codes": plain_codes,
            "warning": "Save these backup codes now. They won't be shown again."}


@router.post("/mfa/disable")
def mfa_disable(body: MfaVerifyIn, user: User = Depends(current_user), org_id: str = Depends(current_org_id)):
    with Session(engine) as s:
        rec = s.exec(select(MfaSecret).where(MfaSecret.user_id == user.id)).first()
        if not rec or not rec.enabled:
            raise HTTPException(400, "MFA is not enabled.")
        if not verify_totp(rec.secret, body.code):
            raise HTTPException(400, "Invalid verification code.")
        rec.enabled = False; s.add(rec); s.commit()
    audit(org_id, user.id, "mfa.disabled", "")
    return {"status": "disabled"}
