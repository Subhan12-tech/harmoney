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
  return "var(--accent-2)";
}

export function mix(token: string, percent: number, into = "transparent"): string {
  return `color-mix(in srgb, ${token} ${percent}%, ${into})`;
}

/** Severity chip: colour at 18% background, text mixed 80% with white. */
export function severityChipStyle(severity: Severity): CSSProperties {
  const c = severityToken(severity);
  return {
    background: mix(c, 18),
    color: mix(c, 80, "white"),
    borderRadius: 6,
    padding: "3px 10px",
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: "nowrap",
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

export const neutralChipStyle: CSSProperties = {
  background: "var(--surface-2)",
  borderRadius: 6,
  padding: "3px 9px",
  fontSize: 11,
  whiteSpace: "nowrap",
};

export const outlineChipStyle: CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "3px 9px",
  fontSize: 11,
  whiteSpace: "nowrap",
};

export const accentChipStyle: CSSProperties = {
  background: mix("var(--accent)", 18),
  color: "var(--accent)",
  borderRadius: 6,
  padding: "3px 9px",
  fontSize: 11,
  whiteSpace: "nowrap",
};

/* ---- Buttons ---- */

export const primaryButtonStyle: CSSProperties = {
  background: "var(--accent)",
  color: "var(--on-accent)",
  border: "none",
  borderRadius: 8,
  padding: "9px 18px",
  fontWeight: 600,
  fontSize: 13.5,
  fontFamily: "var(--font-manrope), system-ui, sans-serif",
  cursor: "pointer",
};

export const secondaryButtonStyle: CSSProperties = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "9px 18px",
  fontSize: 13.5,
  color: "var(--text)",
  cursor: "pointer",
};

export const dangerButtonStyle: CSSProperties = {
  background: "transparent",
  border: `1px solid ${mix("var(--danger)", 45)}`,
  borderRadius: 8,
  padding: "9px 18px",
  fontSize: 13.5,
  color: mix("var(--danger)", 75, "white"),
  cursor: "pointer",
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
    return { ...base, background: mix("var(--accent)", 18), color: mix("var(--accent)", 85, "white") };
  }
  if (status === "Suspended") {
    return { ...base, background: mix("var(--danger)", 16), color: mix("var(--danger)", 80, "white") };
  }
  return { ...base, background: "var(--surface-2)", color: "var(--muted)" };
}

/** Filled secondary-accent button — the corpus upload action. */
export const accent2ButtonStyle: CSSProperties = {
  background: "var(--accent-2)",
  color: "var(--on-accent)",
  border: "none",
  borderRadius: 8,
  padding: "8px 14px",
  fontWeight: 600,
  fontSize: 13,
  fontFamily: "var(--font-manrope), system-ui, sans-serif",
  cursor: "pointer",
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
