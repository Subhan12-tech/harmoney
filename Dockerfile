# ============================================================================
# Harmony — API + product UI in one image.
# ----------------------------------------------------------------------------
# Stage 1 builds harmony-web to static files. Stage 2 is the Python service,
# which serves those files itself. One deployment, one origin, no CORS.
# ============================================================================

# ---- Stage 1: the UI ----
FROM node:20-slim AS web

WORKDIR /web

# Manifests first so the dependency layer caches across UI code changes.
COPY harmony-web/package.json harmony-web/package-lock.json ./
RUN npm ci

COPY harmony-web/ ./
# next.config.mjs sets output:"export", so this writes plain files to /web/out.
# NEXT_PUBLIC_API_URL is deliberately unset: an empty base means the browser
# calls the same origin it loaded from, which is this service.
RUN npm run build


# ---- Stage 2: the API ----
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# psycopg2-binary ships wheels, but build-essential keeps a source fallback working.
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

# The built UI. app.py mounts this at "/" when it exists, and falls back to the
# single-file dashboard when it does not.
COPY --from=web /web/out ./harmony-web/out

RUN useradd -m -u 10001 harmony && chown -R harmony:harmony /app
USER harmony

ENV APP_ENV=production
EXPOSE 8000

# Hosts inject $PORT. One worker per container: scale with replicas, not workers —
# each worker holds its own Qdrant client and embedding model.
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"]
