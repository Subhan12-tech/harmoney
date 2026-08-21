export function Logo({ size = 26, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      style={glow ? { filter: "drop-shadow(0 0 12px rgba(255,255,255,.15))" } : undefined}
    >
      <defs>
        <linearGradient id="harmony-logo-gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#8a9bb8" />
        </linearGradient>
      </defs>
      <path d="M6 4 v24" stroke="url(#harmony-logo-gradient)" strokeWidth={2.4} strokeLinecap="round" />
      <path d="M26 4 v24" stroke="url(#harmony-logo-gradient)" strokeWidth={2.4} strokeLinecap="round" />
      <path d="M6 16 Q16 6 26 16" stroke="url(#harmony-logo-gradient)" strokeWidth={2.4} strokeLinecap="round" fill="none" />
      <path
        d="M6 16 Q16 26 26 16"
        stroke="url(#harmony-logo-gradient)"
        strokeWidth={2.4}
        strokeLinecap="round"
        fill="none"
        opacity={0.55}
      />
    </svg>
  );
}
