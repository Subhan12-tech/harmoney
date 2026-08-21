import Link from "next/link";
import { Logo } from "./Logo";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden overflow-hidden md:flex md:flex-col md:justify-between" style={{ padding: 56 }}>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(1200px 500px at 50% 0, rgba(70,120,220,.18), transparent 60%), " +
              "radial-gradient(700px 320px at 80% 8%, rgba(120,80,220,.12), transparent 60%)",
          }}
        />
        <Link href="/" className="relative z-10 flex items-center gap-2.5">
          <Logo size={26} glow />
          <span className="font-serif text-[22px]" style={{ letterSpacing: "-0.01em" }}>
            Harmony
          </span>
        </Link>
        <div className="relative z-10">
          <h1 className="font-serif text-white" style={{ fontSize: 52, lineHeight: 1.05, maxWidth: 440, marginBottom: 20 }}>
            Say the right thing, consistently.
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.55, color: "#a3a3a3", maxWidth: 400 }}>
            Every AI finding is evidence-cited and requires human approval before publication.
          </p>
        </div>
        <p className="relative z-10" style={{ color: "#5a5a5a", fontSize: 12 }}>
          © 2026 Harmony Technologies
        </p>
      </div>

      <div className="flex items-center justify-center" style={{ padding: 40 }}>
        <div style={{ width: "100%", maxWidth: 380 }}>{children}</div>
      </div>
    </div>
  );
}
