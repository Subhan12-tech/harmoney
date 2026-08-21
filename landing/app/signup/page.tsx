"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/AuthLayout";
import { Button, ErrorBox, Input, Label } from "@/components/ui/kit";
import { useAuth } from "@/lib/auth-context";

export default function SignupPage() {
  const { signup, me } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
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
      await signup(fullName, companyName, email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <h2 className="font-serif text-white" style={{ fontSize: 30, margin: "0 0 6px" }}>
        Create your workspace
      </h2>
      <p style={{ color: "#8a8a8a", fontSize: 14, margin: "0 0 24px" }}>You&rsquo;ll be the owner of a new organization.</p>

      {error && (
        <div style={{ marginBottom: 16 }}>
          <ErrorBox>{error}</ErrorBox>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <Label>Full name</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
        <div style={{ marginBottom: 12 }}>
          <Label>Company name</Label>
          <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
        </div>
        <div style={{ marginBottom: 12 }}>
          <Label>Work email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div style={{ marginBottom: 20 }}>
          <Label>Password</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <Button type="submit" variant="primary" disabled={busy} style={{ width: "100%" }}>
          {busy ? "Creating…" : "Create account"}
        </Button>
      </form>

      <p style={{ color: "#8a8a8a", fontSize: 13, textAlign: "center", marginTop: 22 }}>
        Have an account?{" "}
        <Link href="/login" style={{ color: "#6ea8ff" }}>
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
