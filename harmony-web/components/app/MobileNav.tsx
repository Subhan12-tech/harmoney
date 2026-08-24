"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "@/context/RoleContext";
import { ORGS } from "@/lib/data";
import { NAV_GROUPS, isNavItemActive } from "./Sidebar";

/**
 * The narrow-screen stand-in for the sidebar: the same destinations as a
 * horizontally scrollable strip, plus the workspace switcher. Shown only below
 * `lg`, where a 240px rail would leave the content column unusable.
 */
export function MobileNav() {
  const pathname = usePathname();
  const { orgId, setOrgId } = useRole();
  const items = NAV_GROUPS.flatMap((group) => group.items);

  return (
    <div
      className="scroll-x flex items-center gap-2 lg:hidden"
      style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-elev)" }}
    >
      <nav aria-label="Sections" className="flex flex-none items-center gap-2">
        {items.map((item) => {
          const active = isNavItemActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="flex flex-none items-center gap-2"
              style={{
                padding: "7px 12px",
                borderRadius: 20,
                fontSize: 13,
                whiteSpace: "nowrap",
                color: active ? "var(--text)" : "var(--muted)",
                background: active ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <Icon size={14} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <label htmlFor="org-switcher-mobile" className="sr-only">
        Organization
      </label>
      <select
        id="org-switcher-mobile"
        className="h-select flex-none"
        value={orgId}
        onChange={(e) => setOrgId(e.target.value)}
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 20,
          padding: "7px 12px",
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
  );
}
