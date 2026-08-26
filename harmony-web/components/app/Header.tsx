"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { useState } from "react";
import { useRole } from "@/context/RoleContext";
import { useMe, initialsOf } from "@/context/MeContext";
import { NOTIFICATIONS, getOrg } from "@/lib/data";
import { apiPost, clearSession } from "@/lib/api";
import { Popover } from "./Popover";
import { RoleSwitcher } from "./RoleSwitcher";
import { BellIcon, SearchIcon } from "./icons";
import { ThemeToggle } from "./ThemeToggle";

/** Page titles are derived from the URL so the header stays in sync with routing. */
function titleFor(pathname: string): string {
  if (pathname === "/app") return "Dashboard";
  if (pathname.startsWith("/app/files")) return "Files";
  if (pathname.startsWith("/app/documents")) return "All Documents";
  if (pathname.startsWith("/app/review")) return "Review Workspace";
  if (pathname.startsWith("/app/knowledge")) return "Evidence Library";
  if (pathname.startsWith("/app/analytics")) return "Analytics";
  if (pathname.startsWith("/app/team")) return "Team & Activity";
  if (pathname.startsWith("/app/settings")) return "Settings";
  return "Harmony";
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, orgId } = useRole();
  const { me } = useMe();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const org = getOrg(orgId);
  const displayName = me?.full_name?.trim() || me?.email || "Your account";
  const initials = initialsOf(me?.full_name || me?.email || "");

  const menuItemStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "8px 10px",
    fontSize: 13,
    borderRadius: 6,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontFamily: "inherit",
  };

  return (
    <header
      className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 lg:gap-3.5 lg:px-[26px] lg:py-3.5"
      style={{
        borderBottom: "1px solid var(--border)",
        background: "color-mix(in srgb, var(--bg) 92%, transparent)",
        backdropFilter: "blur(10px)",
      }}
    >
      {/* The sidebar carries the wordmark from lg up; below that it lives here. */}
      <Link href="/app" className="flex flex-none items-center lg:hidden" aria-label="Harmony home">
        <Logo size={20} glow id="logo-header" />
      </Link>

      <h1
        className="font-heading flex-none"
        style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "var(--text)" }}
      >
        {titleFor(pathname)}
      </h1>

      <div className="relative hidden flex-1 sm:block" style={{ maxWidth: 340, marginLeft: 16 }}>
        <label htmlFor="app-search" className="sr-only">
          Search documents and evidence
        </label>
        <span
          className="pointer-events-none absolute"
          style={{ left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--faint)" }}
        >
          <SearchIcon size={15} />
        </span>
        <input
          id="app-search"
          type="search"
          placeholder="Search documents, evidence…"
          style={{
            width: "100%",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "8px 12px 8px 32px",
            color: "var(--text)",
            fontSize: 13,
          }}
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />
        <RoleSwitcher />

        {/* ---- Notifications ---- */}
        <Popover
          open={notifOpen}
          onClose={() => setNotifOpen(false)}
          label="Notifications"
          width={300}
          trigger={(props) => (
            <button
              {...props}
              type="button"
              onClick={() => {
                setNotifOpen((v) => !v);
                setProfileOpen(false);
              }}
              className="relative flex items-center justify-center"
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                cursor: "pointer",
              }}
            >
              <span className="sr-only">Notifications (3 unread)</span>
              <BellIcon size={16} />
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 6,
                  right: 7,
                  width: 6,
                  height: 6,
                  background: "var(--accent)",
                  borderRadius: "50%",
                }}
              />
            </button>
          )}
        >
          <div
            className="flex justify-between"
            style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}
          >
            <strong style={{ fontSize: 13, color: "var(--text)" }}>Notifications</strong>
            <button
              type="button"
              style={{
                fontSize: 11,
                color: "var(--accent)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Mark all read
            </button>
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {NOTIFICATIONS.map((n) => (
              <li
                key={n.title}
                style={{ padding: "11px 14px", borderBottom: "1px solid var(--border)", fontSize: 12.5 }}
              >
                <div style={{ fontWeight: 500, color: "var(--text)" }}>{n.title}</div>
                <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 2 }}>{n.time}</div>
              </li>
            ))}
          </ul>
        </Popover>

        {/* ---- Profile ---- */}
        <Popover
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          label="Account menu"
          width={200}
          trigger={(props) => (
            <button
              {...props}
              type="button"
              onClick={() => {
                setProfileOpen((v) => !v);
                setNotifOpen(false);
              }}
              className="font-heading flex items-center justify-center"
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                overflow: "hidden",
                background: "var(--surface-2)",
                // --text is what belongs on a plain surface. (This used to use
                // --on-accent, which is for text on a FILLED accent - it read as
                // near-black on the near-black film here and vanished in dark.)
                color: "var(--text)",
                border: "1px solid var(--border)",
                fontSize: 11.5,
                fontWeight: 600,
                letterSpacing: "0.01em",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <span className="sr-only">Account menu for {displayName}</span>
              {me?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={me.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span aria-hidden="true">{initials}</span>
              )}
            </button>
          )}
        >
          <div style={{ padding: 6 }}>
            <div style={{ padding: "9px 10px", borderBottom: "1px solid var(--border)", marginBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{displayName}</div>
              <div style={{ color: "var(--muted)", fontSize: 11 }}>
                {role} · {org.name}
              </div>
            </div>
            <Link
              href="/app/settings/profile"
              onClick={() => setProfileOpen(false)}
              style={{ ...menuItemStyle, color: "var(--text)" }}
            >
              Edit profile
            </Link>
            <Link
              href="/app/settings/security"
              onClick={() => setProfileOpen(false)}
              style={{ ...menuItemStyle, color: "var(--text)" }}
            >
              Security
            </Link>
            <button
              type="button"
              onClick={() => {
                setProfileOpen(false);
                // Best-effort server-side revoke, then clear locally regardless.
                void apiPost("/api/auth/logout", {}, true).catch(() => {});
                clearSession();
                router.push("/login");
              }}
              style={{ ...menuItemStyle, color: "var(--accent)" }}
            >
              Sign out
            </button>
          </div>
        </Popover>
      </div>
    </header>
  );
}
