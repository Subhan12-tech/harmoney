# Harmony backend (FastAPI + LangGraph + Qdrant).
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# psycopg2-binary ships wheels, but build-essential keeps a source fallback working.
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Requirements first so the dependency layer caches across code changes.
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

RUN useradd -m -u 10001 harmony && chown -R harmony:harmony /app
USER harmony

ENV APP_ENV=production
EXPOSE 8000

# Hosts inject $PORT. One worker per container: scale with replicas, not workers —
# each worker holds its own Qdrant client and embedding model.
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"]
