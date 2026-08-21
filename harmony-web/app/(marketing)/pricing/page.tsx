import type { Metadata } from "next";
import Link from "next/link";
import { ClosingCTA } from "@/components/marketing/ClosingCTA";
import { FaqAccordion } from "@/components/marketing/FaqAccordion";
import { getPlans } from "@/lib/data";

export const metadata: Metadata = {
  title: "Pricing — Harmony",
  description:
    "Three plans for disclosure teams: Starter, Business, and Enterprise. Every plan ships evidence-cited AI analysis and mandatory human approval.",
};

function Check() {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      className="mt-0.5 flex-none"
      aria-hidden="true"
    >
      <path d="M4 12l5 5L20 6" />
    </svg>
  );
}

export default async function PricingPage() {
  const plans = await getPlans();

  return (
    <>
      {/* ---- Header ---- */}
      <section className="relative overflow-hidden text-center" style={{ paddingTop: 78 }}>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(1000px 420px at 50% 0, rgba(70,120,220,.16), transparent 60%)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-[1000px]" style={{ padding: "80px 40px 20px" }}>
          <div
            className="mb-7 inline-flex items-center gap-2 rounded-[20px] border text-muted2"
            style={{ borderColor: "#1c1c1c", background: "#0a0a0a", padding: "5px 12px", fontSize: 12 }}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "#5aff9e", boxShadow: "0 0 8px #5aff9e" }}
            />
            30-day pilot on your own corpus
          </div>
          <h1 className="font-serif text-white" style={{ fontSize: 76, lineHeight: 1, margin: 0 }}>
            Priced per team,
            <br />
            not per panic.
          </h1>
          <p className="mx-auto text-muted2" style={{ fontSize: 17, maxWidth: 520, marginTop: 24, lineHeight: 1.55 }}>
            Every plan includes evidence-cited analysis, an immutable audit trail, and mandatory human approval. The
            difference is scale.
          </p>
        </div>
      </section>

      {/* ---- Plan cards ---- */}
      <section className="mx-auto max-w-[1160px]" style={{ padding: "60px 40px 40px" }}>
        <div className="grid gap-5 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.id}
              className="relative flex flex-col"
              style={{
                background: p.highlighted ? "#080808" : "#050505",
                border: `1px solid ${p.highlighted ? "#2a3a5a" : "#141414"}`,
                borderRadius: 12,
                padding: 28,
                boxShadow: p.highlighted ? "0 0 60px rgba(90,150,255,.12)" : undefined,
              }}
            >
              {p.highlighted && (
                <span
                  className="absolute font-mono uppercase"
                  style={{
                    top: -10,
                    left: 28,
                    background: "#0a0a0a",
                    border: "1px solid #2a3a5a",
                    borderRadius: 20,
                    padding: "3px 10px",
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    color: "#a9c9ff",
                  }}
                >
                  Most adopted
                </span>
              )}

              <div className="font-mono" style={{ fontSize: 11, color: "#666", letterSpacing: "0.1em" }}>
                {p.name.toUpperCase()}
              </div>

              <div className="font-serif text-white" style={{ fontSize: 48, lineHeight: 1.1, marginTop: 12 }}>
                {p.price}
                {p.cadence && <span style={{ fontSize: 18, color: "#5a5a5a" }}>{p.cadence}</span>}
              </div>

              <p style={{ fontSize: 14, color: "#8a8a8a", marginTop: 12, marginBottom: 22, minHeight: 42 }}>
                {p.desc}
              </p>

              <Link
                href={p.id === "enterprise" ? "/signup" : "/signup"}
                className="inline-flex items-center justify-center rounded-[9px] transition-opacity hover:opacity-90"
                style={
                  p.highlighted
                    ? { background: "#fff", color: "#000", padding: "11px 20px", fontSize: 14, fontWeight: 600 }
                    : {
                        border: "1px solid #1e1e1e",
                        background: "#0a0a0a",
                        color: "#e5e5e5",
                        padding: "11px 20px",
                        fontSize: 14,
                      }
                }
              >
                {p.id === "enterprise" ? "Contact sales" : "Start pilot"}
              </Link>

              <ul className="mt-7 flex flex-col gap-3" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2.5" style={{ fontSize: 13.5, color: "#a3a3a3" }}>
                    <span style={{ color: p.highlighted ? "#a9c9ff" : "#5a5a5a" }}>
                      <Check />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Comparison ---- */}
      <section className="mx-auto max-w-[1000px]" style={{ padding: "60px 40px 40px" }}>
        <h2 className="font-serif text-center text-[#e5e5e5]" style={{ fontSize: 44, lineHeight: 1.05 }}>
          What every plan includes.
        </h2>
        <p
          className="mx-auto text-center text-muted2"
          style={{ fontSize: 15, maxWidth: 520, marginTop: 16, marginBottom: 44 }}
        >
          The controls below are not upsells. They are the reason the product exists.
        </p>

        <div style={{ border: "1px solid #141414", borderRadius: 12, background: "#050505", overflow: "hidden" }}>
          {[
            ["Evidence-cited findings", "Every flag links to the exact prior sentence, page, or timestamp."],
            ["Mandatory human approval", "The AI never publishes. A named reviewer signs off, always."],
            ["Immutable audit trail", "Every approval, edit, and dismissal is signed and timestamped."],
            ["Role-based access", "Owner, Admin, Reviewer, Editor and Viewer, enforced end to end."],
            ["Encryption at rest and in transit", "Your corpus is never used to train shared models."],
          ].map(([title, body], i) => (
            <div
              key={title}
              className="grid gap-4 sm:grid-cols-[260px_1fr]"
              style={{ padding: "18px 24px", borderTop: i === 0 ? "none" : "1px solid #141414" }}
            >
              <div style={{ color: "#e5e5e5", fontSize: 14 }}>{title}</div>
              <div style={{ color: "#8a8a8a", fontSize: 13.5, lineHeight: 1.55 }}>{body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---- FAQ ---- */}
      <section className="mx-auto max-w-[1000px]" style={{ padding: "60px 40px 100px" }}>
        <h2 className="font-serif text-center text-[#e5e5e5]" style={{ fontSize: 44, marginBottom: 40 }}>
          Questions, answered.
        </h2>
        <FaqAccordion />
      </section>

      <ClosingCTA
        line1="Start with one quarter."
        line2="Keep the audit trail forever."
        fontSize={64}
        primaryLabel="Start pilot"
        primaryHref="/signup"
        secondaryLabel="Talk to sales"
        secondaryHref="/signup"
      />
    </>
  );
}
