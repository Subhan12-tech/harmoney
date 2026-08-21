"use client";

import { useRole } from "@/context/RoleContext";
import { useAsyncData } from "@/lib/useAsyncData";
import { getTeamActivity } from "@/lib/data";
import { TeamMembers } from "@/components/app/TeamMembers";

export default function TeamPage() {
  const { orgId } = useRole();
  const activity = useAsyncData(() => getTeamActivity(orgId), [orgId], []);

  return (
    <>
      <TeamMembers />

      <section className="app-card" style={{ padding: 20, marginTop: 16 }} aria-labelledby="team-activity-heading">
        <h2 id="team-activity-heading" className="kicker" style={{ marginBottom: 8 }}>
          Recent activity
        </h2>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {activity.map((a) => (
            <li
              key={a.text}
              className="flex items-center justify-between gap-4"
              style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}
            >
              <span className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="font-heading flex flex-none items-center justify-center"
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "color-mix(in srgb, var(--accent) 22%, transparent)",
                    color: "var(--accent)",
                    fontSize: 10.5,
                    fontWeight: 700,
                  }}
                >
                  {a.initials}
                </span>
                <span style={{ color: "var(--text)" }}>{a.text}</span>
              </span>
              <span style={{ color: "var(--muted)", fontSize: 11.5, whiteSpace: "nowrap" }}>{a.time}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
