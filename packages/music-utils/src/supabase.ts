import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://phgrinrlnxzjyxxhsqry.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY_HERE';

// ---------------------------------------------------------------------------
// Singleton Supabase client
// Uses both window and Vite HMR to guarantee exactly ONE GoTrueClient exists
// across cold loads AND hot-module-replacement re-evaluations.
// ---------------------------------------------------------------------------
const GLOBAL_KEY = '__dmusic_supabase__';
const _w = typeof window !== 'undefined' ? (window as any) : ({} as any);

function getOrCreateClient(): SupabaseClient {
  if (_w[GLOBAL_KEY]) return _w[GLOBAL_KEY] as SupabaseClient;
  const client = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
  _w[GLOBAL_KEY] = client;
  return client;
}

export const supabase: SupabaseClient = getOrCreateClient();

// Vite HMR: preserve the client across hot updates so the module
// never calls createClient a second time.
if (import.meta.hot) {
  // Accept self-updates without full reload
  import.meta.hot.accept();
  // Ensure the window reference is always set even after HMR dispose
  import.meta.hot.dispose(() => {
    _w[GLOBAL_KEY] = supabase;
  });
}

const projectId = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');

export const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-f626b673`;

// =============================================
// §L-3 — ApiError: structured error class
// =============================================

/**
 * Structured error thrown by apiFetchStrict when the API returns
 * a non-OK response or fails after retries.
 */
export class ApiError extends Error {
  /** HTTP status code (0 for network failures) */
  public readonly status: number;
  /** HTTP status text */
  public readonly statusText: string;
  /** Response body text (may be JSON string) */
  public readonly body: string;
  /** Parsed JSON error body if available */
  public readonly data: Record<string, any> | null;
  /** Request path that triggered the error */
  public readonly path: string;
  /** Whether this was a rate-limit (429) error */
  public readonly isRateLimited: boolean;
  /** Whether this was a network error (no response received) */
  public readonly isNetworkError: boolean;

  constructor(opts: {
    message: string;
    status?: number;
    statusText?: string;
    body?: string;
    path: string;
    isRateLimited?: boolean;
    isNetworkError?: boolean;
  }) {
    super(opts.message);
    this.name = 'ApiError';
    this.status = opts.status ?? 0;
    this.statusText = opts.statusText ?? '';
    this.body = opts.body ?? '';
    this.path = opts.path;
    this.isRateLimited = opts.isRateLimited ?? false;
    this.isNetworkError = opts.isNetworkError ?? false;

    // Try to parse body as JSON for structured error data
    let parsed: Record<string, any> | null = null;
    if (this.body) {
      try { parsed = JSON.parse(this.body); } catch { /* not JSON */ }
    }
    this.data = parsed;
  }
}

// =============================================
// Shared: auth token + fetch helpers
// =============================================

async function getAuthToken(): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      return data.session.access_token;
    }
  } catch {
    // Fall back to anon key
  }
  return SUPABASE_ANON_KEY;
}

function buildHeaders(token: string, extra?: Record<string, string>): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}

async function doFetchWithRetry(
  url: string,
  options: RequestInit | undefined,
  headers: Record<string, string>,
  path: string
): Promise<Response> {
  const doFetch = () => fetch(url, { ...options, headers });

  let res: Response;
  try {
    res = await doFetch();
  } catch (firstErr) {
    // Retry once (covers cold-start / transient network errors)
    try {
      await new Promise((r) => setTimeout(r, 1500));
      res = await doFetch();
    } catch (retryErr) {
      throw new ApiError({
        message: `[apiFetch] ${path} network error after retry: ${retryErr}`,
        path,
        isNetworkError: true,
      });
    }
  }

  // §5.4 — Handle 429 Too Many Requests with Retry-After back-off
  if (res.status === 429) {
    const retryAfterHeader = res.headers.get('Retry-After');
    const retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 3;
    const waitMs = Math.min((isNaN(retryAfterSec) ? 3 : retryAfterSec) * 1000, 30000);
    console.warn(
      `[apiFetch] ${path} rate-limited (429). Retrying after ${waitMs}ms...`
    );
    await new Promise((r) => setTimeout(r, waitMs));
    try {
      res = await doFetch();
    } catch (retryErr) {
      throw new ApiError({
        message: `[apiFetch] ${path} network error during 429 retry: ${retryErr}`,
        path,
        isNetworkError: true,
        isRateLimited: true,
      });
    }
    // If still 429 after retry, return it (caller decides how to handle)
    if (res.status === 429) {
      const body = await res.text().catch(() => '');
      throw new ApiError({
        message: `[apiFetch] ${path} still rate-limited (429) after retry`,
        status: 429,
        statusText: res.statusText,
        body,
        path,
        isRateLimited: true,
      });
    }
  }

  return res;
}

// =============================================
// apiFetch (backward-compatible, returns T | null)
// =============================================

/**
 * Resilient fetch wrapper — retries once on network failure,
 * handles 429 rate-limit with Retry-After back-off,
 * and validates the response before parsing JSON.
 * Automatically attaches the user's session token when available,
 * falling back to publicAnonKey for unauthenticated requests.
 *
 * Returns `null` on any error (backward-compatible behavior).
 * For strict error handling, use `apiFetchStrict` instead.
 *
 * §5.4 — 429 Too Many Requests 友好处理
 * §L-3 — Enhanced error context logging
 */
export async function apiFetch<T = any>(
  path: string,
  options?: RequestInit
): Promise<T | null> {
  try {
    const token = await getAuthToken();
    const headers = buildHeaders(token, options?.headers as Record<string, string> | undefined);
    const url = `${API_BASE}${path}`;

    const res = await doFetchWithRetry(url, options, headers, path);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn(`[apiFetch] ${path} responded ${res.status} ${res.statusText}: ${text.slice(0, 200)}`);
      return null;
    }

    try {
      return (await res.json()) as T;
    } catch {
      console.warn(`[apiFetch] ${path} returned non-JSON response`);
      return null;
    }
  } catch (err) {
    if (err instanceof ApiError) {
      console.warn(`[apiFetch] ${err.message}`);
    } else {
      console.warn(`[apiFetch] ${path} unexpected error:`, err);
    }
    return null;
  }
}

// =============================================
// §L-3 — apiFetchStrict (throws ApiError on failure)
// =============================================

/**
 * Strict fetch wrapper — same retry/429 logic as apiFetch,
 * but throws an `ApiError` on any failure instead of returning null.
 *
 * Usage:
 *   try {
 *     const data = await apiFetchStrict<{ likes: number }>('/likes/track-1');
 *     // data is guaranteed to be non-null here
 *   } catch (err) {
 *     if (err instanceof ApiError) {
 *       console.error(`Status ${err.status}: ${err.body}`);
 *       if (err.isRateLimited) showRateLimitBanner();
 *       if (err.isNetworkError) showOfflineBanner();
 *     }
 *   }
 */
export async function apiFetchStrict<T = any>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const token = await getAuthToken();
  const headers = buildHeaders(token, options?.headers as Record<string, string> | undefined);
  const url = `${API_BASE}${path}`;

  const res = await doFetchWithRetry(url, options, headers, path);

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ApiError({
      message: `[apiFetchStrict] ${path} responded ${res.status} ${res.statusText}`,
      status: res.status,
      statusText: res.statusText,
      body,
      path,
    });
  }

  try {
    return (await res.json()) as T;
  } catch (parseErr) {
    throw new ApiError({
      message: `[apiFetchStrict] ${path} returned non-JSON response`,
      status: res.status,
      statusText: res.statusText,
      body: '',
      path,
    });
  }
}
