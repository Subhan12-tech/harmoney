/**
 * Live client for the Harmony FastAPI backend.
 *
 * The rest of the app still reads from the seed data in `lib/data.ts`; this
 * module is the first real edge, used by the auth flows. Point it somewhere
 * else with NEXT_PUBLIC_API_URL when the API is not on localhost.
 */

export const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

const TOKEN_KEY = "harmony.token";
const ORG_KEY = "harmony.org_id";
const ROLE_KEY = "harmony.role";
const USER_KEY = "harmony.user_id";

export type Session = { token: string; org_id: string; role: string };

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
    [TOKEN_KEY, ORG_KEY, ROLE_KEY, USER_KEY].forEach((k) => s.removeItem(k));
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
    throw new ApiError(0, `Cannot reach the Harmony API at ${API_BASE}. Is the backend running?`);
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

export function apiPost<T>(path: string, body?: unknown, auth = false): Promise<T> {
  return request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }, auth);
}

export function apiGet<T>(path: string, auth = true): Promise<T> {
  return request<T>(path, { method: "GET" }, auth);
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
    throw new ApiError(0, `Cannot reach the Harmony API at ${API_BASE}. Is the backend running?`);
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
