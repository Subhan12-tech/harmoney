"use client";

import { useEffect, useState } from "react";
import { searchSourceEvidence, type SourceEvidence } from "@/lib/api";

/** Highlight every occurrence of `term` inside a passage, case-insensitively. */
function Marked({ text, term }: { text: string; term: string }) {
  const q = term.trim();
  if (!q) return <>{text}</>;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let parts: string[];
  try {
    parts = text.split(new RegExp(`(${escaped})`, "gi"));
  } catch {
    return <>{text}</>;
  }
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === q.toLowerCase() ? (
          <mark
            key={i}
            style={{ background: "var(--search-hit-active)", color: "inherit", borderRadius: 3, padding: "0 1px" }}
          >
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

/**
 * Draft passage and the corresponding source passages, side by side.
 *
 * This is an INVESTIGATION panel, not a verdict. It never says a difference is
 * a contradiction - it puts the two passages next to each other and lets the
 * reviewer decide, which is the whole point of searching manually rather than
 * relying on the AI's automatic findings.
 */
export function SearchEvidence({ query, passage }: { query: string; passage: string }) {
  const [evidence, setEvidence] = useState<SourceEvidence[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    // Runs on the QUERY, not on the passage. A term that is not literally in
    // the draft still deserves a source lookup - "nothing in the draft" and
    // "nothing anywhere" are different answers, and only the second one means
    // the reviewer can stop looking.
    if (!query.trim()) {
      setEvidence([]);
      setState("idle");
      return;
    }
    let cancelled = false;
    setState("loading");
    setIdx(0);
    searchSourceEvidence(query, passage)
      .then((r) => {
        if (cancelled) return;
        setEvidence(r.evidence ?? []);
        setState(r.error ? "error" : "done");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [query, passage]);

  const current = evidence[idx];

  return (
    <section className="app-card" style={{ padding: 18 }} aria-label="Search evidence">
      {/* ---- DRAFT ---- */}
      <div className="kicker" style={{ marginBottom: 6 }}>
        Draft evidence
      </div>
      {passage ? (
        <p
          style={{
            fontSize: 13.5,
            margin: 0,
            color: "var(--text)",
            lineHeight: 1.6,
            borderLeft: "2px solid var(--search-hit-border)",
            paddingLeft: 10,
          }}
        >
          <Marked text={passage} term={query} />
        </p>
      ) : (
        <p style={{ fontSize: 13, margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--text)" }}>Not mentioned in this draft.</strong> If your history
          covers it, that may be information the draft has left out — worth checking whether the omission is
          deliberate.
        </p>
      )}

      <div style={{ height: 1, background: "var(--border)", margin: "14px 0" }} />

      {/* ---- SOURCE ---- */}
      <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
        <span className="kicker" style={{ margin: 0 }}>
          Source evidence
        </span>
        {evidence.length > 1 && (
          <span className="flex items-center gap-2" style={{ fontSize: 11.5, color: "var(--muted)" }}>
            <button
              type="button"
              onClick={() => setIdx((i) => (i - 1 + evidence.length) % evidence.length)}
              style={navBtn}
              aria-label="Previous source passage"
            >
              ↑
            </button>
            {idx + 1} / {evidence.length}
            <button
              type="button"
              onClick={() => setIdx((i) => (i + 1) % evidence.length)}
              style={navBtn}
              aria-label="Next source passage"
            >
              ↓
            </button>
          </span>
        )}
      </div>

      {state === "loading" && (
        <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>Finding related source evidence…</p>
      )}

      {state === "error" && (
        <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
          Source evidence could not be loaded. Try again — your draft matches are unaffected.
        </p>
      )}

      {state === "done" && evidence.length === 0 && (
        <p style={{ color: "var(--muted)", fontSize: 13, margin: 0, lineHeight: 1.6 }}>
          <strong style={{ color: "var(--text)" }}>No matching evidence found in your history.</strong> This may
          be new information rather than a problem — Harmony is not calling it a contradiction, only telling you
          nothing prior covers it.
        </p>
      )}

      {state === "done" && current && (
        <>
          <p
            style={{
              fontSize: 13.5,
              margin: 0,
              color: "var(--text)",
              lineHeight: 1.6,
              borderLeft: "2px solid var(--border-strong)",
              paddingLeft: 10,
            }}
          >
            <Marked text={current.text} term={query} />
          </p>
          <div className="flex items-center gap-2" style={{ marginTop: 8, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 10.5,
                padding: "2px 7px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                color: current.match_type === "exact" ? "var(--text)" : "var(--muted)",
                background: current.match_type === "exact" ? "var(--surface-2)" : "transparent",
              }}
            >
              {current.match_type === "exact" ? "Exact match" : "Related"}
            </span>
            <span style={{ fontSize: 11.5, color: "var(--faint)" }}>
              {current.source} · {current.date} · {current.doc_type}
            </span>
          </div>
        </>
      )}

      <p style={{ fontSize: 11, color: "var(--faint)", margin: "12px 0 0", lineHeight: 1.5 }}>
        Search is read-only. Nothing here changes the draft or creates a finding — compare the two passages and
        judge for yourself.
      </p>
    </section>
  );
}

const navBtn: React.CSSProperties = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 5,
  color: "var(--text)",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 11,
  lineHeight: 1,
  padding: "3px 6px",
};
