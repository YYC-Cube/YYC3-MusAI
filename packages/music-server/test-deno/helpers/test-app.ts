/**
 * 测试用 Hono app 工厂 + 请求辅助函数。
 * 注册顺序与 src/index.tsx 保持一致（同名路由以先注册者为准）。
 */
import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';

import { registerAuthRoutes } from '../../src/routes-auth.ts';
import { registerMusicRoutes } from '../../src/routes-music.ts';
import { registerStarpowerRoutes } from '../../src/routes-starpower.ts';
import { registerUserRoutes } from '../../src/routes-user.ts';
import { registerCommunityRoutes } from '../../src/routes-community.ts';
import { registerAiRoutes } from '../../src/routes-ai.ts';
import { registerAnalyticsRoutes } from '../../src/routes-analytics.ts';
import { registerSocialRoutes } from '../../src/routes-social.ts';
import { registerSpacetimeRoutes } from '../../src/routes-spacetime.ts';
import { registerChallengeRoutes } from '../../src/routes-challenge.ts';
import { registerLiveSessionRoutes } from '../../src/routes-live.ts';
import { registerAlbumRoutes } from '../../src/routes-albums.ts';
import { registerPkiRoutes } from '../../src/routes-pki.ts';
import { registerMarketRoutes } from '../../src/routes-market.ts';
import { registerDiagnosticsRoutes } from '../../src/routes-diagnostics.ts';
import { registerUploadRoutes } from '../../src/routes-upload.ts';

export function createTestApp(): Hono {
  const app = new Hono();
  app.use(
    '/*',
    cors({
      origin: (origin: string) => origin || '*',
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      exposeHeaders: ['Content-Length'],
      maxAge: 600,
    }),
  );

  registerAuthRoutes(app);
  registerMusicRoutes(app);
  registerStarpowerRoutes(app);
  registerUserRoutes(app);
  registerCommunityRoutes(app);
  registerAiRoutes(app);
  registerAnalyticsRoutes(app);
  registerSocialRoutes(app);
  registerSpacetimeRoutes(app);
  registerChallengeRoutes(app);
  registerLiveSessionRoutes(app);
  registerAlbumRoutes(app);
  registerPkiRoutes(app);
  registerMarketRoutes(app);
  registerDiagnosticsRoutes(app);
  registerUploadRoutes(app);

  return app;
}

/**
 * 仅注册 spacetime 路由。
 * 主 app 中 `/stt/transcribe` 已被 routes-ai 先占用，因此需要独立 app 才能覆盖
 * routes-spacetime 内的同名路由实现。
 */
export function createSpacetimeApp(): Hono {
  const app = new Hono();
  registerSpacetimeRoutes(app);
  return app;
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
  headers?: Record<string, string>;
  ip?: string;
}

let ipCounter = 0;

/** 生成唯一 IP，避免限流跨用例互相影响 */
export function nextIp(): string {
  ipCounter += 1;
  return `10.${(ipCounter >> 16) & 255}.${(ipCounter >> 8) & 255}.${ipCounter & 255}`;
}

export function request(app: Hono, path: string, opts: RequestOptions = {}): Promise<Response> {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  let body: string | undefined;
  if (opts.body !== undefined) {
    body = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
    if (typeof opts.body !== 'string' && !headers['content-type'] && !headers['Content-Type']) {
      headers['content-type'] = 'application/json';
    }
  }
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  headers['x-forwarded-for'] = opts.ip ?? nextIp();

  const method = opts.method ?? (body !== undefined ? 'POST' : 'GET');
  return Promise.resolve(app.request(`http://localhost${path}`, { method, headers, body }));
}

export async function jsonBody(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function tokenFor(userId: string): string {
  return `token-${userId}`;
}
