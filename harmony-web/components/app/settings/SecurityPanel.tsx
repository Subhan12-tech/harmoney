"use client";

import { useEffect, useState } from "react";
import { useRole } from "@/context/RoleContext";
import { useAsyncData } from "@/lib/useAsyncData";
import { getSecurityLog, getSessions } from "@/lib/data";
import { accentChipStyle, neutralChipStyle, secondaryButtonStyle } from "@/lib/style";
import { Modal } from "../Modal";
import { useToast } from "../Toast";

const BACKUP_CODES = ["4K2P-9WQX", "7ZR4-1MJD", "H3VN-8TQB", "R9CD-2LKF", "M5XW-6PAY", "T1QE-4NUV"];

export function SecurityPanel() {
  const { orgId, canManageSecurity } = useRole();
  const { toast } = useToast();

  const sessions = useAsyncData(() => getSessions(orgId), [orgId], []);
  const log = useAsyncData(() => getSecurityLog(orgId), [orgId], []);

  const [revoked, setRevoked] = useState<string[]>([]);
  const [mfaOpen, setMfaOpen] = useState(false);

  useEffect(() => setRevoked([]), [orgId]);

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
            <span style={accentChipStyle}>Enabled</span>
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
              .filter((s) => !revoked.includes(s.ip))
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
                      onClick={() => {
                        setRevoked((prev) => [...prev, s.ip]);
                        toast(`Signed out ${s.device}.`);
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
      <Modal open={mfaOpen && canManageSecurity} onClose={() => setMfaOpen(false)} title="Manage MFA" width={460}>
        <p style={{ fontSize: 13.5, color: "rgba(238,241,244,.85)", margin: "0 0 14px" }}>
          Two-factor authentication is enabled for your account using an authenticator app. Store these backup
          codes somewhere safe — each one works once.
        </p>
        <ul
          className="grid gap-2"
          style={{ gridTemplateColumns: "1fr 1fr", listStyle: "none", margin: "0 0 16px", padding: 0 }}
        >
          {BACKUP_CODES.map((code) => (
            <li
              key={code}
              style={{
                background: "var(--bg-elev)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "8px 10px",
                fontSize: 13,
                letterSpacing: "0.04em",
                color: "var(--accent)",
              }}
            >
              {code}
            </li>
          ))}
        </ul>
        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            onClick={() => {
              setMfaOpen(false);
              toast("New backup codes generated. The previous set is no longer valid.");
            }}
            style={{ ...secondaryButtonStyle, fontFamily: "inherit" }}
          >
            Regenerate codes
          </button>
          <button
            type="button"
            onClick={() => setMfaOpen(false)}
            style={{ ...secondaryButtonStyle, fontFamily: "inherit" }}
          >
            Done
          </button>
        </div>
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
