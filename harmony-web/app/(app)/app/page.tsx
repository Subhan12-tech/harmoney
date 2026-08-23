"use client";

import Link from "next/link";
import { useRole } from "@/context/RoleContext";
import { useAsyncData } from "@/lib/useAsyncData";
import { getKpis, getPendingApprovals, getTeamActivity } from "@/lib/data";
import { KpiCard } from "@/components/app/KpiCard";
import { DocTable } from "@/components/app/DocTable";

export default function DashboardPage() {
  const { orgId } = useRole();

  const kpis = useAsyncData(() => getKpis(orgId), [orgId], []);
  const pending = useAsyncData(() => getPendingApprovals(orgId), [orgId], []);
  const activity = useAsyncData(() => getTeamActivity(orgId), [orgId], []);

  return (
    <>
      <section aria-label="Key metrics">
        <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4" style={{ marginBottom: 20 }}>
          {kpis.map((k) => (
            <KpiCard key={k.label} kpi={k} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_1fr]">
        <section className="app-card" style={{ padding: 20 }} aria-labelledby="pending-heading">
          <h2 id="pending-heading" className="kicker" style={{ marginBottom: 10 }}>
            Pending approvals
          </h2>
          <div className="scroll-x">
            <DocTable documents={pending} compact />
          </div>
        </section>

        <section className="app-card" style={{ padding: 20 }} aria-labelledby="activity-heading">
          <h2 id="activity-heading" className="kicker" style={{ marginBottom: 10 }}>
            Team activity
          </h2>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {activity.map((a) => (
              <li
                key={a.text}
                className="flex gap-2.5"
                style={{ padding: "9px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}
              >
                <span
                  className="font-heading flex flex-none items-center justify-center"
                  aria-hidden="true"
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: "color-mix(in srgb, var(--accent) 22%, transparent)",
                    color: "var(--accent)",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {a.initials}
                </span>
                <span>
                  <span style={{ display: "block", color: "var(--text)" }}>{a.text}</span>
                  <span style={{ display: "block", color: "var(--muted)", fontSize: 11 }}>{a.time}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section
        className="flex flex-wrap items-center gap-5"
        style={{
          background:
            "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 20,
          marginTop: 16,
        }}
        aria-labelledby="graph-teaser-heading"
      >
        <div className="flex-1">
          <h2 id="graph-teaser-heading" className="kicker" style={{ marginBottom: 8 }}>
            Disclosure knowledge graph — preview
          </h2>
          <p style={{ maxWidth: 440, fontSize: 13.5, color: "var(--muted)", margin: 0 }}>
            A live map of how the current draft connects to prior earnings calls, filings, and policy documents.
          </p>
        </div>
        <Link
          href="/app/knowledge"
          className="flex-none"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "10px 16px",
            fontSize: 13,
            color: "var(--text)",
          }}
        >
          Open graph <span aria-hidden="true">→</span>
        </Link>
      </section>
    </>
  );
}
