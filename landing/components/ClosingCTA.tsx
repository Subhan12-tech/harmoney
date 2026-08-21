import Link from "next/link";

export function ClosingCTA() {
  return (
    <section
      className="relative text-center"
      style={{ borderTop: "1px solid #0f0f0f", padding: "100px 40px 120px" }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(600px 400px at 50% 100%, rgba(90,150,255,.12), transparent 60%)" }}
      />
      <div className="relative z-10">
        <h2 className="font-serif" style={{ fontSize: 76, lineHeight: 1 }}>
          Disclosure, reimagined.
          <br />
          <span style={{ color: "#7a7a7a" }}>Available today.</span>
        </h2>
        <div className="mt-9 flex items-center justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center rounded-[9px] bg-white font-semibold text-black hover:opacity-90 transition-opacity"
            style={{ padding: "12px 22px", fontSize: 14.5 }}
          >
            Get started
          </Link>
          <a
            href="#"
            className="inline-flex items-center rounded-[9px] border text-neutral-200 hover:border-neutral-500 transition-colors"
            style={{ borderColor: "#1e1e1e", background: "#0a0a0a", padding: "12px 22px", fontSize: 14.5 }}
          >
            Talk to sales
          </a>
        </div>
      </div>
    </section>
  );
}
