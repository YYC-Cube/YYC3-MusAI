/**
 * D-Music — Monitoring Routes（终审 R4：前端错误/性能/事件上报落库）
 *
 * 对接 packages/music-utils/src/monitoring.js 的 sendToApi：
 *   POST /monitoring/errors       — 前端未捕获错误
 *   POST /monitoring/performance  — 页面/资源/长任务性能指标
 *   POST /monitoring/events       — 自定义埋点事件
 *
 * 落库复用 audit 通道（musai.audit_logs，KV 降级兜底）：
 *   action = monitoring:{type}，detail = 上报 payload，actor = 可选会话用户。
 */

import { ROUTE_PREFIX, getUserFromRequest } from "../services/server-utils.ts";
import { rateLimit, RATE_STANDARD } from "../services/rate-limit.ts";
import { recordAudit } from "../services/audit.ts";

// 上报类型白名单：超出集合直接 400，防止任意字符串刷审计表
const ALLOWED_TYPES = new Set(['errors', 'performance', 'events']);

// 单条 payload 上限（字节）：截断超大堆栈/指标，防 abuse
const MAX_BODY_BYTES = 8 * 1024;

export function registerMonitoringRoutes(app: any): void {
  app.post(
    `${ROUTE_PREFIX}/monitoring/:type`,
    rateLimit(RATE_STANDARD),
    async (c: any) => {
      const { type } = c.req.param();
      if (!ALLOWED_TYPES.has(type)) {
        return c.json({ error: 'unsupported monitoring type' }, 400);
      }

      let payload: unknown;
      try {
        const raw = await c.req.text();
        if (raw.length > MAX_BODY_BYTES) {
          return c.json({ error: 'payload too large' }, 413);
        }
        payload = raw ? JSON.parse(raw) : null;
      } catch {
        return c.json({ error: 'invalid JSON' }, 400);
      }

      // 可选会话用户：上报不强制登录（未登录错误同样值得采集）
      const user = await getUserFromRequest(c).catch(() => null);
      const ip =
        c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
        c.req.header('x-real-ip') ??
        null;

      await recordAudit({
        action: `monitoring:${type}`,
        actorId: user?.id ?? null,
        ip,
        detail: payload,
      });

      return c.json({ ok: true });
    },
  );
}
