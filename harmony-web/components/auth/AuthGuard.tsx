"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession, getToken } from "@/lib/api";

/**
 * Gate for the authenticated shell.
 *
 * This is a convenience, not a security boundary — the real enforcement is the
 * backend rejecting every request without a valid Bearer token. What this stops
 * is the shell rendering an empty, broken app for someone with no session and
 * then firing a dozen 401s at the API.
 *
 * The check runs after mount because localStorage does not exist during the
 * server render; gating on it during render would desync hydration.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "allowed">("checking");

  useEffect(() => {
    if (getToken()) {
      setState("allowed");
      return;
    }
    clearSession();
    router.replace("/login");
  }, [router]);

  if (state === "checking") {
    return (
      <div
        className="app-skin"
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          color: "var(--muted)",
          fontSize: 13,
        }}
      >
        Loading your workspace…
      </div>
    );
  }

  return <>{children}</>;
}
