"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, EmptyState, ErrorBox, Kicker, PageHead, SeverityChip, Table, Td, Th } from "@/components/ui/kit";
import { api } from "@/lib/api";
import { describeAudit, initials, timeAgo } from "@/lib/format";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api("/api/dashboard/stats"), api("/api/documents"), api("/api/audit?limit=6")])
      .then(([s, d, a]: any[]) => {
        setStats(s);
        setDocs(d.documents);
        setActivity(a.audit);
      })
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!stats) return <div style={{ color: "#8a8a8a" }}>Loading…</div>;

  const pending = docs.filter((d) => ["In Review", "Changes Requested"].includes(d.status)).slice(0, 6);
  const kpis: [string, string | number][] = [
    ["Active reviews", stats.active_reviews],
    ["Documents reviewed", stats.documents_reviewed],
    ["Approval rate", stats.approval_rate + "%"],
    ["Avg consistency", stats.avg_consistency + "/10"],
    ["Documents total", stats.documents_total],
    ["High-risk open", stats.high_risk_open],
  ];

  return (
    <div>
      <PageHead eyebrow="Overview" title="Welcome back" subtitle="Here's a quick look at what's happening with your documents." />

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", marginBottom: 24 }}>
        {kpis.map(([label, value]) => (
          <Card key={label} glow style={{ padding: 20 }}>
            <div className="font-mono" style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "#666", marginBottom: 10 }}>
              {label}
            </div>
            <div className="font-serif" style={{ fontSize: 34, color: "#fff" }}>
              {value}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: "1.3fr 1fr" }}>
        <Card>
          <Kicker>Waiting on you</Kicker>
          {pending.length ? (
            <Table>
              <thead>
                <tr>
                  <Th>Document</Th>
                  <Th>Type</Th>
                  <Th>Risk</Th>
                  <Th>Reviewer</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {pending.map((d) => (
                  <tr key={d.id}>
                    <Td>{d.title}</Td>
                    <Td muted>{d.doc_type}</Td>
                    <Td>
                      <SeverityChip severity={d.risk} />
                    </Td>
                    <Td muted>{d.reviewer}</Td>
                    <Td>
                      <Link href={`/documents/${d.id}`} style={{ color: "#6ea8ff", fontSize: 13 }}>
                        Open →
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState>Nothing pending review right now.</EmptyState>
          )}
        </Card>

        <Card>
          <Kicker>Recent activity</Kicker>
          {activity.length ? (
            activity.map((a, i) => (
              <div key={i} className="flex items-start gap-3" style={{ padding: "9px 0", borderBottom: "1px solid #141414" }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #333, #0a0a0a)",
                    border: "1px solid #222",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    flex: "none",
                  }}
                >
                  {initials(a.actor_name)}
                </div>
                <div>
                  <div style={{ fontSize: 13.5 }}>{describeAudit(a)}</div>
                  <div style={{ color: "#666", fontSize: 11 }}>{timeAgo(a.created_at)}</div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState>No activity yet.</EmptyState>
          )}
        </Card>
      </div>

      <Card
        style={{
          marginTop: 20,
          display: "flex",
          alignItems: "center",
          gap: 20,
          background: "linear-gradient(135deg, rgba(90,150,255,.08), transparent), #050505",
        }}
      >
        <div style={{ flex: 1 }}>
          <Kicker>Got documents to compare against?</Kicker>
          <p style={{ color: "#8a8a8a", fontSize: 14, margin: 0, maxWidth: 460 }}>
            Upload the company&rsquo;s past statements so new drafts can be checked against them.
          </p>
        </div>
        <Link
          href="/evidence"
          style={{ flex: "none", background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 9, padding: "10px 18px", fontSize: 13.5 }}
        >
          Go there →
        </Link>
      </Card>
    </div>
  );
}
