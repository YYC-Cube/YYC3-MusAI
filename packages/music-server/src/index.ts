/**
 * D-Music Server — Entry Point (§2.2 Modularized)
 *
 * All route handlers are organized into domain-specific modules:
 *   routes-auth.ts       — /health, /signup
 *   routes-music.ts      — /likes, /annotations, /play, /comments, /songs
 *   routes-starpower.ts  — /starpower (CRUD, checkin, consume, leaderboard boost, shop)
 *   routes-user.ts       — /profile, /creators, /role, /preferences, /themes, /export, /error-report
 *   routes-community.ts  — /community, /shared-works, /works/fork, /copyright
 *   routes-ai.ts         — /ai/lyrics, /ai/compose
 *   routes-analytics.ts  — /leaderboard, /analytics, /listening-history, /recommendations, /smart-playlist
 *   routes-social.ts     — /achievements, /notifications, /timeline-comments, /fork-tree, /mheart
 *   routes-spacetime.ts  — /spacetime (capsules, messages, location)
 *   routes-challenge.ts  — /challenges (CRUD, submit, finalize, leaderboard)
 *   routes-live.ts       — /live (sessions, presence, danmaku)
 *   routes-albums.ts     — /albums (CRUD, tracks, artwork)
 *   routes-pki.ts        — /pki (certificate management, key exchange)
 *   routes-market.ts     — /market (store, purchase, inventory)
 *   routes-diagnostics.ts— /diagnostics (health checks, performance metrics)
 *   routes-upload.ts     — /upload (file upload, management)
 *
 * Shared utilities in server-utils.ts:
 *   - ROUTE_PREFIX, kv, requireAuth, wilsonScore, song index, shared work helpers
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { createRequire } from "node:module";
import { apiError, ERROR_CODES } from "./api-contract.ts";
import { closePool } from "./db.ts";
import { closeKvPool } from "./kv_store_pg.ts";
import { recordRequest, renderMetrics } from "./metrics.ts";

// §2.2 Route modules
import { registerAuthRoutes } from "./routes-auth.ts";
import { registerMusicRoutes } from "./routes-music.ts";
import { registerStarpowerRoutes } from "./routes-starpower.ts";
import { registerUserRoutes } from "./routes-user.ts";
import { registerCommunityRoutes } from "./routes-community.ts";
import { registerAiRoutes } from "./routes-ai.ts";
import { registerAnalyticsRoutes } from "./routes-analytics.ts";
import { registerSocialRoutes } from "./routes-social.ts";
import { registerSpacetimeRoutes } from "./routes-spacetime.ts";
import { registerChallengeRoutes } from "./routes-challenge.ts";
import { registerLiveSessionRoutes } from "./routes-live.ts";
import { registerAlbumRoutes } from "./routes-albums.ts";
import { registerPkiRoutes } from "./routes-pki.ts";
import { registerMarketRoutes } from "./routes-market.ts";
import { registerDiagnosticsRoutes } from "./routes-diagnostics.ts";
import { registerUploadRoutes } from "./routes-upload.ts";
import { registerPlaylistRoutes } from "./routes-playlist.ts";
import { registerFollowRoutes } from "./routes-follow.ts";

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

// §8.5 — CORS configuration (domain whitelist for security hardening)
app.use(
  "/*",
  cors({
    origin: (origin: string) => {
      // Allow Figma Make proxy domains and local development
      if (!origin) return '*';
      if (
        origin.endsWith('.figma.site') ||
        origin.endsWith('.supabase.co') ||
        origin.startsWith('http://localhost:')
      ) {
        return origin;
      }
      // Fallback: allow with log for auditing (can tighten to reject later)
      console.log(`[CORS] Unrecognized origin: ${origin}`);
      return origin;
    },
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
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
    version: process.env.APP_VERSION ?? '11.2.0',
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
  }),
);

// Prometheus 指标（供抓取；不含业务敏感数据）
app.get('/metrics', (c) => {
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

// ==========================================
// Node 20+ 运行时入口（@hono/node-server）
// ==========================================
const port = Number(process.env.PORT ?? 8080);
const hostname = process.env.HOST ?? '0.0.0.0';

const server = serve({ fetch: app.fetch, port, hostname }, (info) => {
  console.log(`[Server] YYC³ MusAI API listening on http://${info.address}:${info.port}`);
});

// ==========================================
// WebSocket 实时通道（/ws/live）：实时弹幕与在线房间
// 依赖 ws；缺失时自动降级（HTTP 轮询仍可用）
// ==========================================
let wssRef: any = null;
try {
  const require = createRequire(import.meta.url);
  const { WebSocketServer } = require('ws');
  const wss = new WebSocketServer({ server: server as any, path: '/ws/live' });
  const rooms = new Map<string, Set<any>>();
  wssRef = wss;

  wss.on('connection', (socket: any) => {
    let room = 'lobby';
    const join = (next: string) => {
      rooms.get(room)?.delete(socket);
      room = next.slice(0, 64) || 'lobby';
      if (!rooms.has(room)) rooms.set(room, new Set());
      rooms.get(room)!.add(socket);
    };
    join(room);
    socket.send(JSON.stringify({ type: 'welcome', room }));

    socket.on('message', (raw: any) => {
      let msg: any;
      try { msg = JSON.parse(String(raw)); } catch { return; }

      if (msg.type === 'join' && typeof msg.room === 'string') {
        join(msg.room);
        socket.send(JSON.stringify({ type: 'joined', room }));
        return;
      }
      if (msg.type === 'ping') {
        socket.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
        return;
      }
      if (msg.type === 'danmaku') {
        const payload = JSON.stringify({
          type: 'danmaku',
          room,
          text: String(msg.text ?? '').slice(0, 200),
          user: msg.user ?? null,
          ts: Date.now(),
        });
        for (const peer of rooms.get(room) ?? []) {
          if (peer.readyState === 1) peer.send(payload);
        }
      }
    });

    socket.on('close', () => {
      rooms.get(room)?.delete(socket);
    });
  });

  console.log('[WS] WebSocket server ready at /ws/live');
} catch (error) {
  console.warn('[WS] disabled (ws 未安装):', error instanceof Error ? error.message : error);
}

// 优雅停机：停止接收新请求 → 关闭连接池 → 退出（10s 兜底强退）
let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[Server] ${signal} received, shutting down...`);
  setTimeout(() => process.exit(1), 10_000).unref();
  wssRef?.close();
  server.close();
  await Promise.allSettled([closePool(), closeKvPool()]);
  console.log('[Server] Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

export { app };
