"use client";

import { useEffect, useState } from "react";
import { Card, EmptyState, ErrorBox, Kicker, PageHead, Table, Td, Th } from "@/components/ui/kit";
import { api } from "@/lib/api";

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api("/api/admin/stats"), api("/api/admin/orgs"), api("/api/admin/users")])
      .then(([s, o, u]: any[]) => {
        setStats(s);
        setOrgs(o.organizations);
        setUsers(u.users);
      })
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!stats) return <div style={{ color: "#8a8a8a" }}>Loading…</div>;

  return (
    <div>
      <PageHead eyebrow="Super-admin" title="Platform Admin" subtitle="An overview of every company using Harmony." />

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", marginBottom: 24 }}>
        {[
          ["Companies", stats.organizations],
          ["Users", stats.users],
          ["Documents", stats.documents],
          ["Reviews", stats.reviews],
        ].map(([label, value]) => (
          <Card key={label as string} glow style={{ padding: 20 }}>
            <div className="font-mono" style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "#666", marginBottom: 10 }}>
              {label}
            </div>
            <div className="font-serif" style={{ fontSize: 34, color: "#fff" }}>
              {value}
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <Kicker>Companies</Kicker>
        {orgs.length ? (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Slug</Th>
                <Th>Members</Th>
                <Th>Plan</Th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.org_id}>
                  <Td>{o.name}</Td>
                  <Td muted>{o.slug}</Td>
                  <Td>{o.members}</Td>
                  <Td>
                    <span style={{ background: "#151515", borderRadius: 6, padding: "3px 9px", fontSize: 11 }}>{o.plan}</span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState>No companies yet.</EmptyState>
        )}
      </Card>

      <Card style={{ marginTop: 20 }}>
        <Kicker>All users</Kicker>
        <Table>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <Td>{u.name || "—"}</Td>
                <Td muted>{u.email}</Td>
                <Td>{u.superadmin && <span style={{ background: "rgba(110,168,255,.15)", color: "#6ea8ff", borderRadius: 6, padding: "3px 9px", fontSize: 11 }}>super-admin</span>}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
