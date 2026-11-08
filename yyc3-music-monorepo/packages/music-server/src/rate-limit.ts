/**
 * D-Music §5.3 — In-memory Rate Limiter
 * 防止恶意刷票/刷星力/刷评论，基于滑动窗口算法
 *
 * 设计原则:
 * - 内存级速率限制（Edge Function 单实例生命周期内有效）
 * - 按 IP + 路由分组限制
 * - 超限时返回 429 Too Many Requests
 * - 支持不同端点配置不同速率
 */
import type { Context, Next } from "npm:hono";

// ============================================================
// Rate Limit Store (sliding window)
// ============================================================
interface WindowEntry {
  timestamps: number[];
}

const store = new Map<string, WindowEntry>();

// Periodic cleanup every 5 minutes to prevent memory bloat
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupStore(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  const cutoff = now - windowMs * 2; // double window for safety
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter(t => t > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

// ============================================================
// Rate Limit Check
// ============================================================
function isRateLimited(key: string, maxRequests: number, windowMs: number): {
  limited: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  cleanupStore(windowMs);

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside window
  const windowStart = now - windowMs;
  entry.timestamps = entry.timestamps.filter(t => t > windowStart);

  if (entry.timestamps.length >= maxRequests) {
    const oldest = entry.timestamps[0];
    return {
      limited: true,
      remaining: 0,
      resetAt: oldest + windowMs,
    };
  }

  entry.timestamps.push(now);
  return {
    limited: false,
    remaining: maxRequests - entry.timestamps.length,
    resetAt: now + windowMs,
  };
}

// ============================================================
// Extract client identifier (IP or auth user)
// ============================================================
function getClientKey(c: Context): string {
  // Try to get user ID from auth header
  const auth = c.req.header('Authorization');
  if (auth) {
    // Use a hash-like short identifier to avoid storing full tokens
    const tokenPart = auth.slice(-16);
    return `user:${tokenPart}`;
  }
  // Fall back to IP
  const forwarded = c.req.header('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || c.req.header('x-real-ip') || 'unknown';
  return `ip:${ip}`;
}

// ============================================================
// Rate Limit Presets
// ============================================================
export interface RateLimitConfig {
  maxRequests: number;   // max requests in window
  windowMs: number;      // window in milliseconds
  keyPrefix?: string;    // optional key prefix for grouping
}

/** Standard write operations: 30 requests per minute */
export const RATE_STANDARD: RateLimitConfig = {
  maxRequests: 30,
  windowMs: 60 * 1000,
  keyPrefix: 'std',
};

/** Sensitive operations (likes, votes): 20 requests per minute */
export const RATE_SENSITIVE: RateLimitConfig = {
  maxRequests: 20,
  windowMs: 60 * 1000,
  keyPrefix: 'sen',
};

/** Star Power operations: 10 requests per minute */
export const RATE_STARPOWER: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60 * 1000,
  keyPrefix: 'sp',
};

/** AI / Heavy operations: 5 requests per minute */
export const RATE_HEAVY: RateLimitConfig = {
  maxRequests: 5,
  windowMs: 60 * 1000,
  keyPrefix: 'heavy',
};

/** Auth operations: 10 requests per 5 minutes */
export const RATE_AUTH: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 5 * 60 * 1000,
  keyPrefix: 'auth',
};

// ============================================================
// Hono Middleware Factory
// ============================================================
export function rateLimit(config: RateLimitConfig = RATE_STANDARD) {
  return async (c: Context, next: Next) => {
    const clientKey = getClientKey(c);
    const routeKey = config.keyPrefix || c.req.path;
    const key = `rl:${routeKey}:${clientKey}`;

    const result = isRateLimited(key, config.maxRequests, config.windowMs);

    // Set rate limit headers
    c.header('X-RateLimit-Limit', config.maxRequests.toString());
    c.header('X-RateLimit-Remaining', result.remaining.toString());
    c.header('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000).toString());

    if (result.limited) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      c.header('Retry-After', retryAfter.toString());
      console.log(`[RateLimit] ${key} exceeded ${config.maxRequests}/${config.windowMs}ms — blocked`);
      return c.json({
        error: 'Too many requests. Please try again later.',
        retryAfter,
      }, 429);
    }

    await next();
  };
}
