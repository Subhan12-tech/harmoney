"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * The glossy mark that introduces each section.
 *
 * A tile holding a lit object, which rotates and settles when you arrive.
 * Built from gradients and SVG rather than image files: it scales to any size,
 * re-tints with the theme tokens, weighs nothing, and stays crisp on any
 * display — none of which a PNG of a rendered object would do.
 *
 * The lighting is a single convention, applied consistently: one source above
 * and slightly left, a soft floor bounce beneath, and a hairline rim where the
 * object turns away. That consistency is what makes a set of these read as one
 * family rather than a pile of effects.
 *
 * Every colour comes from a --mark-* variable, so the theme decides the
 * MATERIAL while the lighting stays fixed: a dark polished body on dark, a pale
 * ceramic one on light. Hardcoding it dark made the mark a black blob on a
 * light page - the object and the interface stopped looking like one product.
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
        // Tile: lit from above, falling away at the base. The theme supplies the
        // material; the lighting direction is the same in both.
        background:
          "var(--mark-tile)",
        boxShadow:
          "var(--mark-tile-shadow)",
      }}
    >
      {/* Specular sweep across the tile's upper-left, the single light source. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "var(--mark-specular)",
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
            "var(--mark-sphere)",
          boxShadow:
            "var(--mark-sphere-shadow)",
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
              "var(--mark-bounce)",
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
          <stop stopColor="var(--mark-face-a)" />
          <stop offset="0.45" stopColor="var(--mark-face-b)" />
          <stop offset="1" stopColor="var(--mark-face-c)" />
        </linearGradient>
        <linearGradient id="markEdge" x1="18" y1="4" x2="70" y2="92" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--mark-edge-a)" />
          <stop offset="0.4" stopColor="var(--mark-edge-b)" />
          <stop offset="1" stopColor="var(--mark-edge-c)" />
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
          <circle cx="50" cy="50" r="13" fill="var(--mark-hollow)" stroke={stroke} strokeWidth="2" />
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
          <circle cx="50" cy="50" r="11" fill="var(--mark-hollow)" stroke={stroke} strokeWidth="2" />
        </>
      )}

      {shape === "check" && (
        <>
          <rect x="16" y="16" width="68" height="68" rx="18" fill={fill} stroke={stroke} strokeWidth="2.6" />
          <path d="M34 51 L45 62 L67 40" stroke="var(--mark-tick)" strokeWidth="6"
                strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      )}
    </svg>
  );
}
