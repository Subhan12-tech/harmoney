"""Measure detection accuracy against data/testset, whose answers are known.

    python evals/run_accuracy_probe.py                    # all cases
    python evals/run_accuracy_probe.py 05_new_topic_no_evidence.txt   # one case

Scores each draft two ways: did it find the planted contradictions, and did it
stay silent where it should. The two silence cases matter most - a false finding
is worse than a missed one in a product whose claim is cited accuracy.

Try a change against this before believing it helped. Results were not even
repeatable until temperature was pinned, which made every earlier comparison
noise rather than measurement.

Levers, cheapest first:
    HARMONY_RELEVANCE_FLOOR   withhold weak evidence      default 0.83
    HARMONY_MODEL             a larger model              default mistral-small-2503
    HARMONY_TEMPERATURE       leave at 0                  default 0
"""
import io, json, os, sys, time

sys.path.insert(0, os.getcwd())
import harmony

ORG = "accuracy-probe"

# What each draft SHOULD produce. Keywords are matched against the flagged quote.
CASES = {
    "01_clear_numeric_contradiction.txt": {
        "expect": "issues",
        "keywords": ["double-digit", "1,500", "118%", "low teens"],
        "note": "baseline - obvious contradictions",
    },
    "02_fully_consistent_control.txt": {
        "expect": "none",
        "keywords": [],
        "note": "FALSE POSITIVE TEST - must find nothing",
    },
    "03_subtle_qualifier_drift.txt": {
        "expect": "issues",
        "keywords": ["nearly 10", "holding steady", "broadly unchanged"],
        "note": "subtle - directionally wrong",
    },
    "05_new_topic_no_evidence.txt": {
        "expect": "none",
        "keywords": [],
        "note": "HALLUCINATION GATE - must find nothing",
    },
    "07_guidance_change_unexplained.txt": {
        "expect": "issues",
        "keywords": ["492", "500", "low teens"],
        "note": "guidance integrity",
    },
}

only = sys.argv[1:] or list(CASES)

# Load the corpus once.
harmony.set_org(ORG)
hist_dir = os.path.join("data", "testset", "history")
print("Ingesting corpus...")
total = 0
for f in sorted(os.listdir(hist_dir)):
    text = io.open(os.path.join(hist_dir, f), encoding="utf-8").read()
    total += harmony.add_to_history(text, company="Meridian Systems", doc_type="history", source_file=f)
print(f"  {total} chunks from {len(os.listdir(hist_dir))} documents\n")

rows = []
for name in only:
    if name not in CASES:
        continue
    spec = CASES[name]
    draft = io.open(os.path.join("data", "testset", "drafts", name), encoding="utf-8").read()
    t0 = time.time()
    harmony.set_org(ORG)
    result = harmony.run_review(draft, org_id=ORG)
    secs = time.time() - t0

    issues = result.get("issues", [])
    quotes = " ".join(str(i.get("quote", "")).lower() for i in issues)
    hits = [k for k in spec["keywords"] if k.lower() in quotes]
    missed = [k for k in spec["keywords"] if k.lower() not in quotes]

    if spec["expect"] == "none":
        verdict = "PASS" if len(issues) == 0 else f"FAIL ({len(issues)} false positive)"
    else:
        verdict = f"{len(hits)}/{len(spec['keywords'])} found" + ("" if not missed else f"  MISSED: {missed}")

    rows.append((name, spec["note"], len(issues), verdict, round(secs)))
    print(f"{name}")
    print(f"  {spec['note']}")
    print(f"  issues: {len(issues)}  |  {verdict}  |  {round(secs)}s")
    for i in issues:
        print(f"    [{str(i.get('severity','?')).upper():6}] {str(i.get('quote',''))[:70]}")
    print()

print("=" * 74)
print(f"{'draft':<44} {'found':>6}  verdict")
print("-" * 74)
for name, note, n, verdict, secs in rows:
    print(f"{name:<44} {n:>6}  {verdict}")
