# ============================================================================
# DETECTION EVAL  —  system apna asli kaam theek karta hai? (accuracy scorecard)
# ----------------------------------------------------------------------------
# KYA: har golden draft chalata hai (bina human-input ke) aur check karta hai:
#      - inconsistent drafts par system ne issue pakda? (rating kam + expected words)
#      - consistent drafts par FALSE ALARM to nahi? (false positive)
# KYUN: deploy se pehle number-based proof chahiye ke detection sahi hai.
#
# CHALANE KA TARIQA (project root se):
#   python evals/run_detection_eval.py
# ============================================================================

import os
import sys
import json

# harmony.py (parent folder) ko import karne ke liye path add karo
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

import harmony   # noqa: E402

# rating is se neeche = "inconsistent" (issue mila), is se upar = "consistent"
RATING_THRESHOLD = 7.0


def load_golden():
    with open(os.path.join(ROOT, "evals", "golden_set.json"), "r", encoding="utf-8") as f:
        return json.load(f)


def read_draft(path):
    with open(os.path.join(ROOT, path), "r", encoding="utf-8") as f:
        return f.read()


def main():
    golden = load_golden()

    # STEP 1: history load karo (agar DB khali hai to sample history ingest karo)
    n = harmony.load_store()
    if n == 0:
        print("No history in DB. Ingesting sample history...")
        harmony.ingestion_agent({"messages": [{"role": "user", "content": golden["history_path"]}]})
    else:
        print(f"Loaded {n} history chunks from DB.")

    print("\n================= DETECTION EVAL =================\n")

    total = 0
    correct_verdict = 0
    keyword_hits = 0
    keyword_total = 0
    false_positives = 0

    for case in golden["cases"]:
        draft = read_draft(case["file"])
        result = harmony.run_review(draft)

        rating = result["consistency_rating"]
        text_lower = result["consistency_text"].lower()

        # predicted verdict: rating threshold se
        predicted = "inconsistent" if rating < RATING_THRESHOLD else "consistent"
        expected = case["expected_verdict"]

        verdict_ok = (predicted == expected)
        if verdict_ok:
            correct_verdict += 1

        # expected keywords kitne mile (sirf inconsistent cases ke liye)
        found = []
        for kw in case["expected_keywords"]:
            keyword_total += 1
            if kw.lower() in text_lower:
                keyword_hits += 1
                found.append(kw)

        # false positive: consistent hona chahiye tha lekin system ne inconsistent kaha
        fp = (expected == "consistent" and predicted == "inconsistent")
        if fp:
            false_positives += 1

        total += 1

        status = "PASS" if verdict_ok and not fp else "FAIL"
        print(f"[{status}] {os.path.basename(case['file'])}")
        print(f"    expected : {expected}   |   predicted : {predicted}   |   rating : {rating}/10")
        if case["expected_keywords"]:
            print(f"    keywords found : {found}  (out of {case['expected_keywords']})")
        if fp:
            print("    >>> FALSE ALARM (flagged a consistent draft)")
        print()

    # ---- summary scorecard ----
    print("================= SCORECARD =================")
    print(f"Verdict accuracy    : {correct_verdict}/{total}  ({round(100*correct_verdict/total)}%)")
    if keyword_total:
        print(f"Issue keyword recall: {keyword_hits}/{keyword_total}  ({round(100*keyword_hits/keyword_total)}%)")
    print(f"False positives     : {false_positives}")
    print("============================================")


if __name__ == "__main__":
    main()
