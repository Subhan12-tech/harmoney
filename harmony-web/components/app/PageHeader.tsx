"use client";

import { SectionMark } from "./SectionMark";

/**
 * The heading every app page opens with: the section's mark, its title, and one
 * line saying what the page is for.
 *
 * Using it consistently is what makes the marks feel like a system rather than
 * an ornament on one screen.
 */
export function PageHeader({
  title,
  blurb,
  actions,
}: {
  title: string;
  blurb?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header
      className="flex flex-wrap items-center justify-between gap-4"
      style={{ marginBottom: 26 }}
    >
      <div className="flex items-center" style={{ gap: 15 }}>
        <SectionMark size={54} />
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-0.022em", margin: 0 }}>
            {title}
          </h1>
          {blurb && (
            <p style={{ color: "var(--muted)", fontSize: 13, margin: "3px 0 0", lineHeight: 1.55 }}>
              {blurb}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </header>
  );
}
