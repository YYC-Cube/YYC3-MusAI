/**
 * server-utils / kv_store 单元测试
 *
 * 覆盖：QueryCache（TTL/LRU/前缀失效/统计/getOrFetch）、hashContent、
 * wilsonScore、歌曲索引、共享作品索引与迁移、getUserFromRequest/requireAuth、
 * kv_store 的 set/get/del/mset/mget/mdel/getByPrefix 及错误分支。
 */
import {
  assert,
  assertEquals,
  assertMatch,
  assertRejects,
} from 'jsr:@std/assert@1';

import { FakeSupabase } from './helpers/fake-supabase.ts';

const fake = new FakeSupabase();
fake.install();
Deno.env.set('SUPABASE_URL', 'http://localhost:54321');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
Deno.env.set('SUPABASE_ANON_KEY', 'test-anon-key');

import * as kv from '../src/kv_store.tsx';
import {
  ROUTE_PREFIX,
  QueryCache,
  queryCache,
  hashContent,
  verifyContentHash,
  wilsonScore,
  getAllSongIds,
  registerSongId,
  getUserFromRequest,
  requireAuth,
  createAdminClient,
  getSharedWorkIndex,
  getSharedWork,
  saveSharedWork,
  addToSharedWorkIndex,
  getAllSharedWorks,
} from '../src/server-utils.ts';

// ============================================================
// kv_store
// ============================================================

Deno.test('kv_store: set/get/del 基本读写', async () => {
  fake.reset();
  await kv.set('unit:key', 'value-1');
  assertEquals(fake.read('unit:key'), 'value-1');
  assertEquals(await kv.get('unit:key'), 'value-1');
  assertEquals(await kv.get('unit:missing'), undefined);

  await kv.set('unit:key', { nested: true });
  assertEquals(await kv.get('unit:key'), { nested: true });

  await kv.del('unit:key');
  assertEquals(fake.read('unit:key'), undefined);
});

Deno.test('kv_store: mset/mget/mdel 批量读写', async () => {
  fake.reset();
  await kv.mset(['unit:a', 'unit:b'], [1, { x: 2 }]);
  assertEquals(await kv.get('unit:a'), 1);
  assertEquals(await kv.get('unit:b'), { x: 2 });

  const values = await kv.mget(['unit:a', 'unit:b', 'unit:none']);
  assertEquals(values.length, 2);
  assert(values.includes(1));

  await kv.mdel(['unit:a', 'unit:b']);
  assertEquals(fake.read('unit:a'), undefined);
  assertEquals(fake.read('unit:b'), undefined);
});

Deno.test('kv_store: getByPrefix 前缀查询', async () => {
  fake.reset();
  await kv.set('unit:p:one', 'a');
  await kv.set('unit:p:two', 'b');
  await kv.set('unit:q:three', 'c');

  const values = await kv.getByPrefix('unit:p:');
  assertEquals(values.sort(), ['a', 'b']);

  const none = await kv.getByPrefix('unit:zzz:');
  assertEquals(none, []);
});

Deno.test('kv_store: 故障时各方法抛出错误', async () => {
  fake.reset();
  fake.kvDown = true;
  await assertRejects(() => kv.set('k', 'v'), Error, 'kv unavailable');
  await assertRejects(() => kv.get('k'), Error, 'kv unavailable');
  await assertRejects(() => kv.del('k'), Error, 'kv unavailable');
  await assertRejects(() => kv.mset(['k'], ['v']), Error, 'kv unavailable');
  await assertRejects(() => kv.mget(['k']), Error, 'kv unavailable');
  await assertRejects(() => kv.mdel(['k']), Error, 'kv unavailable');
  await assertRejects(() => kv.getByPrefix('k'), Error, 'kv unavailable');
  fake.kvDown = false;
});

// ============================================================
// QueryCache
// ============================================================

Deno.test('QueryCache: 命中/未命中/TTL 过期', async () => {
  const cache = new QueryCache(8, 1000);
  assertEquals(cache.get('nope'), undefined);

  cache.set('a', 1);
  assertEquals(cache.get('a'), 1);

  cache.set('bad', 2, -1);
  assertEquals(cache.get('bad'), undefined);
  assertEquals(cache.stats().size, 1);

  let calls = 0;
  const first = await cache.getOrFetch('computed', async () => {
    calls++;
    return 'v';
  });
  const second = await cache.getOrFetch('computed', async () => {
    calls++;
    return 'v2';
  });
  assertEquals(first, 'v');
  assertEquals(second, 'v');
  assertEquals(calls, 1);

  cache.invalidate('computed');
  assertEquals(cache.get('computed'), undefined);
});

Deno.test('QueryCache: LRU 淘汰与过期清理', async () => {
  const cache = new QueryCache(2, 60_000);
  cache.set('a', 1);
  cache.set('b', 2);
  await new Promise((r) => setTimeout(r, 5));
  cache.get('a'); // 提升 a 的访问时间
  cache.set('c', 3); // 应淘汰 b

  assertEquals(cache.get('a'), 1);
  assertEquals(cache.get('c'), 3);
  assertEquals(cache.get('b'), undefined);

  // 覆盖同名 key 不触发 LRU 淘汰
  cache.set('a', 99);
  assertEquals(cache.get('a'), 99);
  assertEquals(cache.get('c'), 3);

  // 过期条目在 set 时被清理
  const cache2 = new QueryCache(8, 60_000);
  cache2.set('expired', 4, -1);
  cache2.set('d', 5, 60_000);
  assertEquals(cache2.get('expired'), undefined);
  assertEquals(cache2.get('d'), 5);
});

Deno.test('QueryCache: 前缀失效/清空/统计', async () => {
  const cache = new QueryCache();
  cache.set('market:a', 1);
  cache.set('market:b', 2);
  cache.set('user:a', 3);
  cache.invalidatePrefix('market:');
  assertEquals(cache.get('market:a'), undefined);
  assertEquals(cache.get('market:b'), undefined);
  assertEquals(cache.get('user:a'), 3);

  cache.get('missing');
  const stats = cache.stats();
  assertEquals(stats.hits, 1);
  assertEquals(stats.misses, 3);
  assertEquals(stats.size, 1);
  assertEquals(stats.hitRate, '25%');

  cache.clear();
  assertEquals(cache.stats(), { size: 0, hits: 0, misses: 0, hitRate: 'N/A' });
});

// ============================================================
// hashContent / wilsonScore
// ============================================================

Deno.test('hashContent: 确定性与格式', async () => {
  const a = await hashContent('hello world');
  const b = await hashContent('hello world');
  const c = await hashContent('hello world!');
  assertEquals(a, b);
  assert(a !== c);
  assertMatch(a, /^DM-[0-9A-F]{16}$/);

  assertEquals(await verifyContentHash('hello world', a), true);
  assertEquals(await verifyContentHash('tampered', a), false);
});

Deno.test('wilsonScore: 边界与置信度分支', () => {
  assertEquals(wilsonScore(0, 0), 0);
  const low = wilsonScore(1, 100);
  const high = wilsonScore(90, 100);
  assert(high > low);
  assert(high <= 1);

  const at95 = wilsonScore(10, 20, 0.95);
  const at90 = wilsonScore(10, 20, 0.90);
  assert(at90 >= at95);
});

// ============================================================
// Song index
// ============================================================

Deno.test('getAllSongIds/registerSongId: 默认/缓存/注册/异常', async () => {
  fake.reset();
  const defaults = await getAllSongIds();
  assertEquals(defaults.length, 6);
  assertEquals(defaults[0], 'track-1');
  assertEquals(fake.readJson('system:all-song-ids').length, 6);

  // 已有缓存
  fake.seedJson('system:all-song-ids', ['custom-1']);
  assertEquals(await getAllSongIds(), ['custom-1']);

  // 非数组 / 空数组 → 回退默认
  fake.seed('system:all-song-ids', JSON.stringify({ not: 'array' }));
  assertEquals((await getAllSongIds()).length, 6);
  fake.seed('system:all-song-ids', '[]');
  assertEquals((await getAllSongIds()).length, 6);

  // 非法 JSON → 回退默认
  fake.seed('system:all-song-ids', 'not-json');
  assertEquals((await getAllSongIds()).length, 6);

  // registerSongId 新增 / 已存在
  const before = await getAllSongIds();
  await registerSongId('new-song');
  const after = await getAllSongIds();
  assertEquals(after.length, before.length + 1);
  assertEquals(after.includes('new-song'), true);
  await registerSongId('new-song');
  assertEquals((await getAllSongIds()).length, before.length + 1);

  // 错误被吞掉
  fake.kvDown = true;
  await registerSongId('ignored');
  await assertRejects(() => getAllSongIds(), Error, 'kv unavailable');
  fake.kvDown = false;

  // 非数组缓存 + 注册仍可工作
  fake.seed('system:all-song-ids', JSON.stringify(['x']));
  await registerSongId('y');
  assertEquals(fake.readJson('system:all-song-ids'), ['x', 'y']);
});

// ============================================================
// Shared work index
// ============================================================

Deno.test('getSharedWorkIndex: 正常/非数组/旧键迁移/异常', async () => {
  fake.reset();
  // 无任何数据
  assertEquals(await getSharedWorkIndex(), []);

  // 正常索引
  fake.seedJson('shared-work-index', ['w1', 'w2']);
  assertEquals(await getSharedWorkIndex(), ['w1', 'w2']);

  // 非数组 → 尝试旧键迁移
  fake.seed('shared-work-index', JSON.stringify({ bad: true }));
  fake.seedJson('shared-works', [
    { workId: 'legacy-1', title: 'L1' },
    { title: 'no id' },
    { workId: 'legacy-2', title: 'L2' },
  ]);
  const migrated = await getSharedWorkIndex();
  assertEquals(migrated, ['legacy-1', 'legacy-2']);
  assertEquals(fake.readJson('shared-work-index'), ['legacy-1', 'legacy-2']);
  assertEquals(fake.readJson('shared-work:legacy-1').title, 'L1');

  // 旧键为空数组 → []
  fake.kv.delete('shared-work-index');
  fake.seedJson('shared-works', []);
  assertEquals(await getSharedWorkIndex(), []);

  // 旧键非法 JSON → []
  fake.seed('shared-works', 'broken-json');
  assertEquals(await getSharedWorkIndex(), []);

  // KV 故障 → []
  fake.kvDown = true;
  assertEquals(await getSharedWorkIndex(), []);
  fake.kvDown = false;
});

Deno.test('getSharedWork/saveSharedWork: 读写与异常', async () => {
  fake.reset();
  assertEquals(await getSharedWork('missing'), null);

  fake.seed('shared-work:bad', 'not-json');
  assertEquals(await getSharedWork('bad'), null);

  const work = { workId: 'w1', title: 'Work' };
  await saveSharedWork(work);
  assertEquals(await getSharedWork('w1'), work);
});

Deno.test('addToSharedWorkIndex: 去重/置顶/上限 1000', async () => {
  fake.reset();
  await addToSharedWorkIndex('first');
  assertEquals(fake.readJson('shared-work-index'), ['first']);

  await addToSharedWorkIndex('second');
  assertEquals(fake.readJson('shared-work-index'), ['second', 'first']);

  await addToSharedWorkIndex('first');
  assertEquals(fake.readJson('shared-work-index'), ['second', 'first']);

  const full = Array.from({ length: 1000 }, (_, i) => `w-${i}`);
  fake.seedJson('shared-work-index', full);
  await addToSharedWorkIndex('newest');
  const capped = fake.readJson<string[]>('shared-work-index')!;
  assertEquals(capped.length, 1000);
  assertEquals(capped[0], 'newest');
  assertEquals(capped.includes('w-999'), false);
});

Deno.test('getAllSharedWorks: 分页与缺失作品过滤', async () => {
  fake.reset();
  fake.seedJson('shared-work-index', ['a', 'b', 'c', 'd']);
  fake.seedJson('shared-work:a', { workId: 'a' });
  fake.seedJson('shared-work:c', { workId: 'c' });

  const page1 = await getAllSharedWorks(1, 2);
  assertEquals(page1.length, 1);
  assertEquals(page1[0].workId, 'a');

  const page2 = await getAllSharedWorks(2, 2);
  assertEquals(page2.length, 1);
  assertEquals(page2[0].workId, 'c');

  const page3 = await getAllSharedWorks(3, 2);
  assertEquals(page3, []);

  const defaultPage = await getAllSharedWorks();
  assertEquals(defaultPage.length, 2);
});

// ============================================================
// Auth helpers
// ============================================================

function mockContext(authorization?: string) {
  const ctx: any = {
    req: { header: (name: string) => (name === 'Authorization' ? authorization : undefined) },
    json: (body: any, status?: number) => ({ body, status }),
    set: (key: string, value: any) => {
      ctx.__set = { key, value };
    },
  };
  return ctx;
}

Deno.test('getUserFromRequest: 缺失/无效/成功/角色/异常', async () => {
  fake.reset();
  assertEquals(await getUserFromRequest(mockContext()), null);
  assertEquals(await getUserFromRequest(mockContext('Bearer invalid-token')), null);

  const user = await getUserFromRequest(mockContext('Bearer token-alice'));
  assertEquals(user, { id: 'alice', email: 'alice@example.com', role: 'user' });

  fake.seed('user:bob:role', 'admin');
  const admin = await getUserFromRequest(mockContext('Bearer token-bob'));
  assertEquals(admin?.role, 'admin');

  // Auth 服务故障
  fake.authDown = true;
  assertEquals(await getUserFromRequest(mockContext('Bearer token-alice')), null);
  fake.authDown = false;

  // 角色读取失败 → catch 返回 null
  fake.kvDown = true;
  assertEquals(await getUserFromRequest(mockContext('Bearer token-alice')), null);
  fake.kvDown = false;
});

Deno.test('requireAuth: 未授权 401 / 授权后注入用户', async () => {
  fake.reset();
  let nextCalled = false;
  const unauthorized = mockContext();
  const res: any = await requireAuth(unauthorized, async () => {
    nextCalled = true;
  });
  assertEquals(res.status, 401);
  assertMatch(res.body.error, /Unauthorized/);
  assertEquals(nextCalled, false);

  const ctx = mockContext('Bearer token-carol');
  await requireAuth(ctx, async () => {
    nextCalled = true;
  });
  assertEquals(nextCalled, true);
  assertEquals(ctx.__set.key, 'authedUser');
  assertEquals(ctx.__set.value.id, 'carol');
});

// ============================================================
// Misc
// ============================================================

Deno.test('常量与全局实例', () => {
  assertEquals(ROUTE_PREFIX, '/make-server-f626b673');
  assert(queryCache instanceof QueryCache);

  const admin = createAdminClient();
  assert(typeof admin.from === 'function');
  assert(typeof admin.auth.getSession === 'function');
  assert(typeof admin.storage.listBuckets === 'function');
});

Deno.test('queryCache 全局实例可正常读写', () => {
  queryCache.clear();
  queryCache.set('global-key', 42, 10_000);
  assertEquals(queryCache.get('global-key'), 42);
  queryCache.invalidate('global-key');
  assertEquals(queryCache.get('global-key'), undefined);
  queryCache.clear();
});
