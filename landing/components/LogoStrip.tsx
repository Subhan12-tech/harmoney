const BRANDS: { text: string; style: React.CSSProperties }[] = [
  { text: "Meridian", style: { fontFamily: "Georgia, serif", fontStyle: "italic" } },
  { text: "ARDEN", style: { fontWeight: 700, letterSpacing: "0.08em" } },
  { text: "Halcyon", style: { fontFamily: "var(--font-instrument-serif), serif", fontSize: 20 } },
  { text: "✦ Vantage", style: { fontWeight: 600 } },
  { text: "Northwind", style: { fontFamily: "Georgia, serif" } },
  { text: "CLARO", style: { fontWeight: 700 } },
  { text: "▲ apex", style: {} },
  { text: "Ferris & Co.", style: { fontFamily: "var(--font-instrument-serif), serif", fontSize: 20 } },
  { text: "◆ orbital", style: {} },
  { text: "Blackstone Row", style: { fontFamily: "Georgia, serif" } },
  { text: "STRATA", style: { fontWeight: 700 } },
  { text: "∿ signal", style: {} },
];

export function LogoStrip() {
  return (
    <section className="mx-auto max-w-[1100px]" style={{ padding: "80px 40px" }}>
      <div
        className="text-center"
        style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.14em", color: "#666" }}
      >
        Trusted by the world&rsquo;s disclosure teams
      </div>
      <div
        className="mt-10 grid grid-cols-2 items-center text-center sm:grid-cols-3 md:grid-cols-6"
        style={{ gap: "40px 20px", opacity: 0.7, color: "#5a5a5a", fontSize: 15 }}
      >
        {BRANDS.map((b) => (
          <div key={b.text} style={b.style}>
            {b.text}
          </div>
        ))}
      </div>
    </section>
  );
}
