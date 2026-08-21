import { BRANDS } from "@/lib/data";

/**
 * The mock brand wall. `/` renders the compact strip; `/customers` renders the
 * same 12 marks enlarged, which is why the sizing is a prop rather than a fork.
 */
export function LogoStrip({
  kicker = "Trusted by the world’s disclosure teams",
  large = false,
}: {
  kicker?: string;
  large?: boolean;
}) {
  return (
    <section className={large ? "mx-auto max-w-[1160px]" : "mx-auto max-w-[1100px]"} style={{ padding: "80px 40px" }}>
      <div
        className="text-center"
        style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.14em", color: "#666" }}
      >
        {kicker}
      </div>
      <div
        className={
          large
            ? "mt-12 grid grid-cols-2 items-center text-center sm:grid-cols-3 md:grid-cols-4"
            : "mt-8 grid grid-cols-2 items-center text-center sm:grid-cols-3 md:grid-cols-6"
        }
        style={{
          gap: large ? "56px 28px" : "40px 20px",
          opacity: 0.7,
          color: "#5a5a5a",
          fontSize: large ? 22 : 15,
        }}
      >
        {BRANDS.map((b) => (
          <div key={b.text} style={large ? scaleUp(b.style) : b.style}>
            {b.text}
          </div>
        ))}
      </div>
    </section>
  );
}

/** The per-brand styles pin a font-size for the serif marks; scale those too. */
function scaleUp(style: React.CSSProperties): React.CSSProperties {
  if (typeof style.fontSize === "number") return { ...style, fontSize: style.fontSize * 1.45 };
  return style;
}
