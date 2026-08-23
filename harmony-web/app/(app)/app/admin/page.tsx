"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  adminApprove,
  adminOrgs,
  adminPending,
  adminReactivate,
  adminStats,
  adminSuspend,
  isSuperadmin,
  type AdminOrg,
  type PendingOrg,
} from "@/lib/api";
import { relativeTime } from "@/lib/mappers";
import { useToast } from "@/components/app/Toast";
import { Skeleton } from "@/components/app/Skeleton";

/**
 * Platform admin — the licence queue.
 *
 * This is the vendor's screen, not a customer's: it is the only place access to
 * the product is granted or withdrawn. The backend gates it on `is_superadmin`
 * regardless of what renders here, so hiding the page is convenience, not
 * security.
 */
export default function AdminPage() {
  const { toast } = useToast();

  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [pending, setPending] = useState<PendingOrg[]>([]);
  const [orgs, setOrgs] = useState<AdminOrg[]>([]);
  const [stats, setStats] = useState<{ organizations: number; users: number; documents: number; reviews: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetched together so the queue and the full list can never disagree.
      const [p, o, s] = await Promise.all([adminPending(), adminOrgs(), adminStats()]);
      setPending(p.pending ?? []);
      setOrgs(o.organizations ?? []);
      setStats(s);
      setAllowed(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setAllowed(false);
      } else {
        toast(err instanceof ApiError ? err.message : "Could not load the admin data.");
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // The stored flag decides what to render first; the request is the real test.
    if (!isSuperadmin()) setAllowed(null);
    void load();
  }, [load]);

  async function act(orgId: string, what: "approve" | "suspend" | "reactivate", name: string) {
    setBusy(orgId);
    try {
      if (what === "approve") {
        await adminApprove(orgId);
        toast(`${name} approved. They can use Harmony immediately.`);
      } else if (what === "suspend") {
        const reason = window.prompt(
          `Why is ${name} being suspended? This message is shown to them.`,
          "Subscription lapsed. Contact your account manager to restore access.",
        );
        if (reason === null) return; // cancelled
        await adminSuspend(orgId, reason);
        toast(`${name} suspended. Access stops on their next request.`);
      } else {
        await adminReactivate(orgId);
        toast(`${name} reactivated.`);
      }
      await load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "That action did not go through.");
    } finally {
      setBusy(null);
    }
  }

  if (allowed === false) {
    return (
      <div className="app-card" style={{ padding: 24, maxWidth: 520 }}>
        <h1 className="font-heading" style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>
          Platform admin
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 13.5, margin: 0, lineHeight: 1.6 }}>
          This area is limited to the Harmony platform owner. If this is your deployment, set
          PLATFORM_OWNER_EMAIL to your address and sign in again.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="font-heading" style={{ fontSize: 19, fontWeight: 600, margin: 0 }}>
            Platform admin
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 12.5, margin: "4px 0 0" }}>
            Grant and withdraw access to Harmony. Suspending never deletes data.
          </p>
        </div>
        <button type="button" onClick={() => void load()} style={ghostButton}>
          Refresh
        </button>
      </div>

      {stats && (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", marginBottom: 18 }}>
          <Stat label="Organizations" value={stats.organizations} />
          <Stat label="Users" value={stats.users} />
          <Stat label="Documents" value={stats.documents} />
          <Stat label="Reviews" value={stats.reviews} />
        </div>
      )}

      {/* ---- Approval queue ---- */}
      <section className="app-card" style={{ padding: 20, marginBottom: 18 }} aria-labelledby="queue-heading">
        <div className="flex items-center gap-2.5" style={{ marginBottom: 12 }}>
          <h2 id="queue-heading" className="kicker" style={{ margin: 0 }}>
            Waiting for approval
          </h2>
          {pending.length > 0 && (
            <span
              style={{
                background: "color-mix(in srgb, var(--warn) 12%, transparent)",
                color: "var(--warn)",
                border: "1px solid color-mix(in srgb, var(--warn) 26%, transparent)",
                borderRadius: 6,
                padding: "1px 7px",
                fontSize: 11.5,
                fontWeight: 500,
              }}
            >
              {pending.length}
            </span>
          )}
        </div>

        {loading && <Skeleton />}

        {!loading && pending.length === 0 && (
          <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
            Nobody is waiting. New sign-ups appear here automatically.
          </p>
        )}

        {!loading &&
          pending.map((p) => (
            <div
              key={p.org_id}
              className="flex flex-wrap items-center justify-between gap-3"
              style={{ padding: "12px 0", borderTop: "1px solid var(--border)" }}
            >
              <div style={{ minWidth: 200 }}>
                <div style={{ fontSize: 14, color: "var(--text)" }}>{p.name}</div>
                <div style={{ color: "var(--muted)", fontSize: 11.5 }}>
                  {p.requested_by_name ? `${p.requested_by_name} · ` : ""}
                  {p.requested_by} · requested {relativeTime(p.created_at)}
                </div>
              </div>
              <button
                type="button"
                disabled={busy === p.org_id}
                onClick={() => void act(p.org_id, "approve", p.name)}
                style={{ ...primaryButton, opacity: busy === p.org_id ? 0.6 : 1 }}
              >
                {busy === p.org_id ? "Approving…" : "Approve access"}
              </button>
            </div>
          ))}
      </section>

      {/* ---- All organizations ---- */}
      <section className="app-card scroll-x" style={{ padding: "6px 20px 4px" }} aria-labelledby="orgs-heading">
        <h2 id="orgs-heading" className="sr-only">
          All organizations
        </h2>
        <table className="app-table">
          <thead>
            <tr>
              <th scope="col">Organization</th>
              <th scope="col">Status</th>
              <th scope="col">Members</th>
              <th scope="col">Plan</th>
              <th scope="col">Created</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {!loading && orgs.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "var(--muted)" }}>
                  No organizations yet.
                </td>
              </tr>
            )}
            {orgs.map((o) => (
              <tr key={o.org_id}>
                <td style={{ color: "var(--text)" }}>
                  {o.name}
                  {o.status_reason && (
                    <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 2 }}>{o.status_reason}</div>
                  )}
                </td>
                <td>
                  <StatusChip status={o.status} />
                </td>
                <td style={{ color: "var(--muted)" }}>{o.members}</td>
                <td style={{ color: "var(--muted)" }}>{o.plan}</td>
                <td style={{ color: "var(--muted)" }}>{relativeTime(o.created_at)}</td>
                <td>
                  <div className="flex gap-2.5">
                    {o.status !== "active" && (
                      <button
                        type="button"
                        disabled={busy === o.org_id}
                        onClick={() => void act(o.org_id, o.status === "pending" ? "approve" : "reactivate", o.name)}
                        style={linkButton}
                      >
                        {o.status === "pending" ? "Approve" : "Reactivate"}
                      </button>
                    )}
                    {o.status === "active" && (
                      <button
                        type="button"
                        disabled={busy === o.org_id}
                        onClick={() => void act(o.org_id, "suspend", o.name)}
                        style={{ ...linkButton, color: "color-mix(in srgb, var(--danger) 75%, white)" }}
                      >
                        Suspend
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="app-card" style={{ padding: 14 }}>
      <div style={{ color: "var(--muted)", fontSize: 11.5 }}>{label}</div>
      <div className="font-heading" style={{ fontSize: 24, fontWeight: 550, marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    active: { bg: "var(--accent)", fg: "var(--accent)", label: "Active" },
    pending: { bg: "var(--warn)", fg: "var(--warn)", label: "Pending" },
    suspended: { bg: "var(--danger)", fg: "var(--danger)", label: "Suspended" },
  };
  const c = map[status] ?? map.pending;
  return (
    <span
      style={{
        background: `color-mix(in srgb, ${c.bg} 16%, transparent)`,
        color: c.fg,
        border: `1px solid color-mix(in srgb, ${c.bg} 35%, transparent)`,
        borderRadius: 999,
        padding: "2px 10px",
        fontSize: 11.5,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {c.label}
    </span>
  );
}

const primaryButton: React.CSSProperties = {
  background: "var(--accent)",
  color: "var(--on-accent)",
  border: "none",
  borderRadius: 8,
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
  whiteSpace: "nowrap",
};

const ghostButton: React.CSSProperties = {
  background: "var(--surface-2, rgba(255,255,255,.07))",
  border: "1px solid var(--border)",
  color: "var(--text)",
  borderRadius: 8,
  padding: "7px 14px",
  fontSize: 12.5,
  cursor: "pointer",
  fontFamily: "inherit",
};

const linkButton: React.CSSProperties = {
  fontSize: 12,
  color: "var(--accent)",
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  fontFamily: "inherit",
};
