import Link from "next/link";
import { Logo } from "./Logo";

const LINKS = ["Platform", "Docs", "Customers", "Pricing", "Changelog"];

export function Nav() {
  return (
    <nav
      className="relative z-10 mx-auto flex max-w-[1240px] items-center justify-between"
      style={{ padding: "22px 40px" }}
    >
      <div className="flex items-center gap-2.5">
        <Logo size={26} glow />
        <span className="font-serif text-[22px]" style={{ letterSpacing: "-0.01em" }}>
          Harmony
        </span>
      </div>

      <div className="hidden items-center gap-7 md:flex">
        {LINKS.map((l) => (
          <a key={l} href="#" className="text-[13.5px] text-[#a3a3a3] hover:text-neutral-200 transition-colors">
            {l}
          </a>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <Link href="/login" className="text-[13.5px] text-neutral-200 hover:opacity-80 transition-opacity">
          Sign in
        </Link>
        <Link
          href="/signup"
          className="inline-flex items-center rounded-lg bg-white font-medium text-black hover:opacity-90 transition-opacity"
          style={{ padding: "8px 14px", fontSize: 13.5 }}
        >
          Get started →
        </Link>
      </div>
    </nav>
  );
}
