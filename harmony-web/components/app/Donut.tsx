"use client";

import { useState } from "react";

export interface DonutSlice {
  label: string;
  count: number;
  token: string;
}

/**
 * A donut with the total in the hole and a legend beside it.
 *
 * Better than a pie for a small number of buckets: the hole carries the total
 * (the number people actually want), and equal-radius arcs are easier to
 * compare than wedges meeting at a point. Segments are drawn with a single
 * stroked circle and dash offsets, so there is no path maths per slice and it
 * stays crisp at any size.
 */
export function Donut({ slices, centerLabel = "total" }: { slices: DonutSlice[]; centerLabel?: string }) {
  const [active, setActive] = useState<number | null>(null);
  const total = slices.reduce((s, x) => s + x.count, 0);
  const R = 60;
  const C = 2 * Math.PI * R;

  if (total === 0) {
    return (
      <div className="flex items-center gap-4">
        <div style={{ width: 150, height: 150, borderRadius: "50%", border: "14px solid var(--border)", flex: "none" }} />
        <div style={{ color: "var(--muted)", fontSize: 13 }}>Nothing flagged yet.</div>
      </div>
    );
  }

  let offset = 0;
  const segs = slices.map((s, i) => {
    const frac = s.count / total;
    const seg = { ...s, i, dash: frac * C, gap: C - frac * C, off: -offset * C, frac };
    offset += frac;
    return seg;
  });

  return (
    <div className="flex items-center gap-5 scroll-x" style={{ flexWrap: "wrap" }}>
      <svg viewBox="0 0 160 160" style={{ width: 150, height: 150, flex: "none" }} role="img"
           aria-label={`${total} findings by severity`}>
        <g transform="rotate(-90 80 80)">
          <circle cx="80" cy="80" r={R} fill="none" stroke="var(--border)" strokeWidth="16" />
          {segs.map((s) => (
            <circle
              key={s.i}
              cx="80"
              cy="80"
              r={R}
              fill="none"
              stroke={s.token}
              strokeWidth={active === s.i ? 20 : 16}
              strokeDasharray={`${s.dash} ${s.gap}`}
              strokeDashoffset={s.off}
              strokeLinecap="butt"
              style={{ transition: "stroke-width 120ms", cursor: "default" }}
              onMouseEnter={() => setActive(s.i)}
              onMouseLeave={() => setActive(null)}
            />
          ))}
        </g>
        <text x="80" y="76" textAnchor="middle" fontSize="26" fontWeight="600" fill="var(--text)">
          {active !== null ? segs[active].count : total}
        </text>
        <text x="80" y="94" textAnchor="middle" fontSize="11" fill="var(--muted)">
          {active !== null ? segs[active].label : centerLabel}
        </text>
      </svg>

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10, minWidth: 150 }}>
        {segs.map((s) => (
          <li key={s.i} className="flex items-center justify-between gap-4"
              onMouseEnter={() => setActive(s.i)} onMouseLeave={() => setActive(null)}
              style={{ cursor: "default" }}>
            <span className="flex items-center gap-2" style={{ fontSize: 13, color: "var(--text)" }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: s.token, flex: "none" }} aria-hidden />
              {s.label}
            </span>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              {s.count} · {Math.round(s.frac * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
