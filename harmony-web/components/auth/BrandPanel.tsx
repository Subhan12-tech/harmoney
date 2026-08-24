import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ParticleField } from "./ParticleField";

const STATS = [
  { value: "SOC 2", label: "Type II in progress" },
  { value: "SSO", label: "SAML & OIDC" },
  { value: "Audit", label: "Full activity trail" },
];

/**
 * The left-hand brand panel shared by sign-in and sign-up.
 *
 * `aside` rather than `main` — it is supporting material beside the form, and
 * everything decorative in it is hidden from assistive technology.
 */
export function BrandPanel({
  headline,
  accentWord,
  body,
  children,
}: {
  headline: string;
  accentWord: string;
  body: string;
  /** Optional slot used by signup for its step rail. */
  children?: React.ReactNode;
}) {
  return (
    <aside
      className="relative hidden flex-col justify-between overflow-hidden lg:flex"
      style={{
        padding: 56,
        background:
          "radial-gradient(circle at 25% 15%, color-mix(in srgb, var(--accent) 20%, transparent), transparent 55%), var(--bg-elev)",
      }}
    >
      <ParticleField />

      <Link href="/" className="relative flex items-center gap-2.5">
        <Logo size={26} glow id="logo-auth" />
        <span className="font-heading" style={{ fontWeight: 700, fontSize: 20, letterSpacing: "-0.01em" }}>
          Harmony
        </span>
      </Link>

      <div className="relative">
        <h1
          className="font-heading"
          style={{ fontWeight: 700, fontSize: 42, lineHeight: 1.1, maxWidth: 460, margin: "0 0 16px" }}
        >
          {headline} <span style={{ color: "var(--accent)" }}>{accentWord}</span>
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 15, maxWidth: 420, lineHeight: 1.65, margin: 0 }}>{body}</p>

        {children ?? (
          <div className="flex gap-7" style={{ marginTop: 36 }}>
            {STATS.map((s) => (
              <div key={s.value}>
                <div
                  className="font-heading"
                  style={{ fontWeight: 700, fontSize: 22, color: "var(--accent)" }}
                >
                  {s.value}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="relative" style={{ color: "var(--faint)", fontSize: 12, margin: 0 }}>
        © 2026 Harmony Technologies. Enterprise disclosure consistency platform.
      </p>
    </aside>
  );
}
