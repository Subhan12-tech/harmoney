import { sevColor } from "@/lib/format";
import type { ReviewIssue } from "@/lib/types";

export function HighlightedDraft({
  content,
  issues,
  onSelect,
}: {
  content: string;
  issues: ReviewIssue[];
  onSelect: (i: number) => void;
}) {
  const spans = issues
    .map((it, i) => ({ ...it, i }))
    .filter((it) => Array.isArray(it.span))
    .sort((a, b) => a.span[0] - b.span[0]);
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  spans.forEach((it) => {
    let [s, e] = it.span;
    if (s < cursor || s >= content.length || s < 0) return;
    e = Math.min(e, content.length);
    if (s > cursor) nodes.push(content.slice(cursor, s));
    const c = sevColor(it.severity);
    nodes.push(
      <span
        key={it.i}
        onClick={() => onSelect(it.i)}
        style={{
          borderRadius: 3,
          padding: "1px 2px",
          cursor: "pointer",
          background: `${c}22`,
          borderBottom: `2px ${it.severity === "low" ? "dashed" : "solid"} ${c}`,
        }}
      >
        {content.slice(s, e)}
      </span>
    );
    cursor = e;
  });
  if (cursor < content.length) nodes.push(content.slice(cursor));
  return <div style={{ fontSize: 15, lineHeight: 1.9, color: "#d4d4d4", whiteSpace: "pre-wrap" }}>{nodes}</div>;
}
