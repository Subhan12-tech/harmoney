/**
 * A single headline number with a label and optional context line.
 *
 * These sit in a row at the top of Analytics and the Evidence Library. The
 * value is the loud element; the label names it; the hint gives it meaning
 * (a delta, a rate, a unit) without competing for attention.
 */
export function StatTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  /** Colour token for a small status dot, e.g. "var(--danger)". Omit for none. */
  accent?: string;
}) {
  return (
    <div className="app-card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
      <div className="flex items-center gap-2">
        {accent && (
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: accent, flex: "none" }} aria-hidden />
        )}
        <span className="kicker" style={{ margin: 0 }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 600, color: "var(--text)", lineHeight: 1.1, letterSpacing: "-0.01em" }}>
        {value}
      </div>
      {hint && <div style={{ fontSize: 12, color: "var(--muted)" }}>{hint}</div>}
    </div>
  );
}
