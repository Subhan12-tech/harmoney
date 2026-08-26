"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  getAuthConfig,
  googleLogin,
  saveSession,
  setSuperadmin,
  setUserId,
  getMe,
} from "@/lib/api";

/**
 * Real "Continue with Google", using Google Identity Services.
 *
 * Google renders its own button into `ref`, hands us a signed ID token when the
 * user picks an account, and the backend verifies that token before it trusts a
 * thing (see google_auth.py). The client id is fetched from the API rather than
 * baked in at build time, because the frontend is a static export and the id is
 * an environment setting on the server — this way one deploy works for any
 * configured id, and the button simply does not appear when none is set.
 */

const GSI_SRC = "https://accounts.google.com/gsi/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google?: any;
  }
}

function loadGsi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Google script failed to load.")));
      return;
    }
    const s = document.createElement("script");
    s.src = GSI_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Google script failed to load."));
    document.head.appendChild(s);
  });
}

export function GoogleButton({ onError }: { onError?: (message: string) => void }) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function handleCredential(resp: { credential?: string }) {
      if (!resp?.credential) return;
      setBusy(true);
      try {
        const session = await googleLogin(resp.credential);
        saveSession(session);
        try {
          const me = await getMe();
          if (me?.id) setUserId(me.id);
          setSuperadmin(Boolean(me?.is_superadmin));
        } catch {
          /* cosmetic only */
        }
        router.push("/app");
      } catch (err) {
        setBusy(false);
        onError?.(
          err instanceof ApiError ? err.message : "Google sign-in failed. Please try again.",
        );
      }
    }

    (async () => {
      try {
        const cfg = await getAuthConfig();
        if (cancelled || !cfg.google_enabled || !cfg.google_client_id) return;
        await loadGsi();
        if (cancelled || !ref.current) return;
        window.google.accounts.id.initialize({
          client_id: cfg.google_client_id,
          callback: handleCredential,
        });
        window.google.accounts.id.renderButton(ref.current, {
          theme: "outline",
          size: "large",
          width: 336,
          text: "continue_with",
          shape: "rectangular",
        });
        setEnabled(true);
      } catch {
        /* Google not configured or unreachable — the button just stays hidden. */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, onError]);

  if (!enabled) return null;

  return (
    <div style={{ position: "relative" }}>
      <div ref={ref} style={{ display: "flex", justifyContent: "center", opacity: busy ? 0.5 : 1 }} />
      {busy && (
        <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center",
                       fontSize: 12, color: "var(--muted)" }}>
          Signing in…
        </span>
      )}
    </div>
  );
}
