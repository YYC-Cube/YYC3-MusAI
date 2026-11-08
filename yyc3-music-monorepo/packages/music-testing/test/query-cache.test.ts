// §6.2 — QueryCache Unit（自研套件 Vitest 化：LRU + TTL 内联缓存）
import { describe, it, expect } from 'vitest'

// 与 core-tests §6.2 的 TestCache 保持一致的本地复刻
class TestCache {
  private cache = new Map<string, { value: any; expiresAt: number; accessedAt: number }>();
  private maxEntries: number;
  private defaultTtl: number;
  hits = 0; misses = 0;

  constructor(max = 4, ttl = 100) { this.maxEntries = max; this.defaultTtl = ttl; }

  get<T>(key: string): T | undefined {
    const e = this.cache.get(key);
    if (!e) { this.misses++; return undefined; }
    if (Date.now() > e.expiresAt) { this.cache.delete(key); this.misses++; return undefined; }
    e.accessedAt = Date.now(); this.hits++; return e.value as T;
  }

  set<T>(key: string, value: T, ttl?: number): void {
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      let oldest = ''; let oldestT = Infinity;
      for (const [k, v] of this.cache) { if (v.accessedAt < oldestT) { oldestT = v.accessedAt; oldest = k; } }
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + (ttl ?? this.defaultTtl), accessedAt: Date.now() });
  }

  invalidate(key: string) { this.cache.delete(key); }
  invalidatePrefix(prefix: string) { for (const k of this.cache.keys()) if (k.startsWith(prefix)) this.cache.delete(k); }
  clear() { this.cache.clear(); this.hits = 0; this.misses = 0; }
  get size() { return this.cache.size; }
}

describe('§6.2 QueryCache', () => {
  it('基本 get/set 工作', () => {
    const c = new TestCache();
    c.set('a', 42);
    expect(c.get<number>('a')).toBe(42);
  });

  it('未命中返回 undefined', () => {
    expect(new TestCache().get('missing')).toBeUndefined();
  });

  it('TTL 过期后返回 undefined', async () => {
    const c = new TestCache(4, 50);
    c.set('ttl-test', 'hello');
    expect(c.get('ttl-test')).toBe('hello');
    await new Promise(r => setTimeout(r, 60));
    expect(c.get('ttl-test')).toBeUndefined();
  });

  it('LRU 淘汰最久未访问的条目', async () => {
    const c = new TestCache(3, 10000);
    c.set('x', 1);
    await new Promise(r => setTimeout(r, 2));
    c.set('y', 2);
    await new Promise(r => setTimeout(r, 2));
    c.set('z', 3);
    await new Promise(r => setTimeout(r, 2));
    c.get('x');
    c.set('w', 4);
    expect(c.get<number>('x')).toBe(1);
    expect(c.get('y')).toBeUndefined();
    expect(c.get<number>('z')).toBe(3);
    expect(c.get<number>('w')).toBe(4);
  });

  it('invalidate 删除指定键', () => {
    const c = new TestCache();
    c.set('del-me', 'bye');
    c.invalidate('del-me');
    expect(c.get('del-me')).toBeUndefined();
  });

  it('invalidatePrefix 删除前缀匹配的键', () => {
    const c = new TestCache();
    c.set('cache:a', 1); c.set('cache:b', 2); c.set('other:c', 3);
    c.invalidatePrefix('cache:');
    expect(c.get('cache:a')).toBeUndefined();
    expect(c.get('cache:b')).toBeUndefined();
    expect(c.get<number>('other:c')).toBe(3);
  });

  it('命中/未命中计数正确', () => {
    const c = new TestCache();
    c.set('k', 'v');
    c.get('k');
    c.get('k');
    c.get('miss');
    expect(c.hits).toBe(2);
    expect(c.misses).toBe(1);
  });

  it('clear 清空所有', () => {
    const c = new TestCache();
    c.set('a', 1); c.set('b', 2);
    c.clear();
    expect(c.size).toBe(0);
    expect(c.hits).toBe(0);
    expect(c.misses).toBe(0);
  });
});
