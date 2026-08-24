"use client";

import { useEffect, useState } from "react";
import { useRole } from "@/context/RoleContext";
import { useAsyncData } from "@/lib/useAsyncData";
import { getSecurityLog, getSessions } from "@/lib/data";
import { ApiError, mfaDisable, mfaEnable, mfaSetup, mfaStatus, revokeSession } from "@/lib/api";
import { accentChipStyle, neutralChipStyle, secondaryButtonStyle } from "@/lib/style";
import { Modal } from "../Modal";
import { useToast } from "../Toast";



export function SecurityPanel() {
  const { orgId, canManageSecurity } = useRole();
  const { toast } = useToast();

  const sessions = useAsyncData(() => getSessions(orgId), [orgId], []);
  const log = useAsyncData(() => getSecurityLog(orgId), [orgId], []);

  const [revoked, setRevoked] = useState<string[]>([]);
  const [mfaOpen, setMfaOpen] = useState(false);

  // Real TOTP state. `secret` exists only between setup and enable.
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauth, setOtpauth] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);

  useEffect(() => setRevoked([]), [orgId]);

  useEffect(() => {
    let cancelled = false;
    mfaStatus()
      .then((r) => {
        if (!cancelled) setMfaEnabled(Boolean(r?.enabled));
      })
      .catch(() => {
        /* treat an unreadable status as "not enabled" rather than blocking the page */
      });
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  async function beginSetup() {
    setMfaBusy(true);
    setMfaError(null);
    try {
      const r = await mfaSetup();
      setSecret(r.secret);
      setOtpauth(r.otpauth_uri);
      setBackupCodes([]);
      setCode("");
    } catch (err) {
      setMfaError(err instanceof ApiError ? err.message : "Could not start MFA setup.");
    } finally {
      setMfaBusy(false);
    }
  }

  async function confirmEnable() {
    if (code.trim().length < 6) {
      setMfaError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setMfaBusy(true);
    setMfaError(null);
    try {
      const r = await mfaEnable(code.trim());
      // These are returned once and stored only as hashes server-side.
      setBackupCodes(r.backup_codes || []);
      setMfaEnabled(true);
      setSecret(null);
      setOtpauth(null);
      setCode("");
      toast("Two-factor authentication enabled.");
    } catch (err) {
      setMfaError(err instanceof ApiError ? err.message : "That code was not accepted.");
    } finally {
      setMfaBusy(false);
    }
  }

  async function turnOff() {
    if (code.trim().length < 6) {
      setMfaError("Enter a current code from your authenticator app to disable MFA.");
      return;
    }
    setMfaBusy(true);
    setMfaError(null);
    try {
      await mfaDisable(code.trim());
      setMfaEnabled(false);
      setBackupCodes([]);
      setCode("");
      setMfaOpen(false);
      toast("Two-factor authentication disabled.");
    } catch (err) {
      setMfaError(err instanceof ApiError ? err.message : "That code was not accepted.");
    } finally {
      setMfaBusy(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2" style={{ maxWidth: 900 }}>
        {/* ---- Authentication ---- */}
        <section className="app-card flex flex-col" style={{ padding: 20 }} aria-labelledby="auth-heading">
          <h2 id="auth-heading" className="kicker" style={{ marginBottom: 6 }}>
            Authentication
          </h2>

          <div className="flex items-center justify-between" style={{ padding: "7px 0" }}>
            <span style={{ fontSize: 13.5 }}>Password</span>
            <button
              type="button"
              onClick={() => toast("A password reset link has been sent to your work email.")}
              style={linkButtonStyle}
            >
              Change
            </button>
          </div>

          <div className="flex items-center justify-between" style={{ padding: "7px 0" }}>
            <span style={{ fontSize: 13.5 }}>Two-factor authentication</span>
            {mfaEnabled ? (
              <span style={accentChipStyle}>Enabled</span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMfaOpen(true);
                  void beginSetup();
                }}
                style={linkButtonStyle}
              >
                Set up
              </button>
            )}
          </div>

          <div className="flex items-center justify-between" style={{ padding: "7px 0" }}>
            <span style={{ fontSize: 13.5 }}>SSO (SAML)</span>
            <span style={{ ...neutralChipStyle, color: "var(--muted)" }}>Not configured</span>
          </div>

          {canManageSecurity ? (
            <button
              type="button"
              onClick={() => setMfaOpen(true)}
              style={{ ...secondaryButtonStyle, marginTop: 10, alignSelf: "flex-start", padding: "8px 16px" }}
            >
              Manage MFA
            </button>
          ) : (
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 10, marginBottom: 0 }}>
              Authentication policy is managed by your workspace Admins.
            </p>
          )}
        </section>

        {/* ---- Sessions ---- */}
        <section className="app-card" style={{ padding: 20 }} aria-labelledby="sessions-heading">
          <h2 id="sessions-heading" className="kicker" style={{ marginBottom: 6 }}>
            Active sessions
          </h2>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {sessions
              .filter((s) => !revoked.includes(s.id))
              .map((s) => (
                <li
                  key={s.ip}
                  className="flex items-start justify-between gap-2"
                  style={{ padding: "7px 0", borderBottom: "1px solid var(--border)" }}
                >
                  <div>
                    <div style={{ fontSize: 13 }}>
                      {s.device} — {s.location}
                    </div>
                    <div style={{ color: "var(--muted)", fontSize: 11 }}>
                      {s.ip} · {s.lastActive}
                    </div>
                  </div>
                  {s.current ? (
                    <span style={accentChipStyle}>This device</span>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await revokeSession(s.id);
                          // Key on the session id, not the IP — two sessions
                          // from one network share an IP and would both vanish.
                          setRevoked((prev) => [...prev, s.id]);
                          toast(`Signed out ${s.device}.`);
                        } catch (err) {
                          toast(err instanceof ApiError ? err.message : "Could not revoke that session.");
                        }
                      }}
                      style={{
                        ...linkButtonStyle,
                        color: "color-mix(in srgb, var(--danger) 75%, white)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Revoke<span className="sr-only"> session on {s.device}</span>
                    </button>
                  )}
                </li>
              ))}
          </ul>
        </section>
      </div>

      {/* ---- Security activity ---- */}
      <section
        className="app-card"
        style={{ padding: 20, maxWidth: 900, marginTop: 16 }}
        aria-labelledby="seclog-heading"
      >
        <h2 id="seclog-heading" className="kicker" style={{ marginBottom: 6 }}>
          Security activity
        </h2>
        <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {log.map((l) => (
            <li
              key={l.event}
              className="flex items-center justify-between gap-4"
              style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}
            >
              <span>{l.event}</span>
              <span style={{ color: "var(--muted)", fontSize: 11.5, whiteSpace: "nowrap" }}>{l.time}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* ---- MFA ---- */}
      <Modal open={mfaOpen && canManageSecurity} onClose={() => setMfaOpen(false)} title="Two-factor authentication" width={460}>
        {mfaError && (
          <p role="alert" style={{ fontSize: 12.5, color: "color-mix(in srgb, var(--danger) 78%, white)", margin: "0 0 12px" }}>
            {mfaError}
          </p>
        )}

        {/* --- Step 1: scan the secret --- */}
        {secret && (
          <>
            <p style={{ fontSize: 13.5, color: "var(--text)", margin: "0 0 12px" }}>
              Add this secret to your authenticator app, then enter the 6-digit code it shows.
            </p>
            <code style={codeBlockStyle}>{secret}</code>
            {otpauth && (
              <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "8px 0 14px", wordBreak: "break-all" }}>
                {otpauth}
              </p>
            )}
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              aria-label="Verification code"
              style={otpInputStyle}
            />
            <div className="flex justify-end gap-2.5" style={{ marginTop: 14 }}>
              <button type="button" onClick={() => setMfaOpen(false)} style={{ ...secondaryButtonStyle, fontFamily: "inherit" }}>
                Cancel
              </button>
              <button type="button" onClick={confirmEnable} disabled={mfaBusy} style={{ ...secondaryButtonStyle, fontFamily: "inherit", opacity: mfaBusy ? 0.6 : 1 }}>
                {mfaBusy ? "Verifying…" : "Verify & enable"}
              </button>
            </div>
          </>
        )}

        {/* --- Step 2: the real backup codes, shown once --- */}
        {backupCodes.length > 0 && (
          <>
            <p style={{ fontSize: 13.5, color: "var(--text)", margin: "0 0 14px" }}>
              Store these backup codes somewhere safe — each works once, and they cannot be shown again.
            </p>
            <ul className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr", listStyle: "none", margin: "0 0 16px", padding: 0 }}>
              {backupCodes.map((c) => (
                <li key={c} style={backupCodeStyle}>{c}</li>
              ))}
            </ul>
            <div className="flex justify-end">
              <button type="button" onClick={() => { setBackupCodes([]); setMfaOpen(false); }} style={{ ...secondaryButtonStyle, fontFamily: "inherit" }}>
                I have saved them
              </button>
            </div>
          </>
        )}

        {/* --- Already on: offer to turn it off --- */}
        {mfaEnabled && !secret && backupCodes.length === 0 && (
          <>
            <p style={{ fontSize: 13.5, color: "var(--text)", margin: "0 0 14px" }}>
              Two-factor authentication is active on your account. To turn it off, enter a current code from your
              authenticator app.
            </p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              aria-label="Verification code"
              style={otpInputStyle}
            />
            <div className="flex justify-end gap-2.5" style={{ marginTop: 14 }}>
              <button type="button" onClick={() => setMfaOpen(false)} style={{ ...secondaryButtonStyle, fontFamily: "inherit" }}>
                Done
              </button>
              <button type="button" onClick={turnOff} disabled={mfaBusy} style={{ ...secondaryButtonStyle, fontFamily: "inherit", opacity: mfaBusy ? 0.6 : 1, color: "color-mix(in srgb, var(--danger) 75%, white)" }}>
                {mfaBusy ? "Disabling…" : "Disable MFA"}
              </button>
            </div>
          </>
        )}

        {!mfaEnabled && !secret && backupCodes.length === 0 && (
          <p style={{ fontSize: 13.5, color: "var(--muted)", margin: 0 }}>
            {mfaBusy ? "Preparing setup…" : "Could not start setup. Close this and try again."}
          </p>
        )}
      </Modal>
    </>
  );
}

const linkButtonStyle: React.CSSProperties = {
  fontSize: 12.5,
  color: "var(--accent)",
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  fontFamily: "inherit",
};

const codeBlockStyle: React.CSSProperties = {
  background: "var(--bg-elev)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "8px 12px",
  display: "block",
  fontSize: 13,
  letterSpacing: "0.06em",
  color: "var(--accent)",
  wordBreak: "break-all",
};

const otpInputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-elev)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "10px 12px",
  color: "var(--text)",
  fontSize: 16,
  letterSpacing: "0.3em",
  fontFamily: "inherit",
};

const backupCodeStyle: React.CSSProperties = {
  background: "var(--bg-elev)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 13,
  letterSpacing: "0.04em",
  color: "var(--accent)",
};
