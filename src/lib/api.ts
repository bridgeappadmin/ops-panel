import { session } from './session';
import type { AdminRole, Session } from './types';

/** A refused call: the server's own `message` (or 'Something went wrong') and the HTTP status (0 = no response). */
export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

type Init = { method?: 'GET' | 'POST' | 'PATCH'; body?: unknown };
const FALLBACK = 'Something went wrong';

// The one fetch. Paths are the server's ('/admin/offers'); the browser sends them to '/api/...', which the Next.js
// rewrite forwards to OPS_API_URL. A 401 clears the session, and AppShell, which watches it, routes to /login.
// Signed out, nothing but the sign-in is sent: it fails as a 401 here, the same way.
async function request(path: string, { method = 'GET', body }: Init = {}): Promise<Response> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = session.get()?.token;
  if (token) headers.Authorization = `Bearer ${token}`;
  else if (path !== '/moderation/login') {
    session.clear();
    throw new ApiError('Please sign in', 401);
  }

  let res: Response;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(FALLBACK, 0);
  }
  if (res.ok) return res;

  // Not every error is JSON: the login rate limiter answers 429 in plain text.
  const message: unknown = (await res.json().catch(() => null))?.message;
  if (res.status === 401) session.clear();
  throw new ApiError(typeof message === 'string' && message ? message : FALLBACK, res.status);
}

const json = (res: Response) => res.json().catch(() => { throw new ApiError(FALLBACK, res.status); });

/** An `/admin/*` call. Answers the envelope's `data`. */
export async function api<T>(path: string, init?: Init): Promise<T> {
  return (await json(await request(path, init))).data as T;
}

/** A file download (the report CSV), with the same auth and 401 handling as `api`. */
export async function apiBlob(path: string): Promise<Blob> {
  return (await request(path)).blob();
}

/** `POST /moderation/login`, which answers a bare `{ accessToken, role, name }`. Stores and returns the session. */
export async function login(email: string, password: string): Promise<Session> {
  const { accessToken, role, name } = (await json(await request('/moderation/login', { method: 'POST', body: { email, password } }))) as {
    accessToken: string; role: AdminRole; name: string;
  };
  const s = { token: accessToken, role, name };
  session.set(s);
  return s;
}
