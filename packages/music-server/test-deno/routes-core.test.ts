/**
 * 核心路由测试：auth / music / starpower / user / community
 */
import {
  assert,
  assertEquals,
  assertExists,
  assertMatch,
} from 'jsr:@std/assert@1';

import { FakeSupabase } from './helpers/fake-supabase.ts';
import {
  createTestApp,
  jsonBody,
  request,
  tokenFor,
} from './helpers/test-app.ts';
import { getVIPLevel } from '../src/routes-starpower.ts';
import { hashContent } from '../src/server-utils.ts';

const fake = new FakeSupabase();
fake.install();
Deno.env.set('SUPABASE_URL', 'http://localhost:54321');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
Deno.env.set('SUPABASE_ANON_KEY', 'test-anon-key');
Deno.env.delete('OPENAI_API_KEY');

const app = createTestApp();
const P = '/make-server-f626b673';

// ============================================================
// Auth
// ============================================================

Deno.test('auth: health 返回 ok', async () => {
  const res = await request(app, `${P}/health`);
  assertEquals(res.status, 200);
  assertEquals(await jsonBody(res), { status: 'ok' });
});

Deno.test('auth: signup 成功写入星力/角色/档案', async () => {
  fake.reset();
  const res = await request(app, `${P}/signup`, {
    body: { email: 'alice@example.com', password: 's3cret', displayName: 'Alice' },
  });
  assertEquals(res.status, 200);
  const body = await jsonBody(res);
  assertEquals(body.success, true);
  assertEquals(body.user.id, 'user-alice');

  assertEquals(fake.read('user:user-alice:starpower'), '100');
  assertEquals(fake.read('user:user-alice:role'), 'user');
  const profile = fake.readJson('user:user-alice:profile');
  assertEquals(profile.displayName, 'Alice');
  assertEquals(profile.starPower, 100);
  assertEquals(profile.email, 'alice@example.com');
  assert(fake.callsTo('/auth/v1/admin/users').length > 0);
});

Deno.test('auth: signup 缺少密码返回 400', async () => {
  const res = await request(app, `${P}/signup`, { body: { email: 'no-pass@example.com' } });
  assertEquals(res.status, 400);
  assertExists((await jsonBody(res)).error);
});

Deno.test('auth: signup 上游已存在用户返回 400', async () => {
  fake.adminSignupError = 'User already registered';
  const res = await request(app, `${P}/signup`, {
    body: { email: 'dup@example.com', password: 'pw' },
  });
  fake.adminSignupError = null;
  assertEquals(res.status, 400);
  assertEquals((await jsonBody(res)).error, 'User already registered');
});

Deno.test('auth: signup 非法 JSON 返回 500', async () => {
  const res = await request(app, `${P}/signup`, { body: '{not-json' });
  assertEquals(res.status, 500);
  assertMatch((await jsonBody(res)).error, /Signup failed/);
});

// ============================================================
// Music
// ============================================================

Deno.test('music: likes 读取缺省为 0', async () => {
  const res = await request(app, `${P}/likes/like-missing`);
  assertEquals(res.status, 200);
  assertEquals((await jsonBody(res)).likes, 0);
});

Deno.test('music: likes 递增并同步 stats', async () => {
  const first = await request(app, `${P}/likes/like-song`, { method: 'POST' });
  assertEquals(first.status, 200);
  assertEquals((await jsonBody(first)).likes, 1);

  fake.seed('song:like-song:stats', JSON.stringify({ plays: 2, likes: 1, comments: 0 }));
  const second = await request(app, `${P}/likes/like-song`, { method: 'POST' });
  assertEquals((await jsonBody(second)).likes, 2);
  assertEquals(fake.readJson('song:like-song:stats').likes, 2);
  assertEquals(fake.read('song:like-song:likes'), '2');
});

Deno.test('music: likes 读取失败返回 500', async () => {
  fake.kvDown = true;
  const res = await request(app, `${P}/likes/fail-song`);
  fake.kvDown = false;
  assertEquals(res.status, 500);
  assertEquals((await jsonBody(res)).likes, 0);
});

Deno.test('music: annotations 空/写入/校验/失败', async () => {
  const empty = await request(app, `${P}/annotations/anno-song`);
  assertEquals((await jsonBody(empty)).annotations, {});

  const ok = await request(app, `${P}/annotations/anno-song`, {
    body: { lineIndex: 1, emotion: 'happy' },
  });
  assertEquals(ok.status, 200);
  const saved = await jsonBody(ok);
  assertEquals(saved.annotations['1'].happy, 1);

  fake.seed('song:anno-song:annotations', JSON.stringify({ 1: { happy: 1 } }));
  const again = await request(app, `${P}/annotations/anno-song`, {
    body: { lineIndex: 1, emotion: 'happy' },
  });
  assertEquals((await jsonBody(again)).annotations['1'].happy, 2);

  const bad = await request(app, `${P}/annotations/anno-song`, {
    body: { lineIndex: 1, emotion: 'unknown' },
  });
  assertEquals(bad.status, 400);
  assertMatch((await jsonBody(bad)).error, /Validation failed/);

  fake.kvDown = true;
  const down = await request(app, `${P}/annotations/anno-down`);
  fake.kvDown = false;
  assertEquals(down.status, 500);
  assertEquals((await jsonBody(down)).annotations, {});
});

Deno.test('music: play 记录播放与小时统计', async () => {
  fake.seed('song:play-song:stats', JSON.stringify({ plays: 2, likes: 0, comments: 0 }));
  const res = await request(app, `${P}/play/play-song`, { method: 'POST' });
  assertEquals(res.status, 200);
  assertEquals((await jsonBody(res)).plays, 3);
  assertEquals(fake.readJson('song:play-song:stats').plays, 3);
  const hourKey = [...fake.kv.keys()].find((k) => k.startsWith('analytics:plays:'));
  assertExists(hourKey);
});

Deno.test('music: play 内部错误返回 500', async () => {
  fake.kvDown = true;
  const res = await request(app, `${P}/play/play-fail`, { method: 'POST' });
  fake.kvDown = false;
  assertEquals(res.status, 500);
  assertMatch((await jsonBody(res)).error, /Failed/);
});

Deno.test('music: comments 需要鉴权并校验参数', async () => {
  const anonymous = await request(app, `${P}/comments/comment-song`, {
    body: { userName: 'Bob', text: 'hi' },
  });
  assertEquals(anonymous.status, 401);

  const invalid = await request(app, `${P}/comments/comment-song`, {
    token: tokenFor('commenter'),
    body: { userName: 'Bob', text: '' },
  });
  assertEquals(invalid.status, 400);

  const created = await request(app, `${P}/comments/comment-song`, {
    token: tokenFor('commenter'),
    body: { userName: 'Bob', text: 'hello', timestamp: 12 },
  });
  assertEquals(created.status, 200);
  const comment = (await jsonBody(created)).comment;
  assertMatch(comment.id, /^cmt-/);
  assertEquals(comment.likes, 0);

  const list = await request(app, `${P}/comments/comment-song`);
  assertEquals((await jsonBody(list)).comments.length, 1);

  const liked = await request(app, `${P}/comments/comment-song/like/${comment.id}`, {
    body: { userId: 'u-liker' },
  });
  assertEquals((await jsonBody(liked)).comment.likes, 1);

  const unliked = await request(app, `${P}/comments/comment-song/like/${comment.id}`, {
    body: { userId: 'u-liker' },
  });
  assertEquals((await jsonBody(unliked)).comment.likes, 0);

  const missing = await request(app, `${P}/comments/comment-song/like/cmt-missing`, {
    body: { userId: 'u-liker' },
  });
  assertEquals(missing.status, 404);

  fake.kvDown = true;
  const down = await request(app, `${P}/comments/comment-song`);
  fake.kvDown = false;
  assertEquals(down.status, 500);
  assertEquals((await jsonBody(down)).comments, []);
});

Deno.test('music: songs/index 与 songs/register', async () => {
  const res = await request(app, `${P}/songs/index`);
  assertEquals(res.status, 200);
  const body = await jsonBody(res);
  assert(body.songIds.includes('track-1'));
  assertEquals(body.total, body.songIds.length);

  const reg = await request(app, `${P}/songs/register`, { body: { songId: 'song-new' } });
  assertEquals(reg.status, 200);
  assertEquals((await jsonBody(reg)).success, true);
  assert(fake.readJson('system:all-song-ids').includes('song-new'));

  const bad = await request(app, `${P}/songs/register`, { body: {} });
  assertEquals(bad.status, 400);

  fake.kvDown = true;
  const down = await request(app, `${P}/songs/register`, { body: { songId: 'song-x' } });
  fake.kvDown = false;
  assertEquals(down.status, 500);

  // 缓存中的非法 JSON 会回退到默认列表
  fake.seed('system:all-song-ids', '{"not":"array"}');
  const fallback = await request(app, `${P}/songs/index`);
  assertEquals((await jsonBody(fallback)).songIds.includes('track-1'), true);
});

// ============================================================
// Star Power
// ============================================================

Deno.test('starpower: 读取余额', async () => {
  const none = await request(app, `${P}/starpower/sp-read`);
  assertEquals((await jsonBody(none)).starPower, 0);

  fake.seed('user:sp-read:starpower', '250');
  const some = await request(app, `${P}/starpower/sp-read`);
  const someBody = await jsonBody(some);
  assertEquals(someBody.starPower, 250);
  assertEquals(someBody.userId, 'sp-read');

  fake.kvDown = true;
  const down = await request(app, `${P}/starpower/sp-read`);
  fake.kvDown = false;
  assertEquals(down.status, 500);
  assertEquals((await jsonBody(down)).starPower, 0);
});

Deno.test('starpower: 增加余额（鉴权/校验/成功/错误）', async () => {
  const anonymous = await request(app, `${P}/starpower/sp-add`, {
    body: { amount: 10, reason: 'x' },
  });
  assertEquals(anonymous.status, 401);

  fake.seed('user:sp-add:starpower', '100');
  const ok = await request(app, `${P}/starpower/sp-add`, {
    token: tokenFor('sp-add'),
    body: { amount: 50, reason: 'bonus' },
  });
  assertEquals(ok.status, 200);
  const body = await jsonBody(ok);
  assertEquals(body.starPower, 150);
  assertEquals(body.added, 50);
  assertEquals(body.reason, 'bonus');
  assertEquals(fake.read('user:sp-add:starpower'), '150');

  const invalid = await request(app, `${P}/starpower/sp-add`, {
    token: tokenFor('sp-add'),
    body: { amount: 0, reason: 'x' },
  });
  assertEquals(invalid.status, 400);

  const broken = await request(app, `${P}/starpower/sp-add`, {
    token: tokenFor('sp-add'),
    body: '{bad-json',
  });
  assertEquals(broken.status, 500);
});

Deno.test('starpower: 签到连续天数、重复签到与错误', async () => {
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  fake.seed('user:sp-checkin:starpower', '0');
  fake.seed('user:sp-checkin:checkin-streak', '2');
  fake.seed('user:sp-checkin:checkin', yesterday);

  const ok = await request(app, `${P}/starpower/sp-checkin/checkin`, {
    method: 'POST',
    token: tokenFor('sp-checkin'),
  });
  assertEquals(ok.status, 200);
  const body = await jsonBody(ok);
  assertEquals(body.success, true);
  assertEquals(body.streak, 3);
  assertEquals(body.baseReward, 10);
  assertEquals(body.streakBonus, 6);
  assertEquals(body.reward, 16);
  assertEquals(body.starPower, 16);
  assertEquals(fake.read('user:sp-checkin:starpower'), '16');
  assert(fake.readJson('user:sp-checkin:transactions').length > 0);

  const again = await request(app, `${P}/starpower/sp-checkin/checkin`, {
    method: 'POST',
    token: tokenFor('sp-checkin'),
  });
  assertEquals(again.status, 200);
  assertEquals((await jsonBody(again)).alreadyCheckedIn, true);

  const fresh = await request(app, `${P}/starpower/sp-fresh/checkin`, {
    method: 'POST',
    token: tokenFor('sp-fresh'),
  });
  assertEquals((await jsonBody(fresh)).streak, 1);

  const broken = await request(app, `${P}/starpower/sp-checkin/checkin`, {
    token: tokenFor('sp-checkin'),
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: undefined,
  });
  assertEquals(broken.status, 200); // 已签到，提前返回
});

Deno.test('starpower: 交易分页与失败', async () => {
  const txns = [1, 2, 3].map((n) => ({ id: `t${n}`, amount: n }));
  fake.seed('user:sp-txn:transactions', JSON.stringify(txns));

  const page1 = await request(app, `${P}/starpower/sp-txn/transactions?page=1&limit=2`);
  const b1 = await jsonBody(page1);
  assertEquals(b1.transactions.length, 2);
  assertEquals(b1.pagination.total, 3);
  assertEquals(b1.pagination.hasNext, true);
  assertEquals(b1.pagination.hasPrev, false);

  const page2 = await request(app, `${P}/starpower/sp-txn/transactions?page=2&limit=2`);
  const b2 = await jsonBody(page2);
  assertEquals(b2.transactions.length, 1);
  assertEquals(b2.pagination.hasPrev, true);

  fake.kvDown = true;
  const down = await request(app, `${P}/starpower/sp-txn/transactions`);
  fake.kvDown = false;
  assertEquals(down.status, 500);
  assertEquals((await jsonBody(down)).transactions.length, 0);
});

Deno.test('starpower: VIP 等级边界', () => {
  assertEquals(getVIPLevel(0).level, 1);
  assertEquals(getVIPLevel(499).level, 1);
  assertEquals(getVIPLevel(500).level, 2);
  assertEquals(getVIPLevel(2000).level, 3);
  assertEquals(getVIPLevel(5000).level, 4);
  assertEquals(getVIPLevel(5000).nextThreshold, 15000);
  assertEquals(getVIPLevel(15000).level, 5);
  assertEquals(getVIPLevel(15000).nextThreshold, null);
  assertEquals(getVIPLevel(15000).nextLabel, null);
});

Deno.test('starpower: level 端点', async () => {
  fake.seed('user:sp-level:starpower', '5000');
  fake.seed('user:sp-level:checkin-streak', '4');
  fake.seed('user:sp-level:checkin', '2026-01-01');
  const res = await request(app, `${P}/starpower/sp-level/level`);
  assertEquals(res.status, 200);
  const body = await jsonBody(res);
  assertEquals(body.vipLevel.level, 4);
  assertEquals(body.streak, 4);
  assertEquals(body.lastCheckin, '2026-01-01');
  assertEquals(body.allLevels.length, 5);

  fake.kvDown = true;
  const down = await request(app, `${P}/starpower/sp-level/level`);
  fake.kvDown = false;
  assertEquals(down.status, 500);
});

Deno.test('starpower: consume 余额不足/成功/错误', async () => {
  const anonymous = await request(app, `${P}/starpower/sp-consume/consume`, {
    body: { amount: 10, purpose: 'x' },
  });
  assertEquals(anonymous.status, 401);

  const invalid = await request(app, `${P}/starpower/sp-consume/consume`, {
    token: tokenFor('sp-consume'),
    body: { amount: -1, purpose: 'x' },
  });
  assertEquals(invalid.status, 400);

  fake.seed('user:sp-consume:starpower', '10');
  const poor = await request(app, `${P}/starpower/sp-consume/consume`, {
    token: tokenFor('sp-consume'),
    body: { amount: 50, purpose: 'buy' },
  });
  assertEquals(poor.status, 400);
  assertEquals((await jsonBody(poor)).error, 'Insufficient SP');

  fake.seed('user:sp-consume:starpower', '100');
  const ok = await request(app, `${P}/starpower/sp-consume/consume`, {
    token: tokenFor('sp-consume'),
    body: { amount: 30, purpose: 'buy', targetId: 't1' },
  });
  assertEquals(ok.status, 200);
  assertEquals((await jsonBody(ok)).starPower, 70);
  assertEquals(fake.read('user:sp-consume:starpower'), '70');
  assertEquals(fake.readJson('user:sp-consume:transactions')[0].detail, 'Target: t1');

  const broken = await request(app, `${P}/starpower/sp-consume/consume`, {
    token: tokenFor('sp-consume'),
    body: '{bad',
  });
  assertEquals(broken.status, 500);
});

Deno.test('starpower: leaderboard boost', async () => {
  const anonymous = await request(app, `${P}/leaderboard/boost`, {
    body: { songId: 's1', userId: 'u1' },
  });
  assertEquals(anonymous.status, 401);

  const invalid = await request(app, `${P}/leaderboard/boost`, {
    token: tokenFor('boost-user'),
    body: { songId: '', userId: 'u1' },
  });
  assertEquals(invalid.status, 400);

  fake.seed('user:boost-user:starpower', '50');
  const poor = await request(app, `${P}/leaderboard/boost`, {
    token: tokenFor('boost-user'),
    body: { songId: 's1', userId: 'boost-user', amount: 100 },
  });
  assertEquals(poor.status, 400);

  fake.seed('user:boost-user:starpower', '500');
  fake.seed('song:s1:stats', JSON.stringify({ plays: 5, likes: 0, comments: 0 }));
  const ok = await request(app, `${P}/leaderboard/boost`, {
    token: tokenFor('boost-user'),
    body: { songId: 's1', userId: 'boost-user', amount: 100 },
  });
  assertEquals(ok.status, 200);
  const body = await jsonBody(ok);
  assertEquals(body.starPower, 400);
  assertEquals(body.boostPlays, 10);
  assertEquals(fake.readJson('song:s1:stats').plays, 15);

  const broken = await request(app, `${P}/leaderboard/boost`, {
    token: tokenFor('boost-user'),
    body: '{bad',
  });
  assertEquals(broken.status, 500);
});

Deno.test('starpower: 商店列表与购买流程', async () => {
  const items = await request(app, `${P}/starpower/shop/items`);
  assertEquals((await jsonBody(items)).items.length, 10);

  const anonymous = await request(app, `${P}/starpower/shop/purchase`, {
    body: { userId: 'shop-user', itemId: 'theme-neon' },
  });
  assertEquals(anonymous.status, 401);

  const invalid = await request(app, `${P}/starpower/shop/purchase`, {
    token: tokenFor('shop-user'),
    body: { userId: 'shop-user' },
  });
  assertEquals(invalid.status, 400);

  const missing = await request(app, `${P}/starpower/shop/purchase`, {
    token: tokenFor('shop-user'),
    body: { userId: 'shop-user', itemId: 'no-such-item' },
  });
  assertEquals(missing.status, 404);

  fake.seed('user:shop-user:starpower', '10');
  const poor = await request(app, `${P}/starpower/shop/purchase`, {
    token: tokenFor('shop-user'),
    body: { userId: 'shop-user', itemId: 'theme-neon' },
  });
  assertEquals(poor.status, 400);
  assertEquals(fake.readJson('user:shop-user:transactions')[0].type, 'failed_spend');

  fake.seed('user:shop-user:starpower', '300');
  const ok = await request(app, `${P}/starpower/shop/purchase`, {
    token: tokenFor('shop-user'),
    body: { userId: 'shop-user', itemId: 'theme-neon' },
  });
  assertEquals(ok.status, 200);
  assertEquals((await jsonBody(ok)).starPower, 100);
  assertEquals(fake.readJson('user:shop-user:inventory').length, 1);

  fake.seed('user:shop-user:starpower', '300');
  fake.seedJson('user:shop-user:inventory', [{ itemId: 'theme-neon', purchasedAt: 1, expiresAt: null }]);
  const owned = await request(app, `${P}/starpower/shop/purchase`, {
    token: tokenFor('shop-user'),
    body: { userId: 'shop-user', itemId: 'theme-neon' },
  });
  assertEquals(owned.status, 400);
  assertEquals((await jsonBody(owned)).error, 'Already owned');
  assertEquals(fake.read('user:shop-user:starpower'), '300');

  // 模拟并发读取导致余额在二次校验时不足
  const raceUser = 'shop-race';
  fake.seed(`user:${raceUser}:starpower`, '300');
  fake.kvSequence.set(`user:${raceUser}:starpower`, ['300', '10']);
  const race = await request(app, `${P}/starpower/shop/purchase`, {
    token: tokenFor(raceUser),
    body: { userId: raceUser, itemId: 'sound-synth' },
  });
  assertEquals(race.status, 400);
  assertMatch((await jsonBody(race)).error, /race condition/);

  const broken = await request(app, `${P}/starpower/shop/purchase`, {
    token: tokenFor('shop-user'),
    body: '{bad',
  });
  assertEquals(broken.status, 500);
});

Deno.test('starpower: 库存过滤过期项', async () => {
  fake.seed(
    'user:inv-user:inventory',
    JSON.stringify([
      { itemId: 'a', expiresAt: null },
      { itemId: 'b', expiresAt: Date.now() + 100000 },
      { itemId: 'c', expiresAt: Date.now() - 1000 },
    ]),
  );
  const res = await request(app, `${P}/starpower/shop/inventory/inv-user`);
  assertEquals(res.status, 200);
  assertEquals((await jsonBody(res)).inventory.length, 2);

  fake.kvDown = true;
  const down = await request(app, `${P}/starpower/shop/inventory/inv-user`);
  fake.kvDown = false;
  assertEquals(down.status, 500);
  assertEquals((await jsonBody(down)).inventory.length, 0);
});

// ============================================================
// User
// ============================================================

Deno.test('user: creators 聚合与筛选', async () => {
  fake.seedJson('shared-work-index', ['w1', 'w2', 'w3']);
  fake.seedJson('shared-work:w1', { workId: 'w1', userName: 'Ann', userId: 'ann', likes: 2, createdAt: 10 });
  fake.seedJson('shared-work:w2', { workId: 'w2', userName: 'Ann', userId: 'ann', likes: 3, createdAt: 20 });
  fake.seedJson('shared-work:w3', { workId: 'w3', userName: 'Ben', userId: 'ben', likes: 1, createdAt: 5 });

  const res = await request(app, `${P}/creators`);
  assertEquals(res.status, 200);
  const creators = (await jsonBody(res)).creators;
  assertEquals(creators.length, 2);
  assertEquals(creators[0].userName, 'Ann');
  assertEquals(creators[0].works, 2);
  assertEquals(creators[0].totalLikes, 5);
  assertEquals(creators[0].latestWork, 20);

  const works = await request(app, `${P}/creators/Ann/works`);
  assertEquals((await jsonBody(works)).works.length, 2);

  fake.kvDown = true;
  const downCreators = await request(app, `${P}/creators`);
  const downWorks = await request(app, `${P}/creators/Ann/works`);
  fake.kvDown = false;
  // getSharedWorkIndex 内部容错，KV 故障时降级为空列表
  assertEquals(downCreators.status, 200);
  assertEquals((await jsonBody(downCreators)).creators, []);
  assertEquals(downWorks.status, 200);
  assertEquals((await jsonBody(downWorks)).works, []);
});

Deno.test('user: profile 读取默认值与已有值', async () => {
  const empty = await request(app, `${P}/profile/prof-user`);
  const emptyProfile = (await jsonBody(empty)).profile;
  assertEquals(emptyProfile.userId, 'prof-user');
  assertEquals(emptyProfile.starPower, 0);

  fake.seedJson('user:prof-user:profile', { userId: 'prof-user', displayName: 'Prof' });
  const existing = await request(app, `${P}/profile/prof-user`);
  assertEquals((await jsonBody(existing)).profile.displayName, 'Prof');

  fake.kvDown = true;
  const down = await request(app, `${P}/profile/prof-user`);
  fake.kvDown = false;
  assertEquals(down.status, 500);
});

Deno.test('user: profile 更新（鉴权/校验/合并）', async () => {
  const anonymous = await request(app, `${P}/profile/prof-up`, { body: { bio: 'hi' } });
  assertEquals(anonymous.status, 401);

  const invalid = await request(app, `${P}/profile/prof-up`, {
    token: tokenFor('prof-up'),
    body: { email: 'not-an-email' },
  });
  assertEquals(invalid.status, 400);

  fake.seedJson('user:prof-up:profile', { userId: 'prof-up', displayName: 'Old', starPower: 5 });
  const ok = await request(app, `${P}/profile/prof-up`, {
    token: tokenFor('prof-up'),
    body: { displayName: 'New', bio: 'bio', extra: 'kept' },
  });
  assertEquals(ok.status, 200);
  const profile = (await jsonBody(ok)).profile;
  assertEquals(profile.displayName, 'New');
  assertEquals(profile.starPower, 5);
  assertEquals(profile.extra, 'kept');

  const broken = await request(app, `${P}/profile/prof-up`, {
    token: tokenFor('prof-up'),
    body: '{bad',
  });
  assertEquals(broken.status, 500);
});

Deno.test('user: role 读取与管理员更新', async () => {
  const def = await request(app, `${P}/user/role/role-user`);
  assertEquals((await jsonBody(def)).role, 'user');

  fake.seed('user:role-user:role', 'creator');
  const existing = await request(app, `${P}/user/role/role-user`);
  assertEquals((await jsonBody(existing)).role, 'creator');

  const anonymous = await request(app, `${P}/user/role/role-user`, { body: { role: 'admin' } });
  assertEquals(anonymous.status, 403);

  const invalidToken = await request(app, `${P}/user/role/role-user`, {
    token: 'invalid-token',
    body: { role: 'admin' },
  });
  assertEquals(invalidToken.status, 403);

  const nonAdmin = await request(app, `${P}/user/role/role-user`, {
    token: tokenFor('plain-user'),
    body: { role: 'admin' },
  });
  assertEquals(nonAdmin.status, 403);

  fake.seed('user:admin-user:role', 'admin');
  const badRole = await request(app, `${P}/user/role/role-user`, {
    token: tokenFor('admin-user'),
    body: { role: 'superuser' },
  });
  assertEquals(badRole.status, 400);

  const ok = await request(app, `${P}/user/role/role-user`, {
    token: tokenFor('admin-user'),
    body: { role: 'moderator' },
  });
  assertEquals(ok.status, 200);
  assertEquals(fake.read('user:role-user:role'), 'moderator');

  fake.kvDown = true;
  const down = await request(app, `${P}/user/role/role-user`);
  fake.kvDown = false;
  assertEquals(down.status, 500);
});

Deno.test('user: unlocked-themes 读写', async () => {
  const empty = await request(app, `${P}/user/theme-user/unlocked-themes`);
  assertEquals((await jsonBody(empty)).themes, []);

  const anonymous = await request(app, `${P}/user/theme-user/unlocked-themes`, {
    body: { themeId: 'neon' },
  });
  assertEquals(anonymous.status, 401);

  const invalid = await request(app, `${P}/user/theme-user/unlocked-themes`, {
    token: tokenFor('theme-user'),
    body: {},
  });
  assertEquals(invalid.status, 400);

  const ok = await request(app, `${P}/user/theme-user/unlocked-themes`, {
    token: tokenFor('theme-user'),
    body: { themeId: 'neon' },
  });
  assertEquals(ok.status, 200);
  assertEquals((await jsonBody(ok)).themes, ['neon']);

  const dup = await request(app, `${P}/user/theme-user/unlocked-themes`, {
    token: tokenFor('theme-user'),
    body: { themeId: 'neon' },
  });
  assertEquals((await jsonBody(dup)).themes, ['neon']);

  fake.kvDown = true;
  const down = await request(app, `${P}/user/theme-user/unlocked-themes`);
  fake.kvDown = false;
  assertEquals(down.status, 500);
  assertEquals((await jsonBody(down)).themes, []);
});

Deno.test('user: preferences 读写与白名单过滤', async () => {
  const empty = await request(app, `${P}/preferences/pref-user`);
  assertEquals((await jsonBody(empty)).preferences, null);

  const anonymous = await request(app, `${P}/preferences/pref-user`, {
    body: { lang: 'zh' },
  });
  assertEquals(anonymous.status, 401);

  const ok = await request(app, `${P}/preferences/pref-user`, {
    token: tokenFor('pref-user'),
    body: { lang: 'zh', volume: 0.5, hack: 'nope', mode: 'loop' },
  });
  assertEquals(ok.status, 200);
  const stored = fake.readJson('prefs:pref-user');
  assertEquals(stored, { lang: 'zh', volume: 0.5, mode: 'loop' });

  const read = await request(app, `${P}/preferences/pref-user`);
  assertEquals((await jsonBody(read)).preferences.lang, 'zh');

  fake.kvDown = true;
  const down = await request(app, `${P}/preferences/pref-user`);
  fake.kvDown = false;
  assertEquals(down.status, 500);
});

Deno.test('user: error-report 校验、截断与容错', async () => {
  const missing = await request(app, `${P}/error-report`, { body: {} });
  assertEquals(missing.status, 400);

  const ok = await request(app, `${P}/error-report`, {
    body: { message: 'boom', stack: 's'.repeat(3000), url: 'http://x' },
  });
  assertEquals(ok.status, 200);
  assertMatch((await jsonBody(ok)).id, /^err-/);

  const logs = fake.readJson('system:error-log');
  assertEquals(logs.length, 1);
  assertEquals(logs[0].message, 'boom');
  assertEquals(logs[0].stack.length, 2000);

  fake.seed('system:error-log', 'not-json');
  const recovered = await request(app, `${P}/error-report`, { body: { message: 'second' } });
  assertEquals(recovered.status, 200);
  assertEquals(fake.readJson('system:error-log').length, 1);

  const existing = Array.from({ length: 60 }, (_, i) => ({ id: `e${i}` }));
  fake.seedJson('system:error-log', existing);
  await request(app, `${P}/error-report`, { body: { message: 'trim' } });
  assertEquals(fake.readJson('system:error-log').length, 50);

  fake.kvDown = true;
  const down = await request(app, `${P}/error-report`, { body: { message: 'down' } });
  fake.kvDown = false;
  assertEquals(down.status, 500);
});

Deno.test('user: export 鉴权与数据过滤', async () => {
  const anonymous = await request(app, `${P}/export/ex-user`);
  assertEquals(anonymous.status, 401);

  const wrongUser = await request(app, `${P}/export/ex-user`, {
    token: tokenFor('someone-else'),
  });
  assertEquals(wrongUser.status, 401);

  fake.seedJson('profile:ex-user', { displayName: 'Ex' });
  fake.seed('user:ex-user:starpower', '42');
  fake.seedJson('shared-work:a', { authorId: 'ex-user', title: 'Mine' });
  fake.seedJson('shared-work:b', { authorId: 'other', title: 'NotMine' });
  fake.seedJson('capsule:c1', { senderId: 'ex-user' });
  fake.seedJson('capsule:c2', { senderId: 'other' });

  const res = await request(app, `${P}/export/ex-user`, { token: tokenFor('ex-user') });
  assertEquals(res.status, 200);
  const body = await jsonBody(res);
  assertEquals(body.userId, 'ex-user');
  assertEquals(body.email, 'ex-user@example.com');
  assertEquals(body.profile.displayName, 'Ex');
  assertEquals(body.starPower, 42);
  assertEquals(body.sharedWorks.length, 1);
  assertEquals(body.timeCapsules.length, 1);
});

// ============================================================
// Community
// ============================================================

Deno.test('community: activities 读取/写入/校验', async () => {
  const empty = await request(app, `${P}/community/activities`);
  assertEquals((await jsonBody(empty)).activities, []);

  const anonymous = await request(app, `${P}/community/activities`, {
    body: { type: 'like', userId: 'u', userName: 'U' },
  });
  assertEquals(anonymous.status, 401);

  const invalid = await request(app, `${P}/community/activities`, {
    token: tokenFor('act-user'),
    body: { type: 'like' },
  });
  assertEquals(invalid.status, 400);

  const ok = await request(app, `${P}/community/activities`, {
    token: tokenFor('act-user'),
    body: { type: 'like', userId: 'act-user', userName: 'Act', songTitle: 'S' },
  });
  assertEquals(ok.status, 200);
  assertMatch((await jsonBody(ok)).activity.id, /^act-/);

  const list = await request(app, `${P}/community/activities`);
  assertEquals((await jsonBody(list)).activities.length, 1);

  fake.kvDown = true;
  const down = await request(app, `${P}/community/activities`);
  fake.kvDown = false;
  assertEquals(down.status, 500);
});

Deno.test('community: shared-works 发布与重复发布', async () => {
  const anonymous = await request(app, `${P}/shared-works`, {
    body: { workId: 'sw-1', title: 'T' },
  });
  assertEquals(anonymous.status, 401);

  const invalid = await request(app, `${P}/shared-works`, {
    token: tokenFor('sw-user'),
    body: { workId: '', title: '' },
  });
  assertEquals(invalid.status, 400);

  const ok = await request(app, `${P}/shared-works`, {
    token: tokenFor('sw-user'),
    body: { workId: 'sw-1', title: 'Work One', userId: 'sw-user', userName: 'Sw' },
  });
  assertEquals(ok.status, 200);
  assertEquals((await jsonBody(ok)).work.workId, 'sw-1');
  assertEquals(fake.readJson('shared-work:sw-1').title, 'Work One');
  assert(fake.readJson('shared-work-index').includes('sw-1'));

  const dup = await request(app, `${P}/shared-works`, {
    token: tokenFor('sw-user'),
    body: { workId: 'sw-1', title: 'Work One' },
  });
  assertEquals((await jsonBody(dup)).alreadyShared, true);

  const list = await request(app, `${P}/shared-works?page=1&limit=10`);
  const listed = await jsonBody(list);
  assertEquals(listed.total >= 1, true);
  assertEquals(listed.page, 1);
  assertEquals(listed.limit, 10);

  fake.kvDown = true;
  const down = await request(app, `${P}/shared-works`);
  fake.kvDown = false;
  // 索引读取内部容错，KV 故障时返回空列表
  assertEquals(down.status, 200);
  assertEquals((await jsonBody(down)).total, 0);
});

Deno.test('community: shared-works like 去重/404/通知/失败', async () => {
  const notFound = await request(app, `${P}/shared-works/no-such-work/like`, { method: 'POST' });
  assertEquals(notFound.status, 404);

  fake.seedJson('shared-work:like-w', {
    workId: 'like-w', userId: 'author-1', userName: 'Author', likes: 4, title: 'W',
  });

  const noBody = await request(app, `${P}/shared-works/like-w/like`, { method: 'POST' });
  assertEquals(noBody.status, 200);
  assertEquals((await jsonBody(noBody)).likes, 5);
  assertEquals(fake.readJson('notifications:user:author-1').length, 1);

  fake.seedJson('shared-work:dedup-w', {
    workId: 'dedup-w', userId: 'author-2', userName: 'Author2', likes: 0, title: 'D',
  });
  const first = await request(app, `${P}/shared-works/dedup-w/like`, {
    body: { userId: 'liker-1' },
  });
  assertEquals((await jsonBody(first)).likes, 1);
  const second = await request(app, `${P}/shared-works/dedup-w/like`, {
    body: { userId: 'liker-1' },
  });
  assertEquals((await jsonBody(second)).deduplicated, true);
  assertEquals(fake.read('like-dedup:dedup-w:liker-1'), '1');

  fake.kvDown = true;
  const down = await request(app, `${P}/shared-works/like-w/like`, { method: 'POST' });
  fake.kvDown = false;
  // getSharedWork 内部容错，KV 故障时视为作品不存在
  assertEquals(down.status, 404);
});

Deno.test('community: fork 作品并写入通知链', async () => {
  const anonymous = await request(app, `${P}/works/fork`, {
    body: { userId: 'f', originalWorkId: 'w', title: 'T' },
  });
  assertEquals(anonymous.status, 401);

  const invalid = await request(app, `${P}/works/fork`, {
    token: tokenFor('forker'),
    body: { userId: 'forker', originalWorkId: '', title: '' },
  });
  assertEquals(invalid.status, 400);

  fake.seedJson('shared-work:orig-w', {
    workId: 'orig-w', userId: 'orig-owner', userName: 'Owner', title: 'Orig',
  });
  const ok = await request(app, `${P}/works/fork`, {
    token: tokenFor('forker'),
    body: {
      userId: 'forker', userName: 'Forker', originalWorkId: 'orig-w',
      originalAuthor: 'Owner', title: 'Fork Title',
    },
  });
  assertEquals(ok.status, 200);
  const fork = (await jsonBody(ok)).fork;
  assertMatch(fork.workId, /^fork-/);
  assertEquals(fake.readJson('fork-chain:orig-w').length, 1);
  assertEquals(fake.readJson('notifications:user:orig-owner').length, 1);
  assert(fake.readJson('shared-work-index').includes(fork.workId));

  const forks = await request(app, `${P}/works/orig-w/forks`);
  assertEquals((await jsonBody(forks)).count, 1);

  fake.kvDown = true;
  const down = await request(app, `${P}/works/orig-w/forks`);
  fake.kvDown = false;
  assertEquals(down.status, 500);

  const broken = await request(app, `${P}/works/fork`, {
    token: tokenFor('forker'),
    body: '{bad',
  });
  assertEquals(broken.status, 500);
});

Deno.test('community: copyright 申请/查询/校验', async () => {
  const anonymous = await request(app, `${P}/copyright/apply`, {
    body: { userId: 'c', workId: 'cw', workTitle: 'T' },
  });
  assertEquals(anonymous.status, 401);

  const invalid = await request(app, `${P}/copyright/apply`, {
    token: tokenFor('copy-user'),
    body: { userId: 'copy-user' },
  });
  assertEquals(invalid.status, 400);

  fake.seedJson('shared-work:cw', { workId: 'cw', userId: 'copy-user', title: 'CW' });
  const createdAt = 1700000000000;
  const applyBody = {
    userId: 'copy-user', userName: 'Copy', workId: 'cw',
    workTitle: 'CW', workTheme: 'happy', workLyrics: ['a', 'b'], createdAt,
  };
  const ok = await request(app, `${P}/copyright/apply`, {
    token: tokenFor('copy-user'),
    body: applyBody,
  });
  assertEquals(ok.status, 200);
  const cert = (await jsonBody(ok)).cert;
  assertMatch(cert.contentHash, /^DM-[0-9A-F]{16}$/);
  assertEquals(fake.readJson('shared-work:cw').copyrightCertified, true);
  assertEquals(fake.readJson('copyright:user:copy-user').length, 1);

  const stored = await request(app, `${P}/copyright/cw`);
  assertEquals((await jsonBody(stored)).cert.certId, cert.certId);

  const missing = await request(app, `${P}/copyright/unknown-work`);
  assertEquals((await jsonBody(missing)).cert, null);

  const userList = await request(app, `${P}/copyright/user/copy-user`);
  assertEquals((await jsonBody(userList)).certs.length, 1);

  const noWorkId = await request(app, `${P}/copyright/verify`, { body: {} });
  assertEquals(noWorkId.status, 400);

  const noCert = await request(app, `${P}/copyright/verify`, { body: { workId: 'nope' } });
  const noCertBody = await jsonBody(noCert);
  assertEquals(noCertBody.verified, false);
  assertEquals(noCertBody.reason, 'No certificate found for this workId');

  const verified = await request(app, `${P}/copyright/verify`, {
    body: { workId: 'cw', workTitle: 'CW', workTheme: 'happy', workLyrics: ['a', 'b'], userId: 'copy-user', createdAt },
  });
  assertEquals((await jsonBody(verified)).verified, true);

  const tampered = await request(app, `${P}/copyright/verify`, {
    body: { workId: 'cw', workTitle: 'CW', workTheme: 'happy', workLyrics: ['a', 'changed'], userId: 'copy-user', createdAt },
  });
  assertEquals((await jsonBody(tampered)).verified, false);

  // hashContent 直接单元验证
  assertEquals(await hashContent('x'), await hashContent('x'));

  fake.kvDown = true;
  const down = await request(app, `${P}/copyright/cw`);
  const downUser = await request(app, `${P}/copyright/user/copy-user`);
  const downVerify = await request(app, `${P}/copyright/verify`, { body: { workId: 'cw' } });
  fake.kvDown = false;
  assertEquals(down.status, 500);
  assertEquals(downUser.status, 500);
  assertEquals(downVerify.status, 500);
});
