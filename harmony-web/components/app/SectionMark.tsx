"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * The glossy mark that introduces each section.
 *
 * A dark tile holding a lit object, which rotates and settles when you arrive.
 * Built from gradients and SVG rather than image files: it scales to any size,
 * re-tints with the theme tokens, weighs nothing, and stays crisp on any
 * display — none of which a PNG of a rendered object would do.
 *
 * The lighting is a single convention, applied consistently: one source above
 * and slightly left, a soft floor bounce beneath, and a hairline rim where the
 * object turns away. That consistency is what makes a set of these read as one
 * family rather than a pile of effects.
 */

type MarkShape = "sphere" | "chevron" | "stack" | "ring" | "bars" | "people" | "gear" | "check";

const ROUTE_MARKS: { match: (p: string) => boolean; shape: MarkShape; label: string }[] = [
  { match: (p) => p === "/app" || p === "/app/", shape: "sphere", label: "Dashboard" },
  { match: (p) => p.startsWith("/app/documents"), shape: "stack", label: "All Documents" },
  { match: (p) => p.startsWith("/app/review"), shape: "chevron", label: "Review Workspace" },
  { match: (p) => p.startsWith("/app/knowledge"), shape: "ring", label: "Evidence Library" },
  { match: (p) => p.startsWith("/app/analytics"), shape: "bars", label: "Analytics" },
  { match: (p) => p.startsWith("/app/team"), shape: "people", label: "Team & Activity" },
  { match: (p) => p.startsWith("/app/settings"), shape: "gear", label: "Settings" },
  { match: (p) => p.startsWith("/app/admin"), shape: "check", label: "Approvals" },
];

export function markForPath(pathname: string): { shape: MarkShape; label: string } {
  const hit = ROUTE_MARKS.find((m) => m.match(pathname));
  return hit ? { shape: hit.shape, label: hit.label } : { shape: "sphere", label: "Harmony" };
}

export function SectionMark({ size = 56, shape: forced }: { size?: number; shape?: MarkShape }) {
  const pathname = usePathname();
  const { shape } = forced ? { shape: forced } : markForPath(pathname);

  // Re-keying on the route restarts the animation, so navigating between
  // sections replays it rather than leaving a static tile behind.
  const [key, setKey] = useState(0);
  useEffect(() => setKey((k) => k + 1), [pathname]);

  return (
    <div
      key={key}
      aria-hidden
      className="mark-tile"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        flex: "none",
        position: "relative",
        overflow: "hidden",
        // Tile: lit from above, falling to near-black at the base.
        background:
          "radial-gradient(120% 100% at 30% 0%, #24262a 0%, #131417 38%, #0a0b0d 100%)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.10), inset 0 0 0 1px rgba(255,255,255,0.045), 0 8px 22px rgba(0,0,0,0.55)",
      }}
    >
      {/* Specular sweep across the tile's upper-left, the single light source. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(60% 45% at 22% 6%, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 70%)",
          pointerEvents: "none",
        }}
      />
      <div className="mark-object" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <Shape shape={shape} size={size} />
      </div>
    </div>
  );
}

function Shape({ shape, size }: { shape: MarkShape; size: number }) {
  const s = Math.round(size * 0.56);

  if (shape === "sphere") {
    // Pure CSS: a lit sphere is gradients, and gradients stay sharp at any size.
    return (
      <div
        style={{
          width: s,
          height: s,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 34% 26%, #f2f3f5 0%, #b9bcc2 14%, #6e7278 34%, #303338 58%, #131417 82%, #0c0d0f 100%)",
          boxShadow:
            "inset -2px -3px 8px rgba(0,0,0,0.65), inset 2px 2px 6px rgba(255,255,255,0.10), 0 3px 10px rgba(0,0,0,0.5)",
          position: "relative",
        }}
      >
        {/* Floor bounce: the underside catches light back off the tile. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 62% 88%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 42%)",
          }}
        />
      </div>
    );
  }

  const stroke = "url(#markEdge)";
  const fill = "url(#markFace)";

  return (
    <svg width={s} height={s} viewBox="0 0 100 100" fill="none">
      <defs>
        {/* One shared material for every extruded shape, so the set matches. */}
        <linearGradient id="markFace" x1="20" y1="6" x2="78" y2="96" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3a3d43" />
          <stop offset="0.45" stopColor="#1c1e22" />
          <stop offset="1" stopColor="#0d0e10" />
        </linearGradient>
        <linearGradient id="markEdge" x1="18" y1="4" x2="70" y2="92" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgba(255,255,255,0.75)" />
          <stop offset="0.4" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="1" stopColor="rgba(255,255,255,0.06)" />
        </linearGradient>
      </defs>

      {shape === "chevron" && (
        <path d="M34 18 L70 50 L34 82 L34 66 L52 50 L34 34 Z" fill={fill} stroke={stroke} strokeWidth="2.5"
              strokeLinejoin="round" />
      )}

      {shape === "stack" && (
        <>
          <rect x="20" y="20" width="60" height="18" rx="5" fill={fill} stroke={stroke} strokeWidth="2.2" />
          <rect x="20" y="42" width="60" height="18" rx="5" fill={fill} stroke={stroke} strokeWidth="2.2" />
          <rect x="20" y="64" width="60" height="18" rx="5" fill={fill} stroke={stroke} strokeWidth="2.2" />
        </>
      )}

      {shape === "ring" && (
        <>
          <circle cx="50" cy="50" r="30" fill={fill} stroke={stroke} strokeWidth="3" />
          <circle cx="50" cy="50" r="13" fill="#0b0c0e" stroke={stroke} strokeWidth="2" />
        </>
      )}

      {shape === "bars" && (
        <>
          <rect x="20" y="54" width="16" height="28" rx="4" fill={fill} stroke={stroke} strokeWidth="2.2" />
          <rect x="42" y="36" width="16" height="46" rx="4" fill={fill} stroke={stroke} strokeWidth="2.2" />
          <rect x="64" y="20" width="16" height="62" rx="4" fill={fill} stroke={stroke} strokeWidth="2.2" />
        </>
      )}

      {shape === "people" && (
        <>
          <circle cx="38" cy="36" r="13" fill={fill} stroke={stroke} strokeWidth="2.4" />
          <circle cx="66" cy="42" r="10" fill={fill} stroke={stroke} strokeWidth="2.2" />
          <path d="M16 80 a22 20 0 0 1 44 0 Z" fill={fill} stroke={stroke} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M60 80 a16 15 0 0 1 28 0 Z" fill={fill} stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" />
        </>
      )}

      {shape === "gear" && (
        <>
          <path
            d="M50 14 l7 10 12-3 3 12 10 7-10 7-3 12-12-3-7 10-7-10-12 3-3-12-10-7 10-7 3-12 12 3 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <circle cx="50" cy="50" r="11" fill="#0b0c0e" stroke={stroke} strokeWidth="2" />
        </>
      )}

      {shape === "check" && (
        <>
          <rect x="16" y="16" width="68" height="68" rx="18" fill={fill} stroke={stroke} strokeWidth="2.6" />
          <path d="M34 51 L45 62 L67 40" stroke="rgba(255,255,255,0.85)" strokeWidth="6"
                strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      )}
    </svg>
  );
}
