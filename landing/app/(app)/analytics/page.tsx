"use client";

import { useEffect, useState } from "react";
import { Card, EmptyState, ErrorBox, Kicker, PageHead, Table, Td, Th } from "@/components/ui/kit";
import { api } from "@/lib/api";
import { sevColor } from "@/lib/format";

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/analytics")
      .then(setData)
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!data) return <div style={{ color: "#8a8a8a" }}>Loading…</div>;

  const pts = data.score_trend as { rating: number; at: string }[];
  const w = 400,
    h = 140,
    pad = 20;
  const coords = pts.map((p, i) => ({
    x: pad + (pts.length > 1 ? (i * (w - 2 * pad)) / (pts.length - 1) : 0),
    y: h - pad - ((p.rating - 60) / 40) * (h - 2 * pad),
  }));
  const line = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const sevMax = Math.max(1, ...data.severity_breakdown.map((b: any) => b.count));
  const typeMax = Math.max(1, ...data.type_breakdown.map((b: any) => b.count));

  return (
    <div>
      <PageHead eyebrow="Metrics" title="Reports" subtitle="How your team and documents are doing over time." />

      <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 20 }}>
        <Card>
          <Kicker>Match score over time</Kicker>
          {pts.length ? (
            <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={140}>
              <polyline points={line} fill="none" stroke="#7fdc8f" strokeWidth={2} />
              {coords.map((c, i) => (
                <circle key={i} cx={c.x} cy={c.y} r={3} fill="#7fdc8f" />
              ))}
            </svg>
          ) : (
            <EmptyState>No reviews yet.</EmptyState>
          )}
        </Card>

        <Card>
          <Kicker>Issues by severity</Kicker>
          {data.severity_breakdown.some((b: any) => b.count) ? (
            data.severity_breakdown.map((b: any) => (
              <div key={b.label} style={{ margin: "12px 0" }}>
                <div className="flex justify-between" style={{ fontSize: 13, marginBottom: 5 }}>
                  <span>{b.label}</span>
                  <span style={{ color: "#8a8a8a" }}>{b.count}</span>
                </div>
                <div style={{ background: "#0a0a0a", height: 8, borderRadius: 4 }}>
                  <div style={{ height: 8, background: sevColor(b.label.toLowerCase()), width: `${Math.round((100 * b.count) / sevMax)}%`, borderRadius: 4 }} />
                </div>
              </div>
            ))
          ) : (
            <EmptyState>No issues flagged yet.</EmptyState>
          )}
        </Card>
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Card>
          <Kicker>Issues by document type</Kicker>
          {data.type_breakdown.length ? (
            data.type_breakdown.map((b: any) => (
              <div key={b.label} style={{ margin: "12px 0" }}>
                <div className="flex justify-between" style={{ fontSize: 13, marginBottom: 5 }}>
                  <span>{b.label}</span>
                  <span style={{ color: "#8a8a8a" }}>{b.count}</span>
                </div>
                <div style={{ background: "#0a0a0a", height: 8, borderRadius: 4 }}>
                  <div style={{ height: 8, background: "#6ea8ff", width: `${Math.round((100 * b.count) / typeMax)}%`, borderRadius: 4 }} />
                </div>
              </div>
            ))
          ) : (
            <EmptyState>No documents yet.</EmptyState>
          )}
        </Card>

        <Card>
          <Kicker>Review performance</Kicker>
          {data.review_performance.length ? (
            <Table>
              <thead>
                <tr>
                  <Th>Reviewer</Th>
                  <Th>Avg time</Th>
                  <Th>Approval rate</Th>
                </tr>
              </thead>
              <tbody>
                {data.review_performance.map((r: any) => (
                  <tr key={r.name}>
                    <Td>{r.name}</Td>
                    <Td muted>{r.avg_minutes}m</Td>
                    <Td muted>{r.approval_rate}%</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState>No decided reviews yet.</EmptyState>
          )}
        </Card>
      </div>
    </div>
  );
}
