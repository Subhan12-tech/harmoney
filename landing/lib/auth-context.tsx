"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "./api";

export type Me = {
  id: string;
  email: string;
  full_name: string;
  job_title?: string;
  email_verified?: boolean;
  org_id: string;
  role: string | null;
  is_superadmin: boolean;
};

type AuthState = {
  me: Me | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (fullName: string, companyName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  switchOrg: (orgId: string) => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setMe(null);
      setLoading(false);
      return;
    }
    try {
      const d = await api<Me>("/api/auth/me");
      setMe(d);
    } catch {
      setToken(null);
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      const d = await api<{ token: string }>("/api/auth/login", "POST", { email, password });
      setToken(d.token);
      await refreshMe();
    },
    [refreshMe]
  );

  const signup = useCallback(
    async (fullName: string, companyName: string, email: string, password: string) => {
      const d = await api<{ token: string }>("/api/auth/signup", "POST", {
        full_name: fullName,
        company_name: companyName,
        email,
        password,
      });
      setToken(d.token);
      await refreshMe();
    },
    [refreshMe]
  );

  const logout = useCallback(async () => {
    try {
      await api("/api/auth/logout", "POST");
    } catch {
      // ignore — we're clearing the local token regardless
    }
    setToken(null);
    setMe(null);
  }, []);

  const switchOrg = useCallback(
    async (orgId: string) => {
      const d = await api<{ token: string }>(`/api/orgs/switch/${orgId}`, "POST");
      setToken(d.token);
      await refreshMe();
    },
    [refreshMe]
  );

  return (
    <AuthContext.Provider value={{ me, loading, login, signup, logout, refreshMe, switchOrg }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
