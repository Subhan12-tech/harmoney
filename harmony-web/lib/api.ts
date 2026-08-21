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
    [TOKEN_KEY, ORG_KEY, ROLE_KEY].forEach((k) => s.removeItem(k));
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
