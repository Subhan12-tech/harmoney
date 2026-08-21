# Harmony — Deploy Guide (Qdrant + FastAPI)

Web dashboard + API, data Qdrant Cloud (persistent, cloud-ready) mein rehta hai.

## 1. .env bharo
```
MISTRAL_API_KEY=your_key
QDRANT_URL=https://xxxx.cloud.qdrant.io
QDRANT_API_KEY=your_qdrant_key
```
> Zaroori: QDRANT_API_KEY mein `=` ke baad SPACE na ho.
> Collection ("harmony_history") pehli baar chalte hi khud ban jayega (1024-dim, cosine).

## 2. Install
```bash
python -m venv venv
venv\Scripts\activate            # Windows
python -m pip install -r requirements.txt
```

## 3. Run (web app)
```bash
uvicorn app:app --reload
```
Browser: http://127.0.0.1:8000

Dashboard: (1) past statement add karo, (2) related search, (3) draft review,
(4) Approve/Reject. Approve par aligned version banti hai + Qdrant history mein save.

## 4. API endpoints
| Method | Path | Body |
|--------|------|------|
| POST | /api/ingest_text | {"text":"...", "company":"..."} |
| POST | /api/ingest_path | {"path":"data/sample/history"} |
| GET  | /api/search?q=... | - |
| POST | /api/review | {"draft":"..."} -> review_id + report |
| POST | /api/decision | {"review_id":"...", "decision":"approve"} |

## 5. Cloud deploy (baad mein)
Railway/Render: repo push, env vars (MISTRAL_API_KEY, QDRANT_URL, QDRANT_API_KEY) set,
start command: `uvicorn app:app --host 0.0.0.0 --port $PORT`

## Notes
- Dedup: content ka UUID = point ID -> Qdrant upsert -> duplicate nahi.
- Pending reviews transient (memory) — permanent "contradiction log" nahi (legal safety).
- CLI bhi chalti hai: `python harmony.py`
- mistral-embed = 1024 dims. Agar Qdrant "dimension mismatch" error de to VECTOR_SIZE check karo.
