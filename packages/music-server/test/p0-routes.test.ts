/**
 * P0 路由契约测试（Vitest / Node）
 * 覆盖：健康、指标鉴权、CORS 白名单、歌单/关注鉴权、AI 参数校验、统一错误体
 */

process.env.KV_DRIVER = 'memory';
process.env.DB_DISABLED = '1';
process.env.JWT_SECRET = 'test-secret-for-unit-tests';
process.env.CORS_ORIGIN = 'https://musai.yyc3.vip';

import { describe, it, expect, afterAll } from 'vitest';
import { app } from '../src/app.ts';

const P = '/make-server-f626b673';

describe('基础探针与错误体', () => {
  it('GET /health 返回 ok', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('musai-server');
  });

  it('未知路由返回统一 404 错误体', async () => {
    const res = await app.request('/not-exist-route');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('NOT_FOUND');
    expect(typeof body.error).toBe('string');
  });
});

describe('指标端点', () => {
  it('默认可直接抓取', async () => {
    const res = await app.request('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/plain');
    expect(await res.text()).toContain('musai_http_requests_total');
  });

  it('配置 METRICS_TOKEN 后要求 Bearer', async () => {
    process.env.METRICS_TOKEN = 'metrics-secret';
    try {
      const denied = await app.request('/metrics');
      expect(denied.status).toBe(401);
      const ok = await app.request('/metrics', { headers: { Authorization: 'Bearer metrics-secret' } });
      expect(ok.status).toBe(200);
    } finally {
      delete process.env.METRICS_TOKEN;
    }
  });
});

describe('CORS 白名单', () => {
  it('本机来源放行', async () => {
    const res = await app.request('/health', { headers: { Origin: 'http://localhost:3198' } });
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:3198');
  });

  it('白名单来源放行', async () => {
    const res = await app.request('/health', { headers: { Origin: 'https://musai.yyc3.vip' } });
    expect(res.headers.get('access-control-allow-origin')).toBe('https://musai.yyc3.vip');
  });

  it('未知来源不回写 ACAO', async () => {
    const res = await app.request('/health', { headers: { Origin: 'https://evil.example.com' } });
    expect(res.headers.get('access-control-allow-origin')).not.toBe('https://evil.example.com');
  });
});

describe('歌单鉴权与校验', () => {
  it('未登录创建歌单 → 401', async () => {
    const res = await app.request(`${P}/playlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'x' }),
    });
    expect(res.status).toBe(401);
  });

  it('缺少 userId 查询列表 → 400', async () => {
    const res = await app.request(`${P}/playlists`);
    expect(res.status).toBe(400);
  });

  it('未知分享 slug → 404', async () => {
    const res = await app.request(`${P}/playlists/shared/not-exist`);
    expect(res.status).toBe(404);
  });
});

describe('关注鉴权', () => {
  it('未登录关注 → 401', async () => {
    const res = await app.request(`${P}/follow/some-user`, { method: 'POST' });
    expect(res.status).toBe(401);
  });

  it('未登录取关 → 401', async () => {
    const res = await app.request(`${P}/follow/some-user`, { method: 'DELETE' });
    expect(res.status).toBe(401);
  });
});

describe('AI 端点', () => {
  it('chat 空 messages → 400', async () => {
    const res = await app.request(`${P}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [] }),
    });
    expect(res.status).toBe(400);
  });

  it('chat 未配置模型 → 503', async () => {
    const res = await app.request(`${P}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
    });
    expect(res.status).toBe(503);
  });

  it('emotion 缺 workTitle → 400', async () => {
    const res = await app.request(`${P}/ai/emotion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('emotion 合法入参 → 模板评分 200', async () => {
    const res = await app.request(`${P}/ai/emotion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workTitle: '星空', workTheme: 'calm' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.provider).toBe('template');
    expect(typeof body.score).toBe('number');
  });
});

describe('登出', () => {
  it('无 token 登出仍返回成功', async () => {
    const res = await app.request(`${P}/logout`, { method: 'POST' });
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });
});

afterAll(() => {
  delete process.env.METRICS_TOKEN;
});
