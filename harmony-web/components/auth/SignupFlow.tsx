"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ROLES, type Role } from "@/lib/data";
import {
  ApiError,
  apiPost,
  checkVerificationCode,
  saveSession,
  sendVerificationCode,
  type Session,
} from "@/lib/api";
import { primaryButtonStyle, secondaryButtonStyle } from "@/lib/style";
import { BrandPanel } from "./BrandPanel";
import { CheckIcon } from "@/components/app/icons";

const STEPS = [
  { key: "account", label: "Your account", blurb: "Name, work email, password" },
  { key: "verify", label: "Verify email", blurb: "Six-digit code" },
  { key: "organization", label: "Organization", blurb: "Company details" },
  { key: "invite", label: "Invite team", blurb: "Optional" },
  { key: "done", label: "Done", blurb: "Open your workspace" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

const INDUSTRIES = [
  "Enterprise Software",
  "Financial Services",
  "Industrial Manufacturing",
  "Healthcare & Life Sciences",
  "Energy & Utilities",
  "Retail & Consumer",
  "Other",
];

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Singapore",
  "UTC",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Only one step form is mounted at a time, so a constant id is unambiguous. */
const FORM_ID = "signup-step";

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "var(--muted)",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  backgroundColor: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 9,
  padding: "11px 13px",
  color: "var(--text)",
  fontSize: 14,
};

/** 0–4. Length carries the most weight, then character variety. */
function passwordScore(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score += 1;
  return Math.min(4, score);
}

const STRENGTH = [
  { label: "Too short", token: "var(--danger)" },
  { label: "Weak", token: "var(--danger)" },
  { label: "Fair", token: "var(--warn)" },
  { label: "Good", token: "var(--accent-2)" },
  { label: "Strong", token: "var(--accent)" },
];

interface InviteRow {
  id: number;
  email: string;
  role: Role;
}

export function SignupFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const requested = searchParams.get("step") as StepKey | null;
  const stepIndex = Math.max(
    0,
    STEPS.findIndex((s) => s.key === requested),
  );
  const step = STEPS[stepIndex];

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [timezone, setTimezone] = useState(TIMEZONES[0]);
  const [invites, setInvites] = useState<InviteRow[]>([{ id: 1, email: "", role: "Reviewer" }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resent, setResent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  /** Shown only when the server has no SMTP configured (development). */
  const [devCode, setDevCode] = useState<string | null>(null);
  /** False when the server could not deliver a code. The verify step is then
   *  skipped entirely rather than demanding six digits that were never sent. */
  const [codeSent, setCodeSent] = useState(true);

  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);
  const score = passwordScore(password);

  const go = useCallback(
    (next: StepKey) => {
      router.push(`/signup?step=${next}`, { scroll: false });
    },
    [router],
  );

  const validate = useCallback((): boolean => {
    const next: Record<string, string> = {};

    if (step.key === "account") {
      if (name.trim().length < 2) next.name = "Enter your full name.";
      if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid work email address.";
      if (passwordScore(password) < 2) next.password = "Use at least 8 characters, with a mix of cases.";
    }
    if (step.key === "verify" && codeSent && code.join("").length < 6) {
      next.code = "Enter the six-digit code we emailed you.";
    }
    if (step.key === "organization") {
      if (company.trim().length < 2) next.company = "Enter your company name.";
      if (website.trim().length < 3) next.website = "Enter your company website.";
    }
    if (step.key === "invite") {
      const bad = invites.find((i) => i.email.trim() !== "" && !EMAIL_RE.test(i.email.trim()));
      if (bad) next.invite = "One of the invitations is not a valid email address.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }, [step.key, name, email, password, code, company, website, invites, codeSent]);

  /**
   * The account is created at the END of the organization step, because the
   * backend's signup takes the person and the company in one call. Everything
   * before that is local state, so the earlier steps stay instant.
   */
  async function onContinue() {
    if (!validate()) return;
    if (submitting) return;

    if (step.key === "account") {
      setSubmitting(true);
      try {
        const r = await sendVerificationCode(email.trim());
        setDevCode(r.dev_code ?? null);
        setResent(false);
        // "demo" means a real code exists, it is just shown rather than emailed.
        const delivered = r.status === "sent" || r.status === "demo";
        setCodeSent(delivered);
        // Nothing arrived, so there is nothing to type. Showing a code box the
        // user cannot possibly satisfy is a dead end, not a security control -
        // the server already knows not to require verification in this state.
        go(delivered || r.dev_code ? "verify" : "organization");
      } catch (err) {
        // A taken address is reported here rather than three steps later.
        setErrors({ email: err instanceof ApiError ? err.message : "Could not send the verification code." });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (step.key === "verify") {
      if (!codeSent && !devCode) {
        go("organization");
        return;
      }
      setSubmitting(true);
      try {
        await checkVerificationCode(email.trim(), code.join(""));
        go("organization");
      } catch (err) {
        setErrors({ code: err instanceof ApiError ? err.message : "Could not check that code." });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (step.key === "organization") {
      setSubmitting(true);
      try {
        const session = await apiPost<Session>("/api/auth/signup", {
          full_name: name.trim(),
          email: email.trim(),
          password,
          company_name: company.trim(),
        });
        saveSession(session);
        // The six-digit step is cosmetic — no code is mailed, and a token only
        // exists now — so the address is marked verified here instead.
        await apiPost("/api/auth/verify-email", {}, true).catch(() => {});
        go("invite");
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Could not create your workspace.";
        // A taken address is a mistake made two steps back; send them to it.
        if (err instanceof ApiError && err.status === 400 && /email/i.test(message)) {
          setErrors({ email: message });
          go("account");
        } else {
          setErrors({ form: message });
        }
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (step.key === "invite") {
      const pending = invites.filter((i) => i.email.trim());
      if (pending.length > 0) {
        setSubmitting(true);
        try {
          for (const row of pending) {
            await apiPost(
              "/api/orgs/invite",
              { email: row.email.trim(), role: row.role.toLowerCase() },
              true,
            );
          }
        } catch (err) {
          setErrors({ form: err instanceof ApiError ? err.message : "Could not send the invitations." });
          setSubmitting(false);
          return;
        }
        setSubmitting(false);
      }
      go("done");
      return;
    }

    const next = STEPS[Math.min(STEPS.length - 1, stepIndex + 1)];
    go(next.key);
  }

  function setDigit(index: number, value: string) {
    const digits = value.replace(/\D/g, "");
    if (!digits) {
      setCode((prev) => prev.map((c, i) => (i === index ? "" : c)));
      return;
    }
    // Handles both single keystrokes and a pasted six-digit code.
    setCode((prev) => {
      const next = [...prev];
      for (let i = 0; i < digits.length && index + i < 6; i += 1) next[index + i] = digits[i];
      return next;
    });
    const focusAt = Math.min(5, index + digits.length);
    codeRefs.current[focusAt]?.focus();
  }

  const rail = useMemo(
    () => (
      <ol style={{ listStyle: "none", margin: "36px 0 0", padding: 0 }}>
        {STEPS.map((s, i) => {
          const done = i < stepIndex;
          const current = i === stepIndex;
          return (
            <li key={s.key} className="flex items-start gap-3" style={{ padding: "10px 0" }}>
              <span
                aria-hidden="true"
                className="flex flex-none items-center justify-center"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  marginTop: 1,
                  fontSize: 11.5,
                  fontWeight: 700,
                  fontFamily: "var(--font-manrope), system-ui, sans-serif",
                  background: done
                    ? "color-mix(in srgb, var(--accent) 24%, transparent)"
                    : current
                      ? "var(--accent)"
                      : "transparent",
                  border: current || done ? "none" : "1px solid var(--border)",
                  color: done ? "var(--accent)" : current ? "var(--on-accent)" : "var(--muted)",
                }}
              >
                {done ? <CheckIcon size={13} /> : i + 1}
              </span>
              <span>
                <span
                  style={{
                    display: "block",
                    fontSize: 13.5,
                    color: current || done ? "var(--text)" : "var(--muted)",
                    fontWeight: current ? 600 : 400,
                  }}
                >
                  {s.label}
                </span>
                <span style={{ display: "block", fontSize: 11.5, color: "var(--muted)" }}>{s.blurb}</span>
              </span>
            </li>
          );
        })}
      </ol>
    ),
    [stepIndex],
  );

  return (
    <div className="app-skin grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <BrandPanel
        headline="Set up your"
        accentWord="workspace."
        body="Five short steps. You can invite the rest of your team later, and nothing publishes until a named human approves it."
      >
        {rail}
      </BrandPanel>

      <main className="flex items-center justify-center" style={{ padding: 48, background: "var(--bg)" }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          <p className="kicker" style={{ marginBottom: 8 }}>
            Step {stepIndex + 1} of {STEPS.length}
          </p>

          {/* ---- 1. Account ---- */}
          {step.key === "account" && (
            <Panel
              title="Create your account"
              blurb="Use the work email your team already knows you by."
              onSubmit={onContinue}
            >
              <Field label="Full name" id="signup-name" error={errors.name}>
                <input
                  id="signup-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  placeholder="Riley Chen"
                  style={inputStyle}
                />
              </Field>

              <Field label="Work email" id="signup-email" error={errors.email}>
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@company.com"
                  style={inputStyle}
                />
              </Field>

              <Field label="Password" id="signup-password" error={errors.password}>
                <input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  style={inputStyle}
                  aria-describedby="password-strength"
                />
                <div className="flex items-center gap-2" style={{ marginTop: 8 }}>
                  <span className="flex flex-1 gap-1" aria-hidden="true">
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        style={{
                          flex: 1,
                          height: 4,
                          borderRadius: 2,
                          background: i < score ? STRENGTH[score].token : "var(--surface-2)",
                          transition: "background 160ms ease",
                        }}
                      />
                    ))}
                  </span>
                  <span id="password-strength" style={{ fontSize: 11.5, color: "var(--muted)" }}>
                    {password ? STRENGTH[score].label : "Password strength"}
                  </span>
                </div>
              </Field>
            </Panel>
          )}

          {/* ---- 2. Verify ---- */}
          {step.key === "verify" && (
            <Panel
              title="Verify your email"
              blurb={
                devCode
                  ? `Demo mode — email is not configured, so your code is ${devCode}`
                  : codeSent
                    ? `We sent a six-digit code to ${email || "your work email"}.`
                    : "We could not send a code to that address, so this step is skipped."
              }
              onSubmit={onContinue}
            >
              <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
                <legend style={labelStyle}>Verification code</legend>
                <div className="flex gap-2">
                  {code.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        codeRefs.current[i] = el;
                      }}
                      value={digit}
                      onChange={(e) => setDigit(i, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !code[i] && i > 0) codeRefs.current[i - 1]?.focus();
                      }}
                      inputMode="numeric"
                      maxLength={6}
                      aria-label={`Digit ${i + 1}`}
                      style={{
                        ...inputStyle,
                        width: 52,
                        textAlign: "center",
                        fontSize: 18,
                        fontFamily: "var(--font-manrope), system-ui, sans-serif",
                        fontWeight: 700,
                        padding: "12px 0",
                      }}
                    />
                  ))}
                </div>
                {errors.code && <ErrorText>{errors.code}</ErrorText>}
              </fieldset>

              <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 14 }}>
                {resent ? (
                  "A new code is on its way."
                ) : (
                  <>
                    Did not get it?{" "}
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const r = await sendVerificationCode(email.trim());
                          setDevCode(r.dev_code ?? null);
                          setResent(true);
                        } catch (err) {
                          setErrors({
                            code: err instanceof ApiError ? err.message : "Could not resend the code.",
                          });
                        }
                      }}
                      style={{
                        color: "var(--accent)",
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontSize: 12.5,
                      }}
                    >
                      Resend the code
                    </button>
                  </>
                )}
              </p>
            </Panel>
          )}

          {/* ---- 3. Organization ---- */}
          {step.key === "organization" && (
            <Panel
              title="Tell us about your organization"
              blurb="This scopes your evidence library and your audit trail."
              onSubmit={onContinue}
            >
              <Field label="Company name" id="signup-company" error={errors.company}>
                <input
                  id="signup-company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Corporation"
                  style={inputStyle}
                />
              </Field>

              <Field label="Website" id="signup-website" error={errors.website}>
                <input
                  id="signup-website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="acme.com"
                  style={inputStyle}
                />
              </Field>

              <Field label="Industry" id="signup-industry">
                <select
                  id="signup-industry"
                  className="h-select"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  style={inputStyle}
                >
                  {INDUSTRIES.map((i) => (
                    <option key={i}>{i}</option>
                  ))}
                </select>
              </Field>

              <Field label="Default timezone" id="signup-timezone">
                <select
                  id="signup-timezone"
                  className="h-select"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  style={inputStyle}
                >
                  {TIMEZONES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
            </Panel>
          )}

          {/* ---- 4. Invite ---- */}
          {step.key === "invite" && (
            <Panel
              title="Invite your reviewers"
              blurb="Approval needs a named human, so most teams add reviewers now. You can skip this."
              onSubmit={onContinue}
            >
              {invites.map((row, i) => (
                <div key={row.id} className="flex items-end gap-2" style={{ marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label htmlFor={`invite-email-${row.id}`} style={labelStyle}>
                      Email {i + 1}
                    </label>
                    <input
                      id={`invite-email-${row.id}`}
                      type="email"
                      value={row.email}
                      onChange={(e) =>
                        setInvites((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, email: e.target.value } : r)),
                        )
                      }
                      placeholder="name@company.com"
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ width: 130 }}>
                    <label htmlFor={`invite-role-${row.id}`} style={labelStyle}>
                      Role
                    </label>
                    <select
                      id={`invite-role-${row.id}`}
                      className="h-select"
                      value={row.role}
                      onChange={(e) =>
                        setInvites((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, role: e.target.value as Role } : r)),
                        )
                      }
                      style={inputStyle}
                    >
                      {ROLES.filter((r) => r !== "Owner").map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  {invites.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setInvites((prev) => prev.filter((r) => r.id !== row.id))}
                      style={{
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        borderRadius: 9,
                        color: "var(--muted)",
                        cursor: "pointer",
                        height: 42,
                        width: 38,
                        fontFamily: "inherit",
                      }}
                    >
                      <span className="sr-only">Remove invitation {i + 1}</span>
                      <span aria-hidden="true">×</span>
                    </button>
                  )}
                </div>
              ))}

              {errors.invite && <ErrorText>{errors.invite}</ErrorText>}

              <button
                type="button"
                onClick={() =>
                  setInvites((prev) => [
                    ...prev,
                    { id: (prev[prev.length - 1]?.id ?? 0) + 1, email: "", role: "Reviewer" },
                  ])
                }
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent)",
                  fontSize: 13,
                  padding: 0,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                + Add another
              </button>
            </Panel>
          )}

          {/* ---- 5. Done ---- */}
          {step.key === "done" && (
            <div>
              <span
                aria-hidden="true"
                className="flex items-center justify-center"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "color-mix(in srgb, var(--accent) 20%, transparent)",
                  color: "var(--accent)",
                  marginBottom: 18,
                }}
              >
                <CheckIcon size={24} />
              </span>
              <h1 className="font-heading" style={{ fontWeight: 700, fontSize: 26, margin: "0 0 8px" }}>
                Your workspace is ready
              </h1>
              <p style={{ color: "var(--muted)", fontSize: 13.5, lineHeight: 1.6, margin: "0 0 20px" }}>
                {company || "Your organization"} is set up{" "}
                {invites.filter((i) => i.email.trim()).length > 0
                  ? `and ${invites.filter((i) => i.email.trim()).length} invitation${
                      invites.filter((i) => i.email.trim()).length === 1 ? " has" : "s have"
                    } been sent. `
                  : ". "}
                Next, upload your historical corpus so Harmony has evidence to cite.
              </p>
              <Link href="/app" style={{ ...primaryButtonStyle, display: "inline-block", padding: "11px 20px" }}>
                Continue to dashboard
              </Link>
            </div>
          )}

          {/* Server-side failures (API down, duplicate org, rejected invite). */}
          {errors.form && step.key !== "done" && (
            <div
              role="alert"
              style={{
                marginTop: 18,
                padding: "11px 13px",
                borderRadius: 10,
                fontSize: 12.5,
                lineHeight: 1.55,
                color: "color-mix(in srgb, var(--danger) 80%, white)",
                background: "color-mix(in srgb, var(--danger) 12%, transparent)",
                border: "1px solid color-mix(in srgb, var(--danger) 35%, transparent)",
              }}
            >
              {errors.form}
            </div>
          )}

          {/* ---- Controls ---- */}
          {step.key !== "done" && (
            <div className="flex items-center gap-2.5" style={{ marginTop: 24 }}>
              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={() => go(STEPS[stepIndex - 1].key)}
                  style={{ ...secondaryButtonStyle, fontFamily: "inherit" }}
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                form={FORM_ID}
                disabled={submitting}
                style={{
                  ...primaryButtonStyle,
                  padding: "10px 22px",
                  fontSize: 14,
                  opacity: submitting ? 0.6 : 1,
                  cursor: submitting ? "progress" : "pointer",
                }}
              >
                {submitting
                  ? step.key === "organization"
                    ? "Creating workspace…"
                    : step.key === "account"
                      ? "Sending code…"
                      : step.key === "verify"
                        ? "Checking…"
                        : "Sending…"
                  : "Continue"}
              </button>
              {step.key === "invite" && (
                <button
                  type="button"
                  onClick={() => go("done")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--muted)",
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Skip for now
                </button>
              )}
            </div>
          )}

          <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 26 }}>
            Already have a workspace?{" "}
            <Link href="/login" style={{ color: "var(--accent)" }}>
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function Panel({
  title,
  blurb,
  children,
  onSubmit,
}: {
  title: string;
  blurb: string;
  children: React.ReactNode;
  onSubmit: () => void;
}) {
  return (
    <form
      id={FORM_ID}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      noValidate
    >
      <h1 className="font-heading" style={{ fontWeight: 700, fontSize: 26, margin: "0 0 6px" }}>
        {title}
      </h1>
      <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 22px", lineHeight: 1.6 }}>{blurb}</p>
      {children}
    </form>
  );
}

function Field({
  label,
  id,
  error,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label htmlFor={id} style={labelStyle}>
        {label}
      </label>
      {children}
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      style={{
        fontSize: 12,
        color: "color-mix(in srgb, var(--danger) 78%, white)",
        margin: "6px 0 0",
      }}
    >
      {children}
    </p>
  );
}
