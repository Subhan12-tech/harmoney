"use client";

import { useRole } from "@/context/RoleContext";
import { useAsyncResource } from "@/lib/useAsyncData";
import { getAnalytics } from "@/lib/data";
import { LineChart } from "@/components/app/LineChart";
import { BarList } from "@/components/app/BarList";
import { SkeletonCard } from "@/components/app/Skeleton";

export default function AnalyticsPage() {
  const { orgId } = useRole();
  const { data } = useAsyncResource(() => getAnalytics(orgId), [orgId]);

  if (!data) {
    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SkeletonCard height={220} />
        <SkeletonCard height={220} />
        <SkeletonCard height={240} />
        <SkeletonCard height={240} />
      </div>
    );
  }

  const latest = data.scores[data.scores.length - 1];
  const first = data.scores[0];
  const delta = latest - first;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2" style={{ marginBottom: 16 }}>
        <section className="app-card" style={{ padding: 20 }} aria-labelledby="score-heading">
          <div className="flex items-start justify-between">
            <h2 id="score-heading" className="kicker" style={{ marginBottom: 8 }}>
              Consistency score — trailing 6 months
            </h2>
            <span style={{ fontSize: 12, color: delta >= 0 ? "var(--accent)" : "var(--muted)" }}>
              {delta >= 0 ? "+" : ""}
              {delta} pts
            </span>
          </div>
          <LineChart values={data.scores} labels={data.months} />
          <div className="flex justify-between" style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
            {data.months.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        </section>

        <section className="app-card" style={{ padding: 20 }} aria-labelledby="severity-heading">
          <h2 id="severity-heading" className="kicker" style={{ marginBottom: 8 }}>
            Issues by severity
          </h2>
          <BarList items={data.severity} />
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="app-card" style={{ padding: 20 }} aria-labelledby="type-heading">
          <h2 id="type-heading" className="kicker" style={{ marginBottom: 8 }}>
            Issues by document type
          </h2>
          <BarList items={data.types} />
        </section>

        <section className="app-card" style={{ padding: 20 }} aria-labelledby="perf-heading">
          <h2 id="perf-heading" className="kicker" style={{ marginBottom: 8 }}>
            Review performance
          </h2>
          <table className="app-table" style={{ fontSize: 13 }}>
            <thead>
              <tr>
                <th scope="col">Reviewer</th>
                <th scope="col">Avg time</th>
                <th scope="col">Approval rate</th>
              </tr>
            </thead>
            <tbody>
              {data.performance.map((r) => (
                <tr key={r.name}>
                  <td style={{ color: "var(--text)" }}>{r.name}</td>
                  <td style={{ color: "var(--muted)" }}>{r.time}</td>
                  <td style={{ color: "var(--muted)" }}>{r.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
