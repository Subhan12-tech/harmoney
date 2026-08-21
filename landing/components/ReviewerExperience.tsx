const CITATIONS = [
  { time: "04:12", source: "Q1 2026 Earnings Call", match: 92, color: "#7fbf7f" },
  { time: "02:31", source: "FY25 10-K, Item 9A", match: 81, color: "#ffd58a" },
  { time: "01:04", source: "Investor Letter, Aug", match: 64, color: "#a9c9ff" },
];

function StageChip({ label, style }: { label: string; style: React.CSSProperties }) {
  return (
    <span className="inline-flex items-center rounded-full" style={{ fontSize: 11.5, padding: "4px 10px", ...style }}>
      {label}
    </span>
  );
}

export function ReviewerExperience() {
  return (
    <section className="mx-auto max-w-[1160px]" style={{ padding: "80px 40px", borderTop: "1px solid #0f0f0f" }}>
      <div style={{ maxWidth: 640, marginBottom: 48 }}>
        <h2 className="font-serif" style={{ fontSize: 44, lineHeight: 1.05 }}>
          First-class
          <br />
          reviewer experience.
        </h2>
        <p className="text-muted2" style={{ fontSize: 15, marginTop: 16 }}>
          Every finding is grounded in evidence. Every suggestion needs a human. Every action is audited. The tools
          your legal, IR, and comms teams will actually adopt.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Card A */}
        <div style={{ background: "#050505", border: "1px solid #141414", borderRadius: 12, padding: 26 }}>
          <div className="font-mono" style={{ fontSize: 11, color: "#666", marginBottom: 14 }}>
            EVIDENCE.CITATION
          </div>
          <div style={{ background: "#0a0a0a", border: "1px solid #141414", borderRadius: 8, padding: 14, fontSize: 13 }}>
            {CITATIONS.map((c, i) => (
              <div
                key={c.source}
                className="flex items-center gap-3"
                style={{ padding: "9px 0", borderTop: i === 0 ? "none" : "1px solid #141414" }}
              >
                <span className="font-mono" style={{ color: "#5a5a5a" }}>
                  {c.time}
                </span>
                <span className="flex-1 text-neutral-300">{c.source}</span>
                <span className="font-mono" style={{ color: c.color }}>
                  match {c.match}%
                </span>
              </div>
            ))}
          </div>
          <h3 className="font-serif" style={{ fontSize: 22, marginTop: 20, marginBottom: 8 }}>
            Cited, not conjured.
          </h3>
          <p style={{ fontSize: 14, color: "#8a8a8a" }}>
            Every AI finding links back to the exact prior sentence, filing, or transcript it came from — so
            reviewers can verify in seconds, not hours.
          </p>
        </div>

        {/* Card B */}
        <div style={{ background: "#050505", border: "1px solid #141414", borderRadius: 12, padding: 26 }}>
          <div className="font-mono" style={{ fontSize: 11, color: "#666", marginBottom: 14 }}>
            APPROVAL.QUEUE
          </div>
          <div style={{ background: "#0a0a0a", border: "1px solid #141414", borderRadius: 8, padding: 14 }}>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 12, color: "#8a8a8a" }}>Draft v4 · 3 issues</span>
              <span className="font-mono" style={{ fontSize: 12, color: "#7fbf7f" }}>
                ● ready
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StageChip label="Draft" style={{ background: "#151515", color: "#ccc" }} />
              <span style={{ color: "#3a3a3a", fontSize: 12 }}>→</span>
              <StageChip
                label="AI Analysis"
                style={{ background: "rgba(90,150,255,.14)", border: "1px solid rgba(90,150,255,.35)", color: "#a9c9ff" }}
              />
              <span style={{ color: "#3a3a3a", fontSize: 12 }}>→</span>
              <StageChip label="Review" style={{ background: "#fff", color: "#000", fontWeight: 600 }} />
              <span style={{ color: "#3a3a3a", fontSize: 12 }}>→</span>
              <StageChip label="Approved" style={{ background: "transparent", color: "#5a5a5a" }} />
            </div>
          </div>
          <h3 className="font-serif" style={{ fontSize: 22, marginTop: 20, marginBottom: 8 }}>
            Humans in the loop.
          </h3>
          <p style={{ fontSize: 14, color: "#8a8a8a" }}>
            The AI never publishes. Every draft routes through a named reviewer — with role-based approval, audit
            trail, and a signed record of who said yes.
          </p>
        </div>
      </div>
    </section>
  );
}
