function Highlight({
  children,
  severity,
}: {
  children: React.ReactNode;
  severity: "high" | "medium" | "low";
}) {
  const styles: Record<string, React.CSSProperties> = {
    high: { background: "rgba(255,120,90,.14)", borderBottom: "2px solid rgba(255,120,90,.75)", color: "#ffb7a5" },
    medium: { background: "rgba(255,190,80,.12)", borderBottom: "2px solid rgba(255,190,80,.7)", color: "#ffd58a" },
    low: { background: "rgba(120,180,255,.1)", borderBottom: "2px dashed rgba(120,180,255,.6)", color: "#a9c9ff" },
  };
  return <span style={styles[severity]}>{children}</span>;
}

export function FlaggedDraft() {
  return (
    <section className="mx-auto max-w-[1000px] text-center" style={{ padding: "60px 40px 100px" }}>
      <div
        className="mx-auto mb-7 flex items-center justify-center"
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: "linear-gradient(135deg, #1a1a1a, #0a0a0a)",
          border: "1px solid #2a2a2a",
          boxShadow: "0 0 60px rgba(90,150,255,.18)",
        }}
      >
        <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#e5e5e5" strokeWidth={1.4}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        </svg>
      </div>

      <h2 className="font-serif" style={{ fontSize: 52, lineHeight: 1 }}>
        Approve this quarter.
      </h2>
      <p
        className="mx-auto text-muted2"
        style={{ fontSize: 16, maxWidth: 540, marginTop: 18, marginBottom: 44 }}
      >
        One workspace for drafts, evidence, suggestions, and approvals. Ship disclosures with the same rigor as
        production code.
      </p>

      <div
        className="overflow-hidden text-left"
        style={{ border: "1px solid #141414", borderRadius: 12, background: "#050505", boxShadow: "0 30px 80px rgba(0,0,0,.6)" }}
      >
        {/* top bar */}
        <div className="flex items-center gap-3" style={{ background: "#0a0a0a", padding: "12px 16px" }}>
          <div className="flex items-center gap-1.5">
            <span className="inline-block rounded-full" style={{ width: 10, height: 10, background: "#333" }} />
            <span className="inline-block rounded-full" style={{ width: 10, height: 10, background: "#333" }} />
            <span className="inline-block rounded-full" style={{ width: 10, height: 10, background: "#333" }} />
          </div>
          <span className="font-mono text-[#5a5a5a]" style={{ fontSize: 12.5 }}>
            q3-fy26-earnings.md
          </span>
          <span
            className="ml-auto rounded-full font-mono"
            style={{
              background: "rgba(120,220,120,.08)",
              border: "1px solid rgba(120,220,120,.2)",
              color: "#7fbf7f",
              fontSize: 11.5,
              padding: "3px 9px",
            }}
          >
            ● connected
          </span>
        </div>

        {/* editor body */}
        <div className="grid" style={{ gridTemplateColumns: "44px 1fr" }}>
          <div
            className="select-none text-right font-mono"
            style={{ background: "#080808", borderRight: "1px solid #141414", color: "#3a3a3a", fontSize: 12.5, lineHeight: 1.7, padding: "18px 10px" }}
          >
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <pre
            className="whitespace-pre-wrap font-mono"
            style={{ fontSize: 13, lineHeight: 1.7, padding: "18px 20px", margin: 0, color: "#c9c9c9" }}
          >
            <div style={{ color: "#5a5a5a" }}># Q3 FY2026 Earnings Release</div>
            <div>
              Harmony delivered a strong third quarter, with continued momentum across our enterprise segment.{" "}
              <Highlight severity="high">Revenue growth is expected at 20–25% for fiscal Q3</Highlight>, supported by
              expansion in our largest accounts.
            </div>
            <div>&nbsp;</div>
            <div>
              Management identified a <Highlight severity="medium">significant deficiency</Highlight> in the revenue
              recognition process during the quarter, which has since been remediated ahead of filing.
            </div>
            <div>&nbsp;</div>
            <div>
              Enterprise customer count grew <Highlight severity="low">40% year-over-year</Highlight>.
            </div>
          </pre>
        </div>

        {/* bottom bar */}
        <div
          className="flex items-center gap-2"
          style={{ background: "#0a0a0a", borderTop: "1px solid #141414", fontSize: 12, color: "#8a8a8a", padding: "12px 16px" }}
        >
          <span
            className="inline-block rounded-full"
            style={{ width: 8, height: 8, background: "#ff785a", boxShadow: "0 0 8px #ff785a" }}
          />
          <span style={{ color: "#ffb7a5", fontWeight: 600 }}>HIGH</span>
          <span>
            Revenue guidance conflicts with Q1 2026 Earnings Call — &ldquo;Revenue growth expected at 15–20%.&rdquo;
          </span>
          <span className="ml-auto" style={{ color: "#5a5a5a" }}>
            confidence 92%
          </span>
        </div>
      </div>
    </section>
  );
}
