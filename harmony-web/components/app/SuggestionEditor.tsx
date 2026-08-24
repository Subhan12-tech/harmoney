"use client";

import { useEffect, useRef, useState } from "react";
import type { Issue } from "@/lib/data";
import { useToast } from "./Toast";

/** How a finding was closed out, and with whose words. */
export interface Resolution {
  status: "applied" | "dismissed";
  /** The wording written into the draft. Absent for a dismissal. */
  text?: string;
  /** True when the reviewer changed the AI's wording before applying it. */
  edited?: boolean;
}

/**
 * The AI suggestion card.
 *
 * The AI proposes a rewrite; the reviewer can accept it, edit it, or replace it
 * with their own sentence entirely. Whichever wording lands in the draft, the
 * card records whether it came from the model or from a person — that
 * distinction is the whole point of the product, so it belongs in the UI and in
 * the audit trail, not just in a toast.
 */
export function SuggestionEditor({
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
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(issue.suggestedRewrite);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Selecting a different sentence resets the editor to that finding's rewrite.
  useEffect(() => {
    setEditing(false);
    setText(issue.suggestedRewrite);
  }, [issue.id, issue.suggestedRewrite]);

  useEffect(() => {
    if (!editing) return;
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [editing]);

  const trimmed = text.trim();
  const changed = trimmed !== issue.suggestedRewrite.trim();
  const empty = trimmed.length === 0;

  function apply(value: string, edited: boolean) {
    onApply(issue.id, value, edited);
    setEditing(false);
    toast(
      edited
        ? "Your wording applied to the draft. It still requires approval."
        : "AI wording applied to the draft. It still requires approval.",
    );
  }

  return (
    <section className="app-card" style={{ padding: 18 }} aria-labelledby="suggestion-heading">
      <h2 id="suggestion-heading" className="kicker" style={{ marginBottom: 8 }}>
        AI suggestion — requires human review
      </h2>

      <p style={{ fontSize: 13.5, margin: 0, color: "var(--text)" }}>{issue.suggestion}</p>

      {/* ---- Resolved ---- */}
      {resolution ? (
        <div style={{ marginTop: 12 }}>
          <div className="flex flex-wrap items-center gap-2" style={{ marginBottom: 8 }}>
            <span
              style={{
                borderRadius: 6,
                padding: "3px 9px",
                fontSize: 11,
                fontWeight: 600,
                background:
                  resolution.status === "applied"
                    ? "color-mix(in srgb, var(--accent) 18%, transparent)"
                    : "var(--surface-2)",
                color: resolution.status === "applied" ? "var(--accent)" : "var(--muted)",
              }}
            >
              {resolution.status === "applied"
                ? resolution.edited
                  ? "Applied — reviewer wording"
                  : "Applied — AI wording"
                : "Dismissed"}
            </span>
            <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
              {resolution.status === "applied"
                ? "Written into the draft, pending approval."
                : "No change made; the flag stays on record."}
            </span>
          </div>

          {resolution.status === "applied" && resolution.text && (
            <blockquote
              style={{
                background: "var(--bg-elev)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 13,
                lineHeight: 1.55,
                color: "var(--text)",
                margin: "0 0 10px",
              }}
            >
              {resolution.text}
            </blockquote>
          )}

          <button
            type="button"
            onClick={() => {
              onReopen(issue.id);
              setText(resolution.text ?? issue.suggestedRewrite);
              toast("Finding reopened.");
            }}
            style={linkButtonStyle}
          >
            Undo
          </button>
        </div>
      ) : editing ? (
        /* ---- Editing ---- */
        <div style={{ marginTop: 12 }}>
          <label htmlFor="revised-wording" style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
            Revised wording
          </label>
          <textarea
            id="revised-wording"
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // Enter is a newline here; Cmd/Ctrl+Enter commits.
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !empty) apply(trimmed, changed);
              if (e.key === "Escape") setEditing(false);
            }}
            rows={3}
            aria-describedby="revised-hint"
            style={{
              width: "100%",
              minHeight: 84,
              resize: "vertical",
              backgroundColor: "var(--bg-elev)",
              border: "1px solid var(--border)",
              borderRadius: 9,
              padding: "10px 12px",
              color: "var(--text)",
              fontSize: 13.5,
              lineHeight: 1.55,
              fontFamily: "inherit",
            }}
          />
          <p id="revised-hint" style={{ fontSize: 11.5, color: "var(--muted)", margin: "6px 0 0" }}>
            {changed
              ? "Your wording replaces the sentence in the draft. The AI original stays on the record."
              : "Edit the AI wording, or write the sentence yourself."}
          </p>

          <div className="flex flex-wrap items-center gap-2" style={{ marginTop: 10 }}>
            <button
              type="button"
              disabled={empty}
              onClick={() => apply(trimmed, changed)}
              style={{
                ...applyButtonStyle,
                opacity: empty ? 0.5 : 1,
                cursor: empty ? "not-allowed" : "pointer",
              }}
            >
              {changed ? "Apply my wording" : "Apply"}
            </button>
            {changed && (
              <button type="button" onClick={() => setText(issue.suggestedRewrite)} style={secondaryStyle}>
                Reset to AI
              </button>
            )}
            <button type="button" onClick={() => setEditing(false)} style={ghostStyle}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* ---- Proposed ---- */
        <div style={{ marginTop: 12 }}>
          <div className="kicker" style={{ marginBottom: 6 }}>
            Proposed rewrite
          </div>
          <blockquote
            style={{
              background: "var(--bg-elev)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 13,
              lineHeight: 1.55,
              color: "var(--text)",
              margin: 0,
            }}
          >
            {text}
            {changed && (
              <span className="flex flex-wrap items-center gap-2" style={{ marginTop: 6 }}>
                <span style={{ fontSize: 11, color: "var(--accent)" }}>Edited by you — not yet applied</span>
                <button type="button" onClick={() => setText(issue.suggestedRewrite)} style={linkButtonStyle}>
                  Reset to AI
                </button>
              </span>
            )}
          </blockquote>

          <div className="flex flex-wrap items-center gap-2" style={{ marginTop: 10 }}>
            <button type="button" onClick={() => setEditing(true)} style={secondaryStyle}>
              Edit
            </button>
            <button type="button" onClick={() => apply(trimmed, changed)} style={applyButtonStyle}>
              {/* The label has to say whose words are about to land in the draft. */}
              {changed ? "Apply my wording" : "Apply"}
            </button>
            <button
              type="button"
              onClick={() => {
                onDismiss(issue.id);
                toast("Suggestion dismissed.");
              }}
              style={ghostStyle}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

const applyButtonStyle: React.CSSProperties = {
  background: "var(--accent)",
  border: "none",
  borderRadius: 7,
  padding: "7px 14px",
  fontSize: 12.5,
  color: "var(--on-accent)",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "var(--font-manrope), system-ui, sans-serif",
};

const secondaryStyle: React.CSSProperties = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 7,
  padding: "7px 14px",
  fontSize: 12.5,
  color: "var(--text)",
  cursor: "pointer",
  fontFamily: "inherit",
};

const ghostStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  padding: "7px 4px",
  fontSize: 12.5,
  color: "var(--muted)",
  cursor: "pointer",
  fontFamily: "inherit",
};

const linkButtonStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--accent)",
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  fontFamily: "inherit",
};
