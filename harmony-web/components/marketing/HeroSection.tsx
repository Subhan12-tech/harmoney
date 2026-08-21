import Link from "next/link";
import { HeroObject } from "./HeroObject";

/**
 * The hero owns the page's top gradient glow. It sits at the very top of the
 * document with the (absolutely positioned) marketing nav layered over it, so
 * the glow reads behind the nav exactly as in the reference.
 */
export function HeroSection() {
  return (
    <section className="relative overflow-hidden" style={{ paddingTop: 78 }}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 500px at 50% 0, rgba(70,120,220,.18), transparent 60%), " +
            "radial-gradient(700px 320px at 80% 8%, rgba(120,80,220,.12), transparent 60%)",
        }}
      />

      <div
        className="relative z-10 mx-auto grid max-w-[1240px] items-center gap-[60px] md:grid-cols-2"
        style={{ padding: "80px 40px 120px", minHeight: 600 }}
      >
        <div>
          <div
            className="inline-flex items-center gap-2 rounded-[20px] border text-muted2"
            style={{
              borderColor: "#1c1c1c",
              background: "#0a0a0a",
              padding: "5px 12px",
              fontSize: 12,
              marginBottom: 28,
            }}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "#5aff9e", boxShadow: "0 0 8px #5aff9e" }}
            />
            Now with SOC 2 Type II
          </div>

          <h1
            className="font-serif text-white"
            style={{ fontSize: "clamp(44px, 7.2vw, 88px)", lineHeight: 0.96, margin: "0 0 26px" }}
          >
            Disclosure
            <br />
            consistency, solved.
          </h1>

          <p className="text-[#a3a3a3]" style={{ fontSize: 17, lineHeight: 1.55, maxWidth: 460, marginBottom: 34 }}>
            Harmony reads every draft against your entire disclosure history, flags what&rsquo;s off with cited
            evidence, and routes each document through mandatory human approval.
          </p>

          <div className="flex items-center gap-3">
            <Link
              href="/app"
              className="inline-flex items-center rounded-[9px] bg-white font-semibold text-black transition-opacity hover:opacity-90"
              style={{ padding: "12px 22px", fontSize: 14 }}
            >
              Get started
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center rounded-[9px] border text-neutral-200 transition-colors hover:border-neutral-500"
              style={{ borderColor: "#1e1e1e", background: "#0a0a0a", padding: "12px 22px", fontSize: 14 }}
            >
              Book a demo
            </Link>
          </div>
        </div>

        <div>
          <HeroObject />
        </div>
      </div>

      <div
        className="relative z-10 h-px w-full"
        style={{ background: "linear-gradient(90deg, transparent, #2a2a2a 20%, #2a2a2a 80%, transparent)" }}
      />
    </section>
  );
}
