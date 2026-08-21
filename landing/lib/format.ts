export function timeAgo(iso?: string | null): string {
  if (!iso) return "";
  const t = new Date(iso.replace(" ", "T") + (iso.includes("Z") ? "" : "Z")).getTime();
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}

export function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso.replace(" ", "T") + (iso.includes("Z") ? "" : "Z")).toLocaleString();
  } catch {
    return iso;
  }
}

export function initials(name?: string | null): string {
  return (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function sevColor(s?: string | null): string {
  const v = (s || "").toLowerCase();
  if (v === "high") return "#ff785a";
  if (v === "medium") return "#ffb35a";
  return "#6ea8ff";
}

export function sevTextColor(s?: string | null): string {
  const v = (s || "").toLowerCase();
  if (v === "high") return "#ffb7a5";
  if (v === "medium") return "#ffd58a";
  return "#a9c9ff";
}

export const ROLE_RANK: Record<string, number> = { viewer: 1, editor: 2, reviewer: 3, admin: 4, owner: 5 };

export const AUDIT_VERBS: Record<string, string> = {
  "user.signup": "signed up",
  "user.login": "signed in",
  "user.logout": "signed out",
  "review.created": "started a review for",
  "review.approved": "approved a review for",
  "review.rejected": "requested changes on a review for",
  "history.ingested": "added to the evidence library:",
  "file.uploaded": "uploaded:",
  "member.invited": "invited",
  "member.role_changed": "changed a role:",
  "member.suspended": "suspended a member",
  "org.updated": "updated organization settings",
  "org.switch": "switched organization",
  "session.revoked": "revoked a session",
  "mfa.enabled": "enabled MFA",
  "mfa.disabled": "disabled MFA",
  "apikey.created": "created an API key:",
  "apikey.revoked": "revoked an API key",
  "sso.updated": "updated SSO config",
  "sso.domain_verified": "verified the SSO domain",
  "billing.plan_changed": "changed the plan to",
};

export function describeAudit(a: { action: string; detail?: string; actor_name?: string }): string {
  const verb = AUDIT_VERBS[a.action] || a.action;
  const detail = a.detail ? " " + a.detail : "";
  return `${a.actor_name || "Someone"} ${verb}${detail}`;
}
