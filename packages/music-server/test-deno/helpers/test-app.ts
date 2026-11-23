/**
 * 测试用 Hono app 工厂 + 请求辅助函数。
 * 注册顺序与 src/index.tsx 保持一致（同名路由以先注册者为准）。
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';

// P1b：关系表走内存驱动（DB_DRIVER=memory，见 src/services/db_memory.ts），
// 避免命中本机 PG 真实数据；应用层鉴权依赖 users 表，内存驱动提供离线语义。
Deno.env.set('DB_DRIVER', 'memory');

// 应用层 JWT（auth.ts）签名密钥：未配置时注册/鉴权链路直接 500
Deno.env.set('JWT_SECRET', 'test-jwt-secret');

import { registerAuthRoutes } from '../../src/routes/routes-auth.ts';
import { registerMusicRoutes } from '../../src/routes/routes-music.ts';
import { registerStarpowerRoutes } from '../../src/routes/routes-starpower.ts';
import { registerUserRoutes } from '../../src/routes/routes-user.ts';
import { registerCommunityRoutes } from '../../src/routes/routes-community.ts';
import { registerAiRoutes } from '../../src/routes/routes-ai.ts';
import { registerAnalyticsRoutes } from '../../src/routes/routes-analytics.ts';
import { registerSocialRoutes } from '../../src/routes/routes-social.ts';
import { registerSpacetimeRoutes } from '../../src/routes/routes-spacetime.ts';
import { registerChallengeRoutes } from '../../src/routes/routes-challenge.ts';
import { registerLiveSessionRoutes } from '../../src/routes/routes-live.ts';
import { registerAlbumRoutes } from '../../src/routes/routes-albums.ts';
import { registerPkiRoutes } from '../../src/routes/routes-pki.ts';
import { registerMarketRoutes } from '../../src/routes/routes-market.ts';
import { registerDiagnosticsRoutes } from '../../src/routes/routes-diagnostics.ts';
import { registerUploadRoutes } from '../../src/routes/routes-upload.ts';

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

/**
 * 签发真实可验证的访问令牌（应用层 JWT）：
 * 先在内存 users 表确保用户存在（默认 role=user，可传 role 提权），
 * 再经 issueAccessToken 签发并登记 KV 会话（登出可吊销）。
 */
export async function tokenFor(userId: string, role = 'user'): Promise<string> {
  const { upsertUserProfile } = await import('../../src/services/db.ts');
  const { issueAccessToken } = await import('../../src/services/auth.ts');
  const email = `${userId}@example.com`;
  await upsertUserProfile(userId, { email, role });
  const { accessToken } = await issueAccessToken({ userId, email, role });
  return accessToken;
}
