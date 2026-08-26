"use client";

import { useRole } from "@/context/RoleContext";
import { useAsyncResource } from "@/lib/useAsyncData";
import { getAnalytics } from "@/lib/data";
import { AreaChart } from "@/components/app/AreaChart";
import { Donut } from "@/components/app/Donut";
import { BarList } from "@/components/app/BarList";
import { StatTile } from "@/components/app/StatTile";
import { SkeletonCard } from "@/components/app/Skeleton";
import { PageHeader } from "@/components/app/PageHeader";

export default function AnalyticsPage() {
  const { orgId } = useRole();
  const { data } = useAsyncResource(() => getAnalytics(orgId), [orgId]);

  if (!data) {
    return (
      <>
        <PageHeader title="Analytics" blurb="How your disclosures are holding up over time." />
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4" style={{ marginBottom: 16 }}>
          <SkeletonCard height={92} />
          <SkeletonCard height={92} />
          <SkeletonCard height={92} />
          <SkeletonCard height={92} />
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <SkeletonCard height={280} />
          </div>
          <SkeletonCard height={280} />
        </div>
      </>
    );
  }

  const { totals, trend, severity, risk, types, performance } = data;
  const empty = totals.reviews === 0;

  const first = trend[0]?.score;
  const last = trend[trend.length - 1]?.score;
  const delta = first != null && last != null ? last - first : 0;

  return (
    <>
      <PageHeader title="Analytics" blurb="How your disclosures are holding up over time." />

      {empty ? (
        <section className="app-card" style={{ padding: 40, textAlign: "center" }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: "0 0 8px" }}>
            No reviews yet
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 13, maxWidth: 420, margin: "0 auto" }}>
            Once you run a draft through review, this page fills in — consistency over time, what gets
            flagged and how severe, and how your team is clearing the queue.
          </p>
        </section>
      ) : (
        <>
          {/* headline numbers */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4" style={{ marginBottom: 16 }}>
            <StatTile label="Reviews run" value={totals.reviews} hint={`${totals.published} published`} />
            <StatTile
              label="Avg consistency"
              value={`${totals.avgConsistency}%`}
              hint={delta === 0 ? "no change" : `${delta > 0 ? "+" : ""}${delta} pts since first`}
              accent={totals.avgConsistency >= 80 ? "var(--warn)" : "var(--danger)"}
            />
            <StatTile label="Issues found" value={totals.issues} hint={`${totals.avgIssuesPerReview} per review`} />
            <StatTile label="Approval rate" value={`${totals.approvalRate}%`} hint="of decided reviews" />
          </div>

          {/* trend + severity */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3" style={{ marginBottom: 16 }}>
            <section className="app-card xl:col-span-2" style={{ padding: 20 }} aria-labelledby="trend-h">
              <div className="flex items-start justify-between" style={{ marginBottom: 6 }}>
                <div>
                  <h2 id="trend-h" className="kicker" style={{ margin: 0 }}>
                    Consistency over time
                  </h2>
                  <p style={{ color: "var(--muted)", fontSize: 12, margin: "4px 0 0" }}>
                    Higher is better. Each point is one review — hover to see which.
                  </p>
                </div>
                <span style={{ fontSize: 12, color: delta >= 0 ? "var(--text)" : "var(--danger)" }}>
                  {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)} pts
                </span>
              </div>
              <AreaChart trend={trend} />
            </section>

            <section className="app-card" style={{ padding: 20 }} aria-labelledby="sev-h">
              <h2 id="sev-h" className="kicker" style={{ marginBottom: 4 }}>
                Issues by severity
              </h2>
              <p style={{ color: "var(--muted)", fontSize: 12, margin: "0 0 16px" }}>
                Every contradiction Harmony has flagged, by how serious it is.
              </p>
              <Donut
                slices={severity.map((s) => ({ label: s.label, count: s.count, token: s.token }))}
                centerLabel="findings"
              />
            </section>
          </div>

          {/* risk + types */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2" style={{ marginBottom: 16 }}>
            <section className="app-card" style={{ padding: 20 }} aria-labelledby="risk-h">
              <h2 id="risk-h" className="kicker" style={{ marginBottom: 4 }}>
                Documents by risk
              </h2>
              <p style={{ color: "var(--muted)", fontSize: 12, margin: "0 0 14px" }}>
                Where your documents currently stand.
              </p>
              <BarList items={risk} />
            </section>

            <section className="app-card" style={{ padding: 20 }} aria-labelledby="type-h">
              <h2 id="type-h" className="kicker" style={{ marginBottom: 4 }}>
                Documents by type
              </h2>
              <p style={{ color: "var(--muted)", fontSize: 12, margin: "0 0 14px" }}>
                What kind of disclosures you review most.
              </p>
              {types.length ? (
                <BarList items={types} />
              ) : (
                <p style={{ color: "var(--muted)", fontSize: 13 }}>No documents yet.</p>
              )}
            </section>
          </div>

          {/* performance */}
          <section className="app-card scroll-x" style={{ padding: 20 }} aria-labelledby="perf-h">
            <h2 id="perf-h" className="kicker" style={{ marginBottom: 4 }}>
              Review performance
            </h2>
            <p style={{ color: "var(--muted)", fontSize: 12, margin: "0 0 12px" }}>
              How quickly each reviewer clears drafts, and how often they approve.
            </p>
            {performance.length ? (
              <table className="app-table" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th scope="col">Reviewer</th>
                    <th scope="col">Avg time to decide</th>
                    <th scope="col">Approval rate</th>
                  </tr>
                </thead>
                <tbody>
                  {performance.map((r) => (
                    <tr key={r.name}>
                      <td style={{ color: "var(--text)" }}>{r.name}</td>
                      <td style={{ color: "var(--muted)" }}>{r.time}</td>
                      <td style={{ color: "var(--muted)" }}>{r.rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: "var(--muted)", fontSize: 13 }}>
                No reviews have been approved or rejected yet.
              </p>
            )}
          </section>
        </>
      )}
    </>
  );
}
