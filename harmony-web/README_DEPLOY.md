# Deploying harmony-web

This is the product UI. It runs as its own Render Web Service, alongside the
API. It cannot be a Static Site: `/app/review/[id]` is server-rendered on
demand, so it needs a Node server.

## 1. Create the service

Render → **New +** → **Web Service** → connect `Subhan12-tech/harmoney`.

| Field | Value |
|---|---|
| Name | `harmony-web` |
| Region | **Oregon** — same as the API |
| Branch | `main` |
| **Root Directory** | **`harmony-web`** ← the setting people miss |
| Language | **Node** |
| Build Command | `npm ci && npm run build` |
| Start Command | `npm run start` |
| Instance Type | Starter |

Environment variables:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://harmoney.onrender.com` |
| `NODE_VERSION` | `20` |

`NEXT_PUBLIC_API_URL` is baked in at **build** time, not read at runtime.
Changing it later needs a rebuild, not a restart. No trailing slash.

`next start` binds whatever `PORT` Render injects — no flag needed, and passing
one breaks the script on Windows.

Deploy. First build ~3-5 minutes.

## 2. Point the API back at it

Two variables on the **Render** service, both needed:

| Key | Value | Why |
|---|---|---|
| `CORS_ORIGINS` | `https://harmony-web.onrender.com` | Without it the browser blocks every API call and the app looks dead while the network tab fills with CORS errors |
| `FRONTEND_URL` | `https://harmony-web.onrender.com` | Makes the API root redirect here instead of serving the old built-in dashboard, so there is only ever one live UI |

Exact origins — scheme included, no trailing slash.

## 3. Check it

1. Open the harmony-web URL → sign-in screen
2. Sign in with your platform-owner account
3. Sidebar shows **Platform → Approvals** (owner only)
4. **All Documents → Check a document** → paste a draft → run it

If the app loads but every panel is empty, it is almost always `CORS_ORIGINS`
not matching the harmony-web origin exactly.

## Local development

```bash
npm install
npm run dev          # http://localhost:3000
```

Expects the API on `http://127.0.0.1:8000`. Start it from the repo root:

```bash
uvicorn app:app --reload
```

For local work set `HARMONY_SIGNUP_MODE=open` on the API, otherwise every
account you create is stuck pending until you approve it.

## What talks to what

```
harmony-web (Render)  ──fetch + Bearer token──▶  harmony-api (Render)
                                                   ├── Postgres   accounts, documents, reviews, audit
                                                   ├── Qdrant     the evidence corpus
                                                   └── Mistral    the review pipeline
```

The frontend holds no secrets. `NEXT_PUBLIC_API_URL` is a public URL, and the
session token lives in the browser's localStorage — every real permission check
happens server-side.
