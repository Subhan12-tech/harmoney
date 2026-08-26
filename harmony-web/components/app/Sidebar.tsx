"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { adminPending, isSuperadmin } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { useRole } from "@/context/RoleContext";
import { ORGS } from "@/lib/data";
import {
  AnalyticsIcon,
  DashboardIcon,
  DocumentsIcon,
  FolderIcon,
  KnowledgeIcon,
  ReviewIcon,
  SettingsIcon,
  TeamIcon,
} from "./icons";

export interface NavItem {
  href: string;
  label: string;
  icon: (p: { size?: number }) => JSX.Element;
  /** A section is active for its sub-routes too, except the dashboard index. */
  exact?: boolean;
}

export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Workspace",
    items: [
      { href: "/app", label: "Dashboard", icon: DashboardIcon, exact: true },
      { href: "/app/files", label: "Files", icon: FolderIcon },
      { href: "/app/documents", label: "All Documents", icon: DocumentsIcon },
      { href: "/app/review", label: "Review Workspace", icon: ReviewIcon },
    ],
  },
  { title: "Knowledge", items: [{ href: "/app/knowledge", label: "Evidence Library", icon: KnowledgeIcon }] },
  { title: "Analytics", items: [{ href: "/app/analytics", label: "Analytics", icon: AnalyticsIcon }] },
  { title: "Team", items: [{ href: "/app/team", label: "Team & Activity", icon: TeamIcon }] },
  { title: "Settings", items: [{ href: "/app/settings/org", label: "Settings", icon: SettingsIcon }] },
];

export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  // "/app/review/[id]" and "/app/settings/[tab]" activate from their section root.
  const section = item.href.split("/").slice(0, 3).join("/");
  return pathname === item.href || pathname.startsWith(`${section}/`) || pathname === section;
}

export function Sidebar() {
  const pathname = usePathname();
  const { orgId, setOrgId } = useRole();

  // Platform-owner only. The count is the reason this is worth showing in the
  // nav rather than hiding behind a URL — a pending customer is revenue waiting.
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const showAdmin = isSuperadmin();

  useEffect(() => {
    if (!showAdmin) return;
    let cancelled = false;
    const poll = () =>
      adminPending()
        .then((r) => {
          if (!cancelled) setPendingCount(r.count ?? 0);
        })
        .catch(() => {
          /* a failure here must never break the nav */
        });
    void poll();
    // Cheap endpoint; refreshing means a signup shows up without a page reload.
    const id = setInterval(poll, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [showAdmin]);

  return (
    <aside
      className="hidden flex-col lg:flex"
      style={{ borderRight: "1px solid var(--border)", padding: "18px 12px", background: "var(--bg)" }}
    >
      <Link href="/app" className="flex items-center gap-2" style={{ padding: "2px 8px 26px" }}>
        <Logo size={19} id="logo-sidebar" />
        <span style={{ fontWeight: 550, fontSize: 14.5, letterSpacing: "-0.015em", color: "var(--text)" }}>
          Harmony
        </span>
      </Link>

      <nav aria-label="Sidebar" className="flex flex-col">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <div
              style={{
                fontSize: 11.5,
                letterSpacing: "-0.004em",
                color: "var(--faint)",
                padding: "0 8px",
                margin: group.title === "Workspace" ? "2px 0 6px" : "20px 0 6px",
              }}
            >
              {group.title}
            </div>
            {group.items.map((item) => {
              const active = isNavItemActive(pathname, item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className="transition-colors"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "7px 9px",
                    marginBottom: 1,
                    borderRadius: 7,
                    fontSize: 13,
                    fontWeight: active ? 500 : 400,
                    color: active ? "var(--text)" : "var(--muted)",
                    background: active ? "var(--surface-2)" : "transparent",
                  }}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
        {showAdmin && (
          <div key="Platform">
            <div
              style={{
                fontSize: 11.5,
                letterSpacing: "-0.004em",
                color: "var(--faint)",
                padding: "20px 8px 6px",
              }}
            >
              Platform
            </div>
            <Link
              href="/app/admin"
              className="flex items-center justify-between gap-2.5"
              style={{
                borderRadius: 7,
                padding: "7px 9px",
                fontSize: 13,
                fontWeight: pathname.startsWith("/app/admin") ? 500 : 400,
                color: pathname.startsWith("/app/admin") ? "var(--text)" : "var(--muted)",
                background: pathname.startsWith("/app/admin") ? "var(--surface-2)" : "transparent",
              }}
            >
              <span>Approvals</span>
              {pendingCount ? (
                <span
                  style={{
                    background: "color-mix(in srgb, var(--warn) 12%, transparent)",
                    color: "var(--warn)",
                    border: "1px solid color-mix(in srgb, var(--warn) 26%, transparent)",
                    borderRadius: 6,
                    padding: "0 6px",
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                >
                  {pendingCount}
                </span>
              ) : null}
            </Link>
          </div>
        )}
      </nav>

      <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid var(--border)" }}>
        <label htmlFor="org-switcher" className="sr-only">
          Organization
        </label>
        <select
          id="org-switcher"
          className="h-select"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          style={{
            width: "100%",
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "8px 12px",
            color: "var(--text)",
            fontSize: 13,
          }}
        >
          {ORGS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>
    </aside>
  );
}
