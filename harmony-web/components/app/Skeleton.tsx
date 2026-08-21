/**
 * Loading placeholders.
 *
 * Reads resolve fast here, but every list and detail view still renders a
 * shaped placeholder rather than collapsing to nothing, so switching org or
 * opening a document never jumps the layout.
 */
export function Skeleton({
  width = "100%",
  height = 14,
  radius = 6,
  style,
}: {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: React.CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      className="app-shimmer block"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

export function SkeletonCard({ height = 96 }: { height?: number }) {
  return <div className="app-card app-shimmer" style={{ height }} />;
}

export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} style={{ padding: "11px 0", borderBottom: "1px solid var(--border)" }}>
          <Skeleton width={`${88 - i * 9}%`} />
        </div>
      ))}
    </div>
  );
}
