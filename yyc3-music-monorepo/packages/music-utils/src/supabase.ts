// =============================================
// 本地模式声明
// 项目已停用 Supabase，浏览器端不再创建任何云端客户端。
// 如需接入新后端，仅需配置 VITE_API_BASE（形如 https://api.example.com/functions/v1/xxx）。
// =============================================

const API_ORIGIN = ((import.meta.env.VITE_API_BASE as string | undefined) ?? '').trim();

/** 后端基地址；为空表示本地模式，所有 API 调用直接短路，不发起网络请求 */
export const API_BASE = API_ORIGIN.replace(/\/+$/, '');

/** 是否为本地模式（未配置后端） */
export const LOCAL_MODE = API_BASE === '';

// ---------------------------------------------------------------------------
// 本地占位客户端
// 保持与原 Supabase 客户端一致的调用签名，使既有业务代码无需改动；
// 本地模式下所有查询返回 { data: null, error: null }，不产生任何网络流量。
// ---------------------------------------------------------------------------
function createLocalQueryBuilder(): any {
  const result = { data: null as any, error: null as any };
  const builder: any = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') {
          return (resolve: (value: typeof result) => void) => resolve(result);
        }
        return () => builder;
      },
    }
  );
  return builder;
}

const localAuth = {
  getSession: async () => ({ data: { session: null }, error: null }),
  getUser: async () => ({ data: { user: null }, error: null }),
  signOut: async () => ({ error: null }),
  signInWithPassword: async () => ({
    data: { user: null, session: null },
    error: { message: '本地模式：账号服务未启用' },
  }),
  signUp: async () => ({
    data: { user: null, session: null },
    error: { message: '本地模式：账号服务未启用' },
  }),
  onAuthStateChange: (_cb?: unknown) => ({
    data: { subscription: { unsubscribe() {} } },
  }),
};

export const supabase: any = {
  auth: localAuth,
  from: () => createLocalQueryBuilder(),
  storage: { from: () => createLocalQueryBuilder() },
  functions: { invoke: async () => ({ data: null, error: { message: '本地模式未配置后端' } }) },
  channel: () => createLocalQueryBuilder(),
  removeChannel: () => {},
};

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
  if (LOCAL_MODE) return '';
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      return data.session.access_token;
    }
  } catch {
    // Fall through to anonymous access
  }
  return '';
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
  // 本地模式：不发起任何网络请求，直接返回 null（与原错误分支行为一致）
  if (LOCAL_MODE) return null;

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
  if (LOCAL_MODE) {
    throw new ApiError({
      message: `[apiFetchStrict] ${path} 本地模式未配置后端（VITE_API_BASE 为空）`,
      path,
      isNetworkError: true,
    });
  }

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
