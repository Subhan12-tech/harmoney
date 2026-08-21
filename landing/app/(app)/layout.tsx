"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const { me, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !me) {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/dashboard")}`);
    }
  }, [loading, me, router, pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ color: "#8a8a8a" }}>
        Loading…
      </div>
    );
  }
  if (!me) return null;

  return <AppShell>{children}</AppShell>;
}
