# ============================================================================
# FAITHFULNESS EVAL  —  system hallucinate to nahi kar raha? (grounding proof)
# ----------------------------------------------------------------------------
# DO cheezein:
#   (A) BUILT-IN grounding score  -> koi extra library nahi. Har quote jo report ne
#       diya, wo retrieved history mein LITERALLY mila? (verified / total)
#   (B) OPTIONAL RAGAS            -> agar 'ragas' installed hai to faithfulness +
#       context precision bhi de dega (Mistral ko judge banata hai).
#
# CHALANE KA TARIQA (project root se):
#   python evals/run_faithfulness_eval.py
# ============================================================================

import os
import sys
import json
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

import harmony   # noqa: E402


def load_golden():
    with open(os.path.join(ROOT, "evals", "golden_set.json"), "r", encoding="utf-8") as f:
        return json.load(f)


def read_draft(path):
    with open(os.path.join(ROOT, path), "r", encoding="utf-8") as f:
        return f.read()


def builtin_grounding(report_text: str, context: str) -> tuple:
    # report ke double-quoted evidence ko context mein literally dhoondo
    quotes = re.findall(r'"([^"]{10,})"', report_text)
    norm_ctx = " ".join(context.lower().split())
    verified = 0
    for q in quotes:
        nq = " ".join(q.lower().split())
        if nq[:40] in norm_ctx:
            verified += 1
    total = len(quotes)
    score = (verified / total) if total else 1.0   # koi quote nahi to grounding masla nahi
    return verified, total, score


def run_builtin(golden, results):
    print("\n========= (A) BUILT-IN GROUNDING SCORE =========\n")
    all_scores = []
    for case, result in zip(golden["cases"], results):
        verified, total, score = builtin_grounding(result["consistency_text"], result["context"])
        all_scores.append(score)
        print(f"{os.path.basename(case['file'])}")
        print(f"    quotes: {total}  |  verified in history: {verified}  |  grounding: {round(score,2)}")
    avg = round(sum(all_scores) / len(all_scores), 2) if all_scores else 0.0
    print(f"\n>>> Average grounding score: {avg}  (1.0 = har claim history se grounded)")
    return avg


def run_ragas(golden, results):
    print("\n========= (B) RAGAS (optional) =========\n")
    try:
        from datasets import Dataset
        from ragas import evaluate
        from ragas.metrics import faithfulness, context_precision
        from ragas.llms import LangchainLLMWrapper
        from ragas.embeddings import LangchainEmbeddingsWrapper
    except Exception as e:
        print("RAGAS not installed / not available -> skipping. (pip install ragas datasets)")
        print("Reason:", e)
        return

    try:
        judge_llm = LangchainLLMWrapper(harmony.model)
        judge_emb = LangchainEmbeddingsWrapper(harmony.embeddings)

        data = {
            "question": [],
            "answer": [],
            "contexts": [],
            "ground_truth": [],
        }
        for case, result in zip(golden["cases"], results):
            data["question"].append("What are the possible inconsistencies between this draft and the company's past statements?")
            data["answer"].append(result["consistency_text"])
            data["contexts"].append([result["context"]])
            data["ground_truth"].append(case["expected_verdict"])

        ds = Dataset.from_dict(data)
        report = evaluate(
            ds,
            metrics=[faithfulness, context_precision],
            llm=judge_llm,
            embeddings=judge_emb,
        )
        print(report)
    except Exception as e:
        print("RAGAS run failed (version issue?) -> use the built-in score above.")
        print("Reason:", e)


def main():
    golden = load_golden()

    n = harmony.load_store()
    if n == 0:
        print("No history in DB. Ingesting sample history...")
        harmony.ingestion_agent({"messages": [{"role": "user", "content": golden["history_path"]}]})
    else:
        print(f"Loaded {n} history chunks from DB.")

    # har draft ek dafa chalao (dono evals isi result par kaam karenge)
    results = []
    for case in golden["cases"]:
        draft = read_draft(case["file"])
        results.append(harmony.run_review(draft))

    run_builtin(golden, results)
    run_ragas(golden, results)


if __name__ == "__main__":
    main()
