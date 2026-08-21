import type { Metadata } from "next";
import { LogoStrip } from "@/components/marketing/LogoStrip";
import { TestimonialCard } from "@/components/marketing/Testimonial";
import { ClosingCTA } from "@/components/marketing/ClosingCTA";
import { TESTIMONIALS } from "@/lib/data";

export const metadata: Metadata = {
  title: "Customers — Harmony",
  description:
    "Investor relations, legal, finance, and communications teams use Harmony to keep every disclosure consistent with everything they have already said.",
};

const STATS = [
  { value: "128", label: "documents reviewed per quarter, per team" },
  { value: "4 days", label: "median review cycle, down from two weeks" },
  { value: "94%", label: "of AI findings accepted by human reviewers" },
];

export default function CustomersPage() {
  return (
    <>
      {/* ---- Header ---- */}
      <section className="relative overflow-hidden text-center" style={{ paddingTop: 78 }}>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(1000px 420px at 50% 0, rgba(70,120,220,.16), transparent 60%), " +
              "radial-gradient(600px 300px at 20% 10%, rgba(120,80,220,.10), transparent 60%)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-[1000px]" style={{ padding: "80px 40px 20px" }}>
          <div
            className="font-mono"
            style={{ fontSize: 11, letterSpacing: "0.15em", color: "#666", marginBottom: 18 }}
          >
            ▲ CUSTOMERS
          </div>
          <h1 className="font-serif text-white" style={{ fontSize: 76, lineHeight: 1, margin: 0 }}>
            The teams who
            <br />
            cannot be wrong twice.
          </h1>
          <p className="mx-auto text-muted2" style={{ fontSize: 17, maxWidth: 540, marginTop: 24, lineHeight: 1.55 }}>
            Investor relations, legal, finance and communications teams use Harmony to keep every disclosure
            consistent with everything they have already said.
          </p>
        </div>
      </section>

      {/* ---- Logo wall ---- */}
      <LogoStrip kicker="Trusted by the world’s disclosure teams" large />

      {/* ---- Stats ---- */}
      <section className="mx-auto max-w-[1000px]" style={{ padding: "20px 40px 80px" }}>
        <div
          className="grid sm:grid-cols-3"
          style={{ background: "#050505", border: "1px solid #141414", borderRadius: 14 }}
        >
          {STATS.map((s, i) => (
            <div
              key={s.label}
              style={{
                padding: "28px 26px",
                borderTop: i === 0 ? "none" : "1px solid #141414",
                borderLeft: "none",
              }}
              className={i > 0 ? "sm:border-l sm:border-t-0 sm:border-l-[#141414]" : ""}
            >
              <div className="font-serif text-white" style={{ fontSize: 44, lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ fontSize: 13, color: "#8a8a8a", marginTop: 10, lineHeight: 1.5 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Testimonials ---- */}
      <section className="mx-auto max-w-[1160px]" style={{ padding: "60px 40px 100px", borderTop: "1px solid #0f0f0f" }}>
        <div style={{ maxWidth: 640, marginBottom: 48 }}>
          <h2 className="font-serif text-[#e5e5e5]" style={{ fontSize: 44, lineHeight: 1.05 }}>
            In their words.
          </h2>
          <p className="text-muted2" style={{ fontSize: 15, marginTop: 16 }}>
            Three teams, three reasons. The common thread is that nothing ships without a human on the record.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <TestimonialCard key={t.name} {...t} />
          ))}
        </div>
      </section>

      <ClosingCTA
        line1="Join them this quarter."
        line2="Pilot on your own filings."
        fontSize={64}
        primaryLabel="Get started"
        primaryHref="/signup"
        secondaryLabel="See pricing"
        secondaryHref="/pricing"
      />
    </>
  );
}
