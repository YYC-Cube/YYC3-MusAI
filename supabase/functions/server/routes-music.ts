/**
 * D-Music §2.2 — Music Routes
 * Routes: likes, annotations, play, comments, songs index/register
 */

import { ROUTE_PREFIX, kv, registerSongId, getAllSongIds, queryCache } from "./server-utils.ts";
import { rateLimit, RATE_STANDARD, RATE_SENSITIVE } from "./rate-limit.ts";
import { validate, annotationSchema, commentSchema, songRegisterSchema } from "./validation.ts";
import { requireAuth } from "./server-utils.ts";

export function registerMusicRoutes(app: any) {
  // ==========================================
  // Likes System
  // ==========================================
  app.get(`${ROUTE_PREFIX}/likes/:songId`, async (c: any) => {
    const songId = c.req.param("songId");
    try {
      const value = await kv.get(`song:${songId}:likes`);
      const likes = value ? parseInt(value as string) : 0;
      return c.json({ likes });
    } catch (error) {
      console.log("Error fetching likes:", error);
      return c.json({ likes: 0 }, 500);
    }
  });

  app.post(`${ROUTE_PREFIX}/likes/:songId`, rateLimit(RATE_SENSITIVE), async (c: any) => {
    const songId = c.req.param("songId");
    try {
      await registerSongId(songId);
      const value = await kv.get(`song:${songId}:likes`);
      const currentLikes = value ? parseInt(value as string) : 0;
      const newLikes = currentLikes + 1;
      await kv.set(`song:${songId}:likes`, newLikes.toString());

      const statsVal = await kv.get(`song:${songId}:stats`);
      let stats = statsVal ? JSON.parse(statsVal as string) : { plays: 0, likes: 0, comments: 0 };
      stats.likes = newLikes;
      await kv.set(`song:${songId}:stats`, JSON.stringify(stats));

      // §6.2 — Invalidate cached leaderboard on likes change
      queryCache.invalidate('cache:leaderboard');

      return c.json({ likes: newLikes });
    } catch (error) {
      console.log("Error updating likes:", error);
      return c.json({ error: "Failed to update likes" }, 500);
    }
  });

  // ==========================================
  // Emotion Annotations System
  // ==========================================
  app.get(`${ROUTE_PREFIX}/annotations/:songId`, async (c: any) => {
    const songId = c.req.param("songId");
    try {
      const value = await kv.get(`song:${songId}:annotations`);
      if (value) {
        const annotations = JSON.parse(value as string);
        return c.json({ annotations });
      }
      return c.json({ annotations: {} });
    } catch (error) {
      console.log(`Error fetching annotations for song ${songId}:`, error);
      return c.json({ annotations: {} }, 500);
    }
  });

  app.post(`${ROUTE_PREFIX}/annotations/:songId`, rateLimit(RATE_STANDARD), async (c: any) => {
    const songId = c.req.param("songId");
    try {
      await registerSongId(songId);
      const body = await c.req.json();
      const parsed = validate(annotationSchema, body);
      if (!parsed.success) return c.json({ error: parsed.error }, 400);
      const { lineIndex, emotion } = parsed.data;

      const value = await kv.get(`song:${songId}:annotations`);
      let annotations: Record<string, Record<string, number>> = {};
      if (value) annotations = JSON.parse(value as string);

      const lineKey = lineIndex.toString();
      if (!annotations[lineKey]) annotations[lineKey] = {};
      annotations[lineKey][emotion] = (annotations[lineKey][emotion] || 0) + 1;

      await kv.set(`song:${songId}:annotations`, JSON.stringify(annotations));
      return c.json({ success: true, annotations });
    } catch (error) {
      console.log(`Error adding annotation for song ${songId}:`, error);
      return c.json({ error: `Failed to add annotation: ${error}` }, 500);
    }
  });

  // ==========================================
  // Play Recording
  // ==========================================
  app.post(`${ROUTE_PREFIX}/play/:songId`, async (c: any) => {
    const songId = c.req.param("songId");
    try {
      await registerSongId(songId);
      const statsVal = await kv.get(`song:${songId}:stats`);
      let stats = statsVal ? JSON.parse(statsVal as string) : { plays: 0, likes: 0, comments: 0 };
      stats.plays += 1;
      await kv.set(`song:${songId}:stats`, JSON.stringify(stats));

      const hour = new Date().toISOString().slice(0, 13);
      const hourlyKey = `analytics:plays:${hour}`;
      const hourlyVal = await kv.get(hourlyKey);
      const hourlyCount = hourlyVal ? parseInt(hourlyVal as string) : 0;
      await kv.set(hourlyKey, (hourlyCount + 1).toString());

      // §6.2 — Invalidate cached analytics/leaderboard on play
      queryCache.invalidatePrefix('cache:analytics');
      queryCache.invalidate('cache:leaderboard');

      return c.json({ success: true, plays: stats.plays });
    } catch (error) {
      console.log(`Error recording play for ${songId}:`, error);
      return c.json({ error: `Failed: ${error}` }, 500);
    }
  });

  // ==========================================
  // Comments System
  // ==========================================
  app.get(`${ROUTE_PREFIX}/comments/:songId`, async (c: any) => {
    const songId = c.req.param("songId");
    try {
      const value = await kv.get(`song:${songId}:comments`);
      const comments = value ? JSON.parse(value as string) : [];
      return c.json({ comments });
    } catch (error) {
      console.log(`Error fetching comments for ${songId}:`, error);
      return c.json({ comments: [] }, 500);
    }
  });

  app.post(`${ROUTE_PREFIX}/comments/:songId`, requireAuth, rateLimit(RATE_STANDARD), async (c: any) => {
    const songId = c.req.param("songId");
    try {
      await registerSongId(songId);
      const body = await c.req.json();
      const parsed = validate(commentSchema, body);
      if (!parsed.success) return c.json({ error: parsed.error }, 400);
      const { userId, userName, text, timestamp: ts } = parsed.data;

      const comment = {
        id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId, userName, text,
        timestamp: ts || 0,
        createdAt: Date.now(),
        likes: 0,
        likedBy: [] as string[],
      };

      const existing = await kv.get(`song:${songId}:comments`);
      let comments = existing ? JSON.parse(existing as string) : [];
      comments = [comment, ...comments].slice(0, 200);
      await kv.set(`song:${songId}:comments`, JSON.stringify(comments));

      const statsVal = await kv.get(`song:${songId}:stats`);
      let stats = statsVal ? JSON.parse(statsVal as string) : { plays: 0, likes: 0, comments: 0 };
      stats.comments = comments.length;
      await kv.set(`song:${songId}:stats`, JSON.stringify(stats));

      return c.json({ success: true, comment });
    } catch (error) {
      console.log(`Error posting comment for ${songId}:`, error);
      return c.json({ error: `Failed: ${error}` }, 500);
    }
  });

  app.post(`${ROUTE_PREFIX}/comments/:songId/like/:commentId`, async (c: any) => {
    const songId = c.req.param("songId");
    const commentId = c.req.param("commentId");
    try {
      const body = await c.req.json();
      const { userId } = body;

      const existing = await kv.get(`song:${songId}:comments`);
      let comments = existing ? JSON.parse(existing as string) : [];

      const idx = comments.findIndex((cm: any) => cm.id === commentId);
      if (idx === -1) return c.json({ error: "Comment not found" }, 404);

      const comment = comments[idx];
      if (!comment.likedBy) comment.likedBy = [];
      if (userId && comment.likedBy.includes(userId)) {
        comment.likedBy = comment.likedBy.filter((id: string) => id !== userId);
        comment.likes = Math.max(0, (comment.likes || 0) - 1);
      } else {
        if (userId) comment.likedBy.push(userId);
        comment.likes = (comment.likes || 0) + 1;
      }

      comments[idx] = comment;
      await kv.set(`song:${songId}:comments`, JSON.stringify(comments));
      return c.json({ success: true, comment });
    } catch (error) {
      console.log(`Error liking comment ${commentId}:`, error);
      return c.json({ error: `Failed: ${error}` }, 500);
    }
  });

  // ==========================================
  // Song Index Management (§8.1)
  // ==========================================
  app.get(`${ROUTE_PREFIX}/songs/index`, async (c: any) => {
    try {
      const songIds = await getAllSongIds();
      return c.json({ songIds, total: songIds.length });
    } catch (error) {
      console.log("Error fetching song index:", error);
      return c.json({ error: `Song index failed: ${error}` }, 500);
    }
  });

  app.post(`${ROUTE_PREFIX}/songs/register`, async (c: any) => {
    try {
      const body = await c.req.json();
      const parsed = validate(songRegisterSchema, body);
      if (!parsed.success) return c.json({ error: parsed.error }, 400);
      const { songId } = parsed.data;
      await registerSongId(songId);
      const allIds = await getAllSongIds();
      return c.json({ success: true, total: allIds.length });
    } catch (error) {
      console.log("Error registering song:", error);
      return c.json({ error: `Registration failed: ${error}` }, 500);
    }
  });
}