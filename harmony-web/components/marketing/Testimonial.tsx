import { TESTIMONIALS } from "@/lib/data";

const seed = TESTIMONIALS[0];

/** The centred single-quote block used to close the landing page. */
export function Testimonial() {
  return (
    <section className="mx-auto max-w-[1000px] text-center" style={{ padding: "100px 40px" }}>
      <div className="font-mono" style={{ fontSize: 11, letterSpacing: "0.15em", color: "#666", marginBottom: 16 }}>
        ▲ ONE PLATFORM
      </div>
      <h2 className="font-serif text-white" style={{ fontSize: "clamp(32px, 4.4vw, 52px)", margin: "0 0 20px" }}>
        Beyond expectations.
      </h2>
      <p style={{ fontSize: 16, color: "#8a8a8a", maxWidth: 560, margin: "0 auto 44px", lineHeight: 1.6 }}>
        &ldquo;{seed.quote}&rdquo;
      </p>
      <div className="flex items-center justify-center gap-3">
        <Avatar initials={seed.initials} />
        <div className="text-left">
          <div style={{ color: "#e5e5e5", fontSize: 14 }}>{seed.name}</div>
          <div style={{ color: "#666", fontSize: 12 }}>{seed.title}</div>
        </div>
      </div>
    </section>
  );
}

/** The card variant, used three-up on /customers. */
export function TestimonialCard({
  quote,
  name,
  title,
  initials,
}: {
  quote: string;
  name: string;
  title: string;
  initials: string;
}) {
  return (
    <figure
      className="flex h-full flex-col"
      style={{ background: "#050505", border: "1px solid #141414", borderRadius: 12, padding: 26, margin: 0 }}
    >
      <blockquote
        className="flex-1 text-[#a3a3a3]"
        style={{ fontSize: 15, lineHeight: 1.6, margin: 0 }}
      >
        &ldquo;{quote}&rdquo;
      </blockquote>
      <figcaption className="mt-6 flex items-center gap-3">
        <Avatar initials={initials} />
        <div>
          <div style={{ color: "#e5e5e5", fontSize: 14 }}>{name}</div>
          <div style={{ color: "#666", fontSize: 12 }}>{title}</div>
        </div>
      </figcaption>
    </figure>
  );
}

function Avatar({ initials }: { initials: string }) {
  return (
    <div
      className="flex flex-none items-center justify-center rounded-full text-[#e5e5e5]"
      style={{
        width: 36,
        height: 36,
        background: "linear-gradient(135deg, #333, #0a0a0a)",
        border: "1px solid #222",
        fontWeight: 600,
        fontSize: 13,
      }}
    >
      {initials}
    </div>
  );
}
