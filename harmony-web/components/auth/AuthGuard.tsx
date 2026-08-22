"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, clearSession, getToken, setUserId } from "@/lib/api";

/**
 * Gate for the authenticated shell.
 *
 * Two jobs. First, no session -> /login. Second, a session whose workspace is
 * not activated yet gets an explanation instead of a shell that renders empty
 * and fires a wall of 403s.
 *
 * This is a convenience, not a security boundary — the backend rejects every
 * request from a pending or suspended workspace regardless of what renders.
 *
 * The check runs after mount because localStorage does not exist during the
 * server render; gating on it during render would desync hydration.
 */

interface Me {
  id: string;
  full_name: string;
  email: string;
  org_status?: string;
  org_status_reason?: string;
}

type State =
  | { kind: "checking" }
  | { kind: "allowed" }
  | { kind: "blocked"; status: string; reason: string; email: string };

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "checking" });

  useEffect(() => {
    let cancelled = false;

    if (!getToken()) {
      clearSession();
      router.replace("/login");
      return;
    }

    (async () => {
      try {
        const me = await apiGet<Me>("/api/auth/me");
        if (cancelled) return;
        if (me?.id) setUserId(me.id);

        const status = (me.org_status || "active").toLowerCase();
        if (status === "active") {
          setState({ kind: "allowed" });
        } else {
          setState({
            kind: "blocked",
            status,
            reason: me.org_status_reason || "",
            email: me.email || "",
          });
        }
      } catch {
        // An expired or revoked token lands here — treat it as signed out.
        if (cancelled) return;
        clearSession();
        router.replace("/login");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state.kind === "checking") {
    return <Centered>Loading your workspace…</Centered>;
  }

  if (state.kind === "blocked") {
    const pending = state.status === "pending";
    return (
      <Centered>
        <div style={{ maxWidth: 460, textAlign: "center" }}>
          <div
            aria-hidden
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              margin: "0 auto 20px",
              display: "grid",
              placeItems: "center",
              fontSize: 24,
              background: pending
                ? "color-mix(in srgb, var(--warn) 18%, transparent)"
                : "color-mix(in srgb, var(--danger) 16%, transparent)",
              color: pending ? "var(--warn)" : "var(--danger)",
            }}
          >
            {pending ? "◷" : "✕"}
          </div>

          <h1 className="font-heading" style={{ fontWeight: 700, fontSize: 24, margin: "0 0 10px" }}>
            {pending ? "Your workspace is awaiting activation" : "Workspace access suspended"}
          </h1>

          <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.65, margin: "0 0 8px" }}>
            {pending
              ? "Your account is set up and your workspace is ready. A member of the Harmony team reviews every new workspace before it is activated — you will be emailed as soon as it is."
              : state.reason ||
                "Access to this workspace has been withdrawn. Contact your Harmony account manager to restore it."}
          </p>

          {state.email && (
            <p style={{ color: "var(--muted)", fontSize: 12.5, margin: "0 0 26px" }}>
              Signed in as {state.email}
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              clearSession();
              router.replace("/login");
            }}
            className="font-heading"
            style={{
              background: "var(--surface-2, rgba(255,255,255,.07))",
              border: "1px solid var(--border)",
              color: "var(--text)",
              borderRadius: 9,
              padding: "10px 20px",
              fontSize: 13.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
      </Centered>
    );
  }

  return <>{children}</>;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="app-skin"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        color: "var(--muted)",
        fontSize: 13,
      }}
    >
      {children}
    </div>
  );
}
