/**
 * D-Music §3.4 — 流媒体/直播路由（补流媒体）
 *
 * 归属：Owncast（MIT）+ MediaMTX（MIT）+ SRS（MIT）推流模型的参考实现。
 * 仅做“推流地址分发与 HLS 播放地址回填”，不复制 AGPL/GPL 源码。
 *
 * 接口：
 *   POST /live/stream/start   — 创建直播间，返回 RTMP 推流地址 + HLS 播放地址
 *   GET  /live/stream/:id     — 查询直播间状态与 HLS 地址（前端可直接用 Video.js/hls.js 播放）
 *   POST /live/stream/:id/end — 结束直播间
 *
 * 数据：KV 双驱（memory/pg），与 auth.ts / server-utils.ts 保持一致的鉴权模式。
 */

import { ROUTE_PREFIX, kv, requireAuth } from "../services/server-utils.ts";
import { apiError, ERROR_CODES } from "../services/api-contract.ts";
import { rateLimit, RATE_STANDARD } from "../services/rate-limit.ts";
import { recordAudit } from "../services/audit.ts";

const LIVE_PREFIX = "live:";

interface StartStreamBody {
  roomName?: string;
  userId?: string;
  userName?: string;
}

/** 生成 RTMP 推流地址（参考 Owncast / MediaMTX / SRS 推流模型） */
function rtmpPushUrl(roomId: string): string {
  const host = process.env.LIVE_RTMP_HOST ?? "localhost";
  const port = process.env.LIVE_RTMP_PORT ?? "1935";
  const app = process.env.LIVE_RTMP_APP ?? "live";
  return `rtmp://${host}:${port}/${app}/${roomId}`;
}

/** 生成 HLS 播放地址（前端 Video.js/hls.js 可直接消费） */
function hlsPlayUrl(roomId: string): string {
  const base = process.env.LIVE_PUBLIC_BASE_URL ?? "http://localhost:3250";
  return `${base}${ROUTE_PREFIX}/live/hls/${roomId}/index.m3u8`;
}

/** 生成 MediaMTX/SRS 回调键名 */
function roomKey(roomId: string): string {
  return `${LIVE_PREFIX}room:${roomId}`;
}

export function registerLiveStreamRoutes(app: any) {
  // ==========================================
  // 创建直播间（返回推流地址 + 播放地址）
  // ==========================================
  app.post(
    `${ROUTE_PREFIX}/live/stream/start`,
    requireAuth,
    rateLimit(RATE_STANDARD),
    async (c: any) => {
      try {
        const body = (await c.req.json()) as StartStreamBody;
        const { userId, userName } = (c as any).get("authedUser") ?? {};
        const roomName = body.roomName ?? `${userName || userId || "anon"}-${Date.now()}`;
        const roomId = `room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        const room = {
          id: roomId,
          name: roomName,
          ownerId: userId,
          ownerName: userName || "Unknown",
          status: "live",
          rtmpPushUrl: rtmpPushUrl(roomId),
          hlsPlayUrl: hlsPlayUrl(roomId),
          createdAt: Date.now(),
          endedAt: null,
          viewerCount: 0,
        };

        await kv.set(roomKey(roomId), JSON.stringify(room));
        await recordAudit({
          action: "livestream.start",
          actorId: userId,
          detail: { roomId, roomName },
        });

        return c.json({
          success: true,
          room: {
            id: room.id,
            name: room.name,
            status: room.status,
            rtmpPushUrl: room.rtmpPushUrl,
            hlsPlayUrl: room.hlsPlayUrl,
            createdAt: room.createdAt,
          },
        });
      } catch (error) {
        console.log("Error starting livestream:", error);
        return apiError(c, 500, "创建直播间失败", undefined, ERROR_CODES.INTERNAL);
      }
    }
  );

  // ==========================================
  // 查询直播间状态与 HLS 播放地址
  // ==========================================
  app.get(`${ROUTE_PREFIX}/live/stream/:id`, async (c: any) => {
    try {
      const roomId = c.req.param("id");
      const raw = await kv.get(roomKey(roomId));
      if (!raw) {
        return c.json({ error: "直播间不存在" }, 404);
      }
      const room = JSON.parse(raw as string);
      return c.json({
        success: true,
        room: {
          id: room.id,
          name: room.name,
          status: room.status,
          rtmpPushUrl: room.rtmpPushUrl,
          hlsPlayUrl: room.hlsPlayUrl,
          viewerCount: room.viewerCount,
          createdAt: room.createdAt,
          endedAt: room.endedAt,
        },
      });
    } catch (error) {
      console.log("Error fetching livestream:", error);
      return apiError(c, 500, "查询直播间失败", undefined, ERROR_CODES.INTERNAL);
    }
  });

  // ==========================================
  // 结束直播间
  // ==========================================
  app.post(
    `${ROUTE_PREFIX}/live/stream/:id/end`,
    requireAuth,
    rateLimit(RATE_STANDARD),
    async (c: any) => {
      try {
        const roomId = c.req.param("id");
        const { userId } = (c as any).get("authedUser") ?? {};
        const raw = await kv.get(roomKey(roomId));
        if (!raw) {
          return c.json({ error: "直播间不存在" }, 404);
        }
        const room = JSON.parse(raw as string);
        if (room.ownerId !== userId) {
          return c.json({ error: "无权结束此直播间" }, 403);
        }
        room.status = "ended";
        room.endedAt = Date.now();
        await kv.set(roomKey(roomId), JSON.stringify(room));
        await recordAudit({ action: "livestream.end", actorId: userId, detail: { roomId } });
        return c.json({ success: true, room });
      } catch (error) {
        console.log("Error ending livestream:", error);
        return apiError(c, 500, "结束直播间失败", undefined, ERROR_CODES.INTERNAL);
      }
    }
  );
}
