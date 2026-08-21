import { Logo } from "./Logo";

const COLUMNS: { title: string; links: string[] }[] = [
  { title: "Product", links: ["Review", "Evidence", "Analytics", "Integrations"] },
  { title: "Developers", links: ["Docs", "API", "SDK", "Status"] },
  { title: "Company", links: ["About", "Customers", "Careers", "Contact"] },
  { title: "Legal", links: ["Terms", "Privacy", "Security", "DPA"] },
];

export function Footer() {
  return (
    <footer style={{ borderTop: "1px solid #0f0f0f", padding: "60px 40px", color: "#666", fontSize: 13 }}>
      <div className="mx-auto grid max-w-[1160px] grid-cols-2 gap-10 sm:grid-cols-3 md:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <Logo size={20} />
            <span className="font-serif" style={{ fontSize: 18, color: "#e5e5e5" }}>
              Harmony
            </span>
          </div>
          <div style={{ color: "#5a5a5a", marginTop: 14 }}>© 2026 Harmony Technologies</div>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <div style={{ color: "#e5e5e5", marginBottom: 12 }}>{col.title}</div>
            <div className="flex flex-col" style={{ gap: 8 }}>
              {col.links.map((l) => (
                <a key={l} href="#" className="hover:text-neutral-300 transition-colors">
                  {l}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </footer>
  );
}
