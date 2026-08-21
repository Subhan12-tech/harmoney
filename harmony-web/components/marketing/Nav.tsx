import Link from "next/link";
import { Logo } from "@/components/Logo";

const LINKS: { label: string; href: string }[] = [
  { label: "Platform", href: "/" },
  { label: "Docs", href: "/#platform" },
  { label: "Customers", href: "/customers" },
  { label: "Pricing", href: "/pricing" },
  { label: "Changelog", href: "/#platform" },
];

export function Nav() {
  return (
    <nav
      className="relative z-10 mx-auto flex max-w-[1240px] items-center justify-between"
      style={{ padding: "22px 40px" }}
      aria-label="Main"
    >
      <Link href="/" className="flex items-center gap-2.5">
        <Logo size={26} glow id="logo-nav" />
        <span className="font-serif text-[22px] text-[#e5e5e5]" style={{ letterSpacing: "-0.01em" }}>
          Harmony
        </span>
      </Link>

      <div className="hidden items-center gap-7 md:flex">
        {LINKS.map((l) => (
          <Link
            key={l.label}
            href={l.href}
            className="text-[13.5px] text-[#a3a3a3] transition-colors hover:text-neutral-200"
          >
            {l.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-2.5">
        <Link href="/login" className="text-[13.5px] text-[#a3a3a3] transition-colors hover:text-neutral-200">
          Sign in
        </Link>
        <Link
          href="/signup"
          className="inline-flex items-center rounded-lg bg-white font-medium text-black transition-opacity hover:opacity-90"
          style={{ padding: "8px 14px", fontSize: 13 }}
        >
          Get started →
        </Link>
      </div>
    </nav>
  );
}
