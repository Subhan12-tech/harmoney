import type { CSSProperties } from "react";
import type { Severity } from "./data";

/**
 * App-skin styling primitives.
 *
 * Every tint in the app skin is produced with `color-mix()` against a token
 * rather than a hand-picked hex, so retuning `--accent` or `--danger` in
 * globals.css re-tints the whole product consistently.
 */

export function severityToken(severity: Severity): string {
  if (severity === "High") return "var(--danger)";
  if (severity === "Medium") return "var(--warn)";
  // Low is deliberately colourless: it is information, not a signal, and
  // giving it a hue makes a page of Low findings look alarming.
  return "var(--accent-2)";
}

export function mix(token: string, percent: number, into = "transparent"): string {
  return `color-mix(in srgb, ${token} ${percent}%, ${into})`;
}

/** Severity chip: colour at 18% background, text mixed 80% with white. */
export function severityChipStyle(severity: Severity): CSSProperties {
  const c = severityToken(severity);
  return {
    ...chipBase,
    background: mix(c, 12),
    color: c,
    border: `1px solid ${mix(c, 26)}`,
  };
}

/**
 * Inline draft highlight. High/Medium get a solid underline, Low a dashed one;
 * the selected issue additionally carries a 2px ring.
 */
export function highlightStyle(severity: Severity, active: boolean): CSSProperties {
  const c = severityToken(severity);
  return {
    background: mix(c, severity === "Low" ? 8 : 16),
    borderBottom: `2px ${severity === "Low" ? "dashed" : "solid"} ${c}`,
    borderRadius: 3,
    padding: "1px 2px",
    cursor: "pointer",
    boxShadow: active ? `0 0 0 2px ${mix(c, 60)}` : undefined,
  };
}

const chipBase: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 6,
  padding: "2px 8px",
  fontSize: 11.5,
  fontWeight: 500,
  whiteSpace: "nowrap",
  lineHeight: 1.5,
};

export const neutralChipStyle: CSSProperties = {
  ...chipBase,
  background: "var(--surface-2)",
  color: "var(--muted)",
};

export const outlineChipStyle: CSSProperties = {
  ...chipBase,
  border: "1px solid var(--border)",
  color: "var(--muted)",
};

export const accentChipStyle: CSSProperties = {
  ...chipBase,
  background: "var(--surface-2)",
  color: "var(--text)",
  border: "1px solid var(--border-strong)",
};

/* ---- Buttons ---- */

/**
 * Buttons.
 *
 * One filled button per view, and it is white-on-black. Everything else is a
 * bordered ghost. The old set had gradient fills and coloured glow shadows on
 * several buttons at once, so nothing read as "the" action — which is the job
 * a primary button exists to do.
 */

const buttonBase: CSSProperties = {
  borderRadius: "var(--radius)" as unknown as number,
  padding: "8px 14px",
  fontSize: 13,
  fontWeight: 500,
  letterSpacing: "-0.006em",
  fontFamily: "var(--font-inter), system-ui, sans-serif",
  cursor: "pointer",
  lineHeight: 1.2,
  transition: "background 120ms ease, border-color 120ms ease, opacity 120ms ease",
};

export const primaryButtonStyle: CSSProperties = {
  ...buttonBase,
  background: "var(--accent)",
  color: "var(--on-accent)",
  border: "1px solid var(--accent)",
  fontWeight: 550,
};

export const secondaryButtonStyle: CSSProperties = {
  ...buttonBase,
  background: "transparent",
  border: "1px solid var(--border-strong)",
  color: "var(--text)",
};

export const dangerButtonStyle: CSSProperties = {
  ...buttonBase,
  background: "transparent",
  border: "1px solid var(--border-strong)",
  color: "var(--danger)",
};

/** Formats bytes for the upload list. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Member status chip — Active is accent-tinted, Suspended danger-tinted. */
export function statusChipStyle(status: "Active" | "Invited" | "Suspended"): CSSProperties {
  const base: CSSProperties = { borderRadius: 6, padding: "3px 9px", fontSize: 11, whiteSpace: "nowrap" };
  if (status === "Active") {
    return { ...base, ...chipBase, background: "var(--surface-2)", color: "var(--text)" };
  }
  if (status === "Suspended") {
    return { ...base, ...chipBase, background: mix("var(--danger)", 12),
             color: "var(--danger)", border: `1px solid ${mix("var(--danger)", 26)}` };
  }
  return { ...base, ...chipBase, background: "transparent",
           color: "var(--faint)", border: "1px solid var(--border)" };
}

/** Second-rank action. A ghost, not a second filled button competing for the eye. */
export const accent2ButtonStyle: CSSProperties = {
  ...buttonBase,
  background: "var(--surface-2)",
  color: "var(--text)",
  border: "1px solid var(--border)",
};

/**
 * A finding whose rewrite has been applied. It keeps a highlight so the change
 * is still findable in the draft, but in the accent rather than the severity
 * colour — the sentence is no longer a problem, it is a pending edit.
 */
export function resolvedHighlightStyle(active: boolean): CSSProperties {
  return {
    background: mix("var(--accent)", 14),
    borderBottom: "2px solid var(--accent)",
    borderRadius: 3,
    padding: "1px 2px",
    cursor: "pointer",
    boxShadow: active ? `0 0 0 2px ${mix("var(--accent)", 60)}` : undefined,
  };
}
