"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "./Logo";
import { api } from "@/lib/api";
import { describeAudit, initials, timeAgo } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";

const NAV: { href: string; label: string }[] = [
  { href: "/dashboard", label: "Home" },
  { href: "/documents", label: "My Documents" },
  { href: "/review", label: "Check a Document" },
  { href: "/evidence", label: "Past Documents" },
  { href: "/analytics", label: "Reports" },
  { href: "/team", label: "Team" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { me, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<{ org_id: string; name: string }[]>([]);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
        setProfileOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => {
    api("/api/orgs/mine").then((d: any) => setOrgs(d.organizations)).catch(() => {});
  }, [me?.org_id]);

  async function openNotifs() {
    const next = !notifOpen;
    setNotifOpen(next);
    setProfileOpen(false);
    if (next) {
      try {
        const d: any = await api("/api/audit?limit=6");
        setNotifs(d.audit);
      } catch {}
    }
  }

  async function handleSwitchOrg(orgId: string) {
    if (!me || orgId === me.org_id) return;
    try {
      await api(`/api/orgs/switch/${orgId}`, "POST").then((d: any) => {
        localStorage.setItem("harmony_token", d.token);
        window.location.reload();
      });
    } catch {}
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  if (!me) return null;

  return (
    <div className="grid min-h-screen" style={{ gridTemplateColumns: "260px 1fr" }}>
      <aside style={{ borderRight: "1px solid #141414", background: "#050505", padding: "22px 16px", display: "flex", flexDirection: "column" }}>
        <Link href="/dashboard" className="flex items-center gap-2.5" style={{ padding: "0 6px 26px" }}>
          <Logo size={24} glow />
          <span className="font-serif" style={{ fontSize: 19 }}>
            Harmony
          </span>
        </Link>

        {NAV.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "block",
                padding: "12px 14px",
                marginBottom: 3,
                borderRadius: 9,
                fontSize: 14.5,
                fontWeight: 600,
                color: active ? "#fff" : "#8a8a8a",
                background: active ? "rgba(110,168,255,.12)" : "transparent",
                borderLeft: active ? "2px solid #6ea8ff" : "2px solid transparent",
                transition: "background .15s, color .15s",
              }}
            >
              {item.label}
            </Link>
          );
        })}

        {me.is_superadmin && (
          <>
            <div className="font-mono" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#444", padding: "0 10px", margin: "18px 0 8px" }}>
              Platform
            </div>
            <Link
              href="/admin"
              style={{
                display: "block",
                padding: "12px 14px",
                borderRadius: 9,
                fontSize: 14.5,
                fontWeight: 600,
                color: pathname === "/admin" ? "#fff" : "#8a8a8a",
                background: pathname === "/admin" ? "rgba(157,92,255,.14)" : "transparent",
                borderLeft: pathname === "/admin" ? "2px solid #9d5cff" : "2px solid transparent",
              }}
            >
              Platform Admin
            </Link>
          </>
        )}

        {orgs.length > 1 && (
          <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid #141414" }}>
            <select
              value={me.org_id}
              onChange={(e) => handleSwitchOrg(e.target.value)}
              style={{ width: "100%", background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 8, padding: "8px 10px", color: "#e5e5e5", fontSize: 13 }}
            >
              {orgs.map((o) => (
                <option key={o.org_id} value={o.org_id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </aside>

      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, position: "relative" }}>
        <div
          className="pointer-events-none absolute"
          style={{
            inset: 0,
            background:
              "radial-gradient(900px 460px at 15% -10%, rgba(70,120,220,.09), transparent 60%), " +
              "radial-gradient(600px 340px at 100% 0%, rgba(120,80,220,.06), transparent 60%)",
            zIndex: 0,
          }}
        />
        <header
          className="flex items-center gap-4"
          style={{ padding: "16px 30px", borderBottom: "1px solid #141414", position: "sticky", top: 0, background: "rgba(0,0,0,.85)", backdropFilter: "blur(10px)", zIndex: 5 }}
        >
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }} ref={popRef}>
            <span style={{ fontSize: 12, border: "1px solid #1a1a1a", borderRadius: 7, padding: "4px 11px", color: "#a3a3a3" }}>
              {me.role ? me.role[0].toUpperCase() + me.role.slice(1) : "—"}
            </span>

            <div style={{ position: "relative" }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openNotifs();
                }}
                style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 8, padding: "8px 14px", fontSize: 13, color: "#e5e5e5", cursor: "pointer" }}
              >
                Activity
              </button>
              {notifOpen && (
                <div style={{ position: "absolute", right: 0, top: 42, width: 320, background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 12, zIndex: 20, boxShadow: "0 20px 60px rgba(0,0,0,.5)", overflow: "hidden" }}>
                  <div style={{ padding: "12px 14px", borderBottom: "1px solid #141414", fontWeight: 600, fontSize: 13 }}>Recent activity</div>
                  <div style={{ maxHeight: 320, overflow: "auto" }}>
                    {notifs.length ? (
                      notifs.map((n, i) => (
                        <div key={i} style={{ padding: "11px 14px", borderBottom: "1px solid #141414", fontSize: 12.5 }}>
                          <div>{describeAudit(n)}</div>
                          <div style={{ color: "#666", fontSize: 11, marginTop: 2 }}>{timeAgo(n.created_at)}</div>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: 16, color: "#666", fontSize: 13 }}>No activity yet.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={{ position: "relative" }}>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setProfileOpen((v) => !v);
                  setNotifOpen(false);
                }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #333, #0a0a0a)",
                  border: "1px solid #222",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {initials(me.full_name || me.email)}
              </div>
              {profileOpen && (
                <div style={{ position: "absolute", right: 0, top: 40, width: 210, background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 12, zIndex: 20, padding: 6, boxShadow: "0 20px 60px rgba(0,0,0,.5)" }}>
                  <div style={{ padding: "9px 10px", borderBottom: "1px solid #141414", marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{me.full_name || me.email}</div>
                    <div style={{ color: "#666", fontSize: 11 }}>
                      {me.role}
                      {me.is_superadmin ? " · super-admin" : ""}
                    </div>
                  </div>
                  <Link href="/settings" onClick={() => setProfileOpen(false)} style={{ display: "block", padding: "8px 10px", fontSize: 13, borderRadius: 6 }}>
                    Profile &amp; preferences
                  </Link>
                  <Link href="/settings?tab=security" onClick={() => setProfileOpen(false)} style={{ display: "block", padding: "8px 10px", fontSize: 13, borderRadius: 6 }}>
                    Security
                  </Link>
                  <button
                    onClick={handleLogout}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", fontSize: 13, color: "#6ea8ff", background: "none", border: "none", cursor: "pointer", borderRadius: 6 }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main style={{ padding: 32, overflow: "auto", flex: 1, position: "relative", zIndex: 1 }}>{children}</main>
      </div>
    </div>
  );
}
