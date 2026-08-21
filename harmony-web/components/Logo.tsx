/**
 * The Harmony wordmark: two vertical bars bridged by mirrored arcs —
 * a stylised soundwave/lens "H". Used in both skins' nav and footer.
 */
export function Logo({
  size = 26,
  glow = false,
  id = "harmony-logo-gradient",
}: {
  size?: number;
  glow?: boolean;
  /** SVG gradient ids must be unique per document when several render at once. */
  id?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
      style={glow ? { filter: "drop-shadow(0 0 12px rgba(255,255,255,.15))" } : undefined}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#8a9bb8" />
        </linearGradient>
      </defs>
      <path d="M6 4 v24" stroke={`url(#${id})`} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M26 4 v24" stroke={`url(#${id})`} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M6 16 Q16 6 26 16" stroke={`url(#${id})`} strokeWidth={2.4} strokeLinecap="round" fill="none" />
      <path
        d="M6 16 Q16 26 26 16"
        stroke={`url(#${id})`}
        strokeWidth={2.4}
        strokeLinecap="round"
        fill="none"
        opacity={0.55}
      />
    </svg>
  );
}
