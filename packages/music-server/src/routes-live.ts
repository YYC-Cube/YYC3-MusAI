/**
 * D-Music §2.2 — Live Session Routes (§26.x)
 *
 * Routes: live-session/heartbeat, leave, presence, danmaku
 * Extracted from index.tsx for modularization.
 */

import * as kv from "./kv_store.tsx";
import { ROUTE_PREFIX } from "./server-utils.ts";
import { rateLimit, RATE_STANDARD } from "./rate-limit.ts";
import { validate, liveHeartbeatSchema, liveLeaveSchema, danmakuSchema } from "./validation.ts";

const P = ROUTE_PREFIX;

export function registerLiveSessionRoutes(app: any) {

  app.post(`${P}/live-session/heartbeat`, async (c: any) => {
    try {
      const body = await c.req.json();
      const parsed = validate(liveHeartbeatSchema, body);
      if (!parsed.success) return c.json({ error: parsed.error }, 400);
      const { userId, userName, trackId, trackTitle, emotion, isPlaying } = parsed.data;

      const presenceKey = 'live-session:presence';
      const raw = await kv.get(presenceKey);
      let listeners: any[] = raw ? JSON.parse(raw as string) : [];

      const now = Date.now();
      listeners = listeners.filter((l: any) => now - l.lastSeen < 30000);

      const existing = listeners.findIndex((l: any) => l.userId === userId);
      const entry = { userId, userName, trackId, trackTitle, emotion, isPlaying, lastSeen: now };
      if (existing >= 0) listeners[existing] = entry;
      else listeners.push(entry);

      await kv.set(presenceKey, JSON.stringify(listeners));
      return c.json({ success: true, onlineCount: listeners.length });
    } catch (error) {
      console.log("Live heartbeat error:", error);
      return c.json({ error: `Heartbeat failed: ${error}` }, 500);
    }
  });

  app.post(`${P}/live-session/leave`, async (c: any) => {
    try {
      const body = await c.req.json();
      const parsed = validate(liveLeaveSchema, body);
      if (!parsed.success) return c.json({ error: parsed.error }, 400);
      const { userId } = parsed.data;
      const presenceKey = 'live-session:presence';
      const raw = await kv.get(presenceKey);
      let listeners: any[] = raw ? JSON.parse(raw as string) : [];
      listeners = listeners.filter((l: any) => l.userId !== userId);
      await kv.set(presenceKey, JSON.stringify(listeners));
      return c.json({ success: true });
    } catch (error) {
      return c.json({ error: `Leave failed: ${error}` }, 500);
    }
  });

  app.get(`${P}/live-session/presence`, async (c: any) => {
    try {
      const presenceKey = 'live-session:presence';
      const raw = await kv.get(presenceKey);
      let listeners: any[] = raw ? JSON.parse(raw as string) : [];
      listeners = listeners.filter((l: any) => Date.now() - l.lastSeen < 30000);
      return c.json({ listeners });
    } catch (error) {
      return c.json({ error: `Presence failed: ${error}` }, 500);
    }
  });

  app.post(`${P}/live-session/danmaku`, rateLimit(RATE_STANDARD), async (c: any) => {
    try {
      const body = await c.req.json();
      const parsed = validate(danmakuSchema, body);
      if (!parsed.success) return c.json({ error: parsed.error }, 400);
      const { userId, userName, text, trackId, color } = parsed.data;

      const msgKey = 'live-session:danmaku';
      const raw = await kv.get(msgKey);
      let messages: any[] = raw ? JSON.parse(raw as string) : [];

      const msg = {
        id: `dm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId, userName: userName || 'User',
        text: text.trim().slice(0, 100),
        trackId, color: color || '#FFD700',
        timestamp: Date.now(),
      };
      messages.push(msg);

      if (messages.length > 200) messages = messages.slice(-200);
      await kv.set(msgKey, JSON.stringify(messages));

      console.log(`[LiveSession] Danmaku from ${userName}: "${text.slice(0, 30)}"`);
      return c.json({ success: true, message: msg });
    } catch (error) {
      console.log("Danmaku POST error:", error);
      return c.json({ error: `Danmaku failed: ${error}` }, 500);
    }
  });

  app.get(`${P}/live-session/danmaku`, async (c: any) => {
    try {
      const msgKey = 'live-session:danmaku';
      const raw = await kv.get(msgKey);
      let messages: any[] = raw ? JSON.parse(raw as string) : [];
      const cutoff = Date.now() - 60000;
      messages = messages.filter((m: any) => m.timestamp > cutoff);
      return c.json({ messages });
    } catch (error) {
      return c.json({ error: `Danmaku GET failed: ${error}` }, 500);
    }
  });
}