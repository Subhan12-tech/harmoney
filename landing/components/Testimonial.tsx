export function Testimonial() {
  return (
    <section className="mx-auto max-w-[1000px] text-center" style={{ padding: "100px 40px" }}>
      <div
        className="font-mono"
        style={{ fontSize: 11, letterSpacing: "0.15em", color: "#666", marginBottom: 18 }}
      >
        ▲ ONE PLATFORM
      </div>
      <h2 className="font-serif" style={{ fontSize: 52 }}>
        Beyond expectations.
      </h2>
      <p className="mx-auto text-muted2" style={{ fontSize: 16, maxWidth: 620, marginTop: 20, marginBottom: 36 }}>
        &ldquo;We cut disclosure review from two weeks to four days, and caught a guidance mismatch that would have
        made the front page.&rdquo;
      </p>
      <div className="flex items-center justify-center gap-3">
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 36,
            height: 36,
            background: "linear-gradient(135deg, #333, #0a0a0a)",
            border: "1px solid #222",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          EC
        </div>
        <div className="text-left">
          <div style={{ color: "#e5e5e5", fontSize: 14 }}>Elena Costa</div>
          <div style={{ color: "#666", fontSize: 12 }}>VP Investor Relations, Meridian</div>
        </div>
      </div>
    </section>
  );
}
