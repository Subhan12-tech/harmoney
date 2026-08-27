"use client";

import { useEffect, useState } from "react";
import { searchSourceEvidence, type SourceEvidence } from "@/lib/api";
import type { SpanMark } from "./DraftViewer";
import { sentenceAt } from "./DraftViewer";

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

const sectionLabel: React.CSSProperties = {
  fontSize: 10.5,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--muted)",
  fontWeight: 600,
};

function EmptySide({ what }: { what: string }) {
  return (
    <p style={{ fontSize: 13, margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
      No matching passage found in {what}.
    </p>
  );
}

/**
 * Two-sided search results: the CURRENT DRAFT on one side, the EVIDENCE /
 * COMPARISON documents on the other, each searched independently and each with
 * its own match count and navigation.
 *
 * The sides are never merged and never substituted for one another. A draft
 * passage is always labelled as the draft's and an evidence passage as the
 * source's, because the reviewer's question is precisely "what does MINE say
 * versus what did we say BEFORE" - answering it with the wrong side, or with
 * only one side, is worse than answering nothing.
 *
 * Every passage is verbatim from its document. Nothing here is generated,
 * paraphrased or reconstructed; when a side has no match it says so plainly
 * rather than offering an approximation.
 */
export function SearchEvidence({
  query,
  draftText,
  draftSpans,
  activeIndex,
  onSelectDraftMatch,
}: {
  query: string;
  draftText: string;
  /** Every occurrence of the query in the draft, as character offsets. */
  draftSpans: SpanMark[];
  activeIndex: number;
  onSelectDraftMatch: (index: number) => void;
}) {
  const [evidence, setEvidence] = useState<SourceEvidence[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [evIdx, setEvIdx] = useState(0);

  // The passage around the currently selected draft match - the context that
  // makes the source lookup about THIS occurrence rather than the draft at large.
  const activePassage =
    draftSpans[activeIndex] ? sentenceAt(draftText, draftSpans[activeIndex].start) : "";

  useEffect(() => {
    // Runs on the QUERY, independent of whether the draft contains it: "not in
    // the draft" and "nowhere at all" are different answers and the reviewer
    // needs both.
    if (!query.trim()) {
      setEvidence([]);
      setState("idle");
      return;
    }
    let cancelled = false;
    setState("loading");
    setEvIdx(0);
    searchSourceEvidence(query, activePassage)
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
  }, [query, activePassage]);

  const currentEv = evidence[evIdx];

  return (
    <section className="app-card" style={{ padding: 18 }} aria-label="Search results">
      {/* ===================== CURRENT DRAFT ===================== */}
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <span style={sectionLabel}>Current draft</span>
        <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
          {draftSpans.length === 0
            ? "no matches"
            : `${draftSpans.length} match${draftSpans.length === 1 ? "" : "es"}`}
        </span>
      </div>

      {draftSpans.length === 0 ? (
        <EmptySide what="this draft" />
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4, maxHeight: 190, overflowY: "auto" }}>
          {draftSpans.map((s, i) => (
            <li key={`${s.start}-${s.end}`}>
              <button
                type="button"
                onClick={() => onSelectDraftMatch(i)}
                title="Jump to this occurrence in the draft"
                style={{
                  width: "100%",
                  textAlign: "left",
                  display: "flex",
                  gap: 8,
                  padding: "7px 9px",
                  borderRadius: 7,
                  border: "1px solid",
                  borderColor: i === activeIndex ? "var(--search-hit-border)" : "transparent",
                  background: i === activeIndex ? "var(--search-hit)" : "transparent",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 12.5,
                  lineHeight: 1.55,
                  color: "var(--text)",
                }}
              >
                <span style={{ color: "var(--faint)", flex: "none", fontVariantNumeric: "tabular-nums" }}>
                  {i + 1}.
                </span>
                <span style={{ minWidth: 0 }}>
                  <Marked text={sentenceAt(draftText, s.start)} term={query} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div style={{ height: 1, background: "var(--border)", margin: "14px 0" }} />

      {/* ================= EVIDENCE / COMPARISON ================= */}
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <span style={sectionLabel}>Evidence / comparison</span>
        <span className="flex items-center gap-2" style={{ fontSize: 11.5, color: "var(--muted)" }}>
          {state === "done" &&
            (evidence.length === 0
              ? "no matches"
              : `${evIdx + 1} / ${evidence.length}`)}
          {state === "done" && evidence.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setEvIdx((i) => (i - 1 + evidence.length) % evidence.length)}
                style={navBtn}
                aria-label="Previous evidence passage"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => setEvIdx((i) => (i + 1) % evidence.length)}
                style={navBtn}
                aria-label="Next evidence passage"
              >
                ↓
              </button>
            </>
          )}
        </span>
      </div>

      {state === "loading" && (
        <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>Finding related source evidence…</p>
      )}

      {state === "error" && (
        <p style={{ color: "var(--muted)", fontSize: 13, margin: 0, lineHeight: 1.6 }}>
          Source evidence could not be loaded. Try again — your draft matches above are unaffected.
        </p>
      )}

      {state === "done" && evidence.length === 0 && <EmptySide what="your evidence library" />}

      {state === "done" && currentEv && (
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
            <Marked text={currentEv.text} term={query} />
          </p>
          <div className="flex items-center gap-2" style={{ marginTop: 8, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 10.5,
                padding: "2px 7px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                color: currentEv.match_type === "exact" ? "var(--text)" : "var(--muted)",
                background: currentEv.match_type === "exact" ? "var(--surface-2)" : "transparent",
              }}
            >
              {currentEv.match_type === "exact" ? "Exact match" : "Related"}
            </span>
            <span style={{ fontSize: 11.5, color: "var(--faint)" }}>
              {currentEv.source} · {currentEv.date} · {currentEv.doc_type}
            </span>
          </div>
        </>
      )}

      <p style={{ fontSize: 11, color: "var(--faint)", margin: "12px 0 0", lineHeight: 1.5 }}>
        Both sides are quoted verbatim from their own document. Searching never changes the draft or creates a
        finding — compare the two and judge for yourself.
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
