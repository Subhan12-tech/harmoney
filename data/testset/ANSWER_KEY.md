# Harmony test set — answer key

A fictional company, **Meridian Systems Inc.**, across eight disclosure documents
spanning Feb–Oct 2026. Facts interlock deliberately: some drafts can only be
caught by connecting two separate sources.

Upload everything in `history/` as **evidence**, then submit each file in
`drafts/` for review.

---

## The ground truth

| Fact | Value | Stated in |
|---|---|---|
| FY2025 revenue | $412.0M | 07 |
| Q1 FY2026 revenue | $118.4M, **+9%** | 01 |
| Q2 FY2026 revenue | $124.7M, **+7%** | 02 |
| Q3 FY2026 revenue | $131.2M, **+8%** | 03 |
| FY2026 guidance | high single-digit, **$478–486M**, reaffirmed 3× | 01, 02, 03 |
| Enterprise customers | 1,180 → 1,240 → **1,310** | 01, 02, 03 |
| Customers >$1M ARR | 78 → **84** | 02, 03 |
| Net revenue retention | 121% → 116% → 114% → 112% → **109%** (declining) | 07, 01, 02, 03 |
| Gross margin | 71.5% → 71.2% → **70.8%** | 01, 02, 03 |
| Operating margin | −1.2% → negative H1 → **+4.1% (first positive, Q3 only)** | 01, 05, 03 |
| Headcount | 2,940 → 2,890 → **2,850** (declining) | 01, 02, 03 |
| Largest customer | 5.4% → 5.1% → 5.0% → **4.8%** | 07, 01, 05, 03 |
| Pricing | **consumption-based** since FY2025 (moved off per-seat) | 05 |
| Regions | Virginia, Oregon, Frankfurt. **No APAC** — under evaluation | 04, 05, 06, 08 |
| Meridian Vault GA | **Q1 FY2027**, unchanged since FY2025 reset | 01, 06, 08 |
| Vault key handling | **client-side only**, no managed-key option | 06, 08 |
| Certifications | **SOC 2 Type II yes** (Mar 2026); **ISO 27001 NO** | 04, 07 |
| R&D | 22% of revenue | 03 |
| Gross logo churn | 6.2% annualised | 02 |

---

## Expected findings per draft

### 01 — Clear numeric contradiction · **should flag 3**
| Claim | Reality | Severity |
|---|---|---|
| "double-digit year-over-year growth" | 8% | High |
| "more than 1,500 enterprise customers" | 1,310 | High |
| "retention improved to 118%" | 109%, and **declining** | High |
| "full-year growth in the low teens" | guidance is high single-digit | High |

The easiest case. If Harmony misses any of these, something is broken.

### 02 — Fully consistent control · **should flag 0**
Every number matches the Q3 call exactly. **This is the false-positive test.**
Any finding here is a false positive and counts against the system.

### 03 — Subtle qualifier drift · **should flag 2–3**
| Claim | Reality |
|---|---|
| "grew nearly 10%" | 8% — rounding *up* across a threshold |
| "retention … holding steady across recent quarters" | 114 → 112 → 109, explicitly called a deceleration |
| "headcount … broadly unchanged over the past year" | 2,940 → 2,850, a disclosed reduction |

Harder: each sentence is *directionally* wrong rather than numerically false.
The retention one is the real test — the company explicitly used the word
"moderated" twice.

### 04 — Multiple issues, mixed severity · **should flag 2, leave 2 alone**
| Claim | Verdict |
|---|---|
| "largest customer … under 3%" | **Flag** — 4.8% (High) |
| "SOC 2 Type II and ISO 27001" | **Flag** — ISO 27001 explicitly not held (High) |
| "Headcount **grew** to 2,850" | **Flag** — it fell from 2,890 (Medium) |
| "revenue $131.2M, up 8%" | correct — must not flag |
| "R&D 22% of revenue" | correct — must not flag |

Tests severity discrimination and precision in the same document.

### 05 — New topic, no evidence · **should flag 0**
Nothing about Calder Analytics appears anywhere in the corpus. The grounding
rule says: no evidence, no finding. **If Harmony invents a citation here, the
anti-hallucination gate has failed** — that is the most serious possible result
in this set.

### 06 — Timeline slip, unacknowledged · **should flag 2**
| Claim | Reality |
|---|---|
| "Vault GA in Q4 FY2026, ahead of schedule" | Q1 FY2027, stated three times; the memo explicitly forbids signalling a pull-in |
| "managed-key option … Meridian handles key custody" | client-side encryption is a design constraint, not configurable |

Requires the internal memo (08) or analyst day (06), not the earnings calls.

### 07 — Guidance change, unexplained · **should flag 2**
| Claim | Reality |
|---|---|
| "$492M to $500M" | $478–486M, reaffirmed three times |
| "growth in the low teens" | high single-digit |

The "same disciplined execution we have described all year" framing is the
aggravating factor — a guidance raise presented as continuity.

### 08 — Cherry-picked but true · **hard; 1 finding, low–medium**
Every number is accurate. The problem is the *characterisation*: 109% is
described as "consistency" and "durability" when the company reported three
consecutive declines and guided to no recovery.

A strict grounding rule may correctly decline to flag this, since no statement
is literally false. **Either outcome is defensible** — this draft exists to show
you where the system's boundary sits. Note what it does.

### 09 — Cross-document contradiction · **should flag 2**
| Claim | Reality | Source needed |
|---|---|---|
| "Singapore region available today" | no APAC region exists | 04, 05, 06, **08** |
| "licensed on a per-seat basis" | consumption-based since FY2025 | **05** |

Neither is in the earnings calls. Tests whether retrieval reaches beyond the
obvious financial documents.

### 10 — Terminology substitution · **should flag 1–2**
| Claim | Reality |
|---|---|
| "Customer expansion rate: 109%" | renamed metric — same number, different label than "net revenue retention" |
| "operating-margin positive **throughout FY2026**" | positive in Q3 only; negative in Q1 and H1 |

The renamed metric may legitimately pass. The "throughout FY2026" claim must be
flagged — it contradicts 01, 05 and 03.

---

## Scorecard

| Draft | Expect | Type |
|---|---|---|
| 01 | 3–4 findings | Baseline detection |
| 02 | **0** | False-positive test |
| 03 | 2–3 | Subtle drift |
| 04 | 3 flagged, 2 untouched | Precision + severity |
| 05 | **0** | Hallucination gate |
| 06 | 2 | Non-financial retrieval |
| 07 | 2 | Guidance integrity |
| 08 | 0–1 | Boundary case |
| 09 | 2 | Cross-document retrieval |
| 10 | 1–2 | Terminology drift |

**The two that matter most are 02 and 05.** Findings on either mean the system
is inventing problems or inventing evidence — both worse than a missed catch in
a product whose entire claim is evidence-cited accuracy.

Every quoted evidence sentence should appear **verbatim** in a history file.
Spot-check a few: if a quote is paraphrased rather than copied, the critic node
is not doing its job.
