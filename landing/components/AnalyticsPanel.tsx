const SCORES = [70, 72, 74, 71, 76, 78, 80, 79, 82, 85, 84, 87];

function buildChart() {
  const width = 800;
  const height = 180;
  const left = 20;
  const right = 20;
  const top = 20;
  const bottom = 20;
  const usableW = width - left - right;
  const usableH = height - top - bottom;

  const points = SCORES.map((v, i) => {
    const x = left + i * (usableW / (SCORES.length - 1));
    const y = height - bottom - ((v - 60) / 40) * usableH;
    return { x, y };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPath =
    `M${points[0].x} ${points[0].y} ` +
    points
      .slice(1)
      .map((p) => `L${p.x} ${p.y}`)
      .join(" ") +
    ` L${points[points.length - 1].x} ${height} L${points[0].x} ${height} Z`;

  return { points, polyline, areaPath };
}

const KPIS = [
  { kicker: "CONSISTENCY SCORE", value: "87", suffix: "/100", delta: "+5 vs Q2", deltaColor: "#7fbf7f" },
  { kicker: "ISSUES FOUND", value: "342", suffix: "", delta: "92 auto-resolved", deltaColor: "#a9c9ff" },
  { kicker: "AVG REVIEW TIME", value: "3.2h", suffix: "", delta: "−18min vs Q2", deltaColor: "#7fbf7f" },
];

export function AnalyticsPanel() {
  const { polyline, areaPath, points } = buildChart();

  return (
    <section className="mx-auto max-w-[1160px] text-center" style={{ padding: "80px 40px", borderTop: "1px solid #0f0f0f" }}>
      <div
        className="mx-auto mb-7"
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: "radial-gradient(circle at 30% 30%, #9d5cff, #2a1055)",
          boxShadow: "0 0 60px rgba(157,92,255,.4)",
        }}
      />
      <h2 className="font-serif" style={{ fontSize: 48 }}>
        Everything in your control.
      </h2>
      <p className="mx-auto text-muted2" style={{ fontSize: 16, maxWidth: 520, marginTop: 16, marginBottom: 48 }}>
        Live consistency metrics per document, per team, per quarter — visible to leadership, drillable by reviewer.
      </p>

      <div className="text-left" style={{ background: "#050505", border: "1px solid #141414", borderRadius: 14 }}>
        {/* filter bar */}
        <div
          className="flex flex-wrap items-center gap-2"
          style={{ padding: "14px 18px", background: "#0a0a0a", borderBottom: "1px solid #141414", fontSize: 12, color: "#8a8a8a" }}
        >
          <span className="rounded-md" style={{ background: "#151515", color: "#e5e5e5", padding: "6px 12px" }}>
            Last 90 days
          </span>
          <span style={{ padding: "6px 12px" }}>All teams</span>
          <span style={{ padding: "6px 12px" }}>All document types</span>
          <span
            className="ml-auto rounded-md border"
            style={{ borderColor: "#1c1c1c", padding: "6px 12px" }}
          >
            Export CSV
          </span>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-1 sm:grid-cols-3">
          {KPIS.map((k, i) => (
            <div key={k.kicker} style={{ padding: "22px 24px", borderRight: i < 2 ? "1px solid #141414" : "none" }}>
              <div className="font-mono" style={{ fontSize: 11, color: "#8a8a8a" }}>
                {k.kicker}
              </div>
              <div className="font-serif" style={{ fontSize: 44, marginTop: 6 }}>
                {k.value}
                {k.suffix && (
                  <span style={{ fontSize: 20, color: "#5a5a5a" }}>{k.suffix}</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: k.deltaColor, marginTop: 4 }}>{k.delta}</div>
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: "#141414" }} />

        {/* chart */}
        <div style={{ padding: "22px 24px" }}>
          <svg viewBox="0 0 800 180" width="100%" height={180}>
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(120,220,140,.35)" />
                <stop offset="100%" stopColor="rgba(120,220,140,0)" />
              </linearGradient>
            </defs>
            {[20, 65, 110, 155].map((y) => (
              <line key={y} x1={0} y1={y} x2={800} y2={y} stroke="#151515" />
            ))}
            <path d={areaPath} fill="url(#lg)" />
            <polyline points={polyline} fill="none" stroke="#7fdc8f" strokeWidth={1.6} />
            {points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={2} fill="#7fdc8f" />
            ))}
          </svg>
        </div>
      </div>
    </section>
  );
}
