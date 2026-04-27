const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8080";
const TOKEN_KEY = "mjmusic_token";

// ── Token helpers ─────────────────────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ── Custom error ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Core request ──────────────────────────────────────────────────────────────

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    throw new ApiError(response.status, text || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
}

// ── Multipart (file upload) ───────────────────────────────────────────────────

async function postForm<T>(path: string, formData: FormData): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    throw new ApiError(response.status, text || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// ── Streaming (audio with auth) ───────────────────────────────────────────────

/** Cache of authenticated blob URLs keyed by songId */
const mediaBlobCache = new Map<string, string>();

/**
 * Fetches audio from /api/media/{songId} with Bearer token and returns a
 * blob:// URL safe to use as HTMLAudioElement.src.
 * Results are cached in memory for the lifetime of the page.
 */
export async function getMediaBlobUrl(songId: string): Promise<string | null> {
  const cached = mediaBlobCache.get(songId);
  if (cached) return cached;

  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const response = await fetch(`${BASE_URL}/api/media/${songId}`, { headers });
    if (!response.ok) return null;

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    mediaBlobCache.set(songId, url);
    return url;
  } catch {
    return null;
  }
}

/** Revokes cached blob URLs to free memory (call on song removal) */
export function revokeMediaBlobUrl(songId: string): void {
  const url = mediaBlobCache.get(songId);
  if (url) {
    URL.revokeObjectURL(url);
    mediaBlobCache.delete(songId);
  }
}

// ── Exported client ───────────────────────────────────────────────────────────

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  postForm: <T>(path: string, formData: FormData) => postForm<T>(path, formData),
};
