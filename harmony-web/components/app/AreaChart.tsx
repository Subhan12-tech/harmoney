"use client";

import { useId, useState } from "react";
import type { TrendPoint } from "@/lib/data";

/**
 * The consistency-score trend, drawn properly: a filled area under a line, a
 * fixed 0–100 axis with gridlines, dated ticks, and a hover tooltip naming the
 * review behind each point.
 *
 * Pure SVG plus one absolutely-positioned HTML tooltip — no charting library.
 * The score axis is fixed 0–100 rather than auto-scaled, because consistency is
 * a percentage and an auto-zoomed axis makes a 2-point wobble look like a
 * cliff. Points map to pixel columns so the hover overlay lines up exactly.
 */

const W = 560;
const H = 210;
const PAD_L = 34;
const PAD_R = 14;
const PAD_T = 16;
const PAD_B = 30;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

const GRID = [0, 25, 50, 75, 100];

function y(score: number) {
  return PAD_T + PLOT_H * (1 - Math.max(0, Math.min(100, score)) / 100);
}

export function AreaChart({ trend }: { trend: TrendPoint[] }) {
  const gid = useId().replace(/:/g, "");
  const [active, setActive] = useState<number | null>(null);

  if (trend.length === 0) {
    return (
      <div style={{ height: H, display: "grid", placeItems: "center", color: "var(--muted)", fontSize: 13 }}>
        No reviews yet — run a draft through review and its consistency score appears here.
      </div>
    );
  }

  const n = trend.length;
  const x = (i: number) => (n === 1 ? PAD_L + PLOT_W / 2 : PAD_L + (PLOT_W * i) / (n - 1));
  const pts = trend.map((p, i) => ({ ...p, px: x(i), py: y(p.score) }));

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.px},${p.py}`).join(" ");
  const area = `${line} L${pts[pts.length - 1].px},${PAD_T + PLOT_H} L${pts[0].px},${PAD_T + PLOT_H} Z`;

  // Which x-ticks to show, so labels never collide on a crowded axis.
  const tickEvery = Math.ceil(n / 6);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img"
           aria-label={`Consistency score trend across ${n} reviews`}>
        <defs>
          <linearGradient id={`area-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-2)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent-2)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* gridlines + y labels */}
        {GRID.map((g) => (
          <g key={g}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y(g)} y2={y(g)} stroke="var(--border)" strokeWidth={1} />
            <text x={PAD_L - 8} y={y(g) + 3} textAnchor="end" fontSize={10} fill="var(--faint)">
              {g}
            </text>
          </g>
        ))}

        <path d={area} fill={`url(#area-${gid})`} />
        <path d={line} fill="none" stroke="var(--accent-2)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {pts.map((p, i) => (
          <g key={i}>
            {i % tickEvery === 0 && (
              <text x={p.px} y={H - 10} textAnchor="middle" fontSize={10} fill="var(--faint)">
                {p.label}
              </text>
            )}
            <circle cx={p.px} cy={p.py} r={active === i ? 4.5 : 3} fill="var(--bg-elev)"
                    stroke="var(--accent-2)" strokeWidth={2} />
            {/* wide invisible hit target for hover */}
            <rect x={p.px - PLOT_W / (2 * n) - 2} y={PAD_T} width={PLOT_W / n + 4} height={PLOT_H}
                  fill="transparent" onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} />
          </g>
        ))}
      </svg>

      {active !== null && (
        <div
          style={{
            position: "absolute",
            left: `${(pts[active].px / W) * 100}%`,
            top: `${(pts[active].py / H) * 100}%`,
            transform: "translate(-50%, -115%)",
            background: "var(--bg-elev)",
            border: "1px solid var(--border-strong)",
            borderRadius: 8,
            padding: "7px 10px",
            fontSize: 12,
            color: "var(--text)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            boxShadow: "0 6px 20px rgba(0,0,0,0.28)",
            zIndex: 5,
          }}
        >
          <div style={{ fontWeight: 600 }}>{pts[active].score}% consistent</div>
          <div style={{ color: "var(--muted)", marginTop: 2 }}>
            {pts[active].company ? `${pts[active].company} · ` : ""}
            {pts[active].label}
          </div>
          <div style={{ color: "var(--muted)" }}>
            {pts[active].issues} issue{pts[active].issues === 1 ? "" : "s"} found
          </div>
        </div>
      )}
    </div>
  );
}
