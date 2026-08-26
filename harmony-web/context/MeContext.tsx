"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getMe, getToken, type Me } from "@/lib/api";

/**
 * The real signed-in user — name, email, avatar — fetched once from
 * /api/auth/me and shared across the shell.
 *
 * Before this, the header showed a hard-coded seed user ("Riley Chen"). Now the
 * avatar and account menu reflect who is actually signed in, and a profile edit
 * updates here so every place that shows the user changes at once, with no
 * reload.
 */

interface MeContextValue {
  me: Me | null;
  loading: boolean;
  /** Re-fetch from the server. */
  refresh: () => Promise<void>;
  /** Apply a local change immediately (after a successful profile save). */
  patch: (fields: Partial<Me>) => void;
}

const MeContext = createContext<MeContextValue | null>(null);

export function MeProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setMe(null);
      setLoading(false);
      return;
    }
    try {
      setMe(await getMe());
    } catch {
      // A failed /me is not fatal to the shell — the header just falls back to
      // a neutral avatar. AuthGuard handles an actually-expired session.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const patch = useCallback((fields: Partial<Me>) => {
    setMe((prev) => (prev ? { ...prev, ...fields } : prev));
  }, []);

  const value = useMemo<MeContextValue>(() => ({ me, loading, refresh, patch }), [me, loading, refresh, patch]);

  return <MeContext.Provider value={value}>{children}</MeContext.Provider>;
}

export function useMe(): MeContextValue {
  const ctx = useContext(MeContext);
  if (!ctx) throw new Error("useMe must be used within MeProvider");
  return ctx;
}

/** Initials from a full name — "Riley Chen" -> "RC", "riley" -> "RI". */
export function initialsOf(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
