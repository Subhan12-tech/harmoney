/**
 * Backend -> UI shape translation.
 *
 * The API speaks the database's language (snake_case, ISO timestamps, lowercase
 * roles); the components speak the language in `lib/data.ts`. Everything that
 * bridges the two lives here, so neither side has to bend toward the other.
 */

import type {
  ActivityEntry,
  DocStatus,
  DocType,
  HarmonyDocument,
  Kpi,
  Role,
  Severity,
  TeamMember,
} from "./data";

/* ---------- primitives ---------- */

export function initialsOf(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** "3 hours ago" style. The API returns absolute times; the UI shows relative. */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  // The backend serialises naive UTC datetimes, so mark them as UTC explicitly
  // or the browser reads them as local time and everything looks hours off.
  const normalised = /[Zz]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso.replace(" ", "T")}Z`;
  const then = new Date(normalised).getTime();
  if (Number.isNaN(then)) return "—";

  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(normalised).toLocaleDateString();
}

const DOC_TYPES: DocType[] = [
  "Earnings Release",
  "Investor Letter",
  "Regulatory Filing",
  "Press Release",
  "Analyst Call",
  "Corporate Statement",
];

const DOC_STATUSES: DocStatus[] = ["Draft", "In Review", "Changes Requested", "Approved", "Published"];

function asDocType(v: string): DocType {
  return DOC_TYPES.includes(v as DocType) ? (v as DocType) : "Corporate Statement";
}

function asStatus(v: string): DocStatus {
  return DOC_STATUSES.includes(v as DocStatus) ? (v as DocStatus) : "Draft";
}

function asSeverity(v: string): Severity {
  const k = (v || "").toLowerCase();
  return k === "high" ? "High" : k === "medium" ? "Medium" : "Low";
}

/** Backend roles are lowercase; the UI's Role union is capitalised. */
export function asRole(v: string): Role {
  const k = (v || "").toLowerCase();
  return ((k.charAt(0).toUpperCase() + k.slice(1)) as Role) || "Viewer";
}

export function toApiRole(role: Role): string {
  return role.toLowerCase();
}

/* ---------- entities ---------- */

export interface ApiDocument {
  id: string;
  title: string;
  doc_type: string;
  status: string;
  risk: string;
  content?: string;
  created_at: string;
  submitted_by?: string;
  reviewer?: string;
  average_rating?: number | null;
}

export function toDocument(d: ApiDocument): HarmonyDocument {
  return {
    id: d.id,
    name: d.title || "Untitled",
    type: asDocType(d.doc_type),
    status: asStatus(d.status),
    reviewer: d.reviewer || "—",
    risk: asSeverity(d.risk),
    updated: relativeTime(d.created_at),
  };
}

export interface ApiStats {
  documents_reviewed: number;
  active_reviews: number;
  approved: number;
  approval_rate: number;
  avg_consistency: number;
  documents_total: number;
  high_risk_open: number;
}

export function toKpis(s: ApiStats): Kpi[] {
  return [
    {
      label: "Active reviews",
      value: String(s.active_reviews),
      delta: `${s.documents_total} document${s.documents_total === 1 ? "" : "s"} total`,
    },
    {
      label: "Approval rate",
      value: `${s.approval_rate}%`,
      delta: `${s.approved} of ${s.documents_reviewed} approved`,
    },
    {
      label: "Avg consistency",
      value: s.avg_consistency ? s.avg_consistency.toFixed(1) : "—",
      delta: s.documents_reviewed ? "across all reviews" : "no reviews yet",
    },
    {
      label: "High risk open",
      value: String(s.high_risk_open),
      delta: s.high_risk_open === 0 ? "nothing outstanding" : "needs attention",
    },
  ];
}

/** Audit actions are machine strings; the activity feed wants a sentence. */
const ACTION_PHRASES: Record<string, string> = {
  "user.signup": "created the workspace",
  "user.login": "signed in",
  "user.logout": "signed out",
  "review.created": "submitted a document for review",
  "review.approved": "approved a document",
  "review.rejected": "requested changes on a document",
  "history.ingested": "added a document to the evidence library",
  "file.uploaded": "uploaded a file",
  "member.invited": "invited a teammate",
  "member.role_changed": "changed a teammate's role",
  "session.revoked": "revoked a session",
  "apikey.created": "created an API key",
  "apikey.revoked": "revoked an API key",
  "mfa.enabled": "enabled two-factor authentication",
  "mfa.disabled": "disabled two-factor authentication",
  "sso.updated": "updated SSO configuration",
};

export interface ApiAudit {
  action: string;
  detail: string;
  actor_name?: string;
  created_at: string;
}

export function toActivity(a: ApiAudit): ActivityEntry {
  const who = a.actor_name || "Someone";
  const what = ACTION_PHRASES[a.action] ?? a.action.replace(/[._]/g, " ");
  const detail = a.detail ? ` — ${a.detail}` : "";
  return {
    initials: initialsOf(who),
    text: `${who} ${what}${detail}`,
    time: relativeTime(a.created_at),
  };
}

export interface ApiMember {
  user_id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

export function toTeamMember(m: ApiMember, currentUserId?: string): TeamMember {
  return {
    name: m.name || m.email,
    email: m.email,
    role: asRole(m.role),
    status: m.status === "suspended" ? "Suspended" : "Active",
    lastActive: "—",
    isCurrentUser: currentUserId ? m.user_id === currentUserId : false,
  };
}
