import type { Kpi } from "@/lib/data";

export function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <div className="app-card" style={{ padding: 18 }}>
      <div className="kicker" style={{ marginBottom: 8 }}>
        {kpi.label}
      </div>
      <div className="font-heading" style={{ fontWeight: 700, fontSize: 28, color: "var(--text)" }}>
        {kpi.value}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--accent)", marginTop: 4 }}>{kpi.delta}</div>
    </div>
  );
}
