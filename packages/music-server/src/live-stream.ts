/**
 * D-Music §2.2 — Live Streaming Routes (W3)
 *
 * 参考 Owncast 的推流/播放模型（仅借鉴架构，不引入代码）：
 *   - 推流端：OBS / FFmpeg → RTMP 推到 MediaMTX / SRS（地址与密钥由运维配置，仅存 env）；
 *   - 拉流端：观众通过 HLS（.m3u8）拉流；本服务只下发播放地址与在线状态；
 *   - 互动端：/live/ws WebSocket 直播间（聊天 + 表情 + 审核 + 房间），KV 持久化。
 *
 * 安全边界：
 *   - 推流密钥等凭据只从环境变量读取，任何响应都不回传密钥本体；
 *   - 服务端出站请求前强制校验目标 URL（http/https，拒绝 localhost/环回/私有/保留地址），
 *     防止把直播探测接口变成内网探测器（SSRF）。
 */

import * as kv from "./kv_store.tsx";
import { ROUTE_PREFIX } from "./server-utils.ts";
import { rateLimit, RATE_STANDARD } from "./rate-limit.ts";
import { validate } from "./validation.ts";
import { z } from "npm:zod@3.24.1";

const P = ROUTE_PREFIX;

// ==========================================
// 房间元数据 KV Key
// ==========================================

const ROOM_META_KEY = "live:room:meta";
const CHAT_HISTORY_KEY = "live:room:chat";

// ==========================================
// SSRF 防护：出站 URL 校验
// ==========================================

/** 保留/私有 IPv4 段（CIDR 起止，按整数比较） */
const PRIVATE_V4_RANGES: Array<[number, number]> = [
  [cidrToRange("0.0.0.0/8")[0], cidrToRange("0.0.0.0/8")[1]],
  [cidrToRange("10.0.0.0/8")[0], cidrToRange("10.0.0.0/8")[1]],
  [cidrToRange("100.64.0.0/10")[0], cidrToRange("100.64.0.0/10")[1]],
  [cidrToRange("127.0.0.0/8")[0], cidrToRange("127.0.0.0/8")[1]],
  [cidrToRange("169.254.0.0/16")[0], cidrToRange("169.254.0.0/16")[1]],
  [cidrToRange("172.16.0.0/12")[0], cidrToRange("172.16.0.0/12")[1]],
  [cidrToRange("192.0.0.0/24")[0], cidrToRange("192.0.0.0/24")[1]],
  [cidrToRange("192.168.0.0/16")[0], cidrToRange("192.168.0.0/16")[1]],
  [cidrToRange("198.18.0.0/15")[0], cidrToRange("198.18.0.0/15")[1]],
  [cidrToRange("224.0.0.0/4")[0], cidrToRange("224.0.0.0/4")[1]],
  [cidrToRange("240.0.0.0/4")[0], cidrToRange("240.0.0.0/4")[1]],
];

function cidrToRange(cidr: string): [number, number] {
  const [addr, bitsRaw] = cidr.split("/");
  const bits = Number(bitsRaw);
  const base = ipToInt(addr);
  const size = 2 ** (32 - bits);
  // JS 位运算为 int32，高位段（如 127/8）会得到负数，必须 >>>0 归一为 uint32
  const start = (base & (0xffffffff - (size - 1))) >>> 0;
  return [start, start + size - 1];
}

function ipToInt(addr: string): number {
  const parts = addr.split(".").map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function isPrivateV4(host: string): boolean {
  const n = ipToInt(host);
  return PRIVATE_V4_RANGES.some(([lo, hi]) => n >= lo && n <= hi);
}

/**
 * 校验出站 URL：仅 http/https；拒绝 localhost、环回、私有与保留地址。
 * 未通过校验时抛出 Error，由调用方转为 4xx/5xx。
 */
export function assertPublicHttpUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("invalid_url");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("invalid_protocol");
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "::1" ||
    host === "::" ||
    host.startsWith("fc") ||
    host.startsWith("fd") ||
    host.startsWith("fe80")
  ) {
    throw new Error("private_host");
  }
  // 纯 IPv4
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) && isPrivateV4(host)) {
    throw new Error("private_host");
  }
  return url;
}

/** 安全出站 fetch：校验通过才请求；超时 3s；不跟随跨协议重定向以外的异常。 */
async function safeFetchJson(url: string, timeoutMs = 3000): Promise<any | null> {
  let target: URL;
  try {
    target = assertPublicHttpUrl(url);
  } catch {
    return null;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(target.toString(), {
      signal: controller.signal,
      redirect: "follow",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ==========================================
// 环境配置（凭据仅从 env 读取）
// ==========================================

interface LiveEnvConfig {
  /** HLS 播放地址基座，如 https://live.example.com/stream/index.m3u8 */
  hlsBaseUrl?: string;
  /** MediaMTX/SRS 流状态 API（服务端探测用），如 https://live.example.com/v3/streams/list */
  streamApiUrl?: string;
  /** RTMP 推流地址基座（不含密钥），如 rtmp://live.example.com/app */
  rtmpPublishBase?: string;
  /** 推流密钥：只在服务端使用，绝不进入任何响应 */
  streamKey?: string;
}

function loadLiveEnv(): LiveEnvConfig {
  const env = (globalThis as any).Deno?.env ?? null;
  const get = (k: string) => {
    try {
      return env?.get(k) ?? undefined;
    } catch {
      return undefined;
    }
  };
  return {
    hlsBaseUrl: get("LIVE_HLS_BASE_URL") || undefined,
    streamApiUrl: get("LIVE_STREAM_API_URL") || undefined,
    rtmpPublishBase: get("LIVE_RTMP_PUBLISH_BASE") || undefined,
    streamKey: get("LIVE_STREAM_KEY") || undefined,
  };
}

// ==========================================
// 房间元数据
// ==========================================

const roomMetaSchema = z.object({
  title: z.string().min(1).max(120),
  hostName: z.string().min(1).max(60).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(["idle", "live", "ended"]).optional(),
});

async function getRoomMeta(): Promise<any> {
  const raw = await kv.get(ROOM_META_KEY);
  if (raw) {
    try {
      return JSON.parse(raw as string);
    } catch {
      /* fallthrough */
    }
  }
  return { title: "D-Music 直播间", status: "idle", updatedAt: 0 };
}

// ==========================================
// WebSocket 直播间（单实例扇出 + KV 持久化）
// ==========================================

interface LiveWsClient {
  ws: any;
  roomId: string;
  userId: string;
  userName: string;
  role: "viewer" | "host" | "moderator";
}

/** roomId → clients。单实例内存表；跨实例扩展时替换为 Redis pub/sub。 */
const rooms = new Map<string, Set<LiveWsClient>>();

function broadcast(roomId: string, payload: any, exceptClient?: LiveWsClient) {
  const clients = rooms.get(roomId);
  if (!clients) return;
  const data = JSON.stringify(payload);
  for (const client of clients) {
    if (client === exceptClient) continue;
    try {
      client.ws.send(data);
    } catch {
      /* 连接已断开，room-close 时清理 */
    }
  }
}

/** 简单敏感词/频率之外的审核钩子：host/moderator 可删除消息。 */
async function moderateDelete(roomId: string, messageId: string, operator: LiveWsClient): Promise<boolean> {
  if (operator.role === "viewer") return false;
  const raw = await kv.get(CHAT_HISTORY_KEY);
  let messages: any[] = raw ? JSON.parse(raw as string) : [];
  const before = messages.length;
  messages = messages.filter((m: any) => !(m.id === messageId && m.roomId === roomId));
  if (messages.length === before) return false;
  await kv.set(CHAT_HISTORY_KEY, JSON.stringify(messages.slice(-200)));
  broadcast(roomId, { type: "chat:deleted", messageId });
  return true;
}

async function handleLiveWebSocket(req: Request, roomId: string): Promise<Response> {
  const Deno = (globalThis as any).Deno;
  if (typeof Deno?.upgradeWebSocket !== "function") {
    return new Response(
      JSON.stringify({ error: "websocket_unavailable", fallback: "polling via /live-session/danmaku" }),
      { status: 501, headers: { "Content-Type": "application/json" } },
    );
  }

  const url = new URL(req.url);
  const userId = url.searchParams.get("userId") || `anon-${Date.now()}`;
  const userName = (url.searchParams.get("userName") || "User").slice(0, 60);
  const roleParam = url.searchParams.get("role");
  // 主播身份由服务端 env 比对（不信任客户端自报）；此处仅接受 moderator 预留
  const role: LiveWsClient["role"] = roleParam === "moderator" ? "moderator" : "viewer";

  const { socket, response } = Deno.upgradeWebSocket(req);
  const client: LiveWsClient = { ws: socket, roomId, userId, userName, role };

  socket.onopen = async () => {
    if (!rooms.has(roomId)) rooms.set(roomId, new Set());
    rooms.get(roomId)!.add(client);

    const raw = await kv.get(CHAT_HISTORY_KEY);
    const history: any[] = raw ? JSON.parse(raw as string) : [];
    const recent = history.filter((m: any) => m.roomId === roomId).slice(-30);

    socket.send(JSON.stringify({
      type: "room:joined",
      roomId,
      userId,
      onlineCount: rooms.get(roomId)!.size,
      recent,
    }));
    broadcast(roomId, { type: "presence:join", userId, userName, onlineCount: rooms.get(roomId)!.size }, client);
  };

  socket.onmessage = async (event: MessageEvent) => {
    let parsed: any;
    try {
      parsed = JSON.parse(typeof event.data === "string" ? event.data : "");
    } catch {
      return;
    }

    switch (parsed.type) {
      case "chat": {
        const msg = {
          id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: "chat",
          roomId,
          userId,
          userName,
          text: String(parsed.text || "").trim().slice(0, 200),
          emotion: String(parsed.emotion || "").slice(0, 24),
          timestamp: Date.now(),
        };
        if (!msg.text) return;
        const raw = await kv.get(CHAT_HISTORY_KEY);
        const messages: any[] = raw ? JSON.parse(raw as string) : [];
        messages.push(msg);
        await kv.set(CHAT_HISTORY_KEY, JSON.stringify(messages.slice(-200)));
        broadcast(roomId, msg);
        break;
      }
      case "reaction": {
        broadcast(roomId, { type: "reaction", roomId, userId, userName, emoji: String(parsed.emoji || "").slice(0, 8), timestamp: Date.now() });
        break;
      }
      case "gift": {
        broadcast(roomId, { type: "gift", roomId, userId, userName, gift: String(parsed.gift || "").slice(0, 24), timestamp: Date.now() });
        break;
      }
      case "moderate:delete": {
        const ok = await moderateDelete(roomId, String(parsed.messageId || ""), client);
        if (client.ws.readyState === 1) {
          client.ws.send(JSON.stringify({ type: "moderate:result", messageId: parsed.messageId, ok }));
        }
        break;
      }
      default:
        break;
    }
  };

  socket.onclose = () => {
    const clients = rooms.get(roomId);
    if (clients) {
      clients.delete(client);
      if (clients.size === 0) rooms.delete(roomId);
      else broadcast(roomId, { type: "presence:leave", userId, userName, onlineCount: clients.size });
    }
  };

  socket.onerror = () => {
    const clients = rooms.get(roomId);
    if (clients) clients.delete(client);
  };

  return response;
}

// ==========================================
// 路由注册
// ==========================================

export function registerLiveStreamRoutes(app: any) {

  // GET /live/stream — 播放地址与在线状态（不下发任何凭据）
  app.get(`${P}/live/stream`, async (c: any) => {
    try {
      const cfg = loadLiveEnv();
      const meta = await getRoomMeta();

      let streamOnline = false;
      let viewerHint: string | null = null;

      if (cfg.streamApiUrl) {
        // MediaMTX: /v3/streams/list → [{name, ready}]; SRS: /api/v1/streams → {streams:[...]}
        const data = await safeFetchJson(cfg.streamApiUrl);
        if (Array.isArray(data?.streams_list)) {
          streamOnline = data.streams_list.some((s: any) => s?.ready === true);
        } else if (Array.isArray(data?.streams)) {
          streamOnline = data.streams.length > 0;
        }
      }

      if (cfg.hlsBaseUrl) {
        let hlsUrl: string;
        try {
          hlsUrl = assertPublicHttpUrl(cfg.hlsBaseUrl).toString();
          viewerHint = hlsUrl;
        } catch {
          viewerHint = null;
        }
      }

      return c.json({
        live: streamOnline,
        room: meta,
        playback: viewerHint ? { hlsUrl: viewerHint } : null,
        publish: cfg.rtmpPublishBase ? { rtmpBase: cfg.rtmpPublishBase } : null,
      });
    } catch (error) {
      console.log("Live stream GET error:", error);
      return c.json({ error: `Stream info failed: ${error}` }, 500);
    }
  });

  // POST /live/stream — 更新房间元数据（主播/管理端）
  app.post(`${P}/live/stream`, rateLimit(RATE_STANDARD), async (c: any) => {
    try {
      const body = await c.req.json();
      const parsed = validate(roomMetaSchema as any, body);
      if (!parsed.success) return c.json({ error: parsed.error }, 400);

      const meta = {
        ...parsed.data,
        updatedAt: Date.now(),
      };
      await kv.set(ROOM_META_KEY, JSON.stringify(meta));
      broadcast("main", { type: "room:meta", room: meta });
      return c.json({ success: true, room: meta });
    } catch (error) {
      return c.json({ error: `Stream update failed: ${error}` }, 500);
    }
  });

  // GET /ws/live — WebSocket 直播间升级（主仓统一端点，路径与 Node 入口 index.ts 的
  // ws 通道一致；roomId 查询参数默认 main）。/live/ws 保留为兼容别名。
  // 注意：Node 运行时下 /ws/live 由 index.ts 的 ws WebSocketServer 先行接管，
  // 此 Hono 路由仅在 Deno Edge 运行时生效。
  app.get("/ws/live", async (c: any) => {
    const roomId = (new URL(c.req.url).searchParams.get("roomId") || "main").slice(0, 64);
    return handleLiveWebSocket(c.req, roomId);
  });

  // GET /live/ws — WebSocket 直播间升级（兼容别名，规范路径为 /ws/live）
  app.get(`${P}/live/ws`, async (c: any) => {
    const roomId = (new URL(c.req.url).searchParams.get("roomId") || "main").slice(0, 64);
    return handleLiveWebSocket(c.req, roomId);
  });
}
