/**
 * D-Music Server — Application（不监听端口，可被测试直接 import）
 *
 * index.ts 仅负责 serve / WebSocket / 优雅停机；本文件只组装 Hono app。
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { apiError, ERROR_CODES } from "./services/api-contract.ts";
import { recordRequest, renderMetrics } from "./services/metrics.ts";

import { registerAuthRoutes } from "./routes/routes-auth.ts";
import { registerMusicRoutes } from "./routes/routes-music.ts";
import { registerStarpowerRoutes } from "./routes/routes-starpower.ts";
import { registerUserRoutes } from "./routes/routes-user.ts";
import { registerCommunityRoutes } from "./routes/routes-community.ts";
import { registerAiRoutes } from "./routes/routes-ai.ts";
import { registerAnalyticsRoutes } from "./routes/routes-analytics.ts";
import { registerSocialRoutes } from "./routes/routes-social.ts";
import { registerSpacetimeRoutes } from "./routes/routes-spacetime.ts";
import { registerChallengeRoutes } from "./routes/routes-challenge.ts";
import { registerLiveSessionRoutes } from "./routes/routes-live.ts";
import { registerAlbumRoutes } from "./routes/routes-albums.ts";
import { registerPkiRoutes } from "./routes/routes-pki.ts";
import { registerMarketRoutes } from "./routes/routes-market.ts";
import { registerDiagnosticsRoutes } from "./routes/routes-diagnostics.ts";
import { registerUploadRoutes } from "./routes/routes-upload.ts";
import { registerPlaylistRoutes } from "./routes/routes-playlist.ts";
import { registerFollowRoutes } from "./routes/routes-follow.ts";
import { registerLiveStreamRoutes } from "./routes/routes-livestream.ts";

const app = new Hono();

// A4：统一 404 / 未捕获异常的错误体
app.notFound((c) =>
  apiError(c, 404, `Route not found: ${c.req.method} ${new URL(c.req.url).pathname}`, undefined, ERROR_CODES.NOT_FOUND),
);
app.onError((err, c) => {
  console.error(`[Server] Unhandled error on ${c.req.method} ${new URL(c.req.url).pathname}:`, err);
  return apiError(c, 500, 'Internal server error', { detail: String(err) }, ERROR_CODES.INTERNAL);
});

app.use('*', logger(console.log));

// 指标采集（在响应后计数）
app.use('*', async (c, next) => {
  await next();
  recordRequest(c.req.method, c.res.status);
});

// ==========================================
// CORS：显式白名单（CORS_ORIGIN，逗号分隔）+ 本机开发地址
// ==========================================
const readAllowedOrigins = (): string[] =>
  (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

function isLocalOrigin(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

app.use(
  "/*",
  cors({
    origin: (origin: string) => {
      if (!origin) return '*';
      if (isLocalOrigin(origin)) return origin;
      if (readAllowedOrigins().includes(origin)) return origin;
      console.log(`[CORS] blocked origin: ${origin}`);
      return '';
    },
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length", "Content-Range", "Accept-Ranges"],
    maxAge: 600,
  }),
);

// ==========================================
// 存活探针（供 Docker / 网关直接使用，不经过 ROUTE_PREFIX）
// ==========================================
const startedAt = Date.now();

app.get('/health', (c) =>
  c.json({
    status: 'ok',
    service: 'musai-server',
    version: process.env.APP_VERSION ?? '11.3.0',
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
  }),
);

// Prometheus 指标（配置 METRICS_TOKEN 后需 Bearer 鉴权）
app.get('/metrics', (c) => {
  const token = process.env.METRICS_TOKEN;
  if (token) {
    const auth = c.req.header('authorization') ?? '';
    if (auth !== `Bearer ${token}`) {
      return apiError(c, 401, 'Unauthorized', undefined, ERROR_CODES.UNAUTHORIZED);
    }
  }
  c.header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  return c.body(renderMetrics());
});

// ==========================================
// Register all route modules
// ==========================================
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
registerPlaylistRoutes(app);
registerFollowRoutes(app);
registerLiveStreamRoutes(app);

export { app };
