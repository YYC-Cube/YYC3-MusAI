/**
 * Social / Spacetime / Challenge / Live Session 路由测试
 */
import { assert, assertEquals, assertMatch } from 'jsr:@std/assert@1';

import { FakeSupabase } from './helpers/fake-supabase.ts';
import {
  createSpacetimeApp,
  createTestApp,
  jsonBody,
  request,
  tokenFor,
} from './helpers/test-app.ts';
import { queryCache } from '../src/server-utils.ts';

const fake = new FakeSupabase();
fake.install();
Deno.env.set('SUPABASE_URL', 'http://localhost:54321');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
Deno.env.delete('OPENAI_API_KEY');
Deno.env.delete('DMUSIC_LOCAL_API');

const app = createTestApp();
const spacetimeApp = createSpacetimeApp();
const P = '/make-server-f626b673';

const auth = (id: string) => tokenFor(id);

// ============================================================
// Social
// ============================================================

Deno.test('social: achievements 默认与全量解锁', async () => {
  const empty = await request(app, `${P}/achievements/ach-empty`);
  const emptyBody = await jsonBody(empty);
  assertEquals(emptyBody.totalUnlocked, 0);
  assertEquals(emptyBody.achievements.length, 12);

  fake.seedJson('user:ach-all:achievement-stats', {
    totalWorks: 10, streakDays: 7, totalLikesReceived: 100, totalForks: 5,
    totalPlays: 10000, totalMessages: 50, totalCapsules: 5, peakStarPower: 2000,
    locationMessages: 5, voiceMessages: 10,
  });
  const all = await request(app, `${P}/achievements/ach-all`);
  const allBody = await jsonBody(all);
  assertEquals(allBody.totalUnlocked, 12);
  assertEquals(allBody.achievements.every((a: any) => a.newlyUnlocked), true);
  assertEquals(fake.readJson('user:ach-all:achievements').length, 12);

  const again = await request(app, `${P}/achievements/ach-all`);
  assertEquals((await jsonBody(again)).achievements.every((a: any) => !a.newlyUnlocked), true);

  fake.kvDown = true;
  const down = await request(app, `${P}/achievements/ach-all`);
  fake.kvDown = false;
  assertEquals(down.status, 500);
  assertEquals((await jsonBody(down)).totalUnlocked, 0);
});

Deno.test('social: achievements track 各动作分支', async () => {
  const anonymous = await request(app, `${P}/achievements/u-track/track`, {
    body: { action: 'create_work' },
  });
  assertEquals(anonymous.status, 401);

  const invalid = await request(app, `${P}/achievements/u-track/track`, {
    token: auth('u-track'),
    body: {},
  });
  assertEquals(invalid.status, 400);

  const actions = [
    'create_work', 'receive_like', 'receive_fork', 'send_message',
    'create_capsule', 'send_voice', 'send_location', 'unknown-action',
  ];
  for (const action of actions) {
    const res = await request(app, `${P}/achievements/u-track/track`, {
      token: auth('u-track'),
      body: { action, starPower: 2500, totalPlays: 123 },
    });
    assertEquals(res.status, 200);
    assertEquals((await jsonBody(res)).success, true);
  }
  const stats = fake.readJson('user:u-track:achievement-stats');
  assertEquals(stats.totalWorks, 1);
  assertEquals(stats.peakStarPower, 2500);
  assertEquals(stats.totalPlays, 123);

  // 连续登录：昨天 -> 今天递增
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  fake.seedJson('user:u-daily:achievement-stats', { streakDays: 3, lastActiveDate: yesterday });
  const daily = await request(app, `${P}/achievements/u-daily/track`, {
    token: auth('u-daily'),
    body: { action: 'daily_login' },
  });
  assertEquals((await jsonBody(daily)).stats.streakDays, 4);

  const sameDay = await request(app, `${P}/achievements/u-daily/track`, {
    token: auth('u-daily'),
    body: { action: 'daily_login' },
  });
  assertEquals((await jsonBody(sameDay)).stats.streakDays, 4);

  // 断签重置为 1
  fake.seedJson('user:u-gap:achievement-stats', { streakDays: 9, lastActiveDate: '2020-01-01' });
  const gap = await request(app, `${P}/achievements/u-gap/track`, {
    token: auth('u-gap'),
    body: { action: 'daily_login' },
  });
  assertEquals((await jsonBody(gap)).stats.streakDays, 1);

  const broken = await request(app, `${P}/achievements/u-track/track`, {
    token: auth('u-track'),
    body: '{bad',
  });
  assertEquals(broken.status, 500);
});

Deno.test('social: notifications 迁移、已读与错误', async () => {
  fake.seedJson('user:notif-user:profile', { displayName: 'Legacy' });
  fake.seedJson('notifications:Legacy', [{ id: 'n1', text: 'old' }]);

  const migrated = await request(app, `${P}/notifications/notif-user`);
  assertEquals((await jsonBody(migrated)).notifications.length, 1);
  assert(fake.read('notifications:user:notif-user'));
  assertEquals(fake.read('notifications:Legacy'), undefined);

  const read = await request(app, `${P}/notifications/notif-user/read`, { method: 'POST' });
  assertEquals(read.status, 200);
  assertEquals(fake.readJson('notifications:user:notif-user')[0].read, true);

  const empty = await request(app, `${P}/notifications/notif-none`);
  assertEquals((await jsonBody(empty)).notifications, []);

  fake.kvDown = true;
  const down = await request(app, `${P}/notifications/notif-user`);
  fake.kvDown = false;
  assertEquals(down.status, 500);
  assertEquals((await jsonBody(down)).notifications, []);
});

Deno.test('social: timeline comments 发布/截断/点赞', async () => {
  const empty = await request(app, `${P}/timeline-comments/tl-song`);
  assertEquals((await jsonBody(empty)).comments, []);

  const anonymous = await request(app, `${P}/timeline-comments/tl-song`, {
    body: { text: 'hi', timestamp: 1 },
  });
  assertEquals(anonymous.status, 401);

  const invalid = await request(app, `${P}/timeline-comments/tl-song`, {
    token: auth('tl-user'),
    body: { text: 'hi' },
  });
  assertEquals(invalid.status, 400);

  const ok = await request(app, `${P}/timeline-comments/tl-song`, {
    token: auth('tl-user'),
    body: { text: 'nice', timestamp: 12, userName: 'TL' },
  });
  assertEquals(ok.status, 200);
  const comment = (await jsonBody(ok)).comment;
  assertMatch(comment.id, /^tc-/);

  const liked = await request(app, `${P}/timeline-comments/tl-song/like/${comment.id}`, {
    method: 'POST',
  });
  assertEquals(liked.status, 200);
  assertEquals(fake.readJson('timeline-comments:tl-song')[0].likes, 1);

  const missing = await request(app, `${P}/timeline-comments/tl-song/like/tc-none`, {
    method: 'POST',
  });
  assertEquals(missing.status, 200);

  const existing = Array.from({ length: 200 }, (_, i) => ({ id: `old${i}` }));
  fake.seedJson('timeline-comments:tl-trim', existing);
  const trimmed = await request(app, `${P}/timeline-comments/tl-trim`, {
    token: auth('tl-user'),
    body: { text: 'overflow', timestamp: 1 },
  });
  assertEquals((await jsonBody(trimmed)).total, 200);

  const broken = await request(app, `${P}/timeline-comments/tl-song`, {
    token: auth('tl-user'),
    body: '{bad',
  });
  assertEquals(broken.status, 500);

  fake.kvDown = true;
  const downGet = await request(app, `${P}/timeline-comments/tl-song`);
  const downLike = await request(app, `${P}/timeline-comments/tl-song/like/${comment.id}`, {
    method: 'POST',
  });
  fake.kvDown = false;
  assertEquals(downGet.status, 500);
  assertEquals(downLike.status, 500);
});

Deno.test('social: fork tree 遍历', async () => {
  fake.seedJson('work:root', { id: 'root', title: 'Root' });
  fake.seedJson('work:root:forks', ['f1']);
  fake.seedJson('work:f1', { id: 'f1', title: 'F1' });
  fake.seedJson('work:f1:forks', ['root', 'f2']);
  fake.seedJson('work:f2', { id: 'f2', title: 'F2' });

  const res = await request(app, `${P}/works/fork-tree/root`);
  assertEquals(res.status, 200);
  const body = await jsonBody(res);
  assertEquals(body.rootId, 'root');
  assertEquals(body.tree.length, 3);
  assertEquals(body.tree.map((w: any) => w.id).sort(), ['f1', 'f2', 'root']);

  fake.kvDown = true;
  const down = await request(app, `${P}/works/fork-tree/root`);
  fake.kvDown = false;
  assertEquals(down.status, 500);
});

Deno.test('social: mheart 计算与趋势', async () => {
  fake.seedJson('user:mh-user:listening-history', [
    { emotion: 'energetic', listenDuration: 120 },
    { emotion: 'happy', listenDuration: 60 },
    { emotion: 'mystery' },
  ]);
  fake.seedJson('profile:mh-user', { totalLikes: 10, totalAnnotations: 3 });
  fake.seedJson('achievements:mh-user', ['a1', 'a2']);
  fake.seedJson('mheart-trend:mh-user', Array.from({ length: 30 }, (_, i) => ({ score: i, timestamp: i })));

  const res = await request(app, `${P}/mheart/mh-user`);
  assertEquals(res.status, 200);
  const body = await jsonBody(res);
  assertEquals(body.mheart.totalSessions, 3);
  assertEquals(body.mheart.listeningMinutes, 3);
  assertEquals(body.mheart.emotionBreakdown.energetic, 1);
  assert(body.mheart.rarity > 8 && body.mheart.rarity < 9);
  assert(body.mheart.score > 0);
  assertEquals(body.trend.length, 30);
  assertEquals(fake.readJson('mheart:mh-user').totalSessions, 3);

  fake.seedJson('user:mh-many:listening-history', Array.from({ length: 12 }, () => ({ emotion: 'sad', listenDuration: 60 })));
  fake.seedJson('profile:mh-many', { totalLikes: 100 });
  const many = await jsonBody(await request(app, `${P}/mheart/mh-many`));
  assertEquals(many.mheart.totalSessions, 12);
  assertEquals(many.mheart.rarity, 8);

  fake.kvDown = true;
  const down = await request(app, `${P}/mheart/mh-user`);
  fake.kvDown = false;
  assertEquals(down.status, 500);
});

// ============================================================
// Space-Time
// ============================================================

Deno.test('spacetime: 留言创建/列表/错误', async () => {
  const anonymous = await request(app, `${P}/spacetime/messages`, {
    body: { content: 'hello' },
  });
  assertEquals(anonymous.status, 401);

  const invalid = await request(app, `${P}/spacetime/messages`, {
    token: auth('st-user'),
    body: { content: '' },
  });
  assertEquals(invalid.status, 400);

  const ok = await request(app, `${P}/spacetime/messages`, {
    token: auth('st-user'),
    body: { content: 'hello world', userName: 'ST', emotion: 'happy' },
  });
  assertEquals(ok.status, 200);
  const message = (await jsonBody(ok)).message;
  assertMatch(message.id, /^stm-/);
  assertEquals(message.status, 'active');
  assertEquals(fake.readJson('spacetime:messages').length, 1);

  const scheduled = await request(app, `${P}/spacetime/messages`, {
    token: auth('st-user'),
    body: { content: 'future', targetTime: new Date(Date.now() + 3600000).toISOString() },
  });
  assertEquals((await jsonBody(scheduled)).message.status, 'scheduled');

  const broken = await request(app, `${P}/spacetime/messages`, {
    token: auth('st-user'),
    body: '{bad',
  });
  assertEquals(broken.status, 500);

  fake.seedJson('spacetime:messages', [
    { id: 'm1', isPublic: true, status: 'active', likes: 0 },
    { id: 'm2', isPublic: false, status: 'active' },
    { id: 'm3', isPublic: true, status: 'scheduled', targetTime: new Date(Date.now() + 3600000).toISOString() },
    { id: 'm4', isPublic: true, status: 'scheduled', targetTime: new Date(Date.now() - 1000).toISOString() },
  ]);
  const list = await request(app, `${P}/spacetime/messages`);
  const messages = (await jsonBody(list)).messages;
  assertEquals(messages.length, 2);
  assertEquals(messages.find((m: any) => m.id === 'm4').status, 'active');

  fake.kvDown = true;
  const down = await request(app, `${P}/spacetime/messages`);
  fake.kvDown = false;
  assertEquals(down.status, 500);
  assertEquals((await jsonBody(down)).messages, []);
});

Deno.test('spacetime: 留言点赞与回复', async () => {
  fake.seedJson('spacetime:messages', [{
    id: 'like-msg', userId: 'author', isPublic: true, status: 'active', likes: 0, likedBy: [], replies: 0,
  }]);

  const noBody = await request(app, `${P}/spacetime/messages/like-msg/like`, { method: 'POST' });
  assertEquals(noBody.status, 500);

  const notFound = await request(app, `${P}/spacetime/messages/nope/like`, {
    body: { userId: 'u1' },
  });
  assertEquals(notFound.status, 404);

  const liked = await request(app, `${P}/spacetime/messages/like-msg/like`, {
    body: { userId: 'u1' },
  });
  const likedBody = await jsonBody(liked);
  assertEquals(likedBody.likes, 1);
  assertEquals(likedBody.liked, true);

  const unliked = await request(app, `${P}/spacetime/messages/like-msg/like`, {
    body: { userId: 'u1' },
  });
  assertEquals((await jsonBody(unliked)).likes, 0);

  const anonymous = await request(app, `${P}/spacetime/messages/like-msg/like`, { body: {} });
  const anonymousBody = await jsonBody(anonymous);
  assertEquals(anonymousBody.likes, 1);
  assertEquals(anonymousBody.liked, false);

  const invalidReply = await request(app, `${P}/spacetime/messages/like-msg/reply`, {
    body: { content: '' },
  });
  assertEquals(invalidReply.status, 400);

  const reply = await request(app, `${P}/spacetime/messages/like-msg/reply`, {
    body: { content: 'reply text', userName: 'R' },
  });
  assertEquals(reply.status, 200);
  assertMatch((await jsonBody(reply)).reply.id, /^str-/);
  const stored = fake.readJson('spacetime:messages').find((m: any) => m.id === 'like-msg');
  assertEquals(stored.replies, 1);

  const orphanReply = await request(app, `${P}/spacetime/messages/orphan/reply`, {
    body: { content: 'orphan' },
  });
  assertEquals(orphanReply.status, 200);

  const replies = await request(app, `${P}/spacetime/messages/like-msg/replies`);
  assertEquals((await jsonBody(replies)).replies.length, 1);

  fake.kvDown = true;
  const downLike = await request(app, `${P}/spacetime/messages/like-msg/like`, {
    body: { userId: 'u1' },
  });
  const downReply = await request(app, `${P}/spacetime/messages/like-msg/reply`, {
    body: { content: 'x' },
  });
  const downReplies = await request(app, `${P}/spacetime/messages/like-msg/replies`);
  fake.kvDown = false;
  assertEquals(downLike.status, 500);
  assertEquals(downReply.status, 500);
  assertEquals(downReplies.status, 500);
});

Deno.test('spacetime: 时间胶囊创建/解锁/点赞', async () => {
  const anonymous = await request(app, `${P}/spacetime/capsules`, {
    body: { title: 'T', content: 'C', unlockAt: '2030-01-01' },
  });
  assertEquals(anonymous.status, 401);

  const invalid = await request(app, `${P}/spacetime/capsules`, {
    token: auth('cap-user'),
    body: { title: 'T', content: 'C' },
  });
  assertEquals(invalid.status, 400);

  const badDate = await request(app, `${P}/spacetime/capsules`, {
    token: auth('cap-user'),
    body: { title: 'T', content: 'C', unlockAt: 'not-a-date' },
  });
  assertEquals(badDate.status, 400);

  const plain = await request(app, `${P}/spacetime/capsules`, {
    token: auth('cap-user'),
    body: { title: 'Plain', content: 'secret', unlockAt: '2030-01-01', recipientName: 'R' },
  });
  assertEquals(plain.status, 200);
  const plainCapsule = (await jsonBody(plain)).capsule;
  assertEquals(plainCapsule.content, 'secret');
  assertEquals(plainCapsule.isUnlocked, false);

  const encrypted = await request(app, `${P}/spacetime/capsules`, {
    token: auth('cap-user'),
    body: {
      title: 'Encrypted', content: 'cipher-holder', unlockAt: '2030-01-01',
      encrypted: true, encryptedContent: 'cipher', encryptedSessionKey: 'key',
      encryptionIv: 'iv', senderFingerprint: 'fp', recipientUserId: 'target',
    },
  });
  const encryptedCapsule = (await jsonBody(encrypted)).capsule;
  assertEquals(encryptedCapsule.content, '[E2EE Encrypted]');
  assertEquals(encryptedCapsule.encrypted, true);
  assertEquals(encryptedCapsule.recipientUserId, 'target');

  fake.seedJson('spacetime:capsules', [
    { id: 'c-old', isUnlocked: false, unlockTs: Date.now() - 1000, likes: 0 },
    { id: 'c-new', isUnlocked: false, unlockTs: Date.now() + 1000_000, likes: 0 },
  ]);
  const list = await request(app, `${P}/spacetime/capsules`);
  const capsules = (await jsonBody(list)).capsules;
  assertEquals(capsules.find((c: any) => c.id === 'c-old').isUnlocked, true);
  assertEquals(capsules.find((c: any) => c.id === 'c-new').isUnlocked, false);

  const missingLike = await request(app, `${P}/spacetime/capsules/nope/like`, { method: 'POST' });
  assertEquals(missingLike.status, 404);
  const liked = await request(app, `${P}/spacetime/capsules/c-old/like`, { method: 'POST' });
  assertEquals((await jsonBody(liked)).likes, 1);

  fake.kvDown = true;
  const downList = await request(app, `${P}/spacetime/capsules`);
  const downLike = await request(app, `${P}/spacetime/capsules/c-old/like`, { method: 'POST' });
  fake.kvDown = false;
  assertEquals(downList.status, 500);
  assertEquals(downLike.status, 500);
});

Deno.test('spacetime: nearby 地理位置过滤', async () => {
  const empty = await request(app, `${P}/spacetime/messages/nearby`);
  assertEquals((await jsonBody(empty)).messages, []);

  fake.seedJson('spacetime:messages', [
    { id: 'near', targetLocation: { lat: 31.21, lng: 121.51 } },
    { id: 'far', targetLocation: { lat: 40.0, lng: 116.0 } },
    { id: 'no-loc' },
    { id: 'zero', targetLocation: { lat: 0, lng: 0 } },
  ]);
  const res = await request(app, `${P}/spacetime/messages/nearby?lat=31.2&lng=121.5&radius=10`);
  const messages = (await jsonBody(res)).messages;
  assertEquals(messages.length, 1);
  assertEquals(messages[0].id, 'near');
  assert(messages[0].distance < 10);

  fake.kvDown = true;
  const down = await request(app, `${P}/spacetime/messages/nearby?lat=31.2&lng=121.5`);
  fake.kvDown = false;
  assertEquals(down.status, 500);
});

Deno.test('spacetime: 语音上传与签名 URL', async () => {
  const missing = await request(app, `${P}/voice/upload`, { body: {} });
  assertEquals(missing.status, 400);

  const ok = await request(app, `${P}/voice/upload`, {
    body: { userId: 'voice-user', audioBase64: 'data:audio/mp4;base64,AAAA', mimeType: 'audio/mp4' },
  });
  assertEquals(ok.status, 200);
  const body = await jsonBody(ok);
  assertEquals(body.success, true);
  assertMatch(body.filePath, /^voice-user\/.+\.mp4$/);
  assert(body.signedUrl);
  assert(fake.buckets.has('make-f626b673-voice'));

  const noPrefix = await request(app, `${P}/voice/upload`, {
    body: { userId: 'voice-user', audioBase64: 'AAAA' },
  });
  assertMatch((await jsonBody(noPrefix)).filePath, /\.webm$/);

  const badBase64 = await request(app, `${P}/voice/upload`, {
    body: { userId: 'voice-user', audioBase64: '%%%' },
  });
  assertEquals(badBase64.status, 500);

  fake.uploadError = 'upload exploded';
  const uploadFail = await request(app, `${P}/voice/upload`, {
    body: { userId: 'voice-user', audioBase64: 'AAAA' },
  });
  fake.uploadError = null;
  assertEquals(uploadFail.status, 500);
  assertMatch((await jsonBody(uploadFail)).error, /Upload failed/);

  fake.signError = 'sign exploded';
  const signFail = await request(app, `${P}/voice/upload`, {
    body: { userId: 'voice-user', audioBase64: 'AAAA' },
  });
  const signUrlFail = await request(app, `${P}/voice/url?path=a.webm`);
  fake.signError = null;
  assertEquals(signFail.status, 500);
  assertEquals(signUrlFail.status, 500);

  const noPath = await request(app, `${P}/voice/url`);
  assertEquals(noPath.status, 400);
  const url = await request(app, `${P}/voice/url?path=a.webm`);
  assertEquals(url.status, 200);
  assert((await jsonBody(url)).signedUrl);

  fake.storageDown = true;
  const downUpload = await request(app, `${P}/voice/upload`, {
    body: { userId: 'voice-user', audioBase64: 'AAAA' },
  });
  const downUrl = await request(app, `${P}/voice/url?path=a.webm`);
  fake.storageDown = false;
  assertEquals(downUpload.status, 500);
  assertEquals(downUrl.status, 500);

  const broken = await request(app, `${P}/voice/upload`, { body: '{bad' });
  assertEquals(broken.status, 500);
});

Deno.test('spacetime: STT 代理（本地服务成功/失败/异常）', async () => {
  const missing = await request(spacetimeApp, `${P}/stt/transcribe`, { body: {} });
  assertEquals(missing.status, 400);
  assertEquals((await jsonBody(missing)).error, 'audioBase64 required');

  Deno.env.set('DMUSIC_LOCAL_API', 'http://local.stt');
  fake.localSttOk = true;
  fake.localSttBody = { text: 'local text', segments: [{ start: 0, end: 1, text: 'x' }] };
  const ok = await request(spacetimeApp, `${P}/stt/transcribe`, {
    body: { audioBase64: 'AAAA', language: 'zh' },
  });
  assertEquals(ok.status, 200);
  assertEquals((await jsonBody(ok)).text, 'local text');

  fake.localSttOk = false;
  const down = await request(spacetimeApp, `${P}/stt/transcribe`, {
    body: { audioBase64: 'AAAA' },
  });
  assertEquals(down.status, 200);
  assertMatch((await jsonBody(down)).message, /not configured/);

  fake.localSttThrow = true;
  const threw = await request(spacetimeApp, `${P}/stt/transcribe`, {
    body: { audioBase64: 'AAAA' },
  });
  fake.localSttThrow = false;
  assertEquals(threw.status, 200);
  assertEquals((await jsonBody(threw)).text, '');

  Deno.env.delete('DMUSIC_LOCAL_API');
  const notConfigured = await request(spacetimeApp, `${P}/stt/transcribe`, {
    body: { audioBase64: 'AAAA' },
  });
  assertMatch((await jsonBody(notConfigured)).message, /not configured/);

  const broken = await request(spacetimeApp, `${P}/stt/transcribe`, { body: '{bad' });
  assertEquals(broken.status, 500);
});

// ============================================================
// Challenges
// ============================================================

Deno.test('challenge: active 创建与复用', async () => {
  fake.kv.delete('challenges:active');
  queryCache.clear();
  const first = await request(app, `${P}/challenges/active`);
  assertEquals(first.status, 200);
  const firstBody = await jsonBody(first);
  assertMatch(firstBody.challenge.id, /^challenge-\d+$/);
  assertEquals(firstBody.challenge.entryCount, 0);
  assertEquals(firstBody.autoFinalizeResult, null);

  const second = await request(app, `${P}/challenges/active`);
  assertEquals((await jsonBody(second)).challenge.id, firstBody.challenge.id);

  fake.kvDown = true;
  const down = await request(app, `${P}/challenges/active`);
  fake.kvDown = false;
  assertEquals(down.status, 500);
});

Deno.test('challenge: 过期自动结算', async () => {
  fake.seedJson('challenges:active', {
    id: 'challenge-old', titleZh: '旧挑战', titleEn: 'Old', endsAt: Date.now() - 1000, tags: ['t'],
  });
  fake.seedJson('challenges:entries:challenge-old', [
    { id: 'e1', userId: 'sp-a', userName: 'A', workTitle: 'W1', judgeScore: 80, communityVotes: 3 },
    { id: 'e2', userId: 'sp-b', userName: 'B', workTitle: 'W2', judgeScore: 70, communityVotes: 1 },
  ]);
  fake.seed('user:sp-a:starpower', '0');
  fake.seed('user:sp-b:starpower', '0');

  const res = await request(app, `${P}/challenges/active`);
  const body = await jsonBody(res);
  assertEquals(body.autoFinalizeResult.finalized, true);
  assertEquals(body.autoFinalizeResult.winner.userName, 'A');
  assertEquals(body.autoFinalizeResult.totalEntries, 2);
  assert(body.challenge.id !== 'challenge-old');
  assertEquals(fake.read('user:sp-a:starpower'), '500');
  assertEquals(fake.read('user:sp-b:starpower'), '300');
  assertEquals(fake.readJson('challenges:champions').length, 1);
  assertEquals(fake.readJson('challenge-notifications:challenge-old').length, 2);

  // 过期但没有作品：不结算
  fake.seedJson('challenges:active', {
    id: 'challenge-empty', titleZh: '空', titleEn: 'Empty', endsAt: Date.now() - 1000,
  });
  fake.seedJson('challenges:entries:challenge-empty', []);
  const emptyRes = await jsonBody(await request(app, `${P}/challenges/active`));
  assertEquals(emptyRes.autoFinalizeResult, null);
  assert(emptyRes.challenge.id !== 'challenge-empty');
});

Deno.test('challenge: submit 校验/AI 评分/重复提交', async () => {
  const anonymous = await request(app, `${P}/challenges/c1/submit`, {
    body: { userId: 'u', workTitle: 'W' },
  });
  assertEquals(anonymous.status, 401);

  const invalid = await request(app, `${P}/challenges/c1/submit`, {
    token: auth('sub-user'),
    body: { userId: 'sub-user' },
  });
  assertEquals(invalid.status, 400);

  fake.seedJson('challenges:entries:c1', []);
  const ok = await request(app, `${P}/challenges/c1/submit`, {
    token: auth('sub-user'),
    body: { userId: 'sub-user', userName: 'Sub', workTitle: 'My Song', workLyrics: ['line'], workTheme: 'happy' },
  });
  assertEquals(ok.status, 200);
  const entry = (await jsonBody(ok)).entry;
  assertMatch(entry.id, /^entry-/);
  assertEquals(entry.aiProvider, 'template');
  assert(entry.judgeScore > 0);
  assertEquals(fake.readJson('challenges:entries:c1').length, 1);
  assertEquals(fake.readJson('achievements:stats:sub-user').challengesEntered, 1);

  const dup = await request(app, `${P}/challenges/c1/submit`, {
    token: auth('sub-user'),
    body: { userId: 'sub-user', workTitle: 'Again' },
  });
  assertEquals(dup.status, 400);
  assertEquals((await jsonBody(dup)).alreadySubmitted, true);

  const broken = await request(app, `${P}/challenges/c1/submit`, {
    token: auth('sub-user'),
    body: '{bad',
  });
  assertEquals(broken.status, 500);
});

Deno.test('challenge: entries/vote/champions/notifications', async () => {
  fake.seedJson('challenges:entries:c2', [
    { id: 'e-a', userId: 'ua', userName: 'A', judgeScore: 60, communityVotes: 0, workTitle: 'A' },
    { id: 'e-b', userId: 'ub', userName: 'B', judgeScore: 90, communityVotes: 5, workTitle: 'B' },
  ]);
  const entries = await jsonBody(await request(app, `${P}/challenges/c2/entries`));
  assertEquals(entries.entries[0].id, 'e-b');
  assertEquals(entries.entries[0].communityScoreNorm, 100);

  const anonymous = await request(app, `${P}/challenges/c2/vote`, {
    body: { userId: 'v1', entryId: 'e-a' },
  });
  assertEquals(anonymous.status, 401);

  const invalid = await request(app, `${P}/challenges/c2/vote`, {
    token: auth('v1'),
    body: {},
  });
  assertEquals(invalid.status, 400);

  const vote = await request(app, `${P}/challenges/c2/vote`, {
    token: auth('v1'),
    body: { userId: 'v1', entryId: 'e-a' },
  });
  assertEquals(vote.status, 200);
  assertEquals((await jsonBody(vote)).votes, 1);

  const dupVote = await request(app, `${P}/challenges/c2/vote`, {
    token: auth('v1'),
    body: { userId: 'v1', entryId: 'e-a' },
  });
  assertEquals(dupVote.status, 400);

  const missingEntry = await request(app, `${P}/challenges/c2/vote`, {
    token: auth('v2'),
    body: { userId: 'v2', entryId: 'nope' },
  });
  assertEquals(missingEntry.status, 404);

  fake.seedJson('challenges:champions', [{
    challengeId: 'c2', challengeTitle: { zh: 'X', en: 'X' },
    winner: { userName: 'B' }, totalEntries: 2, finalizedAt: 1,
  }]);
  fake.seedJson('challenge-notifications:c2', [
    { userId: 'ua', rank: 2, spAwarded: 300, isWinner: false },
    { userId: 'ub', rank: 1, spAwarded: 500, isWinner: true },
  ]);
  const champions = await request(app, `${P}/challenges/champions`);
  assertEquals((await jsonBody(champions)).champions.length, 1);

  const notifs = await request(app, `${P}/challenges/notifications/ub`);
  assertEquals((await jsonBody(notifs)).notifications.length, 1);
  const noNotifs = await request(app, `${P}/challenges/notifications/none`);
  assertEquals((await jsonBody(noNotifs)).notifications, []);

  fake.kvDown = true;
  const downEntries = await request(app, `${P}/challenges/c2/entries`);
  const downChampions = await request(app, `${P}/challenges/champions`);
  const downNotifs = await request(app, `${P}/challenges/notifications/ub`);
  fake.kvDown = false;
  assertEquals(downEntries.status, 500);
  assertEquals(downChampions.status, 500);
  assertEquals(downNotifs.status, 500);
});

Deno.test('challenge: finalize 无作品/成功/错误', async () => {
  const anonymous = await request(app, `${P}/challenges/c3/finalize`, { method: 'POST' });
  assertEquals(anonymous.status, 401);

  fake.seedJson('challenges:entries:c3', []);
  const empty = await request(app, `${P}/challenges/c3/finalize`, {
    method: 'POST',
    token: auth('fin-user'),
  });
  assertEquals(empty.status, 400);
  assertEquals((await jsonBody(empty)).error, 'No entries to finalize');

  fake.seedJson('challenges:active', { titleZh: '决', titleEn: 'Fin', endsAt: Date.now() + 10000 });
  fake.seedJson('challenges:entries:c3', [
    { id: 'f1', userId: 'fa', userName: 'A', workTitle: 'WA', judgeScore: 88, communityVotes: 2 },
    { id: 'f2', userId: 'fb', userName: 'B', workTitle: 'WB', judgeScore: 70, communityVotes: 1 },
  ]);
  fake.seedJson('challenges:champions', []);
  fake.seed('user:fa:starpower', '10');
  const ok = await request(app, `${P}/challenges/c3/finalize`, {
    method: 'POST',
    token: auth('fin-user'),
  });
  assertEquals(ok.status, 200);
  const body = await jsonBody(ok);
  assertEquals(body.champion.winner.userName, 'A');
  assertEquals(body.champion.challengeTitle.zh, '决');
  assertEquals(fake.read('user:fa:starpower'), '510');
  assertEquals(fake.readJson('challenges:champions').length, 1);
  assertEquals(body.entries[0].totalScore > body.entries[1].totalScore, true);
});

// ============================================================
// Live Session
// ============================================================

Deno.test('live: heartbeat 在线人数与去重', async () => {
  const invalid = await request(app, `${P}/live-session/heartbeat`, { body: {} });
  assertEquals(invalid.status, 400);

  fake.seedJson('live-session:presence', [
    { userId: 'stale', lastSeen: Date.now() - 60000 },
    { userId: 'active', lastSeen: Date.now() },
  ]);
  const first = await request(app, `${P}/live-session/heartbeat`, {
    body: { userId: 'live-1', userName: 'Live', trackId: 't', isPlaying: true },
  });
  assertEquals(first.status, 200);
  assertEquals((await jsonBody(first)).onlineCount, 2);

  const second = await request(app, `${P}/live-session/heartbeat`, {
    body: { userId: 'live-1', userName: 'Live' },
  });
  assertEquals((await jsonBody(second)).onlineCount, 2);

  const other = await request(app, `${P}/live-session/heartbeat`, {
    body: { userId: 'live-2', userName: 'Live2' },
  });
  assertEquals((await jsonBody(other)).onlineCount, 3);

  const broken = await request(app, `${P}/live-session/heartbeat`, { body: '{bad' });
  assertEquals(broken.status, 500);

  fake.kvDown = true;
  const down = await request(app, `${P}/live-session/heartbeat`, {
    body: { userId: 'live-3' },
  });
  fake.kvDown = false;
  assertEquals(down.status, 500);
});

Deno.test('live: leave 与 presence', async () => {
  const invalid = await request(app, `${P}/live-session/leave`, { body: {} });
  assertEquals(invalid.status, 400);

  fake.seedJson('live-session:presence', [
    { userId: 'l1', lastSeen: Date.now() },
    { userId: 'l2', lastSeen: Date.now() - 60000 },
  ]);
  const presence = await request(app, `${P}/live-session/presence`);
  assertEquals((await jsonBody(presence)).listeners.length, 1);

  const leave = await request(app, `${P}/live-session/leave`, { body: { userId: 'l1' } });
  assertEquals(leave.status, 200);
  const remaining = fake.readJson('live-session:presence');
  assertEquals(remaining.length, 1);
  assertEquals(remaining[0].userId, 'l2');

  fake.kvDown = true;
  const downLeave = await request(app, `${P}/live-session/leave`, { body: { userId: 'l1' } });
  const downPresence = await request(app, `${P}/live-session/presence`);
  fake.kvDown = false;
  assertEquals(downLeave.status, 500);
  assertEquals(downPresence.status, 500);
});

Deno.test('live: danmaku 发布/截断/过滤', async () => {
  const invalid = await request(app, `${P}/live-session/danmaku`, { body: {} });
  assertEquals(invalid.status, 400);

  const ok = await request(app, `${P}/live-session/danmaku`, {
    body: { userId: 'dm-user', userName: 'DM', text: 'hello', trackId: 't1' },
  });
  assertEquals(ok.status, 200);
  const msg = (await jsonBody(ok)).message;
  assertMatch(msg.id, /^dm-/);
  assertEquals(msg.color, '#FFD700');

  const old = Array.from({ length: 200 }, (_, i) => ({
    id: `old${i}`, userId: 'u', timestamp: Date.now() - 120000,
  }));
  fake.seedJson('live-session:danmaku', old);
  const trimmed = await request(app, `${P}/live-session/danmaku`, {
    body: { userId: 'dm-user', text: 'new' },
  });
  assertEquals((await jsonBody(trimmed)).message.text, 'new');
  assertEquals(fake.readJson('live-session:danmaku').length, 200);

  const list = await request(app, `${P}/live-session/danmaku`);
  const messages = (await jsonBody(list)).messages;
  assertEquals(messages.length, 1);
  assertEquals(messages[0].text, 'new');

  fake.kvDown = true;
  const downPost = await request(app, `${P}/live-session/danmaku`, {
    body: { userId: 'dm-user', text: 'down' },
  });
  const downGet = await request(app, `${P}/live-session/danmaku`);
  fake.kvDown = false;
  assertEquals(downPost.status, 500);
  assertEquals(downGet.status, 500);
});
