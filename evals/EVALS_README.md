# Harmony — Evaluation (deploy se pehle proof)

Do tarah ki eval, dono ka maqsad alag:

| Script | Kya measure karta hai | Kyun |
|--------|-----------------------|------|
| `run_detection_eval.py` | System ne sahi issues pakde? consistent ko consistent kaha? | Accuracy ka number-based proof |
| `run_faithfulness_eval.py` | Report evidence par based hai? (hallucinate to nahi?) | Grounding / anti-hallucination proof |

## Chalane se pehle
1. `.env` mein Mistral key honi chahiye (eval Mistral API calls karta hai — net zaroori).
2. Ek dafa history DB mein honi chahiye. Agar nahi hai to eval khud `data/sample/history` ingest kar lega.

## Detection eval
```bash
python evals/run_detection_eval.py
```
Output mein har draft par PASS/FAIL + ek SCORECARD:
- **Verdict accuracy** — kitne drafts ka consistent/inconsistent faisla sahi tha
- **Issue keyword recall** — expected issues (jaise "double-digit", "600") kitne pakde
- **False positives** — consistent draft ko galti se inconsistent to nahi kaha

Achha result: verdict accuracy 5/5, keyword recall high, false positives 0.

## Faithfulness eval
```bash
python evals/run_faithfulness_eval.py
```
- **(A) Built-in grounding score** — koi extra library nahi. Report ke har quote ko history
  mein literally dhoondta hai. 1.0 = har claim grounded. Ye hamesha chalega.
- **(B) RAGAS (optional)** — agar `ragas` + `datasets` installed hain to faithfulness +
  context precision bhi deta hai (Mistral judge). Install:
  ```bash
  python -m pip install ragas datasets
  ```
  Agar RAGAS version issue kare to woh skip ho jayega — built-in score phir bhi milega.

## Golden set
`golden_set.json` mein 5 drafts + expected verdict + expected keywords hain. Naye
test cases add karne ho to isi file mein daal dein.

## Note
Eval real Mistral calls karta hai (paisa/rate-limit lagta hai). Chhota golden set is
liye rakha hai. Threshold `RATING_THRESHOLD` (detection script mein) zaroorat ho to badlein.
