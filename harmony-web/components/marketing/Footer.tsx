import Link from "next/link";
import { Logo } from "@/components/Logo";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Review", href: "/app/review/q3-fy2026-earnings" },
      { label: "Evidence", href: "/app/knowledge" },
      { label: "Analytics", href: "/app/analytics" },
      { label: "Integrations", href: "/app/settings/integrations" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "Docs", href: "/#platform" },
      { label: "API", href: "/app/settings/api" },
      { label: "SDK", href: "/#platform" },
      { label: "Status", href: "/#platform" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/#platform" },
      { label: "Customers", href: "/customers" },
      { label: "Careers", href: "/#platform" },
      { label: "Contact", href: "/signup" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms", href: "/#platform" },
      { label: "Privacy", href: "/#platform" },
      { label: "Security", href: "/app/settings/security" },
      { label: "DPA", href: "/#platform" },
    ],
  },
];

export function Footer() {
  return (
    <footer style={{ borderTop: "1px solid #0f0f0f", padding: "60px 40px", color: "#666", fontSize: 13 }}>
      <div className="mx-auto grid max-w-[1160px] grid-cols-2 gap-10 sm:grid-cols-3 md:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="flex items-center gap-2">
            <Logo size={22} id="logo-footer" />
            <span className="font-serif" style={{ fontSize: 20, color: "#e5e5e5" }}>
              Harmony
            </span>
          </Link>
          <div style={{ color: "#5a5a5a", marginTop: 14 }}>© 2026 Harmony Technologies</div>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <div style={{ color: "#e5e5e5", marginBottom: 10 }}>{col.title}</div>
            <div className="flex flex-col" style={{ gap: 8 }}>
              {col.links.map((l) => (
                <Link key={l.label} href={l.href} className="transition-colors hover:text-neutral-300">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </footer>
  );
}
