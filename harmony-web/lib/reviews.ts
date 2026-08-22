/**
 * Per-document review detail, read from the API.
 *
 * A document opens into its real review workspace: the draft body it was
 * submitted with, the evidence-grounded issues the pipeline verified, and its
 * position in the workflow. Nothing here is invented — an unreviewed document
 * simply reports `analysed: false` and shows no findings.
 */

import { ApiError, apiGet } from "./api";
import { relativeTime } from "./mappers";
import { getDocument, type HarmonyDocument, type Issue, type Severity } from "./data";

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
  /** Present once a decision has been recorded. */
  reviewId?: string;
  decision?: "pending" | "approved" | "rejected";
}

export interface ReviewBundle {
  document: HarmonyDocument;
  detail: ReviewDetail;
}

/* ============================================================
   API shapes
   ============================================================ */

interface ApiIssue {
  quote: string;
  span?: [number, number] | number[];
  severity: string;
  reason: string;
  evidence_doc?: string;
  evidence_date?: string;
  evidence_source?: string;
  evidence_quote?: string;
  confidence?: number;
  suggestion?: string;
}

interface ApiReview {
  id: string;
  average_rating: number;
  critic_verdict: string;
  report: string;
  status: string;
  created_at: string;
  submitted_by?: string;
  issues: ApiIssue[];
  evidence: unknown[];
}

interface ApiDocDetail {
  document: { id: string; title: string; content: string; status: string; created_at: string; submitted_by?: string };
  reviews: ApiReview[];
}

/* ============================================================
   Mapping
   ============================================================ */

function toSeverity(v: string): Severity {
  const k = (v || "").toLowerCase();
  return k === "high" ? "High" : k === "medium" ? "Medium" : "Low";
}

function toIssue(raw: ApiIssue, index: number): Issue {
  return {
    id: `issue-${index}`,
    severity: toSeverity(raw.severity),
    phrase: raw.quote,
    reason: raw.reason,
    evidenceDoc: raw.evidence_doc || "Prior statement",
    evidenceDate: raw.evidence_date || "—",
    evidenceSource: raw.evidence_source || "History",
    evidenceQuote: raw.evidence_quote || "",
    confidence: typeof raw.confidence === "number" ? raw.confidence : 0,
    suggestion: raw.suggestion || "",
    suggestedRewrite: raw.suggestion || "",
  };
}

/**
 * Splits the draft into segments around each flagged phrase.
 *
 * The pipeline records a character span for every issue it keeps (an issue
 * whose quote could not be located in the draft is discarded before it is ever
 * stored), so this slices by position rather than searching for the text —
 * which would mis-highlight whenever a phrase occurs more than once.
 */
function toSegments(draft: string, issues: ApiIssue[]): DraftSegment[] {
  const spans = issues
    .map((it, i) => ({ i, span: Array.isArray(it.span) ? it.span : null }))
    .filter((x): x is { i: number; span: number[] } => !!x.span && x.span.length === 2)
    .sort((a, b) => a.span[0] - b.span[0]);

  if (spans.length === 0) {
    return draft ? [{ before: draft, issueId: null, after: "" }] : [];
  }

  const segments: DraftSegment[] = [];
  let cursor = 0;
  for (const { i, span } of spans) {
    const [start, end] = span;
    // Guard against overlapping or stale spans rather than emitting garbage.
    if (start < cursor || start > draft.length || end > draft.length || end <= start) continue;
    segments.push({ before: draft.slice(cursor, start), issueId: `issue-${i}`, after: "" });
    cursor = end;
  }
  // Whatever trails the last flagged phrase.
  if (cursor < draft.length) {
    if (segments.length > 0) segments[segments.length - 1].after = draft.slice(cursor);
    else segments.push({ before: draft.slice(cursor), issueId: null, after: "" });
  }
  return segments;
}

/** Where this document sits in WORKFLOW_STAGES. */
function toStageIndex(docStatus: string, review: ApiReview | undefined): number {
  if (!review) return docStatus === "Published" ? 6 : 0;      // never analysed
  if (review.status === "approved") return docStatus === "Published" ? 6 : 5;
  if (review.status === "rejected") return 3;                  // Changes Requested
  return 2;                                                    // Review
}

/* ============================================================
   Getters
   ============================================================ */

export async function getReview(orgId: string, documentId: string): Promise<ReviewBundle | undefined> {
  let payload: ApiDocDetail;
  try {
    payload = await apiGet<ApiDocDetail>(`/api/documents/${encodeURIComponent(documentId)}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
  if (!payload?.document) return undefined;

  // getDocument reuses the list mapper, so the header matches the table row.
  const document = await getDocument(orgId, documentId);
  if (!document) return undefined;

  const reviews = payload.reviews ?? [];
  const latest = reviews[0];                    // API orders created_at desc
  const rawIssues = latest?.issues ?? [];
  const body = payload.document.content || "";

  return {
    document,
    detail: {
      version: reviews.length > 1 ? `Draft v${reviews.length}` : "Draft v1",
      submittedBy: latest?.submitted_by || payload.document.submitted_by || "Unknown",
      analysisCompleted: latest ? relativeTime(latest.created_at) : "Not analysed",
      // average_rating is 0-10 from the pipeline; the panel shows a percentage.
      aiConfidence: latest ? Math.round((latest.average_rating || 0) * 10) : 0,
      stageIndex: toStageIndex(payload.document.status, latest),
      analysed: Boolean(latest),
      draft: toSegments(body, rawIssues),
      issues: rawIssues.map(toIssue),
      reviewId: latest?.id,
      decision: (latest?.status as ReviewDetail["decision"]) ?? "pending",
    },
  };
}

export async function getIssues(orgId: string, documentId: string): Promise<Issue[]> {
  const bundle = await getReview(orgId, documentId);
  return bundle?.detail.issues ?? [];
}
