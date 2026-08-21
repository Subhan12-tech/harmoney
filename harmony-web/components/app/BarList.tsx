export interface BarItem {
  label: string;
  count: number | string;
  /** Bar fill as a percentage of the track. */
  width: number;
  /** Defaults to `--accent-2`; severity lists pass their own token. */
  token?: string;
}

/**
 * Horizontal bar list — used for issues-by-severity, issues-by-type, and the
 * billing usage meters, which are the same shape with different tokens.
 */
export function BarList({ items, defaultToken = "var(--accent-2)" }: { items: BarItem[]; defaultToken?: string }) {
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {items.map((item) => (
        <li key={item.label} style={{ margin: "12px 0" }}>
          <div className="flex justify-between" style={{ fontSize: 12.5, marginBottom: 5 }}>
            <span style={{ color: "var(--text)" }}>{item.label}</span>
            <span style={{ color: "var(--muted)" }}>{item.count}</span>
          </div>
          <div style={{ background: "var(--bg-elev)", height: 8, borderRadius: 4, overflow: "hidden" }}>
            <div
              style={{
                height: 8,
                width: `${Math.max(0, Math.min(100, item.width))}%`,
                borderRadius: 4,
                background: item.token ?? defaultToken,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
