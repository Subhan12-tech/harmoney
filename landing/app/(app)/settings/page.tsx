"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, EmptyState, ErrorBox, Input, Kicker, Label, Modal, OkBox, PageHead, Select, SegTabs, Table, Td, Th } from "@/components/ui/kit";
import { api, decodeJwt, getToken } from "@/lib/api";
import { fmtDate, ROLE_RANK, timeAgo } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";

const TABS = [
  { key: "org", label: "Organization" },
  { key: "members", label: "Members & Roles" },
  { key: "security", label: "Security" },
  { key: "api", label: "API" },
  { key: "billing", label: "Billing" },
];

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsInner />
    </Suspense>
  );
}

function SettingsInner() {
  const params = useSearchParams();
  const [tab, setTab] = useState(params.get("tab") || "org");

  return (
    <div>
      <PageHead eyebrow="Workspace" title="Settings" subtitle="Manage your organization, security, and billing." />
      <SegTabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === "org" && <OrgTab />}
      {tab === "members" && <MembersTab />}
      {tab === "security" && <SecurityTab />}
      {tab === "api" && <ApiTab />}
      {tab === "billing" && <BillingTab />}
    </div>
  );
}

function OrgTab() {
  const { me } = useAuth();
  const showToast = useToast();
  const [org, setOrg] = useState<any>(null);
  const [error, setError] = useState("");
  const canManage = me ? ROLE_RANK[me.role || "viewer"] >= ROLE_RANK.admin : false;

  useEffect(() => {
    api("/api/orgs/current").then(setOrg).catch((e) => setError(String(e)));
  }, []);

  async function save() {
    try {
      await api("/api/orgs/current", "PATCH", { name: org.name, website: org.website, industry: org.industry });
      showToast("Organization updated.");
    } catch (e) {
      showToast(String(e), true);
    }
  }

  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!org) return <div style={{ color: "#8a8a8a" }}>Loading…</div>;

  return (
    <>
      <Card style={{ maxWidth: 560 }}>
        <Kicker>Organization</Kicker>
        <Label>Company name</Label>
        <Input value={org.name || ""} onChange={(e) => setOrg({ ...org, name: e.target.value })} readOnly={!canManage} style={{ marginBottom: 12 }} />
        <Label>Website</Label>
        <Input value={org.website || ""} onChange={(e) => setOrg({ ...org, website: e.target.value })} readOnly={!canManage} style={{ marginBottom: 12 }} />
        <Label>Industry</Label>
        <Input value={org.industry || ""} onChange={(e) => setOrg({ ...org, industry: e.target.value })} readOnly={!canManage} style={{ marginBottom: 12 }} />
        <Label>Workspace ID</Label>
        <Input value={org.id} readOnly style={{ marginBottom: canManage ? 16 : 0 }} />
        {canManage && <Button onClick={save}>Save changes</Button>}
      </Card>

      {canManage && (
        <Card style={{ maxWidth: 560, marginTop: 20, borderColor: "rgba(255,120,90,.3)", background: "rgba(255,120,90,.04)" }}>
          <Kicker>
            <span style={{ color: "#ffb7a5" }}>Danger zone</span>
          </Kicker>
          <div className="flex justify-between items-center" style={{ marginTop: 6 }}>
            <span style={{ fontSize: 13.5 }}>Transfer ownership</span>
            <Button size="sm" disabled title="Contact support">
              Transfer
            </Button>
          </div>
          <div className="flex justify-between items-center" style={{ marginTop: 12 }}>
            <span style={{ fontSize: 13.5 }}>Delete workspace</span>
            <Button size="sm" variant="danger" disabled title="Contact support">
              Delete
            </Button>
          </div>
          <p style={{ color: "#666", fontSize: 12, marginTop: 10 }}>These actions require support assistance in the current build.</p>
        </Card>
      )}
    </>
  );
}

function MembersTab() {
  const [members, setMembers] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/orgs/members")
      .then((d: any) => setMembers(d.members))
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <ErrorBox>{error}</ErrorBox>;

  return (
    <Card style={{ padding: "8px 24px 6px" }}>
      {members.length ? (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Role</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {members.map((x) => (
              <tr key={x.user_id}>
                <Td>{x.name || "—"}</Td>
                <Td>
                  <span style={{ border: "1px solid #1a1a1a", borderRadius: 6, padding: "3px 9px", fontSize: 11 }}>{x.role}</span>
                </Td>
                <Td>
                  <span style={{ background: "#151515", borderRadius: 6, padding: "3px 9px", fontSize: 11 }}>{x.status}</span>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <EmptyState>No members yet.</EmptyState>
      )}
    </Card>
  );
}

function SecurityTab() {
  const { me } = useAuth();
  const showToast = useToast();
  const [sessions, setSessions] = useState<any[]>([]);
  const [sso, setSso] = useState<any>({ configured: false });
  const [activity, setActivity] = useState<any[]>([]);
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);
  const [showMfa, setShowMfa] = useState(false);
  const [showSso, setShowSso] = useState(false);
  const [error, setError] = useState("");

  const canManage = me ? ROLE_RANK[me.role || "viewer"] >= ROLE_RANK.admin : false;
  const myJti = getToken() ? decodeJwt(getToken() as string).jti : null;

  function load() {
    Promise.all([
      api("/api/security/sessions"),
      api("/api/sso/config").catch(() => ({ configured: false })),
      api("/api/security/activity"),
      api("/api/security/mfa/status").catch(() => ({ enabled: null })),
    ])
      .then(([s, sso, a, mfa]: any[]) => {
        setSessions(s.sessions);
        setSso(sso);
        setActivity(a.activity);
        setMfaEnabled(mfa.enabled);
      })
      .catch((e) => setError(String(e)));
  }
  useEffect(load, []);

  async function revoke(id: string) {
    try {
      await api(`/api/security/sessions/${id}/revoke`, "POST");
      showToast("Session revoked.");
      load();
    } catch (e) {
      showToast(String(e), true);
    }
  }

  if (error) return <ErrorBox>{error}</ErrorBox>;

  return (
    <>
      <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1fr", maxWidth: 900 }}>
        <Card>
          <Kicker>Authentication</Kicker>
          <div className="flex justify-between" style={{ padding: "7px 0" }}>
            <span style={{ fontSize: 13.5 }}>Password</span>
            <span style={{ color: "#666", fontSize: 12 }}>Not available yet</span>
          </div>
          <div className="flex justify-between" style={{ padding: "7px 0" }}>
            <span style={{ fontSize: 13.5 }}>Two-factor authentication</span>
            <span style={{ background: "rgba(110,168,255,.15)", color: "#6ea8ff", borderRadius: 6, padding: "3px 9px", fontSize: 11 }}>
              {mfaEnabled === null ? "Unknown" : mfaEnabled ? "Enabled" : "Not enabled"}
            </span>
          </div>
          <div className="flex justify-between" style={{ padding: "7px 0" }}>
            <span style={{ fontSize: 13.5 }}>SSO (SAML/OIDC)</span>
            <span style={{ background: "#151515", color: "#8a8a8a", borderRadius: 6, padding: "3px 9px", fontSize: 11 }}>
              {sso.configured ? (sso.enabled ? "Enabled" : "Configured") : "Not configured"}
            </span>
          </div>
          {canManage && (
            <div className="flex gap-2" style={{ marginTop: 10 }}>
              <Button size="sm" onClick={() => setShowMfa(true)}>
                Manage MFA
              </Button>
              <Button size="sm" onClick={() => setShowSso(true)}>
                Configure SSO
              </Button>
            </div>
          )}
        </Card>

        <Card>
          <Kicker>Active sessions</Kicker>
          {sessions.map((s) => (
            <div key={s.id} className="flex justify-between items-start" style={{ padding: "7px 0", borderBottom: "1px solid #141414", gap: 8 }}>
              <div>
                <div style={{ fontSize: 13 }}>{(s.user_agent || "Unknown device").slice(0, 44)}</div>
                <div style={{ color: "#666", fontSize: 11 }}>
                  {s.ip || "—"} · {timeAgo(s.last_active)}
                </div>
              </div>
              {s.id === myJti ? (
                <span style={{ background: "rgba(110,168,255,.15)", color: "#6ea8ff", borderRadius: 6, padding: "3px 9px", fontSize: 11, whiteSpace: "nowrap" }}>
                  This device
                </span>
              ) : (
                <button onClick={() => revoke(s.id)} style={{ background: "none", border: "none", color: "#ffb7a5", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
                  Revoke
                </button>
              )}
            </div>
          ))}
        </Card>
      </div>

      <Card style={{ maxWidth: 900, marginTop: 20 }}>
        <Kicker>Security activity</Kicker>
        {activity.length ? (
          activity.map((a: any, i: number) => (
            <div key={i} className="flex justify-between" style={{ padding: "8px 0", borderBottom: "1px solid #141414", fontSize: 13.5 }}>
              <span>
                {a.action}
                {a.detail ? ` — ${a.detail}` : ""}
              </span>
              <span style={{ color: "#666", fontSize: 12 }}>{timeAgo(a.at)}</span>
            </div>
          ))
        ) : (
          <EmptyState>No security events yet.</EmptyState>
        )}
      </Card>

      {showMfa && <MfaModal onClose={() => { setShowMfa(false); load(); }} />}
      {showSso && <SsoModal sso={sso} onClose={() => { setShowSso(false); load(); }} />}
    </>
  );
}

function MfaModal({ onClose }: { onClose: () => void }) {
  const [secret, setSecret] = useState<{ secret: string; otpauth_uri: string } | null>(null);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<React.ReactNode>(null);

  async function setup() {
    try {
      const d: any = await api("/api/security/mfa/setup", "POST");
      setSecret(d);
    } catch (e) {
      setResult(<ErrorBox>{String(e)}</ErrorBox>);
    }
  }
  async function enable() {
    try {
      const d: any = await api("/api/security/mfa/enable", "POST", { code });
      setResult(
        <OkBox>
          MFA enabled. Backup codes (save now, shown once):
          <br />
          <code style={{ fontSize: 11.5 }}>{d.backup_codes.join(" ")}</code>
        </OkBox>
      );
    } catch (e) {
      setResult(<ErrorBox>{String(e)}</ErrorBox>);
    }
  }
  async function disable() {
    try {
      await api("/api/security/mfa/disable", "POST", { code });
      setResult(<OkBox>MFA disabled.</OkBox>);
    } catch (e) {
      setResult(<ErrorBox>{String(e)}</ErrorBox>);
    }
  }

  return (
    <Modal onClose={onClose}>
      <h3 className="font-serif" style={{ fontSize: 20, marginBottom: 14 }}>
        Manage MFA
      </h3>
      <p style={{ color: "#8a8a8a", fontSize: 13 }}>Starting setup generates a new secret and disables any currently-enabled MFA until you re-verify a code below.</p>
      <Button size="sm" onClick={setup}>
        Start / reset setup
      </Button>
      {secret && (
        <div style={{ marginTop: 12 }}>
          <OkBox>
            Secret: <code>{secret.secret}</code>
            <br />
            otpauth URI: <code style={{ fontSize: 11, wordBreak: "break-all" }}>{secret.otpauth_uri}</code>
          </OkBox>
        </div>
      )}
      <div style={{ marginTop: 14 }}>
        <Label>6-digit code from your authenticator app</Label>
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
      </div>
      <div className="flex gap-2" style={{ marginTop: 10 }}>
        <Button size="sm" variant="primary" onClick={enable}>
          Enable
        </Button>
        <Button size="sm" variant="danger" onClick={disable}>
          Disable
        </Button>
      </div>
      {result && <div style={{ marginTop: 12 }}>{result}</div>}
      <div className="flex justify-end" style={{ marginTop: 14 }}>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}

function SsoModal({ sso, onClose }: { sso: any; onClose: () => void }) {
  const [provider, setProvider] = useState(sso.provider || "saml");
  const [entityId, setEntityId] = useState(sso.entity_id || "");
  const [ssoUrl, setSsoUrl] = useState(sso.sso_url || "");
  const [domain, setDomain] = useState(sso.domain || "");
  const [enabled, setEnabled] = useState(!!sso.enabled);
  const [result, setResult] = useState<React.ReactNode>(null);

  async function save() {
    try {
      await api("/api/sso/config", "PUT", { provider, entity_id: entityId, sso_url: ssoUrl, domain, enabled });
      setResult(<OkBox>Saved.</OkBox>);
    } catch (e) {
      setResult(<ErrorBox>{String(e)}</ErrorBox>);
    }
  }
  async function verifyDomain() {
    try {
      await api("/api/sso/verify-domain", "POST");
      setResult(<OkBox>Domain verified.</OkBox>);
    } catch (e) {
      setResult(<ErrorBox>{String(e)}</ErrorBox>);
    }
  }

  return (
    <Modal onClose={onClose}>
      <h3 className="font-serif" style={{ fontSize: 20, marginBottom: 14 }}>
        Configure SSO
      </h3>
      <Label>Provider</Label>
      <Select value={provider} onChange={(e) => setProvider(e.target.value)} style={{ marginBottom: 10 }}>
        {["saml", "oidc", "entra", "google", "okta"].map((p) => (
          <option key={p}>{p}</option>
        ))}
      </Select>
      <Label>Entity ID</Label>
      <Input value={entityId} onChange={(e) => setEntityId(e.target.value)} style={{ marginBottom: 10 }} />
      <Label>SSO URL</Label>
      <Input value={ssoUrl} onChange={(e) => setSsoUrl(e.target.value)} style={{ marginBottom: 10 }} />
      <Label>Domain</Label>
      <Input value={domain} onChange={(e) => setDomain(e.target.value)} style={{ marginBottom: 14 }} />
      <label className="flex items-center gap-2" style={{ fontSize: 13 }}>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Enabled
      </label>
      {result && <div style={{ marginTop: 10 }}>{result}</div>}
      <div className="flex justify-end gap-3" style={{ marginTop: 14 }}>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button variant="secondary" onClick={verifyDomain}>
          Verify domain
        </Button>
        <Button variant="primary" onClick={save}>
          Save
        </Button>
      </div>
    </Modal>
  );
}

function ApiTab() {
  const showToast = useToast();
  const [keys, setKeys] = useState<any[]>([]);
  const [banner, setBanner] = useState<React.ReactNode>(null);
  const { me } = useAuth();
  const canManage = me ? ROLE_RANK[me.role || "viewer"] >= ROLE_RANK.admin : false;

  function load() {
    api("/api/security/api-keys")
      .then((d: any) => setKeys(d.keys))
      .catch(() => setKeys([]));
  }
  useEffect(load, []);

  async function createKey() {
    const name = prompt("Name this API key:", "Integration key");
    if (!name) return;
    try {
      const d: any = await api("/api/security/api-keys", "POST", { name });
      setBanner(
        <OkBox>
          Store this key securely — you won&rsquo;t see it again:
          <br />
          <code style={{ fontSize: 12, wordBreak: "break-all" }}>{d.api_key}</code>
        </OkBox>
      );
      load();
    } catch (e) {
      showToast(String(e), true);
    }
  }

  async function revokeKey(id: string) {
    if (!confirm("Revoke this API key?")) return;
    try {
      await api(`/api/security/api-keys/${id}/revoke`, "POST");
      showToast("Key revoked.");
      load();
    } catch (e) {
      showToast(String(e), true);
    }
  }

  return (
    <>
      <div className="flex justify-end" style={{ marginBottom: 12 }}>
        {canManage && <Button variant="primary" onClick={createKey}>Create API key</Button>}
      </div>
      {banner && <div style={{ marginBottom: 14 }}>{banner}</div>}
      <Card style={{ padding: "8px 24px 6px" }}>
        {keys.length ? (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Prefix</Th>
                <Th>Created</Th>
                <Th>Last used</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id}>
                  <Td>{k.name}</Td>
                  <Td muted>{k.prefix}…</Td>
                  <Td muted>{fmtDate(k.created_at)}</Td>
                  <Td muted>{k.last_used ? fmtDate(k.last_used) : "Never"}</Td>
                  <Td>
                    {canManage && (
                      <button onClick={() => revokeKey(k.id)} style={{ background: "none", border: "none", color: "#ffb7a5", fontSize: 12, cursor: "pointer" }}>
                        Revoke
                      </button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState>No API keys yet.</EmptyState>
        )}
      </Card>
    </>
  );
}

function BillingTab() {
  const showToast = useToast();
  const [plans, setPlans] = useState<any[]>([]);
  const [sub, setSub] = useState<any>(null);
  const [seatsUsed, setSeatsUsed] = useState(0);
  const { me } = useAuth();
  const canManage = me ? ROLE_RANK[me.role || "viewer"] >= ROLE_RANK.admin : false;

  function load() {
    Promise.all([api("/api/billing/plans"), api("/api/billing/subscription"), api("/api/orgs/members")]).then(([p, s, m]: any[]) => {
      setPlans(p.plans);
      setSub(s);
      setSeatsUsed(m.members.filter((x: any) => x.status === "active").length);
    });
  }
  useEffect(load, []);

  async function changePlan(plan: string) {
    try {
      await api("/api/billing/change", "POST", { plan });
      showToast("Plan updated.");
      load();
    } catch (e) {
      showToast(String(e), true);
    }
  }

  if (!sub) return <div style={{ color: "#8a8a8a" }}>Loading…</div>;

  return (
    <>
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(3, 1fr)", maxWidth: 900, marginBottom: 20 }}>
        {plans.map((p) => (
          <Card key={p.id} style={{ borderColor: p.id === sub.plan ? "#6ea8ff" : "#141414" }}>
            <Kicker>{p.name}</Kicker>
            <div className="font-serif" style={{ fontSize: 24, marginBottom: 8 }}>
              {p.price}
            </div>
            <p style={{ color: "#8a8a8a", fontSize: 13, minHeight: 36 }}>
              {p.seats} seats · {p.docs} documents/mo
            </p>
            {p.id === sub.plan ? (
              <div style={{ color: "#6ea8ff", fontSize: 12.5 }}>Current plan</div>
            ) : canManage ? (
              p.id === "enterprise" ? (
                <a href="mailto:sales@harmony.example">
                  <Button size="sm">Contact sales</Button>
                </a>
              ) : (
                <Button size="sm" onClick={() => changePlan(p.id)}>
                  Switch to {p.name}
                </Button>
              )
            ) : null}
          </Card>
        ))}
      </div>
      <Card style={{ maxWidth: 900 }}>
        <Kicker>Usage this cycle</Kicker>
        <div style={{ margin: "12px 0" }}>
          <div className="flex justify-between" style={{ fontSize: 13, marginBottom: 5 }}>
            <span>Seats used</span>
            <span style={{ color: "#8a8a8a" }}>
              {seatsUsed} / {sub.seats}
            </span>
          </div>
          <div style={{ background: "#0a0a0a", height: 8, borderRadius: 4 }}>
            <div style={{ height: 8, background: "#6ea8ff", width: `${Math.min(100, Math.round((100 * seatsUsed) / sub.seats))}%`, borderRadius: 4 }} />
          </div>
        </div>
        <div style={{ margin: "12px 0" }}>
          <div className="flex justify-between" style={{ fontSize: 13 }}>
            <span>Documents analyzed</span>
            <span style={{ color: "#8a8a8a" }}>{sub.docs_used}</span>
          </div>
        </div>
      </Card>
    </>
  );
}
