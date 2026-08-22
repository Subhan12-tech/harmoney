# Deploying harmony-web

This is the product UI. The API lives separately (Render); this deploys to
Vercel, which handles Next.js better than a container host and is free at this
scale.

## 1. Deploy

1. https://vercel.com/new → import `Subhan12-tech/harmoney`
2. **Root Directory: `harmony-web`** — this is the one setting people miss.
   Vercel builds from the repo root otherwise and finds no Next.js app.
3. Framework preset: Next.js (auto-detected)
4. Environment Variable:

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://harmoney.onrender.com` |

   No trailing slash. It is baked in at build time, so changing it later
   requires a redeploy, not just a restart.
5. Deploy. ~2 minutes.

## 2. Point the API back at it

Two variables on the **Render** service, both needed:

| Key | Value | Why |
|---|---|---|
| `CORS_ORIGINS` | `https://your-app.vercel.app` | Without it the browser blocks every API call and the app looks dead while the network tab fills with CORS errors |
| `FRONTEND_URL` | `https://your-app.vercel.app` | Makes the API root redirect here instead of serving the old built-in dashboard, so there is only ever one live UI |

Exact origins — scheme included, no trailing slash.

## 3. Check it

1. Open the Vercel URL → sign-in screen
2. Sign in with your platform-owner account
3. Sidebar shows **Platform → Approvals** (owner only)
4. **All Documents → Check a document** → paste a draft → run it

If the app loads but every panel is empty, it is almost always `CORS_ORIGINS`
not matching the Vercel origin exactly.

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
harmony-web (Vercel)  ──fetch + Bearer token──▶  FastAPI (Render)
                                                   ├── Postgres   accounts, documents, reviews, audit
                                                   ├── Qdrant     the evidence corpus
                                                   └── Mistral    the review pipeline
```

The frontend holds no secrets. `NEXT_PUBLIC_API_URL` is a public URL, and the
session token lives in the browser's localStorage — every real permission check
happens server-side.
