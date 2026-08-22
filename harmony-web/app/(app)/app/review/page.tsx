"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRole } from "@/context/RoleContext";
import { useAsyncResource } from "@/lib/useAsyncData";
import { CURRENT_USER, WORKFLOW_STAGES, type Issue } from "@/lib/data";
import { getReview } from "@/lib/reviews";
import { ApiError, decideReview } from "@/lib/api";
import {
  highlightStyle,
  outlineChipStyle,
  primaryButtonStyle,
  resolvedHighlightStyle,
  secondaryButtonStyle,
} from "@/lib/style";
import { WorkflowStepper } from "@/components/app/WorkflowStepper";
import { ReviewPanel } from "@/components/app/ReviewPanel";
import type { Resolution } from "@/components/app/SuggestionEditor";
import { Modal } from "@/components/app/Modal";
import { Skeleton } from "@/components/app/Skeleton";
import { useToast } from "@/components/app/Toast";
import { BackIcon, SpinnerIcon } from "@/components/app/icons";

/**
 * The review workspace.
 *
 * Reads the document id from `?id=` rather than a path segment. A path segment
 * would make this route dynamic, which forces a Node server; as a query it
 * exports statically and the API can serve the whole app itself - one service,
 * one origin, no CORS.
 */
function ReviewPageInner() {
  const search = useSearchParams();
  const params = { id: search.get("id") ?? "" };
  const { orgId, canApprove, isViewer, isEditorOnly, role } = useRole();
  const { toast } = useToast();
  const router = useRouter();

  const { data: bundle, loading } = useAsyncResource(() => getReview(orgId, params.id), [orgId, params.id]);

  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [stageIndex, setStageIndex] = useState(0);
  /**
    * How each finding was closed out, keyed by issue id — including the exact
    * wording written into the draft and whether a person changed it.
    */
  const [resolutions, setResolutions] = useState<Record<string, Resolution>>({});
  const [showApprove, setShowApprove] = useState(false);
  const [deciding, setDeciding] = useState(false);
  /** null = not requested, "running" = analysis in flight, "done" = complete. */
  const [analysis, setAnalysis] = useState<"idle" | "running" | "done">("idle");

  const detail = bundle?.detail;
  const document = bundle?.document;

  // Seed the local workflow/selection whenever a different document loads.
  useEffect(() => {
    if (!detail) return;
    setStageIndex(detail.stageIndex);
    setSelectedIssueId(detail.issues[0]?.id ?? null);
    setResolutions({});
    setAnalysis(detail.analysed ? "done" : "idle");
  }, [detail]);

  const issues = detail?.issues ?? [];
  const analysed = analysis === "done";
  const visibleIssues = analysed ? issues : [];

  const byId = useMemo(() => new Map(visibleIssues.map((i) => [i.id, i])), [visibleIssues]);
  const active: Issue | undefined = (selectedIssueId ? byId.get(selectedIssueId) : undefined) ?? visibleIssues[0];

  const highCount = visibleIssues.filter((i) => i.severity === "High").length;
  const unresolved = visibleIssues.filter((i) => !resolutions[i.id]).length;
  const appliedCount = visibleIssues.filter((i) => resolutions[i.id]?.status === "applied").length;
  const editedCount = visibleIssues.filter((i) => resolutions[i.id]?.edited).length;

  if (loading) {
    return (
      <div aria-busy="true">
        <span className="sr-only">Loading review workspace…</span>
        <Skeleton width={360} height={26} style={{ marginBottom: 12 }} />
        <Skeleton width={480} height={13} style={{ marginBottom: 26 }} />
        <Skeleton height={34} radius={20} style={{ marginBottom: 20, maxWidth: 720 }} />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
          <div className="app-card app-shimmer" style={{ height: 420 }} />
          <div className="app-card app-shimmer" style={{ height: 420 }} />
        </div>
      </div>
    );
  }

  if (!bundle || !detail || !document) {
    return (
      <section className="app-card" style={{ padding: 28, maxWidth: 560 }}>
        <h1 className="font-heading" style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700 }}>
          Document not found
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 13.5, margin: "0 0 16px" }}>
          No document with the id <code style={{ color: "var(--text)" }}>{params.id}</code> exists in this
          workspace. It may belong to another organisation, or it may have been removed.
        </p>
        <Link href="/app/documents" style={{ ...primaryButtonStyle, display: "inline-block" }}>
          Back to all documents
        </Link>
      </section>
    );
  }

  function runAnalysis() {
    setAnalysis("running");
    setStageIndex(1);
    // Stands in for the analysis job; the real one streams findings back.
    window.setTimeout(() => {
      setAnalysis("done");
      setStageIndex(2);
      setSelectedIssueId(issues[0]?.id ?? null);
      toast(`AI analysis complete — ${issues.length} issue${issues.length === 1 ? "" : "s"} found.`);
    }, 1600);
  }

  return (
    <>
      {/* ---- Header ---- */}
      <div className="flex flex-wrap items-center gap-2.5" style={{ marginBottom: 6 }}>
        <button
          type="button"
          onClick={() => router.push("/app/documents")}
          className="flex items-center justify-center"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            cursor: "pointer",
            flex: "none",
          }}
        >
          <span className="sr-only">Back to all documents</span>
          <BackIcon size={15} />
        </button>
        <h1 className="font-heading" style={{ margin: 0, fontWeight: 700, fontSize: 20, color: "var(--text)" }}>
          {document.name} — {detail.version}
        </h1>
        <span style={{ ...outlineChipStyle, color: "var(--muted)" }}>{document.type}</span>
      </div>
      <p style={{ color: "var(--muted)", fontSize: 12.5, margin: "0 0 18px" }}>
        Submitted by {detail.submittedBy} ·{" "}
        {analysed
          ? `AI analysis completed ${detail.analysisCompleted} · ${issues.length} issue${
              issues.length === 1 ? "" : "s"
            } found`
          : analysis === "running"
            ? "AI analysis in progress…"
            : "AI analysis has not been run on this draft"}
      </p>

      <WorkflowStepper currentIndex={stageIndex} />

      {/* ---- Draft + evidence ---- */}
      <div className={`grid grid-cols-1 gap-4 ${analysed ? "xl:grid-cols-[1.4fr_1fr]" : ""}`}>
        <section
          className="app-card"
          style={{ padding: 22, maxHeight: 560, overflow: "auto" }}
          aria-labelledby="draft-heading"
        >
          <h2 id="draft-heading" className="kicker" style={{ marginBottom: 12 }}>
            Draft document
          </h2>

          {detail.draft.map((para, i) => {
            const issue = para.issueId ? byId.get(para.issueId) : undefined;
            const resolution = issue ? resolutions[issue.id] : undefined;
            const applied = resolution?.status === "applied";
            // Applying rewrites the sentence in place, so the reviewer reads
            // the document as it would publish.
            const shown = applied && resolution?.text ? resolution.text : issue?.phrase;
            return (
              <p
                key={i}
                style={{
                  fontSize: 14.5,
                  lineHeight: 1.8,
                  color: "rgba(238,241,244,.92)",
                  margin: "0 0 16px",
                }}
              >
                {para.before}
                {issue ? (
                  <button
                    type="button"
                    onClick={() => setSelectedIssueId(issue.id)}
                    aria-pressed={selectedIssueId === issue.id}
                    style={{
                      // An applied sentence stops carrying its severity and
                      // reads as accepted copy instead.
                      ...(applied
                        ? resolvedHighlightStyle(selectedIssueId === issue.id)
                        : highlightStyle(issue.severity, selectedIssueId === issue.id)),
                      opacity: resolution?.status === "dismissed" ? 0.55 : 1,
                      font: "inherit",
                      color: "inherit",
                      // Clear the button chrome one side at a time — `border:
                      // none` would take the severity underline with it.
                      borderTop: "none",
                      borderRight: "none",
                      borderLeft: "none",
                      display: "inline",
                      textAlign: "left",
                    }}
                  >
                    {shown}
                    <span className="sr-only">
                      {applied
                        ? ` — rewritten ${resolution?.edited ? "by the reviewer" : "from the AI suggestion"}, select to inspect`
                        : ` — ${issue.severity} severity issue, select to inspect`}
                    </span>
                  </button>
                ) : (
                  // Before analysis the phrase is still part of the sentence.
                  para.issueId && detail.issues.find((x) => x.id === para.issueId)?.phrase
                )}
                {para.after}
              </p>
            );
          })}
        </section>

        {analysed && active && (
          <ReviewPanel
            issue={active}
            resolution={resolutions[active.id]}
            onApply={(id, text, edited) =>
              setResolutions((prev) => ({ ...prev, [id]: { status: "applied", text, edited } }))
            }
            onDismiss={(id) => setResolutions((prev) => ({ ...prev, [id]: { status: "dismissed" } }))}
            onReopen={(id) =>
              setResolutions((prev) => {
                const next = { ...prev };
                delete next[id];
                return next;
              })
            }
          />
        )}
      </div>

      {/* ---- Not yet analysed ---- */}
      {!analysed && (
        <section
          className="app-card"
          style={{ padding: 22, marginTop: 16, maxWidth: 640 }}
          aria-labelledby="analysis-heading"
        >
          <h2 id="analysis-heading" className="kicker" style={{ marginBottom: 8 }}>
            AI analysis
          </h2>
          <p style={{ fontSize: 14, color: "rgba(238,241,244,.9)", margin: "0 0 12px" }}>
            This draft has not been compared against the evidence library yet. Running the analysis retrieves
            related prior statements, cites them, and returns findings for a human to review.
          </p>
          <button
            type="button"
            onClick={runAnalysis}
            disabled={analysis === "running"}
            style={{
              ...primaryButtonStyle,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 700,
              opacity: analysis === "running" ? 0.6 : 1,
              cursor: analysis === "running" ? "progress" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {analysis === "running" && (
              <span className="app-spin" style={{ display: "inline-flex" }}>
                <SpinnerIcon size={15} />
              </span>
            )}
            {analysis === "running" ? "Analysing draft…" : "Run AI analysis"}
          </button>
        </section>
      )}

      {/* ---- Review decision ---- */}
      {analysed && (
        <section className="app-card" style={{ padding: 22, marginTop: 16 }} aria-labelledby="decision-heading">
          <h2 id="decision-heading" className="kicker" style={{ marginBottom: 8 }}>
            Review decision
          </h2>
          <p style={{ fontSize: 14, maxWidth: 640, color: "rgba(238,241,244,.9)" }}>
            AI analysis is complete. A human reviewer must approve this document before it can be published.{" "}
            {issues.length} issue{issues.length === 1 ? " was" : "s were"} identified — {highCount} high risk,{" "}
            {unresolved} still unresolved.
          </p>

          {canApprove && (
            <div className="flex flex-wrap gap-2.5" style={{ marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setShowApprove(true)}
                style={{
                  ...primaryButtonStyle,
                  padding: "10px 20px",
                  fontSize: 14,
                  fontWeight: 700,
                  boxShadow: "0 6px 18px color-mix(in srgb, var(--accent) 30%, transparent)",
                }}
              >
                Approve &amp; publish
              </button>
              <button
                type="button"
                onClick={() => {
                  setStageIndex(3);
                  toast("Changes requested. The author has been notified.");
                }}
                style={{ ...secondaryButtonStyle, padding: "10px 20px", fontSize: 14, fontFamily: "inherit" }}
              >
                Request changes
              </button>
              <button
                type="button"
                onClick={async () => {
                  const reviewId = bundle?.detail.reviewId;
                  if (!reviewId) {
                    toast("This document has no completed analysis to reject.");
                    return;
                  }
                  setDeciding(true);
                  try {
                    await decideReview(reviewId, "reject");
                    setStageIndex(0);
                    toast("Document rejected and returned to draft.");
                  } catch (err) {
                    toast(err instanceof ApiError ? err.message : "Could not record the rejection.");
                  } finally {
                    setDeciding(false);
                  }
                }}
                style={{
                  background: "transparent",
                  border: "1px solid color-mix(in srgb, var(--danger) 45%, transparent)",
                  borderRadius: 8,
                  padding: "10px 20px",
                  fontSize: 14,
                  color: "color-mix(in srgb, var(--danger) 75%, white)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Reject
              </button>
            </div>
          )}

          {isViewer && (
            <div style={noticeStyle}>
              You have view-only access. Approval actions are limited to Owners, Admins and Reviewers.
            </div>
          )}

          {isEditorOnly && (
            <div style={noticeStyle}>
              As an Editor you can apply suggestions and request re-review, but approval requires a Reviewer, Admin
              or Owner.
            </div>
          )}
        </section>
      )}

      {/* ---- Approval confirmation ---- */}
      <Modal open={showApprove} onClose={() => setShowApprove(false)} title="Confirm approval & publish">
        <p style={modalTextStyle}>
          Reviewer: {CURRENT_USER.name} ({role}) · Document: {document.name}
        </p>
        <p style={modalTextStyle}>
          Unresolved issues: {unresolved} · High-risk: {highCount} · AI confidence: {detail.aiConfidence}%
        </p>
        <p style={modalTextStyle}>
          Applied rewrites: {appliedCount}
          {appliedCount > 0 &&
            (editedCount > 0
              ? ` · ${editedCount} in your own wording rather than the AI's`
              : " · all in the AI's wording")}
        </p>
        <p style={{ ...modalTextStyle, marginBottom: 18 }}>
          By approving this document, you confirm that you have reviewed the identified inconsistencies and
          supporting evidence, and take responsibility for its publication.
        </p>
        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            onClick={() => setShowApprove(false)}
            style={{ ...secondaryButtonStyle, fontFamily: "inherit" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={async () => {
              const reviewId = bundle?.detail.reviewId;
              if (!reviewId) {
                toast("This document has no completed analysis to approve.");
                setShowApprove(false);
                return;
              }
              setDeciding(true);
              try {
                await decideReview(reviewId, "approve");
                setShowApprove(false);
                setStageIndex(WORKFLOW_STAGES.length - 1);
                // Approving also writes the document into the evidence corpus,
                // so future drafts are checked against it.
                toast("Approved and published. Added to your disclosure history.");
              } catch (err) {
                toast(err instanceof ApiError ? err.message : "Could not record the approval.");
              } finally {
                setDeciding(false);
              }
            }}
            disabled={deciding}
            style={{ ...primaryButtonStyle, fontWeight: 700, opacity: deciding ? 0.6 : 1 }}
          >
            {deciding ? "Publishing…" : "Approve & publish"}
          </button>
        </div>
      </Modal>

      <p style={{ marginTop: 18, fontSize: 12, color: "var(--muted)" }}>
        Looking for a different document?{" "}
        <Link href="/app/documents" className="app-link">
          Browse all documents
        </Link>
        .
      </p>
    </>
  );
}

const noticeStyle: React.CSSProperties = {
  background: "var(--bg-elev)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "11px 14px",
  marginTop: 8,
  fontSize: 13,
  color: "var(--muted)",
};

const modalTextStyle: React.CSSProperties = {
  fontSize: 13.5,
  color: "rgba(238,241,244,.85)",
  margin: "0 0 8px",
};

/** `useSearchParams` requires a Suspense boundary to prerender. */
export default function ReviewPage() {
  return (
    <Suspense fallback={<div className="app-card" style={{ padding: 24 }}><Skeleton /></div>}>
      <ReviewPageInner />
    </Suspense>
  );
}
