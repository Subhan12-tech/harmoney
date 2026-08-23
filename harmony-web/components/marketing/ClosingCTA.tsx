import Link from "next/link";

/**
 * The closing CTA. Defaults reproduce the landing page exactly; `/pricing` and
 * Callers pass their own headline through rather than forking the block.
 */
export function ClosingCTA({
  line1 = "Disclosure, reimagined.",
  line2 = "Available today.",
  fontSize = 76,
  primaryLabel = "Get started",
  primaryHref = "/app",
  secondaryLabel = "Talk to sales",
  secondaryHref = "/signup",
}: {
  line1?: string;
  line2?: string;
  fontSize?: number;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}) {
  return (
    <section className="relative text-center" style={{ borderTop: "1px solid #0f0f0f", padding: "100px 40px 120px" }}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(600px 400px at 50% 100%, rgba(90,150,255,.12), transparent 60%)" }}
      />
      <div className="relative z-10">
        <h2
          className="font-serif text-[#e5e5e5]"
          style={{ fontSize: `clamp(34px, 6.2vw, ${fontSize}px)`, lineHeight: 1 }}
        >
          {line1}
          <br />
          <span style={{ color: "#7a7a7a" }}>{line2}</span>
        </h2>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
          <Link
            href={primaryHref}
            className="inline-flex items-center rounded-[9px] bg-white font-semibold text-black transition-opacity hover:opacity-90"
            style={{ padding: "13px 24px", fontSize: 14 }}
          >
            {primaryLabel}
          </Link>
          <Link
            href={secondaryHref}
            className="inline-flex items-center rounded-[9px] border text-neutral-200 transition-colors hover:border-neutral-500"
            style={{ borderColor: "#1e1e1e", background: "#0a0a0a", padding: "13px 24px", fontSize: 14 }}
          >
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
