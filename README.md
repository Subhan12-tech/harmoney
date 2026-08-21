# Harmony — Disclosure Consistency Copilot

Multi-agent AI (LangGraph + Mistral + FAISS) jo publish karne se **pehle** kisi draft
ko company ki apni purani statements se **faithfully** compare karta hai aur possible
inconsistencies flag karta hai. **AI suggest karta hai — publish insaan karta hai.**

## Is version ki khaas baatein
- **Persistent history** — history disk par save hoti hai (`db/faiss_index`), run band karne par bhi zinda.
- **Auto-relate** — naya draft aate hi hybrid search (BM25 keyword + semantic) se related past statements khud nikaalta hai.
- **Faithful compare** — grounding rule + **critic node** jo har quote history mein literally verify karta hai (hallucination gate).
- **Approved → history** — jo draft aap approve karte hain, wo wapas history mein add ho jata hai (sirf approve ke baad).

## Flow (2 back-edges)
```
START -> draft_setup -> supervisor
      -> consistency_check -> CRITIC
             - pass -> impact_check -> suggestion -> final_review -> human_review
             - fail -> supervisor        (faithfulness loop)
      human_review: approve -> publish (+ save to history) -> END
                    reject  -> supervisor (retry, max 2)
```

## Setup
```bash
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
python -m pip install -r requirements.txt
```

## API key
`.env` mein apni asli key daalein:
```
MISTRAL_API_KEY=xxxxxxxx
```

## Run
```bash
python harmony.py
```
1. **Step 1** — pehli dafa history add karo: `data/sample/history` (baad mein Enter daba kar skip, kyunke history persist ho chuki hogi).
2. **Step 2** — (optional) related past data dekho.
3. **Step 3** — draft do: `data/sample/drafts/01_clear_inconsistency.txt` (path) ya text paste karo.
4. Report par `yes`/`no`. Approve karne par safe version banega **aur history mein save ho jayega**.
5. `exit` se niklo.

> History reset karni ho to `db/` folder delete kar do.

## Deploy note
Ye LOCAL-PERSISTENT version hai (FAISS + SQLite). Cloud deploy ke liye FAISS -> pgvector
aur SqliteSaver -> PostgresSaver swap hota hai (logic wahi rehta hai).

## Warning
GitHub par push karne se pehle asli company/personnel names anonymize karein. `.env` aur `db/` `.gitignore` mein hain.
