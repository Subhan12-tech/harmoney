"use client";

import { AI_WORKFLOW, type Issue } from "@/lib/data";
import { severityChipStyle } from "@/lib/style";
import { SuggestionEditor, type Resolution } from "./SuggestionEditor";
import { useToast } from "./Toast";

/**
 * The right-hand column of the review workspace: why the sentence was flagged,
 * what the AI proposes, and the pipeline that produced it. Everything here is
 * driven by whichever highlighted sentence is currently selected.
 */
export function ReviewPanel({
  issue,
  resolution,
  onApply,
  onDismiss,
  onReopen,
}: {
  issue: Issue;
  resolution?: Resolution;
  onApply: (id: string, text: string, edited: boolean) => void;
  onDismiss: (id: string) => void;
  onReopen: (id: string) => void;
}) {
  const { toast } = useToast();

  return (
    <div className="flex flex-col gap-3.5">
      {/* ---- Why this was flagged ---- */}
      <section className="app-card" style={{ padding: 18 }} aria-labelledby="flag-heading">
        <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
          <h2 id="flag-heading" className="kicker" style={{ margin: 0 }}>
            Why this was flagged
          </h2>
          <span style={severityChipStyle(issue.severity)}>{issue.severity}</span>
        </div>

        <p style={{ fontSize: 13.5, margin: 0, color: "rgba(238,241,244,.9)" }}>{issue.reason}</p>

        <div style={{ height: 1, background: "var(--border)", margin: "12px 0" }} />

        <div className="kicker" style={{ marginBottom: 6 }}>
          Evidence
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{issue.evidenceDoc}</div>
        <div style={{ color: "var(--muted)", fontSize: 11.5, marginBottom: 8 }}>
          {issue.evidenceDate} · {issue.evidenceSource}
        </div>

        <blockquote
          style={{
            background: "var(--bg-elev)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 13,
            fontStyle: "italic",
            color: "var(--accent)",
            margin: 0,
          }}
        >
          &ldquo;{issue.evidenceQuote}&rdquo;
        </blockquote>

        <div className="flex items-center justify-between" style={{ marginTop: 10 }}>
          <span style={{ color: "var(--muted)", fontSize: 11.5 }}>Confidence: {issue.confidence}%</span>
          <div className="flex gap-2.5">
            <button type="button" onClick={() => toast("Side-by-side comparison opened.")} style={linkButtonStyle}>
              Compare
            </button>
            <button
              type="button"
              onClick={() => toast(`Opening ${issue.evidenceDoc}.`)}
              style={linkButtonStyle}
            >
              View source <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </section>

      {/* ---- AI suggestion, editable by the reviewer ---- */}
      <SuggestionEditor
        issue={issue}
        resolution={resolution}
        onApply={onApply}
        onDismiss={onDismiss}
        onReopen={onReopen}
      />

      {/* ---- AI workflow ---- */}
      <section
        aria-label="AI workflow"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--accent) 16%, transparent), color-mix(in srgb, var(--accent-2) 12%, transparent)), var(--bg-elev)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 16,
        }}
      >
        <div className="kicker" style={{ color: "var(--accent)", marginBottom: 8 }}>
          AI workflow
        </div>
        <div
          className="flex flex-wrap gap-1.5"
          style={{ fontSize: 11.5, color: "rgba(238,241,244,.85)" }}
        >
          {AI_WORKFLOW.map((step, i) => {
            const isLast = i === AI_WORKFLOW.length - 1;
            return (
              <span key={step} className="flex items-center gap-1.5">
                {/* The last step is always emphasised — the AI never publishes. */}
                <span style={isLast ? { color: "var(--accent)", fontWeight: 700 } : undefined}>{step}</span>
                {!isLast && (
                  <span aria-hidden="true" style={{ color: "var(--muted)" }}>
                    →
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </section>
    </div>
  );
}

const linkButtonStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--accent)",
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  fontFamily: "inherit",
};
