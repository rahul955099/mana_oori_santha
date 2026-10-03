// Thin client for the Mana Oori Santha backend. Every response from the API
// has the shape { success, message, data } (or { success: false, message, error }).

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "http://localhost:5000/api";
const TOKEN_KEY = "mos_token";

export class ApiError extends Error {
  status: number;
  code: string;
  /** Extra context from the server, e.g. `{ problems }` when the cart changed. */
  details?: unknown;

  constructor(message: string, status: number, code: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage unavailable (private mode) — the session just won't survive a reload.
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

export async function request<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  options: { body?: unknown; query?: Query } = {}
): Promise<T> {
  const url = new URL(`${API_URL}${path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  const token = getToken();
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0, "NETWORK_ERROR");
  }

  const payload = (await res.json().catch(() => null)) as
    | { success: boolean; message: string; data?: T; error?: string; details?: unknown }
    | null;

  if (!res.ok || !payload?.success) {
    throw new ApiError(payload?.message ?? `Request failed (${res.status})`, res.status, payload?.error ?? "ERROR", payload?.details);
  }
  return payload.data as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>("GET", path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, { body }),
  delete: <T>(path: string) => request<T>("DELETE", path),
};

/** Human-readable message for any error thrown by the API client. */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}
