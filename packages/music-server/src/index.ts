/**
 * D-Music Server — Runtime Entry
 *
 * 仅负责：HTTP serve、WebSocket 实时通道、优雅停机。
 * 应用组装见 app.ts（可被测试直接 import，不监听端口）。
 */

import { serve } from "@hono/node-server";
import { createRequire } from "node:module";
import { app } from "./app.ts";
import { closePool } from "./db.ts";
import { closeKvPool } from "./kv_store_pg.ts";
import { verifyAccessToken } from "./auth.ts";

const port = Number(process.env.PORT ?? 8080);
const hostname = process.env.HOST ?? '0.0.0.0';

const server = serve({ fetch: app.fetch, port, hostname }, (info) => {
  console.log(`[Server] YYC³ MusAI API listening on http://${info.address}:${info.port}`);
});

// ==========================================
// WebSocket 实时通道（/ws/live）
// 默认要求 ?token=<JWT>；本地可用 WS_ALLOW_ANONYMOUS=1 放开
// 依赖 ws；缺失时自动降级（HTTP 轮询仍可用）
// ==========================================
const wsRequireAuth = process.env.WS_ALLOW_ANONYMOUS !== '1';
let wssRef: any = null;

try {
  const require = createRequire(import.meta.url);
  const { WebSocketServer } = require('ws');
  const wss = new WebSocketServer({
    server: server as any,
    path: '/ws/live',
    verifyClient: (info: any, cb: any) => {
      if (!wsRequireAuth) return cb(true);
      try {
        const token = new URL(info.req.url ?? '', 'http://localhost').searchParams.get('token') ?? '';
        if (!token) return cb(false, 401, 'token required');
        verifyAccessToken(token)
          .then((user) => cb(!!user, user ? undefined : 401, user ? undefined : 'unauthorized'))
          .catch(() => cb(false, 401, 'unauthorized'));
      } catch {
        cb(false, 401, 'unauthorized');
      }
      return undefined;
    },
  });
  const rooms = new Map<string, Set<any>>();
  wssRef = wss;

  wss.on('connection', async (socket: any, req: any) => {
    let userId: string | null = null;
    if (wsRequireAuth) {
      const token = new URL(req.url ?? '', 'http://localhost').searchParams.get('token') ?? '';
      const user = await verifyAccessToken(token);
      if (!user) {
        socket.close(4001, 'unauthorized');
        return;
      }
      userId = user.id;
    }

    let room = 'lobby';
    const join = (next: string) => {
      rooms.get(room)?.delete(socket);
      room = next.slice(0, 64) || 'lobby';
      if (!rooms.has(room)) rooms.set(room, new Set());
      rooms.get(room)!.add(socket);
    };
    join(room);
    socket.send(JSON.stringify({ type: 'welcome', room, userId }));

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
          user: userId ?? null,
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

  console.log(`[WS] WebSocket server ready at /ws/live (auth=${wsRequireAuth ? 'jwt' : 'anonymous'})`);
} catch (error) {
  console.warn('[WS] disabled (ws 未安装):', error instanceof Error ? error.message : error);
}

// 优雅停机：停止接收新请求 → 关闭 WS/连接池 → 退出（10s 兜底强退）
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
