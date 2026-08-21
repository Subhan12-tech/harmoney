import Link from "next/link";
import { SETTINGS_TABS, type SettingsTab } from "@/lib/data";

/**
 * The settings segmented control. Each tab is a real route, so a settings
 * screen can be linked to, bookmarked, and reached with the back button.
 */
export function SettingsTabs({ active }: { active: SettingsTab }) {
  return (
    <nav
      aria-label="Settings sections"
      className="scroll-x inline-flex max-w-full"
      style={{ border: "1px solid var(--border)", borderRadius: 9, marginBottom: 18, maxWidth: "100%" }}
    >
      {SETTINGS_TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={`/app/settings/${tab.key}`}
            aria-current={isActive ? "page" : undefined}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              whiteSpace: "nowrap",
              background: isActive ? "var(--accent)" : "transparent",
              color: isActive ? "var(--on-accent)" : "var(--muted)",
              fontWeight: isActive ? 600 : 400,
              fontFamily: isActive ? "var(--font-manrope), system-ui, sans-serif" : "inherit",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
