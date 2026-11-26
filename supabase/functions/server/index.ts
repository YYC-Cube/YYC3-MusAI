/**
 * D-Music Server — Runtime Entry
 *
 * 仅负责：HTTP serve、WebSocket 实时通道、优雅停机。
 * 应用组装见 app.ts（可被测试直接 import，不监听端口）。
 */

import { serve } from "@hono/node-server";
import { createRequire } from "node:module";
import { app } from "./app.ts";
import { closePool } from "./services/db.ts";
import { closeKvPool } from "./services/kv_store_pg.ts";
import { verifyAccessToken } from "./services/auth.ts";

const port = Number(process.env.PORT ?? 8080);
const hostname = process.env.HOST ?? '0.0.0.0';

// 启动守卫（W8-P0-2）：JWT_SECRET 缺失 = 注册/登录/会话全部不可用，fail-fast
if (!process.env.JWT_SECRET) {
  console.error('[boot] 环境变量 JWT_SECRET 未配置——鉴权不可用。生成：openssl rand -hex 32');
  process.exit(1);
}

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
  // Deno 运行时下 createRequire 加载 CJS 包会误判为 ESM（"require is not defined"），
  // 优先走 ESM 动态导入；Node 运行时回退到 createRequire。（联调实测缺陷修复 2026-11-21）
  let WebSocketServer: typeof import('ws').WebSocketServer;
  try {
    ({ WebSocketServer } = await import('ws'));
  } catch {
    const require = createRequire(import.meta.url);
    ({ WebSocketServer } = require('ws'));
  }
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
    const roomOwner = new Map<string, string | null>();
    roomOwner.set(room, userId);
    const join = (next: string) => {
      rooms.get(room)?.delete(socket);
      room = next.slice(0, 64) || 'lobby';
      if (!rooms.has(room)) rooms.set(room, new Set());
      rooms.get(room)!.add(socket);
    };
    join(room);
    socket.send(JSON.stringify({ type: 'welcome', room, userId }));

    const lastMessageAt = new Map<string, number>();
    const isModerator = (uid: string | null) => uid === roomOwner.get(room) || uid === 'admin';

    const broadcast = (payload: any, targetRoom = room) => {
      const str = JSON.stringify(payload);
      for (const peer of rooms.get(targetRoom) ?? []) {
        if (peer.readyState === 1) peer.send(str);
      }
    };

    const sendToSelf = (payload: any) => {
      if (socket.readyState === 1) socket.send(JSON.stringify(payload));
    };

    // 敏感词过滤（简化版，生产可接入专业过滤库）
    const SENSITIVE = /(色情|赌博|枪支|毒品|自杀|炸弹)/i;
    const isSensitive = (text: string) => SENSITIVE.test(text);

    socket.on('message', (raw: any) => {
      let msg: any;
      try { msg = JSON.parse(String(raw)); } catch { return; }

      if (msg.type === 'join' && typeof msg.room === 'string') {
        join(msg.room);
        roomOwner.set(room, userId);
        socket.send(JSON.stringify({ type: 'joined', room }));
        // 同步房间在线人数
        broadcast({ type: 'viewer_count', room, count: (rooms.get(room) as Set<any> | undefined)?.size ?? 0 }, room);
        return;
      }
      if (msg.type === 'ping') {
        socket.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
        return;
      }
      if (msg.type === 'get_room') {
        sendToSelf({ type: 'room_info', room, userId, count: (rooms.get(room) as Set<any> | undefined)?.size ?? 0 });
        return;
      }
      if (msg.type === 'danmaku') {
        const text = String(msg.text ?? '').slice(0, 200);
        if (!text) return;
        const now = Date.now();
        const last = lastMessageAt.get(userId ?? '') ?? 0;
        if (now - last < 1000) return; // 频率限制：1 条/秒
        lastMessageAt.set(userId ?? '', now);
        if (isSensitive(text)) {
          sendToSelf({ type: 'moderated', reason: 'sensitive_content' });
          return;
        }
        const payload = {
          type: 'danmaku',
          room,
          text,
          user: userId ?? null,
          ts: Date.now(),
        };
        for (const peer of rooms.get(room) ?? []) {
          if (peer.readyState === 1) peer.send(JSON.stringify(payload));
        }
        return;
      }
      if (msg.type === 'emoji') {
        const emoji = String(msg.emoji ?? '').slice(0, 10);
        if (!emoji) return;
        const now = Date.now();
        const last = lastMessageAt.get(userId ?? '') ?? 0;
        if (now - last < 1000) return;
        lastMessageAt.set(userId ?? '', now);
        const payload = {
          type: 'emoji',
          room,
          emoji,
          user: userId ?? null,
          ts: Date.now(),
        };
        for (const peer of rooms.get(room) ?? []) {
          if (peer.readyState === 1) peer.send(JSON.stringify(payload));
        }
        return;
      }
      if (msg.type === 'gift') {
        const giftId = String(msg.giftId ?? '').slice(0, 32);
        const count = Math.max(1, Math.min(100, Number(msg.count) || 1));
        if (!giftId) return;
        const payload = {
          type: 'gift',
          room,
          giftId,
          count,
          user: userId ?? null,
          ts: Date.now(),
        };
        for (const peer of rooms.get(room) ?? []) {
          if (peer.readyState === 1) peer.send(JSON.stringify(payload));
        }
        return;
      }
      if (msg.type === 'moderate') {
        if (!isModerator(userId)) {
          sendToSelf({ type: 'moderated', reason: 'not_moderator' });
          return;
        }
        const targetUser = String(msg.targetUser ?? '');
        const action = String(msg.action ?? ''); // 'mute' | 'unmute' | 'kick' | 'delete'
        const payload = {
          type: 'moderation',
          room,
          action,
          targetUser,
          moderator: userId ?? null,
          ts: Date.now(),
        };
        if (action === 'kick') {
          for (const peer of rooms.get(room) ?? []) {
            if (peer.readyState === 1) peer.send(JSON.stringify(payload));
          }
        }
        for (const peer of rooms.get(room) ?? []) {
          if (peer.readyState === 1) peer.send(JSON.stringify(payload));
        }
        return;
      }
      if (msg.type === 'viewer_count_request') {
        broadcast({ type: 'viewer_count', room, count: (rooms.get(room) as Set<any> | undefined)?.size ?? 0 }, room);
        return;
      }
    });

    socket.on('close', () => {
      rooms.get(room)?.delete(socket);
      broadcast({ type: 'viewer_count', room, count: (rooms.get(room) as Set<any> | undefined)?.size ?? 0 }, room);
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
