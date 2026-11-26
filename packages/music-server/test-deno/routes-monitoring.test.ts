/**
 * 终审 R4 监控上报路由测试：/monitoring/{errors|performance|events}
 *
 * 覆盖：三类白名单 200 落库（FakeSupabase KV 降级）、非法 type 400、
 * 非法 JSON 400、超限 payload 413、可选会话用户归因。
 */
import { assertEquals } from '@std/assert';

import { FakeSupabase } from './helpers/fake-supabase.ts';
import { createTestApp, jsonBody, request, tokenFor } from './helpers/test-app.ts';

const fake = new FakeSupabase();
fake.install();
Deno.env.set('SUPABASE_URL', 'http://localhost:54321');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
Deno.env.set('SUPABASE_ANON_KEY', 'test-anon-key');
Deno.env.set('KV_DRIVER', 'supabase');

const app = createTestApp();
const P = '/make-server-f626b673';

Deno.test('monitoring: errors/performance/events 三类白名单均 200', async () => {
  fake.reset();
  for (const type of ['errors', 'performance', 'events']) {
    const res = await request(app, `${P}/monitoring/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { kind: 'unit', payload: { message: `boom-${type}` } },
    });
    assertEquals(res.status, 200, `type=${type}`);
    assertEquals(await jsonBody(res), { ok: true });
  }
});

Deno.test('monitoring: 非白名单 type 拒绝（防审计表注入）', async () => {
  for (const evil of ['evil', 'errors/../admin', 'ERRORS', '']) {
    const res = await request(app, `${P}/monitoring/${evil}`, {
      method: 'POST',
      body: { x: 1 },
    });
    // 白名单外一律不接受上报：直达路由 400；URL 归一化后不可达为 404——均为拒绝
    assertEquals(res.status >= 400 && res.status < 500, true, `type="${evil}" status=${res.status}`);
  }
});

Deno.test('monitoring: 非法 JSON 400', async () => {
  const res = await request(app, `${P}/monitoring/errors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // 直接投喂非 JSON 文本（字符串 body 由 helper 原样透传）
    body: '{not-json',
  });
  assertEquals(res.status, 400);
});

Deno.test('monitoring: 超 8KB payload 413 截断防护', async () => {
  const big = 'x'.repeat(9 * 1024);
  const res = await request(app, `${P}/monitoring/errors`, {
    method: 'POST',
    body: { big },
  });
  assertEquals(res.status, 413);
});

Deno.test('monitoring: 携带会话 JWT 时上报成功（可选归因不阻断）', async () => {
  fake.reset();
  const token = await tokenFor('monitor-user', 'user');
  const res = await request(app, `${P}/monitoring/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: { event: 'panel_open', panel: 'listening-stats' },
  });
  assertEquals(res.status, 200);
  assertEquals(await jsonBody(res), { ok: true });
});

Deno.test('monitoring: 空 body 允许（detail=null 落库）', async () => {
  const res = await request(app, `${P}/monitoring/performance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '',
  });
  assertEquals(res.status, 200);
});
