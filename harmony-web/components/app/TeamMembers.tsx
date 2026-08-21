"use client";

import { useEffect, useMemo, useState } from "react";
import { useRole } from "@/context/RoleContext";
import { useAsyncData } from "@/lib/useAsyncData";
import { ROLES, getTeamMembers, type Role, type TeamMember } from "@/lib/data";
import { outlineChipStyle, primaryButtonStyle, secondaryButtonStyle, statusChipStyle } from "@/lib/style";
import { Modal } from "./Modal";
import { useToast } from "./Toast";

const fieldLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "var(--muted)",
  marginBottom: 5,
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  backgroundColor: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "9px 12px",
  color: "var(--text)",
  fontSize: 14,
};

/**
 * The members table, shared by Team & Activity and Settings → Members & Roles.
 *
 * Every mutation here is gated on `canManageTeam`, and the gate is applied to
 * the action itself as well as to the control that opens it — hiding a button
 * is presentation, not permission.
 */
export function TeamMembers({ compact = false, showInvite = true }: { compact?: boolean; showInvite?: boolean }) {
  const { orgId, role, canManageTeam } = useRole();
  const { toast } = useToast();

  const seed = useAsyncData(() => getTeamMembers(orgId, role), [orgId, role], []);

  /** Invitations and edits made in this session, layered over the seed. */
  const [invited, setInvited] = useState<TeamMember[]>([]);
  const [edits, setEdits] = useState<Record<string, Partial<TeamMember>>>({});
  const [removed, setRemoved] = useState<string[]>([]);

  // Local changes belong to one workspace; drop them when the workspace changes.
  useEffect(() => {
    setInvited([]);
    setEdits({});
    setRemoved([]);
  }, [orgId]);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("Reviewer");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [managing, setManaging] = useState<TeamMember | null>(null);

  const members = useMemo(
    () =>
      [...seed, ...invited]
        .filter((m) => !removed.includes(m.email))
        .map((m) => ({ ...m, ...edits[m.email] })),
    [seed, invited, removed, edits],
  );

  function submitInvite() {
    const email = inviteEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteError("Enter a valid work email address.");
      return;
    }
    if (members.some((m) => m.email.toLowerCase() === email.toLowerCase())) {
      setInviteError("That person is already a member of this workspace.");
      return;
    }
    const name = email
      .split("@")[0]
      .split(/[._-]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

    setInvited((prev) => [...prev, { name, email, role: inviteRole, status: "Invited", lastActive: "—" }]);
    setInviteOpen(false);
    setInviteEmail("");
    setInviteError(null);
    setInviteRole("Reviewer");
    toast(`Invitation sent to ${email}.`);
  }

  function updateMember(email: string, patch: Partial<TeamMember>) {
    setEdits((prev) => ({ ...prev, [email]: { ...prev[email], ...patch } }));
  }

  return (
    <>
      {showInvite && (
        <div className="flex justify-end" style={{ marginBottom: 12 }}>
          {canManageTeam ? (
            <button type="button" onClick={() => setInviteOpen(true)} style={primaryButtonStyle}>
              Invite member
            </button>
          ) : (
            <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
              Inviting members requires an Admin or Owner role.
            </span>
          )}
        </div>
      )}

      <div className="app-card scroll-x" style={{ padding: "6px 20px 4px" }}>
        <table className="app-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              {!compact && <th scope="col">Email</th>}
              <th scope="col">Role</th>
              <th scope="col">Status</th>
              {!compact && <th scope="col">Last active</th>}
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 && (
              <tr>
                <td colSpan={compact ? 4 : 6} style={{ color: "var(--muted)" }}>
                  Loading members…
                </td>
              </tr>
            )}
            {members.map((m) => (
              <tr key={m.email}>
                <td style={{ color: "var(--text)" }}>
                  {m.name}
                  {m.isCurrentUser && (
                    <span style={{ color: "var(--muted)", fontSize: 11.5 }}> · you</span>
                  )}
                </td>
                {!compact && <td style={{ color: "var(--muted)" }}>{m.email}</td>}
                <td>
                  <span style={outlineChipStyle}>{m.role}</span>
                </td>
                <td>
                  <span style={statusChipStyle(m.status)}>{m.status}</span>
                </td>
                {!compact && <td style={{ color: "var(--muted)" }}>{m.lastActive}</td>}
                <td>
                  {canManageTeam && !m.isCurrentUser && (
                    <button
                      type="button"
                      onClick={() => setManaging(m)}
                      style={{
                        fontSize: 12,
                        color: "var(--accent)",
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      Manage<span className="sr-only"> {m.name}</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---- Invite ---- */}
      <Modal
        open={inviteOpen && canManageTeam}
        onClose={() => {
          setInviteOpen(false);
          setInviteError(null);
        }}
        title="Invite team member"
        width={400}
      >
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="invite-email" style={fieldLabelStyle}>
            Email
          </label>
          <input
            id="invite-email"
            type="email"
            value={inviteEmail}
            onChange={(e) => {
              setInviteEmail(e.target.value);
              setInviteError(null);
            }}
            placeholder="name@company.com"
            style={fieldStyle}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="invite-role" style={fieldLabelStyle}>
            Role
          </label>
          <select
            id="invite-role"
            className="h-select"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as Role)}
            style={fieldStyle}
          >
            {ROLES.filter((r) => r !== "Owner").map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {inviteError && (
          <p
            role="alert"
            style={{
              fontSize: 12.5,
              color: "color-mix(in srgb, var(--danger) 78%, white)",
              margin: "0 0 12px",
            }}
          >
            {inviteError}
          </p>
        )}

        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            onClick={() => {
              setInviteOpen(false);
              setInviteError(null);
            }}
            style={{ ...secondaryButtonStyle, fontFamily: "inherit" }}
          >
            Cancel
          </button>
          <button type="button" onClick={submitInvite} style={{ ...primaryButtonStyle, fontWeight: 700 }}>
            Send invitation
          </button>
        </div>
      </Modal>

      {/* ---- Manage ---- */}
      <Modal
        open={managing !== null && canManageTeam}
        onClose={() => setManaging(null)}
        title={managing ? `Manage ${managing.name}` : "Manage member"}
        width={420}
      >
        {managing && (
          <>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 14px" }}>{managing.email}</p>

            <div style={{ marginBottom: 16 }}>
              <label htmlFor="manage-role" style={fieldLabelStyle}>
                Role
              </label>
              <select
                id="manage-role"
                className="h-select"
                value={managing.role}
                onChange={(e) => {
                  const nextRole = e.target.value as Role;
                  updateMember(managing.email, { role: nextRole });
                  setManaging({ ...managing, role: nextRole });
                  toast(`${managing.name} is now a ${nextRole}.`);
                }}
                style={fieldStyle}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const next = managing.status === "Suspended" ? "Active" : "Suspended";
                  updateMember(managing.email, { status: next });
                  setManaging(null);
                  toast(
                    next === "Suspended"
                      ? `${managing.name} has been suspended.`
                      : `${managing.name} has been reactivated.`,
                  );
                }}
                style={{ ...secondaryButtonStyle, fontFamily: "inherit" }}
              >
                {managing.status === "Suspended" ? "Reactivate" : "Suspend"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRemoved((prev) => [...prev, managing.email]);
                  setManaging(null);
                  toast(`${managing.name} was removed from the workspace.`);
                }}
                style={{
                  background: "transparent",
                  border: "1px solid color-mix(in srgb, var(--danger) 45%, transparent)",
                  borderRadius: 8,
                  padding: "9px 18px",
                  fontSize: 13.5,
                  color: "color-mix(in srgb, var(--danger) 75%, white)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Remove
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
