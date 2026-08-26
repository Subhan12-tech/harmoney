/**
 * A half-circle gauge for a single 0–100 health number — the shape finance and
 * ops dashboards use for "where does this sit on a scale", where a bare number
 * or a one-point line says less. The arc fills proportionally and takes its
 * colour from the value, so "good/watch/poor" reads before the digits do.
 */
export function Gauge({
  value,
  label,
  goodAt = 80,
  watchAt = 60,
}: {
  value: number;
  label?: string;
  /** value ≥ goodAt reads as healthy; ≥ watchAt as caution; below as poor. */
  goodAt?: number;
  watchAt?: number;
}) {
  const v = Math.max(0, Math.min(100, value));
  const color = v >= goodAt ? "var(--accent-2)" : v >= watchAt ? "var(--warn)" : "var(--danger)";
  const band = v >= goodAt ? "Healthy" : v >= watchAt ? "Watch" : "Needs attention";

  // Semicircle from 180°→360°. Arc length of a half circle at r=52 is π·52.
  const R = 52;
  const LEN = Math.PI * R;
  const filled = (v / 100) * LEN;

  return (
    <div className="flex flex-col items-center" style={{ padding: "4px 0" }}>
      <svg viewBox="0 0 140 82" style={{ width: "100%", maxWidth: 220 }} role="img"
           aria-label={`${label ?? "Score"}: ${v} out of 100`}>
        {/* track */}
        <path d="M 18 70 A 52 52 0 0 1 122 70" fill="none" stroke="var(--border)" strokeWidth="12"
              strokeLinecap="round" />
        {/* value */}
        <path
          d="M 18 70 A 52 52 0 0 1 122 70"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${LEN}`}
        />
        <text x="70" y="58" textAnchor="middle" fontSize="26" fontWeight="600" fill="var(--text)">
          {v}
        </text>
        <text x="70" y="74" textAnchor="middle" fontSize="10" fill="var(--muted)">
          out of 100
        </text>
      </svg>
      <div className="flex items-center gap-2" style={{ marginTop: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} aria-hidden />
        <span style={{ fontSize: 12.5, color: "var(--text)" }}>{band}</span>
      </div>
      {label && <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{label}</div>}
    </div>
  );
}
