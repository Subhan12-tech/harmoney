"""Score the 100-case benchmark in data/benchmark/cases.json.

    python evals/build_benchmark.py            # build the cases (once)
    python evals/run_benchmark.py              # run all 100
    python evals/run_benchmark.py --n 20       # a sample
    python evals/run_benchmark.py --domain legal
    python evals/run_benchmark.py --resume     # continue after a rate limit

Each case is ingested into its own org id, so one case's corpus can never be
retrieved by another - the same isolation the product relies on, used here to
keep the measurement honest.

Results append to data/benchmark/results.json as they complete. A run of 100
takes roughly 45 minutes of model calls and WILL hit the free Mistral tier's
rate limit; --resume picks up where it stopped rather than starting over.

Two numbers matter more than the headline:
  FALSE POSITIVE RATE on the 32 cases that must produce nothing. A product whose
  claim is cited accuracy is damaged more by inventing a finding than by missing
  one.
  RECALL on the rest - of the planted contradictions, how many were caught.
"""
import argparse, io, json, os, sys, time
from collections import Counter, defaultdict

sys.path.insert(0, os.getcwd())
import harmony

CASES = os.path.join("data", "benchmark", "cases.json")
RESULTS = os.path.join("data", "benchmark", "results.json")


def load(path, default):
    if os.path.exists(path):
        return json.load(io.open(path, encoding="utf-8"))
    return default


def score(case, issues):
    """Did it do the right thing on this case?"""
    quotes = " ".join(str(i.get("quote", "")).lower() for i in issues)
    if case["expect"] == "none":
        return {"ok": len(issues) == 0, "false_positives": len(issues), "caught": 0,
                "planted": 0}
    caught = sum(1 for f in case["must_flag"] if f.lower() in quotes)
    return {"ok": caught == len(case["must_flag"]), "false_positives": 0,
            "caught": caught, "planted": len(case["must_flag"])}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, help="run only the first N matching cases")
    ap.add_argument("--domain", help="restrict to one domain")
    ap.add_argument("--kind", help="restrict to one case kind")
    ap.add_argument("--resume", action="store_true", help="skip cases already in results.json")
    args = ap.parse_args()

    cases = load(CASES, None)
    if cases is None:
        sys.exit("No cases. Run: python evals/build_benchmark.py")

    done = {r["id"]: r for r in load(RESULTS, [])} if args.resume else {}

    todo = [c for c in cases
            if (not args.domain or c["domain"] == args.domain)
            and (not args.kind or c["kind"] == args.kind)
            and c["id"] not in done]
    if args.n:
        todo = todo[: args.n]

    print(f"{len(todo)} case(s) to run" + (f", {len(done)} already done" if done else ""))
    print(f"Roughly {len(todo) * 25 // 60} minutes of model calls.\n")

    results = list(done.values())
    for n, case in enumerate(todo, 1):
        org = f"bench-{case['id']}"
        harmony.set_org(org)
        for h in case["history"]:
            harmony.add_to_history(h, company=case["domain"], doc_type="history")

        t0 = time.time()
        try:
            out = harmony.run_review(case["draft"], org_id=org)
        except Exception as e:
            # A rate limit here is expected on the free tier; keep what is done.
            print(f"\n[{case['id']}] STOPPED: {type(e).__name__}: {str(e)[:120]}")
            print("Progress saved. Re-run with --resume when quota returns.")
            break

        issues = out.get("issues", [])
        s = score(case, issues)
        results.append({**{k: case[k] for k in ("id", "domain", "kind", "expect")},
                        "found": len(issues), **s, "seconds": round(time.time() - t0)})
        io.open(RESULTS, "w", encoding="utf-8").write(json.dumps(results, indent=1))

        mark = "ok " if s["ok"] else "BAD"
        detail = (f"{s['false_positives']} false positive(s)" if case["expect"] == "none"
                  else f"{s['caught']}/{s['planted']} caught")
        print(f"[{n}/{len(todo)}] {case['id']} {case['domain']:<14} {case['kind']:<22} {mark} {detail}")

    report(results)


def report(results):
    if not results:
        return
    silent = [r for r in results if r["expect"] == "none"]
    active = [r for r in results if r["expect"] == "issues"]

    print("\n" + "=" * 68)
    print(f"SCORED {len(results)} case(s)")
    print("=" * 68)

    if silent:
        clean = sum(1 for r in silent if r["false_positives"] == 0)
        print(f"\nMUST FIND NOTHING          {len(silent)} cases")
        print(f"  clean                    {clean}/{len(silent)}  ({100*clean//len(silent)}%)")
        print(f"  false positives raised   {sum(r['false_positives'] for r in silent)}")

    if active:
        planted = sum(r["planted"] for r in active)
        caught = sum(r["caught"] for r in active)
        full = sum(1 for r in active if r["ok"])
        print(f"\nMUST FIND SOMETHING        {len(active)} cases")
        print(f"  planted contradictions   {planted}")
        print(f"  caught                   {caught}  ({100*caught//max(1,planted)}% recall)")
        print(f"  fully correct cases      {full}/{len(active)}")

    by = defaultdict(lambda: [0, 0])
    for r in results:
        by[r["kind"]][0] += 1 if r["ok"] else 0
        by[r["kind"]][1] += 1
    print("\nBY CASE KIND")
    for kind, (ok, tot) in sorted(by.items(), key=lambda x: -x[1][1]):
        print(f"  {kind:<24} {ok}/{tot}")

    byd = defaultdict(lambda: [0, 0])
    for r in results:
        byd[r["domain"]][0] += 1 if r["ok"] else 0
        byd[r["domain"]][1] += 1
    print("\nBY DOMAIN")
    for dom, (ok, tot) in sorted(byd.items()):
        print(f"  {dom:<24} {ok}/{tot}")

    avg = sum(r["seconds"] for r in results) / len(results)
    print(f"\nmean {avg:.0f}s per review")


if __name__ == "__main__":
    main()
