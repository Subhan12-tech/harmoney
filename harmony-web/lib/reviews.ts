/**
 * Per-document review detail.
 *
 * Every document in the library opens into a real review workspace with its
 * own draft body, its own findings, and its own position in the workflow —
 * the table is not six links to one screen. `q3-fy2026-earnings` carries the
 * three seeded issues verbatim; the rest are written against the same schema.
 */

import { REVIEW_DRAFT, REVIEW_ISSUES, REVIEW_META, getDocument, type HarmonyDocument, type Issue } from "./data";

/** A paragraph split around the phrase an issue is anchored to. */
export interface DraftSegment {
  before: string;
  issueId: string | null;
  after: string;
}

export interface ReviewDetail {
  version: string;
  submittedBy: string;
  analysisCompleted: string;
  aiConfidence: number;
  /** Index into `WORKFLOW_STAGES`. */
  stageIndex: number;
  /** False while a draft is still waiting to be sent for AI analysis. */
  analysed: boolean;
  draft: DraftSegment[];
  issues: Issue[];
}

const DETAILS: Record<string, ReviewDetail> = {
  "q3-fy2026-earnings": {
    version: "Draft v4",
    submittedBy: REVIEW_META.submittedBy,
    analysisCompleted: REVIEW_META.analysisCompleted,
    aiConfidence: REVIEW_META.aiConfidence,
    stageIndex: 2,
    analysed: true,
    draft: REVIEW_DRAFT,
    issues: REVIEW_ISSUES,
  },

  "investor-letter-august": {
    version: "Draft v2",
    submittedBy: "Marcus Webb",
    analysisCompleted: "1 hour ago",
    aiConfidence: 84,
    stageIndex: 3,
    analysed: true,
    draft: [
      {
        before:
          "To our shareholders: the third quarter brought steady progress against the operating plan we set out in January. ",
        issueId: "margin",
        after:
          ", driven by improved gross margin and slower headcount growth across our go-to-market organisation.",
      },
      {
        before:
          "Retention remains the clearest signal of the value customers place on the platform, and we continue to see ",
        issueId: "retention",
        after: " across our enterprise cohort.",
      },
      {
        before:
          "We are investing behind the areas that compound — evidence quality, reviewer tooling, and the integrations that put approvals where our customers already work.",
        issueId: null,
        after: "",
      },
    ],
    issues: [
      {
        id: "margin",
        severity: "Medium",
        phrase: "operating margin expanded by approximately 400 basis points",
        reason:
          "The margin expansion stated here is materially wider than the figure given on the most recent earnings call, and no reconciliation is offered.",
        evidenceDoc: "Q2 2026 Earnings Call",
        evidenceDate: "Apr 28, 2026",
        evidenceSource: "Transcript, p. 7",
        evidenceQuote: "Operating margin expanded roughly 250 basis points year over year.",
        confidence: 84,
        suggestion:
          "Restate the figure to match the reported 250 bps, or reconcile the two explicitly if this letter measures a different period.",
        suggestedRewrite: "operating margin expanded by approximately 250 basis points",
      },
      {
        id: "retention",
        severity: "Low",
        phrase: "best-in-class net revenue retention",
        reason:
          "A comparative superlative is used without a cited benchmark, which the disclosure language policy does not permit.",
        evidenceDoc: "Disclosure Language Policy",
        evidenceDate: "Jan 12, 2026",
        evidenceSource: "Section 3, Comparative Claims",
        evidenceQuote: "Superlative comparative claims require a cited third-party benchmark in the same document.",
        confidence: 58,
        suggestion:
          "Replace with the actual retention figure, or cite the benchmark study the comparison is drawn from.",
        suggestedRewrite: "net revenue retention of 118%",
      },
    ],
  },

  "fy25-10k-filing": {
    version: "Final",
    submittedBy: "Elena Torres",
    analysisCompleted: "3 hours ago",
    aiConfidence: 71,
    stageIndex: 5,
    analysed: true,
    draft: [
      {
        before:
          "Item 7. Management’s Discussion and Analysis. Revenue for fiscal 2025 was $412.4 million, an increase of 22% over the prior year. ",
        issueId: "segment",
        after:
          ", which management believes is the most useful basis for evaluating the underlying performance of the business.",
      },
      {
        before:
          "Item 9A. Controls and Procedures. Management identified a material weakness in the revenue recognition process, described in further detail below. Remediation was substantially complete as of the filing date.",
        issueId: null,
        after: "",
      },
    ],
    issues: [
      {
        id: "segment",
        severity: "Low",
        phrase: "Results are presented on a single-segment basis",
        reason:
          "Segment presentation changed from the prior year’s filing without the change-in-presentation note that normally accompanies it.",
        evidenceDoc: "FY2024 10-K Filing",
        evidenceDate: "Mar 5, 2025",
        evidenceSource: "Note 14, Segment Information",
        evidenceQuote: "The Company operates in two reportable segments: Platform and Services.",
        confidence: 71,
        suggestion:
          "Add a change-in-presentation note explaining the move to single-segment reporting and restate the prior-year comparatives.",
        suggestedRewrite:
          "Results are presented on a single-segment basis, a change in presentation from the two reportable segments disclosed in fiscal 2024, and prior-year comparatives have been restated accordingly",
      },
    ],
  },

  "q2-press-release": {
    version: "Published",
    submittedBy: "Priya Shah",
    analysisCompleted: "1 day ago",
    aiConfidence: 66,
    stageIndex: 6,
    analysed: true,
    draft: [
      {
        before:
          "Harmony today announced results for the second quarter of fiscal 2026, reporting revenue of $118.2 million and continued expansion of its enterprise customer base. ",
        issueId: "award",
        after: ", reflecting growing adoption of the platform among regulated industries.",
      },
      {
        before:
          "“Disclosure teams are being asked to move faster without lowering the bar,” said Riley Chen. “That is exactly the problem we built Harmony to solve.”",
        issueId: null,
        after: "",
      },
    ],
    issues: [
      {
        id: "award",
        severity: "Low",
        phrase: "the company was named a category leader by an independent analyst firm",
        reason:
          "The recognition is referenced without naming the source, which prior press releases have consistently attributed.",
        evidenceDoc: "Q4 2025 Press Release",
        evidenceDate: "Nov 12, 2025",
        evidenceSource: "Paragraph 3",
        evidenceQuote: "Named a Leader in the 2025 Ardent Group Disclosure Intelligence Landscape.",
        confidence: 66,
        suggestion: "Name the analyst firm and report, as prior releases do, or remove the claim.",
        suggestedRewrite:
          "the company was named a Leader in the 2025 Ardent Group Disclosure Intelligence Landscape",
      },
    ],
  },

  "analyst-day-script": {
    version: "Draft v1",
    submittedBy: "David Okafor",
    analysisCompleted: "not started",
    aiConfidence: 0,
    stageIndex: 0,
    analysed: false,
    draft: [
      {
        before:
          "Good morning, and thank you for joining us. Over the next ninety minutes we will walk through the market we serve, the product roadmap for the coming year, and the financial framework we manage the business against. ",
        issueId: "target",
        after: ", and we will take questions at the end of each section.",
      },
      {
        before:
          "We will also spend time on the disclosure workflow itself, because how a statement is reviewed is inseparable from whether it can be relied upon.",
        issueId: null,
        after: "",
      },
    ],
    issues: [
      {
        id: "target",
        severity: "Low",
        phrase: "we are committing to a long-term operating margin target of 30%",
        reason:
          "A long-term financial target is introduced here that does not appear in any previously published guidance or filing.",
        evidenceDoc: "No matching source found",
        evidenceDate: "—",
        evidenceSource: "Evidence Library",
        evidenceQuote: "No long-term margin target located in the last 8 quarters of disclosures.",
        confidence: 62,
        suggestion:
          "Confirm with IR and Legal whether this target is approved for public disclosure before the event.",
        suggestedRewrite: "we are managing the business toward continued operating margin expansion",
      },
    ],
  },

  "corporate-sustainability": {
    version: "Draft v3",
    submittedBy: "Elena Torres",
    analysisCompleted: "3 days ago",
    aiConfidence: 77,
    stageIndex: 2,
    analysed: true,
    draft: [
      {
        before:
          "Sustainability is managed as an operating discipline rather than a reporting exercise. In fiscal 2026 we continued to reduce the emissions intensity of the platform, and ",
        issueId: "emissions",
        after: ", measured against our fiscal 2023 baseline.",
      },
      {
        before: "The supply chain programme was extended to a further 40 vendors during the year, and ",
        issueId: "supplier",
        after: " as part of onboarding.",
      },
      {
        before:
          "Governance of these commitments sits with the Audit Committee, which reviews progress against each target twice a year.",
        issueId: null,
        after: "",
      },
    ],
    issues: [
      {
        id: "emissions",
        severity: "Medium",
        phrase: "we achieved a 45% reduction in Scope 2 emissions",
        reason:
          "The reduction claimed is larger than the figure filed in the most recent sustainability report, and the baseline year differs.",
        evidenceDoc: "FY2025 Sustainability Report",
        evidenceDate: "Sep 18, 2025",
        evidenceSource: "Section 2, Emissions Performance",
        evidenceQuote: "Scope 2 emissions declined 28% against a fiscal 2023 baseline.",
        confidence: 77,
        suggestion:
          "Reconcile the two figures and state the baseline year in the sentence itself, so the comparison cannot be misread.",
        suggestedRewrite: "we achieved a 28% reduction in Scope 2 emissions",
      },
      {
        id: "supplier",
        severity: "Low",
        phrase: "every supplier is now independently audited",
        reason:
          "An absolute claim about supplier coverage that the vendor programme documentation does not support.",
        evidenceDoc: "Supplier Assurance Programme",
        evidenceDate: "Feb 2, 2026",
        evidenceSource: "Scope and Coverage",
        evidenceQuote: "Independent audit applies to suppliers above the $250k annual spend threshold.",
        confidence: 59,
        suggestion: "Qualify the claim to the audited population, or drop the absolute.",
        suggestedRewrite: "every supplier above our $250k annual spend threshold is now independently audited",
      },
    ],
  },
};

export interface ReviewBundle {
  document: HarmonyDocument;
  detail: ReviewDetail;
}

/** Returns the document plus its review detail, or undefined for an unknown id. */
export async function getReview(orgId: string, documentId: string): Promise<ReviewBundle | undefined> {
  const document = await getDocument(orgId, documentId);
  const detail = DETAILS[documentId];
  if (!document || !detail) return undefined;
  return { document, detail };
}

export async function getIssues(orgId: string, documentId: string): Promise<Issue[]> {
  const bundle = await getReview(orgId, documentId);
  return bundle?.detail.issues ?? [];
}
