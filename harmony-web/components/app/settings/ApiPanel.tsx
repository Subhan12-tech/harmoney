"use client";

import { useEffect, useState } from "react";
import { useRole } from "@/context/RoleContext";
import { useAsyncData } from "@/lib/useAsyncData";
import { getApiKeys } from "@/lib/data";
import { ApiError, createApiKey, revokeApiKey } from "@/lib/api";
import { outlineChipStyle, primaryButtonStyle } from "@/lib/style";
import { useToast } from "../Toast";

interface ApiKeyRow {
  id: string;
  name: string;
  created: string;
  lastUsed: string;
  perm: string;
}

export function ApiPanel() {
  const { orgId, canManageSecurity } = useRole();
  const { toast } = useToast();

  const seed = useAsyncData(() => getApiKeys(orgId), [orgId], []);
  const [created, setCreated] = useState<ApiKeyRow[]>([]);
  const [revoked, setRevoked] = useState<string[]>([]);
  /** The plaintext secret, returned once by the server and never persisted. */
  const [revealed, setRevealed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCreated([]);
    setRevoked([]);
    setRevealed(null);
  }, [orgId]);

  const keys = [...created, ...seed].filter((k) => !revoked.includes(k.id));

  async function createKey() {
    if (busy) return;
    setBusy(true);
    const name = `Key ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    try {
      // The secret is minted server-side and returned exactly once — the server
      // stores only a hash, so there is no way to show it again later.
      const key = await createApiKey(name);
      setCreated((prev) => [
        { id: key.id, name: key.name || name, created: "Just now", lastUsed: "Never", perm: "Read/Write" },
        ...prev,
      ]);
      setRevealed(key.key);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Could not create the API key.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(k: ApiKeyRow) {
    try {
      await revokeApiKey(k.id);
      setRevoked((prev) => [...prev, k.id]);
      toast(`${k.name} revoked. Requests using it will now fail.`);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Could not revoke the key.");
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4" style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: 0, maxWidth: 520 }}>
          API keys act on behalf of the workspace. They can read documents and evidence and submit drafts for
          analysis — they can never approve or publish.
        </p>
        {canManageSecurity && (
          <button
            type="button"
            onClick={createKey}
            disabled={busy}
            style={{ ...primaryButtonStyle, flex: "none", opacity: busy ? 0.6 : 1 }}
          >
            {busy ? "Creating…" : "Create API key"}
          </button>
        )}
      </div>

      {revealed && (
        <div
          role="status"
          style={{
            border: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)",
            background: "color-mix(in srgb, var(--accent) 8%, transparent)",
            borderRadius: 12,
            padding: 14,
            marginBottom: 14,
          }}
        >
          <div className="flex items-center justify-between gap-4" style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 13 }}>Store this key securely. You will not be able to view it again.</span>
            <button
              type="button"
              onClick={() => {
                setRevealed(null);
                toast("Key hidden. It cannot be shown again.");
              }}
              style={{
                fontSize: 12,
                color: "var(--muted)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                flex: "none",
              }}
            >
              Dismiss
            </button>
          </div>
          <code
            style={{
              background: "var(--bg-elev)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "8px 12px",
              display: "block",
              fontSize: 12.5,
              color: "var(--accent)",
              wordBreak: "break-all",
            }}
          >
            {revealed}
          </code>
        </div>
      )}

      <div className="app-card scroll-x" style={{ padding: "6px 20px 4px" }}>
        <table className="app-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Created</th>
              <th scope="col">Last used</th>
              <th scope="col">Permissions</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "var(--muted)" }}>
                  No API keys yet.
                </td>
              </tr>
            )}
            {keys.map((k) => (
              <tr key={k.id}>
                <td style={{ color: "var(--text)" }}>{k.name}</td>
                <td style={{ color: "var(--muted)" }}>{k.created}</td>
                <td style={{ color: "var(--muted)" }}>{k.lastUsed}</td>
                <td>
                  <span style={outlineChipStyle}>{k.perm}</span>
                </td>
                <td>
                  {canManageSecurity && (
                    <button
                      type="button"
                      onClick={() => revoke(k)}
                      style={{
                        fontSize: 12,
                        color: "color-mix(in srgb, var(--danger) 75%, white)",
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      Revoke<span className="sr-only"> {k.name}</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
