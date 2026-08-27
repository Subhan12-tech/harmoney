"use client";

import { useEffect, useRef } from "react";
import type { Issue } from "@/lib/data";
import { highlightStyle, resolvedHighlightStyle } from "@/lib/style";

export interface SpanMark {
  id: string;
  start: number;
  end: number;
}

/**
 * The draft, rendered with TWO independent highlight layers at once:
 * the AI's findings (warm, by severity) and the reviewer's manual search hits
 * (cool blue). A sentence can carry both and must read as both, so the text is
 * split at every boundary from either layer and each atomic run is styled from
 * whatever covers it.
 *
 * Splitting this way rather than nesting elements avoids the classic overlap
 * bug: a search term that begins inside a flagged sentence and ends outside it
 * cannot be expressed as nested tags, and naive approaches drop one highlight
 * or duplicate the text.
 */
export function DraftViewer({
  text,
  issueSpans,
  issues,
  resolutions,
  selectedIssueId,
  onSelectIssue,
  searchSpans,
  activeSearchIndex,
}: {
  text: string;
  issueSpans: SpanMark[];
  issues: Map<string, Issue>;
  resolutions: Record<string, { status: string }>;
  selectedIssueId: string | null;
  onSelectIssue: (id: string) => void;
  searchSpans: SpanMark[];
  activeSearchIndex: number;
}) {
  const activeRef = useRef<HTMLSpanElement>(null);

  // Bring the current search hit into view. block:"center" so the reviewer sees
  // the surrounding sentence, not a match jammed against the top edge.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeSearchIndex, searchSpans.length]);

  if (!text) return null;

  // Every boundary from either layer becomes a cut point.
  const cuts = new Set<number>([0, text.length]);
  for (const s of [...issueSpans, ...searchSpans]) {
    if (s.start >= 0 && s.start <= text.length) cuts.add(s.start);
    if (s.end >= 0 && s.end <= text.length) cuts.add(s.end);
  }
  const points = [...cuts].sort((a, b) => a - b);

  const runs: React.ReactNode[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (b <= a) continue;
    const chunk = text.slice(a, b);

    const issueSpan = issueSpans.find((s) => s.start <= a && s.end >= b);
    const searchIdx = searchSpans.findIndex((s) => s.start <= a && s.end >= b);
    const isActiveSearch = searchIdx >= 0 && searchIdx === activeSearchIndex;

    let style: React.CSSProperties = {};
    if (issueSpan) {
      const issue = issues.get(issueSpan.id);
      if (issue) {
        style = resolutions[issue.id]
          ? resolvedHighlightStyle(selectedIssueId === issue.id)
          : highlightStyle(issue.severity, selectedIssueId === issue.id);
      }
    }
    if (searchIdx >= 0) {
      // Layered ON TOP of any AI highlight, never replacing it: the AI colour
      // stays visible via its border/text while the search tint sits behind.
      style = {
        ...style,
        background: isActiveSearch ? "var(--search-hit-active)" : "var(--search-hit)",
        outline: isActiveSearch ? "2px solid var(--search-hit-border)" : "none",
        outlineOffset: isActiveSearch ? "1px" : undefined,
        borderRadius: 3,
      };
    }

    const clickable = Boolean(issueSpan);
    runs.push(
      <span
        key={`${a}-${b}`}
        ref={isActiveSearch ? activeRef : undefined}
        onClick={clickable ? () => onSelectIssue(issueSpan!.id) : undefined}
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        onKeyDown={
          clickable
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectIssue(issueSpan!.id);
                }
              }
            : undefined
        }
        style={{ ...style, cursor: clickable ? "pointer" : undefined }}
      >
        {chunk}
      </span>,
    );
  }

  return (
    <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text)", whiteSpace: "pre-wrap" }}>
      {runs}
    </div>
  );
}

/**
 * Find every occurrence of `query` in `text`, case-insensitively.
 *
 * Literal matching, with the query escaped: a reviewer typing "$1.02 billion",
 * "21%" or "(a)" means those characters, not a regular expression, and an
 * unescaped "." or "$" would silently match the wrong things.
 */
export function findMatches(text: string, query: string): SpanMark[] {
  const q = query.trim();
  if (!q || !text) return [];
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const out: SpanMark[] = [];
  try {
    const re = new RegExp(escaped, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m[0].length === 0) {
        re.lastIndex++;
        continue;
      }
      out.push({ id: `s-${m.index}`, start: m.index, end: m.index + m[0].length });
      if (out.length > 500) break; // a pathological query should not hang the page
    }
  } catch {
    return [];
  }
  return out;
}

/** The sentence containing an offset — the context shown beside a match. */
export function sentenceAt(text: string, index: number): string {
  const before = text.lastIndexOf(".", index);
  const nlBefore = text.lastIndexOf("\n", index);
  const start = Math.max(before, nlBefore) + 1;
  let end = text.length;
  for (const ch of [".", "\n"]) {
    const p = text.indexOf(ch, index);
    if (p >= 0 && p + 1 < end) end = p + 1;
  }
  return text.slice(start, end).trim();
}
