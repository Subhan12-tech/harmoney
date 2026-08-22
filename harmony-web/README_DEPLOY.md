# harmony-web

The product UI. It is **not deployed separately** — it is built into the API
image and served from the same origin.

## How it ships

`next.config.mjs` sets `output: "export"`, so `npm run build` produces plain
files in `out/`. The Dockerfile at the repo root builds that in a Node stage,
copies `out/` into the Python image, and `app.py` mounts it at `/`.

```
Dockerfile stage 1 (node:20)   npm ci && npm run build  ->  /web/out
Dockerfile stage 2 (python)    COPY --from=web /web/out ->  harmony-web/out
app.py                         mount("/", StaticFiles(harmony-web/out))
```

One service. One origin. **No CORS**, which removes the most common way a split
deployment breaks.

Deploying is just deploying the API: push, then Render rebuilds. There is no
separate frontend service, no `NEXT_PUBLIC_API_URL` to set in production, and no
`CORS_ORIGINS` to keep in sync.

## Local development

Two servers, because `next dev` gives you hot reload and the export does not.

```bash
# terminal 1 - API on :8000
uvicorn app:app --reload

# terminal 2 - UI on :3000 with hot reload
cd harmony-web && npm run dev
```

`.env.development` (committed) points the dev server at `http://127.0.0.1:8000`.
Production leaves `NEXT_PUBLIC_API_URL` unset, and an empty base means
same-origin requests.

Set `HARMONY_SIGNUP_MODE=open` on the API locally, or every account you create
is stuck pending until you approve it.

## Checking the production build locally

To see exactly what Render will serve:

```bash
cd harmony-web && npm run build      # writes out/
cd .. && uvicorn app:app             # serves it at http://127.0.0.1:8000
```

If `harmony-web/out` is missing, `app.py` says so on startup and falls back to
the built-in single-file dashboard, so the service always has an interface.

## Routing note

`/app/review` takes the document id as `?id=`, not as a path segment. A dynamic
path segment forces a Node server; a query string exports statically. The page
was already a client component, so nothing else changed.

`trailingSlash: true` makes every route its own directory with an `index.html`,
which is what lets deep links resolve with no rewrite rules.

## What talks to what

```
browser ──▶ harmony-api (Render)
              ├── harmony-web/out   the UI, same origin
              ├── Postgres          accounts, documents, reviews, audit
              ├── Qdrant            the evidence corpus
              └── Mistral           the review pipeline
```

The UI holds no secrets. The session token lives in the browser's localStorage
and every real permission check happens server-side.
