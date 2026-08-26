"use client";

import { useState } from "react";

export interface Column {
  label: string;
  value: number;
  /** Optional secondary caption shown in the tooltip. */
  caption?: string;
}

/**
 * Vertical bars for a count per period — issues found per review here.
 *
 * A column chart, not a line: these are discrete counts, one per review, and a
 * line would imply a continuous quantity between them. Bars scale to the tallest
 * column; a zero-issue review shows a thin baseline stub so it reads as "clean",
 * not "missing". Hover a column for its exact count.
 */
export function ColumnChart({ columns, unit = "issue" }: { columns: Column[]; unit?: string }) {
  const [active, setActive] = useState<number | null>(null);

  if (columns.length === 0) {
    return (
      <div style={{ height: 150, display: "grid", placeItems: "center", color: "var(--muted)", fontSize: 13 }}>
        No reviews yet.
      </div>
    );
  }

  const max = Math.max(1, ...columns.map((c) => c.value));
  const H = 150;

  return (
    <div style={{ position: "relative" }}>
      <div
        className="flex items-end scroll-x"
        style={{ height: H, gap: 8, paddingTop: 20 }}
      >
        {columns.map((c, i) => {
          const h = c.value === 0 ? 3 : Math.max(6, Math.round((c.value / max) * (H - 34)));
          const hot = active === i;
          return (
            <div
              key={i}
              className="flex flex-col items-center"
              style={{ flex: "1 1 0", minWidth: 16 }}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: 34,
                  height: h,
                  borderRadius: "4px 4px 0 0",
                  background: c.value === 0 ? "var(--border)" : hot ? "var(--accent-2)" : "color-mix(in srgb, var(--accent-2) 62%, transparent)",
                  transition: "background 120ms",
                }}
                aria-label={`${c.label}: ${c.value} ${unit}${c.value === 1 ? "" : "s"}`}
              />
              <span style={{ fontSize: 10, color: "var(--faint)", marginTop: 6, whiteSpace: "nowrap" }}>
                {c.label}
              </span>
            </div>
          );
        })}
      </div>

      {active !== null && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: `${((active + 0.5) / columns.length) * 100}%`,
            transform: "translateX(-50%)",
            background: "var(--bg-elev)",
            border: "1px solid var(--border-strong)",
            borderRadius: 8,
            padding: "6px 9px",
            fontSize: 12,
            color: "var(--text)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            boxShadow: "0 6px 18px rgba(0,0,0,0.26)",
            zIndex: 5,
          }}
        >
          <strong>
            {columns[active].value} {unit}
            {columns[active].value === 1 ? "" : "s"}
          </strong>
          {columns[active].caption && (
            <div style={{ color: "var(--muted)", marginTop: 1 }}>{columns[active].caption}</div>
          )}
        </div>
      )}
    </div>
  );
}
