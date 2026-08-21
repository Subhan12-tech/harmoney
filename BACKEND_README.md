# Harmony — Enterprise Backend (modules & endpoints)

Ye backend **UI ke ilawa** saari enterprise cheezein cover karta hai: auth, multi-tenancy,
RBAC, documents/reviews persistence, audit trail, security center, MFA, API keys, billing,
SSO config. AI core (Qdrant + agents) waise hi hai; ye uske upar enterprise layer hai.

## Files (kya kaam)

| File | Kaam |
|------|------|
| `harmony.py` | AI core: Qdrant + agents + run_review. Ab **org-scoped** (har org ka data alag). |
| `app.py` | FastAPI app — saare routers wire, review/decision org-scoped + persist. |
| `db.py` | Relational DB (SQLModel). Tables: User, Organization, Membership, Document, Review, AuditLog, SessionRec, ApiKey, MfaSecret, SsoConfig, Invite, Subscription. |
| `auth.py` | Password hashing (bcrypt), JWT + **revocable sessions**, current_user, org context, `require_role()`, MFA verify. |
| `routes_auth.py` | signup / login / logout / me / verify-email |
| `routes_org.py` | org switcher, org settings, members, invites, role change, suspend |
| `routes_documents.py` | documents list/get, reviews list, audit trail, dashboard stats |
| `routes_security.py` | sessions list/revoke, security activity, API keys, MFA (TOTP) |
| `routes_billing.py` | plans, subscription, usage, change plan |
| `routes_sso.py` | SSO config (SAML/OIDC/Entra/Google/Okta), verify domain |

## Setup
```
python -m pip install -r requirements.txt
```
`.env`:
```
MISTRAL_API_KEY=...
QDRANT_URL=...
QDRANT_API_KEY=...
APP_SECRET_KEY=long-random-string
# APP_DATABASE_URL=postgresql://...   (prod; dev = sqlite auto)
```

## Run
```
python -m uvicorn app:app --reload
```
- API docs (test yahan): http://127.0.0.1:8000/docs
- Dashboard UI: http://127.0.0.1:8000

## Test flow (Swagger /docs par)
1. `POST /api/auth/signup` -> token milega (aap owner ban jaoge, ek org banegi).
2. Swagger ke "Authorize" button mein token daalo.
3. `POST /api/review` (draft do) -> report. `POST /api/decision` (approve) -> aligned version.
4. `GET /api/audit` -> saare actions ka log. `GET /api/dashboard/stats` -> numbers.
5. Security: `GET /api/security/sessions`, `POST /api/security/api-keys`, `POST /api/security/mfa/setup`.

## Enterprise features covered
- **Auth**: signup/login/logout, hashed passwords, JWT.
- **Sessions**: revocable (list + revoke) — real session management.
- **RBAC**: owner/admin/reviewer/editor/viewer, backend-enforced (viewer approve nahi kar sakta).
- **Multi-tenancy**: har org ka data isolated (Qdrant metadata filter + DB org_id scoping).
- **Documents + Reviews**: DB mein persist (transient nahi).
- **Audit trail**: har action logged, org-scoped.
- **Security center**: sessions, activity, API keys (hashed, once-shown), MFA (TOTP + backup codes).
- **Billing**: plans (Starter/Business/Enterprise), subscription, usage.
- **SSO**: per-org config storage + domain verify (config layer).

## Honest notes (kya real, kya stub)
- **Real & runnable**: auth, sessions, RBAC, multi-tenant scoping, documents/reviews persist,
  audit, API keys, MFA (TOTP works with authenticator apps), billing/subscription data.
- **Stubbed (external service chahiye)**: email sending (verify-email, invites return a token
  instead of emailing), real SAML/OIDC IdP handshake (config stored, no live redirect),
  real payment (Stripe) — billing is data/UI layer only.
- **Concurrency note**: org-scoping vector search ek module-level `_CURRENT_ORG` use karta hai
  (single-worker/demo ke liye theek). Heavy multi-worker deploy par ise request-context banana behtar.
- Live nahi chala saka is environment mein — syntax verify hua. Pehli run par library-version
  ya runtime issue aaye to error paste karna, fix kar denge.
