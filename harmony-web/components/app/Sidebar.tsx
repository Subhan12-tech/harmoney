"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { useRole } from "@/context/RoleContext";
import { ORGS } from "@/lib/data";
import {
  AnalyticsIcon,
  DashboardIcon,
  DocumentsIcon,
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
      { href: "/app/documents", label: "All Documents", icon: DocumentsIcon },
      { href: "/app/review/q3-fy2026-earnings", label: "Review Workspace", icon: ReviewIcon },
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

  return (
    <aside
      className="hidden flex-col lg:flex"
      style={{ borderRight: "1px solid var(--border)", padding: "20px 14px", background: "var(--bg-elev)" }}
    >
      <Link href="/app" className="flex items-center gap-2.5" style={{ padding: "0 6px 22px" }}>
        <Logo size={22} glow id="logo-sidebar" />
        <span className="font-heading" style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>
          Harmony
        </span>
      </Link>

      <nav aria-label="Sidebar" className="flex flex-col">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "rgba(238,241,244,.35)",
                padding: "0 8px",
                margin: group.title === "Workspace" ? "10px 0 6px" : "18px 0 6px",
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
                    gap: 10,
                    padding: "9px 10px",
                    marginBottom: 2,
                    borderRadius: 8,
                    fontSize: 13.5,
                    color: active ? "var(--text)" : "rgba(238,241,244,.65)",
                    background: active ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent",
                  }}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
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
