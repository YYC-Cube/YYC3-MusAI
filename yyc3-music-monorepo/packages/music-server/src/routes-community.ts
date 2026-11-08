/**
 * D-Music §2.2 — Community Routes
 * Routes: community activities, shared-works, fork, copyright
 */

import {
  ROUTE_PREFIX, kv, requireAuth,
  getSharedWorkIndex, getSharedWork, saveSharedWork, addToSharedWorkIndex, getAllSharedWorks,
  hashContent, verifyContentHash,
} from "./server-utils.ts";
import { rateLimit, RATE_STANDARD, RATE_SENSITIVE } from "./rate-limit.ts";
import { validate, shareWorkSchema, forkWorkSchema } from "./validation.ts";

export function registerCommunityRoutes(app: any) {
  // ==========================================
  // Community Activity Feed
  // ==========================================
  app.get(`${ROUTE_PREFIX}/community/activities`, async (c: any) => {
    try {
      const value = await kv.get("community:activities");
      if (value) {
        const activities = JSON.parse(value as string);
        return c.json({ activities });
      }
      return c.json({ activities: [] });
    } catch (error) {
      console.log("Error fetching community activities:", error);
      return c.json({ activities: [] }, 500);
    }
  });

  app.post(`${ROUTE_PREFIX}/community/activities`, requireAuth, async (c: any) => {
    try {
      const body = await c.req.json();
      const { type, userId, userName, songId, songTitle, detail } = body;

      if (!type || !userId || !userName) {
        return c.json({ error: "Missing required fields" }, 400);
      }

      const activity = {
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type, userId, userName,
        songId: songId || '', songTitle: songTitle || '', detail: detail || '',
        timestamp: Date.now(),
      };

      const existing = await kv.get("community:activities");
      let activities = existing ? JSON.parse(existing as string) : [];
      activities = [activity, ...activities].slice(0, 100);
      await kv.set("community:activities", JSON.stringify(activities));

      return c.json({ success: true, activity });
    } catch (error) {
      console.log("Error logging community activity:", error);
      return c.json({ error: `Failed to log activity: ${error}` }, 500);
    }
  });

  // ==========================================
  // Shared Works (§8.2)
  // ==========================================
  app.post(`${ROUTE_PREFIX}/shared-works`, requireAuth, rateLimit(RATE_STANDARD), async (c: any) => {
    try {
      const body = await c.req.json();
      const parsed = validate(shareWorkSchema, body);
      if (!parsed.success) return c.json({ error: parsed.error }, 400);
      const { workId, title, theme, lyrics, mode, createdAt, userId, userName } = parsed.data;

      const existing = await getSharedWork(workId);
      if (existing) {
        return c.json({ success: true, alreadyShared: true, work: existing });
      }

      const sharedWork = {
        workId, title, theme, lyrics, mode,
        createdAt: createdAt || Date.now(),
        sharedAt: Date.now(),
        userId, userName,
        likes: 0, plays: 0,
      };

      await saveSharedWork(sharedWork);
      await addToSharedWorkIndex(workId);

      console.log(`Shared work: "${title}" by ${userName} (${userId})`);
      return c.json({ success: true, work: sharedWork });
    } catch (error) {
      console.log("Error sharing work:", error);
      return c.json({ error: `Failed to share work: ${error}` }, 500);
    }
  });

  app.get(`${ROUTE_PREFIX}/shared-works`, async (c: any) => {
    try {
      const page = parseInt(c.req.query('page') || '1');
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const index = await getSharedWorkIndex();
      const works = await getAllSharedWorks(page, limit);
      return c.json({
        works, total: index.length, page, limit,
        hasMore: page * limit < index.length,
      });
    } catch (error) {
      console.log("Error fetching shared works:", error);
      return c.json({ works: [], total: 0 }, 500);
    }
  });

  app.post(`${ROUTE_PREFIX}/shared-works/:workId/like`, rateLimit(RATE_SENSITIVE), async (c: any) => {
    const workId = c.req.param("workId");
    try {
      let likerId: string | null = null;
      try {
        const body = await c.req.json();
        likerId = body?.userId || null;
      } catch { /* no body is OK */ }

      if (likerId) {
        const dedupKey = `like-dedup:${workId}:${likerId}`;
        const alreadyLiked = await kv.get(dedupKey);
        if (alreadyLiked) {
          return c.json({ success: false, message: "Already liked", deduplicated: true });
        }
        await kv.set(dedupKey, "1");
      }

      const work = await getSharedWork(workId);
      if (!work) return c.json({ error: "Work not found" }, 404);

      work.likes = (work.likes || 0) + 1;
      await saveSharedWork(work);

      const authorId = work.userId;
      const authorName = work.userName || work.author;
      if (authorId) {
        const statsKey = `achievements:stats:${authorId}`;
        const statsRaw = await kv.get(statsKey);
        const stats = statsRaw ? JSON.parse(statsRaw as string) : {};
        stats.totalLikesReceived = (stats.totalLikesReceived || 0) + 1;
        await kv.set(statsKey, JSON.stringify(stats));
      }

      if (authorName && work.likes % 5 === 0) {
        try {
          // §v11.1 — Write notifications using userId (not userName) for key stability
          const notifTargetId = authorId || authorName; // prefer userId
          const notifKey = authorId ? `notifications:user:${authorId}` : `notifications:${authorName}`;
          const notifRaw = await kv.get(notifKey);
          let notifs = notifRaw ? JSON.parse(notifRaw as string) : [];
          notifs = [{
            id: `notif-like-${workId}-${Date.now()}`,
            type: 'like', fromUser: `${work.likes} users`,
            workTitle: work.title, workId, likes: work.likes,
            createdAt: Date.now(), read: false,
          }, ...notifs].slice(0, 100);
          await kv.set(notifKey, JSON.stringify(notifs));
        } catch (e) { console.log(`Like notification error: ${e}`); }
      }

      return c.json({ success: true, likes: work.likes });
    } catch (error) {
      console.log(`Error liking shared work ${workId}:`, error);
      return c.json({ error: `Failed: ${error}` }, 500);
    }
  });

  // ==========================================
  // Fork a Work
  // ==========================================
  app.post(`${ROUTE_PREFIX}/works/fork`, requireAuth, rateLimit(RATE_STANDARD), async (c: any) => {
    try {
      const body = await c.req.json();
      const parsed = validate(forkWorkSchema, body);
      if (!parsed.success) return c.json({ error: parsed.error }, 400);
      const { userId, userName, originalWorkId, originalAuthor, title, theme, lyrics } = parsed.data;

      const fork = {
        workId: `fork-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId, userName, title, theme, lyrics,
        likes: 0, plays: 0,
        createdAt: Date.now(),
        forkedFrom: {
          workId: originalWorkId,
          author: originalAuthor || 'Unknown',
          forkedAt: Date.now(),
        },
      };

      await saveSharedWork(fork);
      await addToSharedWorkIndex(fork.workId);

      const chainKey = `fork-chain:${originalWorkId}`;
      const chainRaw = await kv.get(chainKey);
      let chain = chainRaw ? JSON.parse(chainRaw as string) : [];
      chain.push({ workId: fork.workId, author: userName, forkedAt: Date.now() });
      await kv.set(chainKey, JSON.stringify(chain));

      if (originalAuthor) {
        // §v11.1 — Fork notification: prefer userId-based key for stability
        // Look up the original work to get the author's userId
        const originalWork = await getSharedWork(originalWorkId);
        const originalAuthorId = originalWork?.userId;
        const notifKey = originalAuthorId
          ? `notifications:user:${originalAuthorId}`
          : `notifications:${originalAuthor}`;
        const notifRaw = await kv.get(notifKey);
        let notifs = notifRaw ? JSON.parse(notifRaw as string) : [];
        notifs = [{
          id: `notif-fork-${Date.now()}`,
          type: 'fork', fromUser: userName || 'Someone',
          workTitle: title, originalWorkId,
          createdAt: Date.now(), read: false,
        }, ...notifs].slice(0, 100);
        await kv.set(notifKey, JSON.stringify(notifs));
        console.log(`Fork notification saved for ${originalAuthorId || originalAuthor}`);
      }

      console.log(`Work forked: "${title}" by ${userName} from ${originalWorkId}`);
      return c.json({ success: true, fork });
    } catch (error) {
      console.log("Error forking work:", error);
      return c.json({ error: `Fork failed: ${error}` }, 500);
    }
  });

  app.get(`${ROUTE_PREFIX}/works/:workId/forks`, async (c: any) => {
    const workId = c.req.param("workId");
    try {
      const chainKey = `fork-chain:${workId}`;
      const chainRaw = await kv.get(chainKey);
      const chain = chainRaw ? JSON.parse(chainRaw as string) : [];
      return c.json({ forks: chain, count: chain.length });
    } catch (error) {
      console.log(`Error fetching forks for ${workId}:`, error);
      return c.json({ forks: [], count: 0 }, 500);
    }
  });

  // ==========================================
  // Copyright Certification
  // ==========================================
  app.post(`${ROUTE_PREFIX}/copyright/apply`, requireAuth, async (c: any) => {
    try {
      const body = await c.req.json();
      const { userId, userName, workId, workTitle, workTheme, workLyrics, createdAt } = body;
      if (!userId || !workId || !workTitle) return c.json({ error: 'userId, workId, workTitle required' }, 400);
      const certId = `cert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const contentStr = `${workTitle}|${workTheme || ''}|${(workLyrics || []).join('|')}|${userId}|${createdAt || Date.now()}`;
      const contentHash = await hashContent(contentStr);
      const cert = {
        certId, userId, userName: userName || 'Unknown', workId, workTitle,
        workTheme: workTheme || '', workLyrics: workLyrics || [], contentHash,
        status: 'certified', appliedAt: Date.now(), certifiedAt: Date.now(),
        certNumber: `DMUSIC-CR-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`,
      };
      await kv.set(`copyright:${workId}`, JSON.stringify(cert));
      const userCertsKey = `copyright:user:${userId}`;
      const userCertsRaw = await kv.get(userCertsKey);
      let userCerts = userCertsRaw ? JSON.parse(userCertsRaw as string) : [];
      userCerts = [cert, ...userCerts].slice(0, 200);
      await kv.set(userCertsKey, JSON.stringify(userCerts));

      const sharedWork = await getSharedWork(workId);
      if (sharedWork) {
        sharedWork.copyrightCertified = true;
        sharedWork.certNumber = cert.certNumber;
        await saveSharedWork(sharedWork);
      }
      console.log(`Copyright certified: ${certId} for work ${workId}`);
      return c.json({ success: true, cert });
    } catch (error) { console.log("Copyright apply error:", error); return c.json({ error: `Copyright apply failed: ${error}` }, 500); }
  });

  app.get(`${ROUTE_PREFIX}/copyright/:workId`, async (c: any) => {
    const workId = c.req.param("workId");
    try {
      const certRaw = await kv.get(`copyright:${workId}`);
      if (!certRaw) return c.json({ cert: null });
      return c.json({ cert: JSON.parse(certRaw as string) });
    } catch (error) { console.log(`Copyright get error for ${workId}:`, error); return c.json({ cert: null }, 500); }
  });

  app.get(`${ROUTE_PREFIX}/copyright/user/:userId`, async (c: any) => {
    const userId = c.req.param("userId");
    try {
      const raw = await kv.get(`copyright:user:${userId}`);
      return c.json({ certs: raw ? JSON.parse(raw as string) : [] });
    } catch (error) { console.log(`Copyright user error:`, error); return c.json({ certs: [] }, 500); }
  });

  // ==========================================
  // §L-1 — Copyright Hash Verification
  // ==========================================
  app.post(`${ROUTE_PREFIX}/copyright/verify`, async (c: any) => {
    try {
      const body = await c.req.json();
      const { workId, workTitle, workTheme, workLyrics, userId, createdAt } = body;
      if (!workId) return c.json({ error: 'workId required' }, 400);

      // Load the stored certificate
      const certRaw = await kv.get(`copyright:${workId}`);
      if (!certRaw) return c.json({ verified: false, reason: 'No certificate found for this workId' });
      const cert = JSON.parse(certRaw as string);

      // Reconstruct the content string and verify
      const contentStr = `${workTitle || cert.workTitle}|${workTheme || cert.workTheme || ''}|${(workLyrics || cert.workLyrics || []).join('|')}|${userId || cert.userId}|${createdAt || cert.appliedAt || ''}`;
      const match = await verifyContentHash(contentStr, cert.contentHash);

      return c.json({
        verified: match,
        certNumber: cert.certNumber,
        contentHash: cert.contentHash,
        certifiedAt: cert.certifiedAt,
        algorithm: 'SHA-256',
      });
    } catch (error) {
      console.log("Copyright verify error:", error);
      return c.json({ error: `Verification failed: ${error}` }, 500);
    }
  });
}