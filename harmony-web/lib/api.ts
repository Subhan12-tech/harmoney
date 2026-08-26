/**
 * Live client for the Harmony FastAPI backend.
 *
 * The rest of the app still reads from the seed data in `lib/data.ts`; this
 * module is the first real edge, used by the auth flows. Point it somewhere
 * else with NEXT_PUBLIC_API_URL when the API is not on localhost.
 */

// Empty means same-origin, which is the production case: the static export is
// served by the API itself, so "/api/..." resolves without a host. Only local
// development needs an absolute URL, and .env.development supplies it.
export const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

const TOKEN_KEY = "harmony.token";
const ORG_KEY = "harmony.org_id";
const ROLE_KEY = "harmony.role";
const USER_KEY = "harmony.user_id";
const SUPERADMIN_KEY = "harmony.superadmin";

export type Session = {
  token: string;
  org_id: string;
  role: string;
  /** Platform owner. Separate from org RBAC and above it. */
  is_superadmin?: boolean;
  org_status?: string;
};

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/* ============================================================
   Session storage
   ============================================================ */

/** Every accessor is SSR-safe: on the server there is no storage, only null. */
function store(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    // Storage can throw outright when the browser blocks site data.
    return null;
  }
}

export function saveSession(session: Session): void {
  const s = store();
  if (!s) return;
  try {
    s.setItem(TOKEN_KEY, session.token);
    s.setItem(ORG_KEY, session.org_id ?? "");
    s.setItem(ROLE_KEY, session.role ?? "");
    s.setItem(SUPERADMIN_KEY, session.is_superadmin ? "1" : "0");
  } catch {
    /* over quota or blocked — the token simply will not survive a reload */
  }
}

export function getToken(): string | null {
  try {
    return store()?.getItem(TOKEN_KEY) ?? null;
  } catch {
    return null;
  }
}

export function getOrgId(): string | null {
  try {
    return store()?.getItem(ORG_KEY) ?? null;
  } catch {
    return null;
  }
}

export function isSuperadmin(): boolean {
  try {
    return store()?.getItem(SUPERADMIN_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSuperadmin(v: boolean): void {
  try {
    store()?.setItem(SUPERADMIN_KEY, v ? "1" : "0");
  } catch {
    /* non-fatal: the admin nav link just will not show until next login */
  }
}

export function getUserId(): string | null {
  try {
    return store()?.getItem(USER_KEY) ?? null;
  } catch {
    return null;
  }
}

export function setUserId(id: string): void {
  try {
    store()?.setItem(USER_KEY, id);
  } catch {
    /* non-fatal: only affects "you" highlighting in the team list */
  }
}

export function getRole(): string | null {
  try {
    return store()?.getItem(ROLE_KEY) ?? null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  const s = store();
  if (!s) return;
  try {
    [TOKEN_KEY, ORG_KEY, ROLE_KEY, USER_KEY, SUPERADMIN_KEY].forEach((k) => s.removeItem(k));
  } catch {
    /* nothing to clear */
  }
}

/* ============================================================
   Requests
   ============================================================ */

/** FastAPI reports failures as `detail`, which is a string for HTTPException
 *  and an array of objects for request-validation errors. */
function messageFrom(status: number, payload: unknown): string {
  const detail = (payload as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const first = detail.find((d) => typeof d?.msg === "string");
    if (first) return String(first.msg);
  }
  return `Request failed (${status}).`;
}

async function request<T>(path: string, init: RequestInit, auth: boolean): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body !== undefined) headers.set("Content-Type", "application/json");

  if (auth) {
    const token = getToken();
    if (!token) throw new ApiError(401, "You are signed out. Sign in again to continue.");
    headers.set("Authorization", `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch {
    // A network-level failure here almost always means the API is not running.
    throw new ApiError(0, `Cannot reach the Harmony API${API_BASE ? ` at ${API_BASE}` : ""}. Is the backend running?`);
  }

  const text = await res.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!res.ok) throw new ApiError(res.status, messageFrom(res.status, payload));
  return payload as T;
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" }, true);
}

export function apiPost<T>(path: string, body?: unknown, auth = false): Promise<T> {
  return request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }, auth);
}

export function apiGet<T>(path: string, auth = true): Promise<T> {
  return request<T>(path, { method: "GET" }, auth);
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}) }, true);
}

/* ============================================================
   Identity — the signed-in user, their profile, and Google sign-in
   ============================================================ */

export interface Me {
  id: string;
  email: string;
  full_name: string;
  job_title?: string;
  avatar?: string;
  auth_provider?: string;
  email_verified?: boolean;
  role?: string | null;
  org_id?: string;
  is_superadmin?: boolean;
  org_status?: string;
  org_status_reason?: string;
}

export function getMe(): Promise<Me> {
  return apiGet<Me>("/api/auth/me");
}

/** Edit your own name and/or avatar. The server refuses everything else. */
export function updateProfile(patch: { full_name?: string; avatar?: string }): Promise<{
  full_name: string;
  avatar: string;
}> {
  return apiPatch("/api/auth/profile", patch);
}

export interface AuthConfig {
  google_enabled: boolean;
  google_client_id: string;
}

/** Public: tells the login page whether to render the Google button. */
export function getAuthConfig(): Promise<AuthConfig> {
  return apiGet<AuthConfig>("/api/auth/config", false);
}

/** Exchange a Google ID token (from the GIS button) for a Harmony session. */
export function googleLogin(credential: string): Promise<Session> {
  return apiPost<Session>("/api/auth/google", { credential }, false);
}

/* ============================================================
   Multipart upload + review submission
   ============================================================ */

/** FormData must NOT get an explicit Content-Type — the browser has to set the
 *  multipart boundary itself, and overriding it makes the server reject the body. */
export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const token = getToken();
  if (!token) throw new ApiError(401, "You are signed out. Sign in again to continue.");

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      body: form,
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new ApiError(0, `Cannot reach the Harmony API${API_BASE ? ` at ${API_BASE}` : ""}. Is the backend running?`);
  }

  const text = await res.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }
  if (!res.ok) throw new ApiError(res.status, messageFrom(res.status, payload));
  return payload as T;
}

export interface UploadResult {
  count: number;
  skipped: string[];
  text: string;
  words: number;
}

/** Extracts text from one or more files without indexing them. */
export function uploadForText(files: File[]): Promise<UploadResult> {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  return apiUpload<UploadResult>("/api/upload", form);
}

/** Indexes files into the evidence corpus this org's drafts are checked against. */
export function uploadToCorpus(files: File[], company = "Unknown"): Promise<{ added: string[]; skipped: string[] }> {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  form.append("company", company);
  return apiUpload("/api/upload_history", form);
}

export interface ReviewResult {
  review_id: string;
  document_id?: string;
  company: string;
  final_summary: string;
  average_rating: number;
  critic_verdict: string;
  issues: unknown[];
  evidence: unknown[];
}

/** Runs the full AI pipeline over a draft. Slow by nature — many model calls. */
export function submitDraft(draft: string): Promise<ReviewResult> {
  return apiPost<ReviewResult>("/api/review", { draft }, true);
}

/** Records the human decision. Approving publishes and adds it to history. */
export function decideReview(reviewId: string, decision: "approve" | "reject"): Promise<unknown> {
  return apiPost("/api/decision", { review_id: reviewId, decision }, true);
}

/* ============================================================
   Settings actions
   ============================================================ */

/* ---- sessions ---- */
export function revokeSession(jti: string): Promise<unknown> {
  return apiPost(`/api/security/sessions/${encodeURIComponent(jti)}/revoke`, {}, true);
}

/* ---- API keys ---- */
export interface CreatedApiKey {
  id: string;
  name: string;
  /** Returned ONCE at creation and never again — the server stores only a hash. */
  key: string;
}

export function createApiKey(name: string): Promise<CreatedApiKey> {
  return apiPost<CreatedApiKey>("/api/security/api-keys", { name }, true);
}

export function revokeApiKey(id: string): Promise<unknown> {
  return apiPost(`/api/security/api-keys/${encodeURIComponent(id)}/revoke`, {}, true);
}

/* ---- MFA (TOTP) ---- */
export interface MfaSetup {
  secret: string;
  otpauth_uri: string;
}

export interface MfaEnabled {
  status: string;
  backup_codes: string[];
  warning: string;
}

export function mfaStatus(): Promise<{ enabled: boolean }> {
  return apiGet<{ enabled: boolean }>("/api/security/mfa/status");
}

export function mfaSetup(): Promise<MfaSetup> {
  return apiPost<MfaSetup>("/api/security/mfa/setup", {}, true);
}

export function mfaEnable(code: string): Promise<MfaEnabled> {
  return apiPost<MfaEnabled>("/api/security/mfa/enable", { code }, true);
}

export function mfaDisable(code: string): Promise<unknown> {
  return apiPost("/api/security/mfa/disable", { code }, true);
}

/* ---- organization ---- */
export interface OrgUpdate {
  name?: string;
  website?: string;
  industry?: string;
  size?: string;
}

export function updateOrg(patch: OrgUpdate): Promise<unknown> {
  return request("/api/orgs/current", { method: "PATCH", body: JSON.stringify(patch) }, true);
}

export function getCurrentOrg(): Promise<{ id: string; name: string; website: string; industry: string; size: string }> {
  return apiGet("/api/orgs/current");
}

/* ---- team ---- */
export function inviteMember(email: string, role: string): Promise<{ invite_token: string }> {
  return apiPost<{ invite_token: string }>("/api/orgs/invite", { email, role: role.toLowerCase() }, true);
}

export function changeMemberRole(userId: string, role: string): Promise<unknown> {
  return apiPost("/api/orgs/members/role", { user_id: userId, role: role.toLowerCase() }, true);
}

export function suspendMember(userId: string): Promise<unknown> {
  return apiPost(`/api/orgs/members/${encodeURIComponent(userId)}/suspend`, {}, true);
}

/* ============================================================
   Platform admin — the licence queue. Superadmin only.
   ============================================================ */

export interface PendingOrg {
  org_id: string;
  name: string;
  requested_by: string;
  requested_by_name: string;
  created_at: string;
}

export interface AdminOrg {
  org_id: string;
  name: string;
  slug: string;
  members: number;
  plan: string;
  status: string;
  status_reason: string;
  activated_at: string | null;
  created_at: string;
}

export function adminPending(): Promise<{ pending: PendingOrg[]; count: number }> {
  return apiGet("/api/admin/pending");
}

export function adminOrgs(): Promise<{ organizations: AdminOrg[] }> {
  return apiGet("/api/admin/orgs");
}

export function adminStats(): Promise<{
  organizations: number;
  users: number;
  documents: number;
  reviews: number;
}> {
  return apiGet("/api/admin/stats");
}

export function adminApprove(orgId: string): Promise<AdminOrg> {
  return apiPost(`/api/admin/orgs/${encodeURIComponent(orgId)}/approve`, {}, true);
}

export function adminSuspend(orgId: string, reason = ""): Promise<AdminOrg> {
  return apiPost(`/api/admin/orgs/${encodeURIComponent(orgId)}/suspend`, { reason }, true);
}

export function adminReactivate(orgId: string): Promise<AdminOrg> {
  return apiPost(`/api/admin/orgs/${encodeURIComponent(orgId)}/reactivate`, {}, true);
}

/* ============================================================
   Email verification
   ============================================================ */

export interface SendCodeResult {
  /** "demo" = a real code was issued but shown on screen rather than emailed. */
  status: "sent" | "not_sent" | "demo";
  detail: string;
  /** Development only, when SMTP is not configured. Never present in production. */
  dev_code?: string;
}

export function sendVerificationCode(email: string): Promise<SendCodeResult> {
  return apiPost<SendCodeResult>("/api/auth/send-code", { email });
}

export function checkVerificationCode(email: string, code: string): Promise<{ status: string }> {
  return apiPost<{ status: string }>("/api/auth/check-code", { email, code });
}

/* ============================================================
   Deleting. Admin only, and irreversible.
   ============================================================ */

/** Removes the document and every review of it. Evidence it contributed stays. */
export function deleteDocument(id: string): Promise<{ document: string; reviews_removed: number }> {
  return apiDelete(`/api/documents/${encodeURIComponent(id)}`);
}

/** Removes an evidence document AND its passages from the search index. */
export function deleteEvidence(id: string): Promise<{ document: string; passages_removed: number }> {
  return apiDelete(`/api/history/${encodeURIComponent(id)}`);
}
