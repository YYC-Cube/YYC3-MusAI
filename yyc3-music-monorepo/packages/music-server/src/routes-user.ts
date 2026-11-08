/**
 * D-Music §2.2 — User Routes
 * Routes: profile, creators, role, preferences, themes, export, error-report
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  ROUTE_PREFIX, kv, requireAuth, getUserFromRequest, getAllSharedWorks,
} from "./server-utils.ts";
import { validate, profileUpdateSchema } from "./validation.ts";

export function registerUserRoutes(app: any) {
  // ==========================================
  // Creator Discovery
  // ==========================================
  app.get(`${ROUTE_PREFIX}/creators`, async (c: any) => {
    try {
      const works = await getAllSharedWorks(1, 1000);
      const creatorsMap: Record<string, { userName: string; userId?: string; works: number; totalLikes: number; latestWork: number }> = {};
      for (const w of works) {
        const name = w.userName || 'Anonymous';
        if (!creatorsMap[name]) creatorsMap[name] = { userName: name, userId: w.userId, works: 0, totalLikes: 0, latestWork: 0 };
        creatorsMap[name].works++;
        creatorsMap[name].totalLikes += (w.likes || 0);
        creatorsMap[name].latestWork = Math.max(creatorsMap[name].latestWork, w.createdAt || 0);
      }
      const creators = Object.values(creatorsMap).sort((a, b) => b.totalLikes - a.totalLikes);
      return c.json({ creators });
    } catch (error) {
      console.log("Creators list error:", error);
      return c.json({ creators: [] }, 500);
    }
  });

  app.get(`${ROUTE_PREFIX}/creators/:userName/works`, async (c: any) => {
    const userName = decodeURIComponent(c.req.param("userName"));
    try {
      const works = await getAllSharedWorks(1, 1000);
      const creatorWorks = works.filter((w: any) => w.userName === userName);
      return c.json({ works: creatorWorks });
    } catch (error) {
      console.log(`Creator works error for ${userName}:`, error);
      return c.json({ works: [] }, 500);
    }
  });

  // ==========================================
  // User Profile System
  // ==========================================
  app.get(`${ROUTE_PREFIX}/profile/:userId`, async (c: any) => {
    const userId = c.req.param("userId");
    try {
      const value = await kv.get(`user:${userId}:profile`);
      if (value) {
        const profile = JSON.parse(value as string);
        return c.json({ profile });
      }
      return c.json({
        profile: {
          userId, email: '', displayName: '', starPower: 0,
          totalListeningTime: 0, totalAnnotations: 0, totalLikes: 0,
          achievements: [], joinedAt: new Date().toISOString(), streak: 0, role: 'user',
        },
      });
    } catch (error) {
      console.log(`Error fetching profile for user ${userId}:`, error);
      return c.json({ error: `Failed to fetch profile: ${error}` }, 500);
    }
  });

  app.post(`${ROUTE_PREFIX}/profile/:userId`, requireAuth, async (c: any) => {
    const userId = c.req.param("userId");
    try {
      const body = await c.req.json();
      const existing = await kv.get(`user:${userId}:profile`);
      let profile = existing ? JSON.parse(existing as string) : {
        userId, email: '', displayName: '', starPower: 0,
        totalListeningTime: 0, totalAnnotations: 0, totalLikes: 0,
        achievements: [], joinedAt: new Date().toISOString(), streak: 0, role: 'user',
      };
      const parsed = validate(profileUpdateSchema, body);
      if (!parsed.success) return c.json({ error: parsed.error }, 400);
      profile = { ...profile, ...parsed.data };
      await kv.set(`user:${userId}:profile`, JSON.stringify(profile));
      return c.json({ success: true, profile });
    } catch (error) {
      console.log(`Error updating profile for user ${userId}:`, error);
      return c.json({ error: `Failed to update profile: ${error}` }, 500);
    }
  });

  // ==========================================
  // Role-Based Access Control
  // ==========================================
  app.get(`${ROUTE_PREFIX}/user/role/:userId`, async (c: any) => {
    const userId = c.req.param("userId");
    try {
      const roleVal = await kv.get(`user:${userId}:role`);
      return c.json({ userId, role: (roleVal as string) || 'user' });
    } catch (error) {
      return c.json({ userId, role: 'user' }, 500);
    }
  });

  app.post(`${ROUTE_PREFIX}/user/role/:userId`, async (c: any) => {
    const userId = c.req.param("userId");
    try {
      const requester = await getUserFromRequest(c);
      if (!requester || requester.role !== 'admin') {
        return c.json({ error: "Unauthorized: admin only" }, 403);
      }
      const body = await c.req.json();
      const { role } = body;
      const validRoles = ['user', 'creator', 'moderator', 'admin'];
      if (!validRoles.includes(role)) {
        return c.json({ error: `Invalid role. Must be: ${validRoles.join(', ')}` }, 400);
      }
      await kv.set(`user:${userId}:role`, role);
      console.log(`Role updated: user=${userId} role=${role} by=${requester.id}`);
      return c.json({ success: true, userId, role });
    } catch (error) {
      return c.json({ error: `Role update failed: ${error}` }, 500);
    }
  });

  // ==========================================
  // Theme Unlock
  // ==========================================
  app.get(`${ROUTE_PREFIX}/user/:userId/unlocked-themes`, async (c: any) => {
    const userId = c.req.param("userId");
    try {
      const raw = await kv.get(`user:${userId}:unlocked-themes`);
      const themes: string[] = raw ? JSON.parse(raw as string) : [];
      return c.json({ themes });
    } catch (error) { console.log(`Unlocked themes fetch error for ${userId}:`, error); return c.json({ themes: [] }, 500); }
  });

  app.post(`${ROUTE_PREFIX}/user/:userId/unlocked-themes`, requireAuth, async (c: any) => {
    const userId = c.req.param("userId");
    try {
      const body = await c.req.json();
      const { themeId } = body;
      if (!themeId) return c.json({ error: 'themeId required' }, 400);
      const raw = await kv.get(`user:${userId}:unlocked-themes`);
      const themes: string[] = raw ? JSON.parse(raw as string) : [];
      if (!themes.includes(themeId)) {
        themes.push(themeId);
        await kv.set(`user:${userId}:unlocked-themes`, JSON.stringify(themes));
      }
      console.log(`Theme ${themeId} unlocked for user ${userId}`);
      return c.json({ success: true, themes });
    } catch (error) { console.log(`Theme unlock error for ${userId}:`, error); return c.json({ error: `Failed: ${error}` }, 500); }
  });

  // ==========================================
  // Preferences
  // ==========================================
  app.get(`${ROUTE_PREFIX}/preferences/:userId`, async (c: any) => {
    try {
      const userId = c.req.param('userId');
      const raw = await kv.get(`prefs:${userId}`);
      const preferences = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
      return c.json({ preferences });
    } catch (error) {
      console.log(`Preferences GET error:`, error);
      return c.json({ error: `Failed to get preferences: ${error}` }, 500);
    }
  });

  app.post(`${ROUTE_PREFIX}/preferences/:userId`, requireAuth, async (c: any) => {
    try {
      const userId = c.req.param('userId');
      const body = await c.req.json();
      const allowed = ['lang', 'volume', 'shuffleEnabled', 'repeatMode', 'mode', 'theme'];
      const clean: Record<string, any> = {};
      for (const key of allowed) {
        if (body[key] !== undefined) clean[key] = body[key];
      }
      await kv.set(`prefs:${userId}`, JSON.stringify(clean));
      console.log(`[Prefs] Saved preferences for user ${userId}`);
      return c.json({ saved: true });
    } catch (error) {
      console.log(`Preferences POST error:`, error);
      return c.json({ error: `Failed to save preferences: ${error}` }, 500);
    }
  });

  // ==========================================
  // Error Reporting
  // ==========================================
  app.post(`${ROUTE_PREFIX}/error-report`, async (c: any) => {
    try {
      const body = await c.req.json();
      const { message, stack, componentStack, url, userAgent, timestamp } = body;
      if (!message) return c.json({ error: 'message is required' }, 400);

      const entry = {
        id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        message: String(message).slice(0, 500),
        stack: stack ? String(stack).slice(0, 2000) : null,
        componentStack: componentStack ? String(componentStack).slice(0, 1000) : null,
        url: url ? String(url).slice(0, 200) : null,
        userAgent: userAgent ? String(userAgent).slice(0, 300) : null,
        timestamp: timestamp || Date.now(),
        receivedAt: Date.now(),
      };

      const logKey = 'system:error-log';
      const raw = await kv.get(logKey);
      let logs: any[] = [];
      try { logs = raw ? JSON.parse(raw as string) : []; } catch { logs = []; }
      logs.unshift(entry);
      if (logs.length > 50) logs = logs.slice(0, 50);
      await kv.set(logKey, JSON.stringify(logs));

      console.log(`[ErrorReport] ${entry.id}: ${entry.message}`);
      return c.json({ received: true, id: entry.id });
    } catch (error) {
      console.log(`Error report endpoint error:`, error);
      return c.json({ error: `Failed to log error: ${error}` }, 500);
    }
  });

  // ==========================================
  // User Data Export
  // ==========================================
  app.get(`${ROUTE_PREFIX}/export/:userId`, async (c: any) => {
    try {
      const userId = c.req.param('userId');
      if (!userId) return c.json({ error: 'userId required' }, 400);

      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { data: { user }, error: authErr } = await supabase.auth.getUser(accessToken);
      if (authErr || !user || user.id !== userId) {
        return c.json({ error: 'Unauthorized - can only export your own data' }, 401);
      }

      const [profileRaw, starpowerRaw, worksRaw, capsulesRaw] = await Promise.all([
        kv.get(`profile:${userId}`),
        kv.get(`user:${userId}:starpower`),
        kv.getByPrefix(`shared-work:`),
        kv.getByPrefix(`capsule:`),
      ]);

      const safeParse = (v: any) => { try { return typeof v === 'string' ? JSON.parse(v) : v; } catch { return null; } };

      const allWorks = (worksRaw || []).map(safeParse).filter(Boolean);
      const userWorks = allWorks.filter((w: any) => w.authorId === userId);

      const allCapsules = (capsulesRaw || []).map(safeParse).filter(Boolean);
      const userCapsules = allCapsules.filter((cap: any) => cap.senderId === userId);

      const exportData = {
        exportVersion: '1.0',
        exportedAt: new Date().toISOString(),
        userId,
        email: user.email,
        profile: safeParse(profileRaw),
        starPower: safeParse(starpowerRaw) || 0,
        sharedWorks: userWorks,
        timeCapsules: userCapsules,
      };

      console.log(`[DataExport] Exported data for user ${userId}: ${userWorks.length} works, ${userCapsules.length} capsules`);
      return c.json(exportData);
    } catch (error) {
      console.log(`Data export error:`, error);
      return c.json({ error: `Export failed: ${error}` }, 500);
    }
  });
}