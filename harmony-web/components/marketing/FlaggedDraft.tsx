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

/**
 * The flagged-draft showcase: an editor chrome around the same three findings
 * the product screens use, so the marketing claim and the app agree.
 */
export function FlaggedDraft() {
  return (
    <section className="mx-auto max-w-[1000px] text-center" style={{ padding: "60px 40px 100px" }}>
      <div className="relative mb-[26px] inline-block">
        <div
          className="flex items-center justify-center"
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "linear-gradient(135deg, #1a1a1a, #0a0a0a)",
            border: "1px solid #2a2a2a",
            boxShadow: "0 0 60px rgba(90,150,255,.18)",
          }}
        >
          <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#e5e5e5" strokeWidth={1.4}>
            <path d="M4 6h16v12H4z" />
            <path d="M4 6l8 6 8-6" />
          </svg>
        </div>
      </div>

      <h2
        className="font-serif text-white"
        style={{ fontSize: "clamp(32px, 4.4vw, 52px)", lineHeight: 1, margin: "0 0 16px" }}
      >
        Approve this quarter.
      </h2>
      <p style={{ fontSize: 16, color: "#8a8a8a", maxWidth: 540, margin: "0 auto 40px", lineHeight: 1.6 }}>
        One workspace for drafts, evidence, suggestions, and approvals. Ship disclosures with the same rigor as
        production code.
      </p>

      <div
        className="overflow-hidden text-left"
        style={{
          border: "1px solid #141414",
          borderRadius: 12,
          background: "#050505",
          boxShadow: "0 30px 80px rgba(0,0,0,.6)",
        }}
      >
        {/* ---- Window chrome ---- */}
        <div
          className="flex items-center"
          style={{ gap: 10, padding: "11px 14px", borderBottom: "1px solid #141414", background: "#0a0a0a" }}
        >
          <span className="inline-block rounded-full" style={{ width: 10, height: 10, background: "#333" }} />
          <span className="inline-block rounded-full" style={{ width: 10, height: 10, background: "#333" }} />
          <span className="inline-block rounded-full" style={{ width: 10, height: 10, background: "#333" }} />
          <span className="font-mono" style={{ color: "#666", marginLeft: 8, fontSize: 12 }}>
            q3-fy26-earnings.md
          </span>
          <span
            className="ml-auto font-mono"
            style={{
              fontSize: 11,
              color: "#7fbf7f",
              background: "rgba(120,220,120,.08)",
              border: "1px solid rgba(120,220,120,.2)",
              padding: "2px 7px",
              borderRadius: 5,
            }}
          >
            ✓ connected
          </span>
        </div>

        {/* ---- Editor ---- */}
        <div className="grid" style={{ gridTemplateColumns: "44px 1fr", fontSize: 13, lineHeight: 1.7 }}>
          <div
            aria-hidden="true"
            className="select-none text-right font-mono"
            style={{ background: "#080808", borderRight: "1px solid #141414", color: "#3a3a3a", padding: "14px 8px" }}
          >
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <pre
            className="whitespace-pre-wrap font-mono"
            style={{ margin: 0, padding: "14px 18px", color: "#c4c4c4", fontSize: 13, lineHeight: 1.7 }}
          >
            <span style={{ color: "#7a7a7a" }}># Q3 FY2026 Earnings Release</span>
            {"\n"}
            Harmony delivered a strong third quarter, with continued{"\n"}momentum across our enterprise segment.{" "}
            <Highlight severity="high">Revenue growth{"\n"}is expected at 20–25% for fiscal Q3</Highlight>,
            supported by{"\n"}expansion in our largest accounts.
            {"\n\n"}
            Management identified a <Highlight severity="medium">significant deficiency</Highlight> in{"\n"}the
            revenue recognition process during the quarter,{"\n"}which has since been remediated ahead of filing.
            {"\n\n"}
            Enterprise customer count grew{" "}
            <Highlight severity="low">40% year-over-year</Highlight>.
          </pre>
        </div>

        {/* ---- Finding ---- */}
        <div
          className="flex flex-wrap items-center"
          style={{
            borderTop: "1px solid #141414",
            background: "#0a0a0a",
            padding: "12px 16px",
            gap: 14,
            fontSize: 12,
            color: "#888",
          }}
        >
          <span
            className="inline-block flex-none rounded-full"
            style={{ width: 8, height: 8, background: "#ff785a", boxShadow: "0 0 6px #ff785a" }}
          />
          <span style={{ color: "#ffb7a5" }}>HIGH</span>
          <span>
            Revenue guidance conflicts with Q1 2026 Earnings Call — &ldquo;Revenue growth expected at
            15&ndash;20%.&rdquo;
          </span>
          <span className="ml-auto flex-none" style={{ color: "#5a5a5a" }}>
            confidence 92%
          </span>
        </div>
      </div>
    </section>
  );
}
