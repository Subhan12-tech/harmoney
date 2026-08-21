"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/AuthLayout";
import { Button, ErrorBox, Input, Label } from "@/components/ui/kit";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { login, me } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (me) router.replace("/dashboard");
  }, [me, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      router.replace(params.get("next") || "/dashboard");
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <h2 className="font-serif text-white" style={{ fontSize: 30, margin: "0 0 6px" }}>
        Sign in
      </h2>
      <p style={{ color: "#8a8a8a", fontSize: 14, margin: "0 0 24px" }}>Welcome back to your workspace.</p>

      {error && (
        <div style={{ marginBottom: 16 }}>
          <ErrorBox>{error}</ErrorBox>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <Label>Work email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required />
        </div>
        <div style={{ marginBottom: 20 }}>
          <Label>Password</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
        </div>
        <Button type="submit" variant="primary" disabled={busy} style={{ width: "100%" }}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p style={{ color: "#8a8a8a", fontSize: 13, textAlign: "center", marginTop: 22 }}>
        Don&rsquo;t have a workspace?{" "}
        <Link href="/signup" style={{ color: "#6ea8ff" }}>
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
}
