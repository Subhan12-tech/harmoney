const VIEW_W = 400;
const VIEW_H = 140;
const PAD_X = 20;
const BASELINE = 130;
/** Score units are mapped from a 60–100 floor/ceiling onto the plot height. */
const FLOOR = 60;
const UNIT = 2.6;

/**
 * The consistency-score trend. Drawn as a plain SVG polyline with a point per
 * month — no charting dependency, and the geometry is deterministic so the
 * server and client render identical markup.
 */
export function LineChart({ values, labels }: { values: number[]; labels?: string[] }) {
  const step = values.length > 1 ? (VIEW_W - PAD_X * 2) / (values.length - 1) : 0;
  const points = values.map((v, i) => ({
    x: PAD_X + i * step,
    y: BASELINE - (v - FLOOR) * UNIT,
    value: v,
    label: labels?.[i],
  }));

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      style={{ width: "100%", height: 140 }}
      role="img"
      aria-label={`Consistency score trend: ${values.join(", ")}`}
    >
      <polyline
        points={points.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((p) => (
        <circle key={p.x} cx={p.x} cy={p.y} r={3} fill="var(--accent)" />
      ))}
    </svg>
  );
}
