/**
 * The decorative node scatter behind the auth brand panel.
 *
 * Seeded from a deterministic pseudo-random function rather than `Math.random`
 * so the server and client render byte-identical markup — a random layout here
 * would be a hydration mismatch on every load. It evokes the knowledge graph;
 * it is not data.
 */

const VIEW_W = 600;
const VIEW_H = 640;
const DOT_COUNT = 46;

function seeded(n: number): number {
  const x = Math.sin(n) * 10000;
  return x - Math.floor(x);
}

const dots = Array.from({ length: DOT_COUNT }, (_, i) => ({
  x: seeded(i * 3.1) * VIEW_W,
  y: seeded(i * 7.7 + 1) * VIEW_H,
  r: 1 + seeded(i * 13.3) * 2.2,
  bright: seeded(i * 5.5) > 0.75,
}));

/**
 * Each edge joins a node to its nearest neighbour rather than to a random one,
 * so the result reads as a local graph instead of chords across the panel.
 */
const edges = (() => {
  const seen = new Set<string>();
  const out: { x1: number; y1: number; x2: number; y2: number }[] = [];

  dots.forEach((a, i) => {
    let bestIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;

    dots.forEach((b, j) => {
      if (i === j) return;
      const distance = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = j;
      }
    });

    // Reciprocal nearest pairs would otherwise be drawn twice.
    const key = i < bestIndex ? `${i}-${bestIndex}` : `${bestIndex}-${i}`;
    if (bestIndex < 0 || seen.has(key)) return;
    seen.add(key);
    const b = dots[bestIndex];
    out.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  });

  return out;
})();

export function ParticleField() {
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ opacity: 0.75 }}
    >
      {edges.map((e, i) => (
        <line
          key={i}
          x1={e.x1}
          y1={e.y1}
          x2={e.x2}
          y2={e.y2}
          stroke="color-mix(in srgb, var(--accent) 35%, transparent)"
          strokeWidth={0.6}
        />
      ))}
      {dots.map((d, i) => (
        <circle
          key={i}
          cx={d.x}
          cy={d.y}
          r={d.r}
          fill={d.bright ? "color-mix(in srgb, var(--accent) 90%, white)" : "var(--faint)"}
        />
      ))}
    </svg>
  );
}
