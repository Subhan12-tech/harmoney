import Link from "next/link";
import { Logo } from "@/components/Logo";

/** Root 404 — marketing skin, since an unknown URL is usually a public one. */
export default function NotFound() {
  return (
    <div className="marketing-skin flex min-h-screen flex-col items-center justify-center bg-black px-10 text-center font-sans text-[#e5e5e5]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
        style={{ background: "radial-gradient(900px 400px at 50% 0, rgba(70,120,220,.14), transparent 60%)" }}
      />
      <div className="relative">
        <Link href="/" className="mb-8 inline-flex items-center gap-2.5">
          <Logo size={26} glow id="logo-404" />
          <span className="font-serif text-[22px]" style={{ letterSpacing: "-0.01em" }}>
            Harmony
          </span>
        </Link>

        <p className="font-mono" style={{ fontSize: 11, letterSpacing: "0.15em", color: "#666", marginBottom: 14 }}>
          404
        </p>
        <h1 className="font-serif text-white" style={{ fontSize: 56, lineHeight: 1, margin: "0 0 16px" }}>
          Nothing filed here.
        </h1>
        <p className="mx-auto" style={{ color: "#8a8a8a", fontSize: 16, maxWidth: 460, lineHeight: 1.6 }}>
          The page you asked for does not exist. It may have been moved, or the link may have been mistyped.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center rounded-[9px] bg-white font-semibold text-black transition-opacity hover:opacity-90"
            style={{ padding: "12px 22px", fontSize: 14.5 }}
          >
            Back to home
          </Link>
          <Link
            href="/app"
            className="inline-flex items-center rounded-[9px] border text-neutral-200 transition-colors hover:border-neutral-500"
            style={{ borderColor: "#1e1e1e", background: "#0a0a0a", padding: "12px 22px", fontSize: 14.5 }}
          >
            Open the app
          </Link>
        </div>
      </div>
    </div>
  );
}
