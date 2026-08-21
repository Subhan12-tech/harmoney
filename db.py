# ============================================================================
# DATABASE LAYER (relational)  —  SQLModel + SQLite (dev) / Postgres (prod)
# Saari enterprise tables yahan hain: users, orgs, roles, documents, reviews,
# audit, sessions, api keys, MFA, SSO config, invites, billing.
# ============================================================================

import os
import uuid
from datetime import datetime
from sqlmodel import SQLModel, Field, create_engine, Session

DB_URL = os.getenv("APP_DATABASE_URL", "sqlite:///./harmony_app.db")
_connect_args = {"check_same_thread": False} if DB_URL.startswith("sqlite") else {}
engine = create_engine(DB_URL, echo=False, connect_args=_connect_args)


def _uuid() -> str:
    return str(uuid.uuid4())


class Organization(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    name: str
    slug: str = Field(index=True, unique=True)
    website: str = ""
    industry: str = ""
    size: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)


class User(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    email: str = Field(index=True, unique=True)
    full_name: str = ""
    job_title: str = ""
    password_hash: str
    email_verified: bool = False
    is_active: bool = True
    is_superadmin: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Membership(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    user_id: str = Field(index=True, foreign_key="user.id")
    org_id: str = Field(index=True, foreign_key="organization.id")
    role: str = "viewer"          # owner / admin / reviewer / editor / viewer
    status: str = "active"        # active / suspended


class Invite(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    org_id: str = Field(index=True)
    email: str = Field(index=True)
    role: str = "viewer"
    token: str = Field(default_factory=_uuid, index=True)
    accepted: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Document(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    org_id: str = Field(index=True)
    title: str = "Untitled"
    doc_type: str = "Press Release"
    status: str = "In Review"     # Draft / In Review / Changes Requested / Approved / Published / Archived
    risk: str = "Low"             # High / Medium / Low — derived from the review's flagged issues
    content: str = ""
    created_by: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Review(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    org_id: str = Field(index=True)
    document_id: str = Field(index=True, default="")
    company: str = ""
    average_rating: float = 0.0
    critic_verdict: str = ""
    report: str = ""
    issues_json: str = "[]"       # structured, evidence-grounded issues (see harmony.structured_issues_agent)
    evidence_json: str = "[]"     # every past statement retrieved for this draft, not just the flagged ones
    status: str = "pending"       # pending / approved / rejected
    created_by: str = ""
    decided_by: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    decided_at: datetime | None = None


class AuditLog(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    org_id: str = Field(index=True)
    user_id: str = ""
    action: str
    detail: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SessionRec(SQLModel, table=True):
    # JWT ka jti yahan track hota hai -> "revoke session" mumkin ho jata hai
    id: str = Field(primary_key=True)           # jti
    user_id: str = Field(index=True)
    org_id: str = ""
    user_agent: str = ""
    ip: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_active: datetime = Field(default_factory=datetime.utcnow)
    revoked: bool = False


class ApiKey(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    org_id: str = Field(index=True)
    name: str = ""
    prefix: str = ""              # dikhane ke liye (poori key kabhi store nahi)
    key_hash: str = ""            # hashed
    created_by: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_used: datetime | None = None
    revoked: bool = False


class MfaSecret(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    user_id: str = Field(index=True, unique=True)
    secret: str = ""
    enabled: bool = False
    backup_codes: str = ""        # hashed codes, json list


class SsoConfig(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    org_id: str = Field(index=True, unique=True)
    provider: str = ""            # saml / oidc / entra / google / okta
    entity_id: str = ""
    sso_url: str = ""
    certificate: str = ""
    domain: str = ""
    domain_verified: bool = False
    require_sso: bool = False
    enabled: bool = False


class Subscription(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    org_id: str = Field(index=True, unique=True)
    plan: str = "starter"         # starter / business / enterprise
    seats: int = 5
    docs_used: int = 0
    cycle_start: datetime = Field(default_factory=datetime.utcnow)


class HistoryItem(SQLModel, table=True):
    # ek record har baar jab kuch evidence history (Qdrant) mein add hota hai — paste,
    # file upload, ya ek approved/published document — taake Evidence Library mein
    # "saari previous documents" ki asli, browsable list dikhayi ja sake.
    id: str = Field(default_factory=_uuid, primary_key=True)
    org_id: str = Field(index=True)
    company: str = ""
    source_file: str = ""         # filename, ya "" agar pasted text tha
    doc_type: str = "history"     # history / approved
    chunk_count: int = 0
    added_by: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)


def _migrate_sqlite():
    # dev convenience: create_all() only adds missing TABLES, not missing COLUMNS on
    # tables that already exist. Patch in newly-added columns on an existing sqlite file.
    if not DB_URL.startswith("sqlite"):
        return
    from sqlalchemy import text
    patches = {
        "document": [("risk", "VARCHAR NOT NULL DEFAULT 'Low'")],
        "review": [("issues_json", "VARCHAR NOT NULL DEFAULT '[]'"), ("evidence_json", "VARCHAR NOT NULL DEFAULT '[]'")],
    }
    with engine.connect() as conn:
        for table, cols in patches.items():
            existing = {row[1] for row in conn.execute(text(f"PRAGMA table_info({table})"))}
            for name, ddl in cols:
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))
        conn.commit()


def init_db():
    SQLModel.metadata.create_all(engine)
    _migrate_sqlite()
