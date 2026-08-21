"use client";

import { useEffect, useState } from "react";
import { Button, Card, EmptyState, ErrorBox, Input, Kicker, Label, Modal, OkBox, PageHead, Select, Table, Td, Th } from "@/components/ui/kit";
import { api } from "@/lib/api";
import { describeAudit, ROLE_RANK, timeAgo } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";

export default function TeamPage() {
  const { me } = useAuth();
  const showToast = useToast();
  const [members, setMembers] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [inviteResult, setInviteResult] = useState<React.ReactNode>(null);

  const canManage = me ? ROLE_RANK[me.role || "viewer"] >= ROLE_RANK.admin : false;

  function load() {
    Promise.all([api("/api/orgs/members"), api("/api/audit?limit=10")])
      .then(([m, a]: any[]) => {
        setMembers(m.members);
        setActivity(a.audit);
      })
      .catch((e) => setError(String(e)));
  }

  useEffect(load, []);

  async function changeRole(userId: string, role: string) {
    try {
      await api("/api/orgs/members/role", "POST", { user_id: userId, role });
      showToast("Role updated.");
      load();
    } catch (e) {
      showToast(String(e), true);
      load();
    }
  }

  async function suspend(userId: string) {
    if (!confirm("Suspend this member?")) return;
    try {
      await api(`/api/orgs/members/${userId}/suspend`, "POST");
      showToast("Member suspended.");
      load();
    } catch (e) {
      showToast(String(e), true);
    }
  }

  async function sendInvite() {
    try {
      const d: any = await api("/api/orgs/invite", "POST", { email: inviteEmail.trim(), role: inviteRole });
      setInviteResult(
        <OkBox>
          Invite created. Email sending isn&rsquo;t wired up yet — share this link manually:
          <br />
          <code style={{ fontSize: 11.5, wordBreak: "break-all" }}>
            {typeof window !== "undefined" ? window.location.origin : ""}/signup?invite={d.invite_token}
          </code>
        </OkBox>
      );
    } catch (e) {
      setInviteResult(<ErrorBox>{String(e)}</ErrorBox>);
    }
  }

  if (error) return <ErrorBox>{error}</ErrorBox>;

  return (
    <div>
      <PageHead eyebrow="People" title="Team" subtitle="Who's on your team, and what they've been up to." />

      <div className="flex justify-end" style={{ marginBottom: 14 }}>
        {canManage && (
          <Button variant="primary" onClick={() => setShowInvite(true)}>
            ＋ Invite someone
          </Button>
        )}
      </div>

      <Card style={{ padding: "8px 24px 6px" }}>
        {members.length ? (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {members.map((x) => (
                <tr key={x.user_id}>
                  <Td>{x.name || "—"}</Td>
                  <Td muted>{x.email}</Td>
                  <Td>
                    {canManage ? (
                      <Select value={x.role} onChange={(e) => changeRole(x.user_id, e.target.value)} style={{ fontSize: 12, padding: "5px 24px 5px 8px" }}>
                        {["viewer", "editor", "reviewer", "admin", "owner"].map((r) => (
                          <option key={r} value={r}>
                            {r[0].toUpperCase() + r.slice(1)}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <span style={{ border: "1px solid #1a1a1a", borderRadius: 6, padding: "3px 9px", fontSize: 11 }}>{x.role}</span>
                    )}
                  </Td>
                  <Td>
                    <span style={{ background: "#151515", borderRadius: 6, padding: "3px 9px", fontSize: 11 }}>{x.status}</span>
                  </Td>
                  <Td>
                    {canManage && x.status !== "suspended" && (
                      <button onClick={() => suspend(x.user_id)} style={{ background: "none", border: "none", color: "#ffb7a5", fontSize: 13, cursor: "pointer" }}>
                        Suspend
                      </button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState>No members yet.</EmptyState>
        )}
      </Card>

      <Card style={{ marginTop: 20 }}>
        <Kicker>Recent activity</Kicker>
        {activity.length ? (
          activity.map((a, i) => (
            <div key={i} className="flex justify-between" style={{ padding: "8px 0", borderBottom: "1px solid #141414", fontSize: 13.5 }}>
              <span>{describeAudit(a)}</span>
              <span style={{ color: "#666", fontSize: 12 }}>{timeAgo(a.created_at)}</span>
            </div>
          ))
        ) : (
          <EmptyState>No activity yet.</EmptyState>
        )}
      </Card>

      {showInvite && (
        <Modal
          onClose={() => {
            setShowInvite(false);
            setInviteResult(null);
          }}
        >
          <h3 className="font-serif" style={{ fontSize: 20, marginBottom: 14 }}>
            Invite team member
          </h3>
          <Label>Email</Label>
          <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="name@company.com" style={{ marginBottom: 12 }} />
          <Label>Role</Label>
          <Select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} style={{ marginBottom: 16 }}>
            <option>viewer</option>
            <option>editor</option>
            <option>reviewer</option>
            <option>admin</option>
          </Select>
          {inviteResult}
          <div className="flex justify-end gap-3" style={{ marginTop: 14 }}>
            <Button
              variant="secondary"
              onClick={() => {
                setShowInvite(false);
                setInviteResult(null);
              }}
            >
              Close
            </Button>
            <Button variant="primary" onClick={sendInvite}>
              Send invitation
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
