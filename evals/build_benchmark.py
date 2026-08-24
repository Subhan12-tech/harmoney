"""Generate a 100-case benchmark across domains, with known ground truth.

Each case is a small corpus of prior statements plus one draft. The draft either
contradicts the corpus in a specific, recorded way, or is consistent with it and
must produce nothing.

Cases are built from templates rather than written by hand, because ground truth
has to be certain: a hand-written case can be argued with, a generated one knows
exactly what it planted. Templates vary the domain, the fact type, the wording
and the difficulty, so the coverage is real even though the construction is
systematic.
"""
import io, json, os, random

random.seed(20260824)   # reproducible: the same benchmark every run

OUT = os.path.join("data", "benchmark")
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------------------
# Domains. Each carries its own vocabulary so the corpus reads like that field
# rather than like finance with the nouns swapped.
# ---------------------------------------------------------------------------
DOMAINS = {
    "finance": {
        "org": ["Northgate Capital", "Ashwell Holdings", "Brightmoor Financial", "Cardon Group"],
        "doc": ["earnings call transcript", "investor letter", "quarterly results release"],
        "metrics": [
            ("revenue", "${v} million", [212.4, 188.9, 341.0, 96.5]),
            ("net interest margin", "{v}%", [3.4, 2.9, 4.1]),
            ("assets under management", "${v} billion", [14.2, 8.7, 22.9]),
            ("cost-to-income ratio", "{v}%", [58.0, 62.5, 49.3]),
        ],
        "qual": [("growth", "mid-single-digit", "double-digit"),
                 ("outlook", "cautious", "confident"),
                 ("margin trend", "compressing", "expanding")],
    },
    "legal": {
        "org": ["Harrow & Vance LLP", "Deloit Mercer", "Stanton Reed"],
        "doc": ["litigation status disclosure", "regulatory filing note", "counsel briefing"],
        "metrics": [
            ("open matters", "{v} matters", [23, 7, 41]),
            ("provision recognised", "${v} million", [4.2, 11.8, 0.9]),
            ("settlement amount", "${v} million", [6.5, 18.0, 2.3]),
        ],
        "qual": [("case outlook", "unresolved", "resolved"),
                 ("regulatory position", "under review", "cleared"),
                 ("exposure", "material", "immaterial")],
    },
    "healthcare": {
        "org": ["Calderon Health", "Sable Clinical", "Riverbend Medical Group"],
        "doc": ["clinical update", "trial results summary", "regulatory submission note"],
        "metrics": [
            ("enrolled patients", "{v} patients", [1240, 380, 2610]),
            ("primary endpoint response", "{v}%", [61.0, 44.5, 78.2]),
            ("serious adverse events", "{v} events", [12, 3, 27]),
        ],
        "qual": [("trial status", "ongoing", "completed"),
                 ("approval position", "not yet submitted", "approved"),
                 ("safety profile", "under evaluation", "established")],
    },
    "energy": {
        "org": ["Kestrel Energy", "Panhandle Resources", "Tallow Grid"],
        "doc": ["operations update", "sustainability report", "production disclosure"],
        "metrics": [
            ("daily production", "{v} barrels per day", [48000, 12500, 96000]),
            ("emissions intensity", "{v} kg CO2e per barrel", [18.4, 25.1, 11.9]),
            ("proven reserves", "{v} million barrels", [340.0, 118.5, 720.0]),
        ],
        "qual": [("transition plan", "in development", "operational"),
                 ("field status", "appraisal stage", "producing"),
                 ("target", "aspirational", "committed")],
    },
    "manufacturing": {
        "org": ["Ferrous Dynamics", "Halden Industrial", "Cortez Manufacturing"],
        "doc": ["operations briefing", "supply chain update", "annual production note"],
        "metrics": [
            ("units shipped", "{v} units", [412000, 87500, 1250000]),
            ("plant utilisation", "{v}%", [78.0, 91.5, 64.2]),
            ("defect rate", "{v}%", [0.8, 2.1, 0.3]),
        ],
        "qual": [("capacity", "constrained", "unconstrained"),
                 ("supplier position", "single-sourced", "dual-sourced"),
                 ("expansion", "under evaluation", "approved")],
    },
    "technology": {
        "org": ["Verdant Systems", "Lumen Data", "Orbis Compute"],
        "doc": ["product update", "investor briefing", "platform status note"],
        "metrics": [
            ("monthly active users", "{v} million", [4.2, 18.6, 0.9]),
            ("gross retention", "{v}%", [92.0, 87.5, 96.1]),
            ("uptime", "{v}%", [99.9, 99.5, 99.99]),
        ],
        "qual": [("release status", "in beta", "generally available"),
                 ("certification", "not held", "held"),
                 ("region", "not operated", "operated")],
    },
    "insurance": {
        "org": ["Marchwood Mutual", "Bellhaven Assurance", "Trellis Re"],
        "doc": ["underwriting update", "reserve disclosure", "policyholder report"],
        "metrics": [
            ("combined ratio", "{v}%", [97.5, 103.2, 91.8]),
            ("gross written premium", "${v} million", [640.0, 215.5, 1180.0]),
            ("reserve release", "${v} million", [22.0, 5.5, 48.3]),
        ],
        "qual": [("reserve position", "strengthening", "releasing"),
                 ("catastrophe exposure", "elevated", "normalised"),
                 ("rate environment", "softening", "hardening")],
    },
}

# ---------------------------------------------------------------------------
# Case kinds. The mix matters more than the count: roughly a third produce
# nothing, because a false finding is the failure that matters most here.
# ---------------------------------------------------------------------------
KINDS = (
    ["numeric_contradiction"] * 22
    + ["qualifier_flip"] * 14
    + ["consistent"] * 20          # must find NOTHING
    + ["absent_topic"] * 12        # must find NOTHING
    + ["magnitude_drift"] * 12
    + ["capability_claim"] * 10
    + ["timeline_slip"] * 10
)

# Shuffled, deterministically. Laid out in blocks, the first 27 cases were all
# "must find something" - so a partial run (and rate limits make partial runs
# the norm) measured only half the question.
random.Random(7).shuffle(KINDS)


def fmt(template: str, v) -> str:
    return template.format(v=v)


def build_case(i: int) -> dict:
    dom_name = list(DOMAINS)[i % len(DOMAINS)]
    dom = DOMAINS[dom_name]
    kind = KINDS[i % len(KINDS)]
    rnd = random.Random(1000 + i)

    org = rnd.choice(dom["org"])
    doc_kind = rnd.choice(dom["doc"])
    metric, tmpl, values = rnd.choice(dom["metrics"])
    true_v = rnd.choice(values)
    qual_name, qual_before, qual_after = rnd.choice(dom["qual"])
    year = rnd.choice([2025, 2026])
    period = rnd.choice(["first quarter", "second quarter", "third quarter", "full year"])

    # The corpus: two prior documents stating the facts plainly.
    hist = [
        f"{org.upper()} - {doc_kind.upper()} ({period} {year}) (fictional sample)\n\n"
        f"{org} reported {metric} of {fmt(tmpl, true_v)} for the {period} of {year}.\n"
        f"Management described the {qual_name} as {qual_before}.\n"
        f"No change to previously stated guidance was announced.",

        f"{org.upper()} - INVESTOR FAQ ({year}) (fictional sample)\n\n"
        f"Q: What was {metric} in the {period}?\n"
        f"A: {fmt(tmpl, true_v)}.\n\n"
        f"Q: How would you characterise the {qual_name}?\n"
        f"A: It remains {qual_before}. We have not revised that position.",
    ]

    expect_none = kind in ("consistent", "absent_topic")
    findings: list[str] = []

    if kind == "numeric_contradiction":
        wrong = round(true_v * rnd.choice([1.6, 2.1, 0.45]), 1)
        draft = (f"DRAFT {doc_kind.upper()}\n\n"
                 f"{org} today reported {metric} of {fmt(tmpl, wrong)} for the {period} of {year}, "
                 f"and reaffirmed its outlook.")
        findings = [fmt(tmpl, wrong)]

    elif kind == "magnitude_drift":
        # Small enough to look like rounding, large enough to be wrong.
        drifted = round(true_v * 1.12, 1)
        draft = (f"DRAFT {doc_kind.upper()}\n\n"
                 f"{org} recorded {metric} of approximately {fmt(tmpl, drifted)} in the {period}, "
                 f"broadly in line with prior disclosure.")
        findings = [fmt(tmpl, drifted)]

    elif kind == "qualifier_flip":
        draft = (f"DRAFT {doc_kind.upper()}\n\n"
                 f"{org} confirmed {metric} of {fmt(tmpl, true_v)} for the {period}. "
                 f"The {qual_name} is now {qual_after}, consistent with what we have said throughout.")
        findings = [qual_after]

    elif kind == "capability_claim":
        draft = (f"DRAFT {doc_kind.upper()}\n\n"
                 f"{org} reported {metric} of {fmt(tmpl, true_v)} for the {period}. "
                 f"The {qual_name} is {qual_after} and has been for some time.")
        findings = [qual_after]

    elif kind == "timeline_slip":
        draft = (f"DRAFT {doc_kind.upper()}\n\n"
                 f"{org} reported {metric} of {fmt(tmpl, true_v)}. "
                 f"Guidance has been revised upward from the previously stated level, "
                 f"reflecting the same approach described all year.")
        findings = ["revised upward"]

    elif kind == "consistent":
        draft = (f"DRAFT {doc_kind.upper()}\n\n"
                 f"{org} reported {metric} of {fmt(tmpl, true_v)} for the {period} of {year}. "
                 f"The {qual_name} remains {qual_before}, unchanged from prior disclosure.")

    else:  # absent_topic - nothing in the corpus touches this
        draft = (f"DRAFT ANNOUNCEMENT\n\n"
                 f"{org} today announced a partnership with Winsley Advisory to develop a joint "
                 f"training programme for graduate recruits. The programme begins next year. "
                 f"Financial terms were not disclosed.")

    return {
        "id": f"{i + 1:03d}",
        "domain": dom_name,
        "kind": kind,
        "expect": "none" if expect_none else "issues",
        "must_flag": findings,
        "history": hist,
        "draft": draft,
    }


cases = [build_case(i) for i in range(100)]
io.open(os.path.join(OUT, "cases.json"), "w", encoding="utf-8").write(
    json.dumps(cases, indent=1))

from collections import Counter
print(f"{len(cases)} cases -> {OUT}/cases.json")
print("\nby domain: ", dict(Counter(c["domain"] for c in cases)))
print("by kind:   ", dict(Counter(c["kind"] for c in cases)))
print("expect none:", sum(1 for c in cases if c["expect"] == "none"),
      "| expect issues:", sum(1 for c in cases if c["expect"] == "issues"))
