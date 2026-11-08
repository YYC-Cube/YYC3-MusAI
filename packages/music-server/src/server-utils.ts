/**
 * D-Music §2.2 — Shared Server Utilities
 *
 * Common utilities shared across all route modules:
 *   - Supabase client factory
 *   - Auth helpers (getUserFromRequest, requireAuth)
 *   - Wilson Score algorithm
 *   - Dynamic song index (getAllSongIds, registerSongId)
 *   - Route prefix constant
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

// ==========================================
// Constants
// ==========================================

export const ROUTE_PREFIX = "/make-server-f626b673";

// ==========================================
// §6.2 — Query Cache (LRU + TTL)
// In-memory cache for hot data, reducing KV round-trips.
// Thread-safe for single-threaded Deno runtime.
// ==========================================

interface CacheEntry<T = any> {
  value: T;
  expiresAt: number;    // Date.now() when entry expires
  accessedAt: number;   // Last access timestamp for LRU
}

export class QueryCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxEntries: number;
  private readonly defaultTtlMs: number;
  private hits = 0;
  private misses = 0;

  constructor(maxEntries = 128, defaultTtlMs = 60_000) {
    this.maxEntries = maxEntries;
    this.defaultTtlMs = defaultTtlMs;
  }

  /** Get a cached value. Returns undefined if missing or expired. */
  get<T = any>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) { this.misses++; return undefined; }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }
    entry.accessedAt = Date.now();
    this.hits++;
    return entry.value as T;
  }

  /** Set a value with optional custom TTL. */
  set<T = any>(key: string, value: T, ttlMs?: number): void {
    // Evict expired entries first
    this.evictExpired();
    // LRU eviction if at capacity
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      this.evictLRU();
    }
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
      accessedAt: Date.now(),
    });
  }

  /**
   * Get-or-fetch pattern: returns cached value if valid,
   * otherwise calls fetcher(), caches and returns the result.
   */
  async getOrFetch<T>(key: string, fetcher: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;
    const value = await fetcher();
    this.set(key, value, ttlMs);
    return value;
  }

  /** Invalidate a specific key. */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /** Invalidate all keys matching a prefix. */
  invalidatePrefix(prefix: string): void {
    for (const k of this.cache.keys()) {
      if (k.startsWith(prefix)) this.cache.delete(k);
    }
  }

  /** Clear entire cache. */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /** Get cache statistics. */
  stats(): { size: number; hits: number; misses: number; hitRate: string } {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? `${Math.round((this.hits / total) * 100)}%` : 'N/A',
    };
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [k, v] of this.cache.entries()) {
      if (now > v.expiresAt) this.cache.delete(k);
    }
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [k, v] of this.cache.entries()) {
      if (v.accessedAt < oldestTime) {
        oldestTime = v.accessedAt;
        oldestKey = k;
      }
    }
    if (oldestKey) this.cache.delete(oldestKey);
  }
}

/** Global shared cache instance for all route modules */
export const queryCache = new QueryCache(128, 60_000);

// ==========================================
// §L-1 — SHA-256 Content Hash (Web Crypto API)
// Replaces the simple char-code hash for copyright certification.
// ==========================================

/**
 * Generate a SHA-256 based content hash.
 * Output format: `DM-{first 16 hex chars uppercase}`
 * Deterministic: same input → same output.
 */
export async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `DM-${hashHex.slice(0, 16).toUpperCase()}`;
}

/**
 * Verify a content hash matches the given content.
 * Used by /copyright/verify endpoint.
 */
export async function verifyContentHash(content: string, expectedHash: string): Promise<boolean> {
  const computed = await hashContent(content);
  return computed === expectedHash;
}

// ==========================================
// Wilson Score Interval Algorithm
// ==========================================

export function wilsonScore(positive: number, total: number, confidence = 0.95): number {
  if (total === 0) return 0;
  const z = confidence === 0.95 ? 1.96 : 1.645;
  const p = positive / total;
  const denominator = 1 + (z * z) / total;
  const centre = p + (z * z) / (2 * total);
  const spread = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total);
  return (centre - spread) / denominator;
}

// ==========================================
// Dynamic Song Index (§8.1)
// ==========================================

const DEFAULT_SONG_IDS = ['track-1', 'track-2', 'track-3', 'track-4', 'track-5', 'track-6'];

export async function getAllSongIds(): Promise<string[]> {
  try {
    const cached = await kv.get('system:all-song-ids');
    if (cached) {
      const ids = JSON.parse(cached as string);
      if (Array.isArray(ids) && ids.length > 0) return ids;
    }
  } catch {
    // Fall through to default
  }
  await kv.set('system:all-song-ids', JSON.stringify(DEFAULT_SONG_IDS));
  return [...DEFAULT_SONG_IDS];
}

export async function registerSongId(songId: string): Promise<void> {
  try {
    const ids = await getAllSongIds();
    if (!ids.includes(songId)) {
      ids.push(songId);
      await kv.set('system:all-song-ids', JSON.stringify(ids));
      console.log(`[SongIndex] Registered new song: ${songId}`);
    }
  } catch (err) {
    console.log(`[SongIndex] Error registering song ${songId}:`, err);
  }
}

// ==========================================
// Auth Helpers
// ==========================================

export async function getUserFromRequest(c: any): Promise<{ id: string; email: string; role?: string } | null> {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  if (!accessToken) return null;
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data?.user) return null;
    const roleVal = await kv.get(`user:${data.user.id}:role`);
    return { id: data.user.id, email: data.user.email || '', role: (roleVal as string) || 'user' };
  } catch {
    return null;
  }
}

export async function requireAuth(c: any, next: () => Promise<void>) {
  const user = await getUserFromRequest(c);
  if (!user) {
    return c.json({ error: 'Unauthorized – valid access token required' }, 401);
  }
  c.set('authedUser', user);
  return next();
}

// ==========================================
// Supabase Admin Client Factory
// ==========================================

export function createAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

// Re-export kv for convenience
export { kv };

// ==========================================
// §8.2 — Shared Work Helpers
// ==========================================

export async function getSharedWorkIndex(): Promise<string[]> {
  try {
    const raw = await kv.get('shared-work-index');
    if (raw) {
      const ids = JSON.parse(raw as string);
      if (Array.isArray(ids)) return ids;
    }
  } catch { /* fall through */ }

  // Migration: if new index doesn't exist, try old monolithic key
  try {
    const legacy = await kv.get('shared-works');
    if (legacy) {
      const works = JSON.parse(legacy as string);
      if (Array.isArray(works) && works.length > 0) {
        console.log(`[SharedWorks] Migrating ${works.length} works from legacy key...`);
        const ids: string[] = [];
        for (const w of works) {
          if (w.workId) {
            await kv.set(`shared-work:${w.workId}`, JSON.stringify(w));
            ids.push(w.workId);
          }
        }
        await kv.set('shared-work-index', JSON.stringify(ids));
        console.log(`[SharedWorks] Migration complete: ${ids.length} works indexed`);
        return ids;
      }
    }
  } catch (e) { console.log(`[SharedWorks] Legacy migration error: ${e}`); }

  return [];
}

export async function getSharedWork(workId: string): Promise<any | null> {
  try {
    const raw = await kv.get(`shared-work:${workId}`);
    return raw ? JSON.parse(raw as string) : null;
  } catch { return null; }
}

export async function saveSharedWork(work: any): Promise<void> {
  await kv.set(`shared-work:${work.workId}`, JSON.stringify(work));
}

export async function addToSharedWorkIndex(workId: string): Promise<void> {
  const index = await getSharedWorkIndex();
  if (!index.includes(workId)) {
    index.unshift(workId); // newest first
    // Cap at 1000 entries
    if (index.length > 1000) index.length = 1000;
    await kv.set('shared-work-index', JSON.stringify(index));
  }
}

export async function getAllSharedWorks(page = 1, limit = 50): Promise<any[]> {
  const index = await getSharedWorkIndex();
  const start = (page - 1) * limit;
  const end = start + limit;
  const pageIds = index.slice(start, end);

  const works: any[] = [];
  for (const id of pageIds) {
    const work = await getSharedWork(id);
    if (work) works.push(work);
  }
  return works;
}