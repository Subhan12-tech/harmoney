"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandPanel } from "@/components/auth/BrandPanel";
import { ApiError, apiGet, apiPost, saveSession, setSuperadmin, setUserId, type Session } from "@/lib/api";
import { WarningIcon } from "@/components/app/icons";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 9,
  padding: "11px 13px",
  color: "var(--text)",
  fontSize: 14,
};

const ssoButtonStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 9,
  padding: 11,
  color: "var(--text)",
  fontSize: 14,
  cursor: "pointer",
  fontFamily: "inherit",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    // Obviously-malformed input is rejected without a round trip. Everything
    // else is the server's call — the client never decides who is authentic.
    if (!EMAIL_RE.test(email.trim()) || !password) {
      setError("Enter your work email and password.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const session = await apiPost<Session>("/api/auth/login", {
        email: email.trim(),
        password,
      });
      saveSession(session);

      // Cache the user id so the team list can mark "you"; a failure here is
      // cosmetic, so it must never block the sign-in.
      try {
        const me = await apiGet<{ id: string; is_superadmin?: boolean }>("/api/auth/me");
        if (me?.id) setUserId(me.id);
        setSuperadmin(Boolean(me?.is_superadmin));
      } catch {
        /* ignore */
      }

      router.push("/app");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not sign in. Check your connection and try again.",
      );
      setSubmitting(false);
    }
  }

  const locked = false;

  return (
    <div className="app-skin grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <BrandPanel
        headline="Say the right thing,"
        accentWord="consistently."
        body="Secure disclosure intelligence for enterprise teams. Every AI finding is evidence-cited and requires human approval before publication."
      />

      <main className="flex items-center justify-center" style={{ padding: 48, background: "var(--bg)" }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <h1 className="font-heading" style={{ fontWeight: 700, fontSize: 26, margin: "0 0 6px" }}>
            Sign in
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 26px" }}>
            Welcome back to your workspace.
          </p>

          {error && (
            <div
              role="alert"
              className="app-fade flex gap-2"
              style={{
                border: "1px solid color-mix(in srgb, var(--danger) 45%, transparent)",
                background: "color-mix(in srgb, var(--danger) 12%, transparent)",
                borderRadius: 10,
                padding: "11px 13px",
                marginBottom: 16,
                fontSize: 13,
                color: "color-mix(in srgb, var(--danger) 75%, white)",
              }}
            >
              <span style={{ flex: "none", marginTop: 1 }}>
                <WarningIcon size={16} />
              </span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={submit} noValidate>
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="email" style={labelStyle}>
                Work email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={error !== null}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label htmlFor="password" style={labelStyle}>
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={error !== null}
                style={inputStyle}
              />
            </div>

            <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
              <label className="flex items-center gap-2" style={{ fontSize: 13, color: "var(--muted)" }}>
                <input type="checkbox" name="remember" defaultChecked style={{ accentColor: "var(--accent)" }} />
                Remember me
              </label>
              <Link href="/login" style={{ fontSize: 13, color: "var(--accent)" }}>
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={locked || submitting}
              className="font-heading"
              style={{
                width: "100%",
                background: "var(--accent)",
                color: "var(--on-accent)",
                border: "none",
                borderRadius: 9,
                padding: 12,
                fontWeight: 700,
                fontSize: 14.5,
                cursor: locked || submitting ? "not-allowed" : "pointer",
                opacity: locked || submitting ? 0.6 : 1,
              }}
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="flex items-center gap-2.5" style={{ margin: "18px 0" }}>
            <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: 11, color: "var(--muted)" }}>OR</span>
            <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          <div className="flex flex-col gap-2.5">
            {["Google", "Microsoft", "enterprise SSO"].map((provider) => (
              <button
                key={provider}
                type="button"
                onClick={() =>
                  setError(
                    `${provider === "enterprise SSO" ? "Enterprise SSO" : provider} sign-in is not enabled for this workspace yet. Use your email and password.`,
                  )
                }
                style={ssoButtonStyle}
              >
                Continue with {provider}
              </button>
            ))}
          </div>

          <p style={{ color: "var(--muted)", fontSize: 12, textAlign: "center", marginTop: 22 }}>
            Do not have a workspace?{" "}
            <Link href="/signup" style={{ color: "var(--accent)" }}>
              Create one
            </Link>
          </p>

          <p style={{ color: "rgba(238,241,244,.35)", fontSize: 11, textAlign: "center", marginTop: 28 }}>
            By continuing you agree to Harmony&rsquo;s{" "}
            <Link href="/login" style={{ color: "inherit", textDecoration: "underline" }}>
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/login" style={{ color: "inherit", textDecoration: "underline" }}>
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "var(--muted)",
  marginBottom: 6,
};
