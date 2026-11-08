/**
 * D-Music §2.2 — Social Routes
 * Routes: achievements, notifications, timeline comments, fork tree, mheart
 */

import { ROUTE_PREFIX, kv, requireAuth } from "./server-utils.ts";
import { rateLimit, RATE_STANDARD, RATE_SENSITIVE } from "./rate-limit.ts";
import { validate, achievementTrackSchema } from "./validation.ts";

// ==========================================
// Achievement Definitions
// ==========================================
const ACHIEVEMENT_DEFS = [
  { id: 'first_creation', nameZh: '初创者', nameEn: 'First Creation', descZh: '完成第一首作品', descEn: 'Complete your first work', icon: '🎵', condition: (s: any) => s.totalWorks >= 1 },
  { id: 'prolific_3', nameZh: '多产新手', nameEn: 'Getting Started', descZh: '完成3首作品', descEn: 'Complete 3 works', icon: '🎶', condition: (s: any) => s.totalWorks >= 3 },
  { id: 'prolific_10', nameZh: '创作达人', nameEn: 'Prolific Creator', descZh: '完成10首作品', descEn: 'Complete 10 works', icon: '🎼', condition: (s: any) => s.totalWorks >= 10 },
  { id: 'inspiration_fountain', nameZh: '灵感喷泉', nameEn: 'Inspiration Fountain', descZh: '连续7天每日创作', descEn: 'Create daily for 7 consecutive days', icon: '⛲', condition: (s: any) => s.streakDays >= 7 },
  { id: 'community_torch', nameZh: '社区火炬手', nameEn: 'Community Torch', descZh: '评论被赞100次', descEn: 'Get 100 likes on comments', icon: '🔥', condition: (s: any) => s.totalLikesReceived >= 100 },
  { id: 'remix_master', nameZh: '改编大师', nameEn: 'Remix Master', descZh: '作品被改编5次', descEn: 'Have your work forked 5 times', icon: '🔀', condition: (s: any) => s.totalForks >= 5 },
  { id: 'popular_10k', nameZh: '万人迷', nameEn: 'Fan Favorite', descZh: '作品播放量超过10000', descEn: 'Reach 10,000 total plays', icon: '🌟', condition: (s: any) => s.totalPlays >= 10000 },
  { id: 'social_butterfly', nameZh: '社交蝴蝶', nameEn: 'Social Butterfly', descZh: '发送50条喊话消息', descEn: 'Send 50 shoutout messages', icon: '🦋', condition: (s: any) => s.totalMessages >= 50 },
  { id: 'time_traveler', nameZh: '时光旅行者', nameEn: 'Time Traveler', descZh: '创建5个时间胶囊', descEn: 'Create 5 time capsules', icon: '⏳', condition: (s: any) => s.totalCapsules >= 5 },
  { id: 'star_collector', nameZh: '星力收集者', nameEn: 'Star Collector', descZh: '累计获得2000星力值', descEn: 'Accumulate 2,000 Star Power', icon: '💎', condition: (s: any) => s.peakStarPower >= 2000 },
  { id: 'location_explorer', nameZh: '位置探索者', nameEn: 'Location Explorer', descZh: '发送5条位置消息', descEn: 'Send 5 location-tagged messages', icon: '📍', condition: (s: any) => s.locationMessages >= 5 },
  { id: 'voice_artist', nameZh: '声音艺术家', nameEn: 'Voice Artist', descZh: '发送10条语音消息', descEn: 'Send 10 voice messages', icon: '🎙️', condition: (s: any) => s.voiceMessages >= 10 },
];

export function registerSocialRoutes(app: any) {
  // ==========================================
  // Achievements
  // ==========================================
  app.get(`${ROUTE_PREFIX}/achievements/:userId`, async (c: any) => {
    const userId = c.req.param("userId");
    try {
      const statsKey = `user:${userId}:achievement-stats`;
      const statsRaw = await kv.get(statsKey);
      const stats = statsRaw ? JSON.parse(statsRaw as string) : {
        totalWorks: 0, streakDays: 0, totalLikesReceived: 0, totalForks: 0,
        totalPlays: 0, totalMessages: 0, totalCapsules: 0, peakStarPower: 0,
        locationMessages: 0, voiceMessages: 0,
      };

      const unlockedKey = `user:${userId}:achievements`;
      const unlockedRaw = await kv.get(unlockedKey);
      const unlocked: string[] = unlockedRaw ? JSON.parse(unlockedRaw as string) : [];

      const newlyUnlocked: string[] = [];
      for (const def of ACHIEVEMENT_DEFS) {
        if (!unlocked.includes(def.id) && def.condition(stats)) {
          unlocked.push(def.id);
          newlyUnlocked.push(def.id);
        }
      }

      if (newlyUnlocked.length > 0) {
        await kv.set(unlockedKey, JSON.stringify(unlocked));
      }

      const achievements = ACHIEVEMENT_DEFS.map(def => ({
        id: def.id, nameZh: def.nameZh, nameEn: def.nameEn,
        descZh: def.descZh, descEn: def.descEn, icon: def.icon,
        unlocked: unlocked.includes(def.id),
        newlyUnlocked: newlyUnlocked.includes(def.id),
      }));

      return c.json({ achievements, stats, totalUnlocked: unlocked.length, totalAchievements: ACHIEVEMENT_DEFS.length });
    } catch (error) {
      console.log(`Error fetching achievements for ${userId}:`, error);
      return c.json({ achievements: [], stats: {}, totalUnlocked: 0, totalAchievements: ACHIEVEMENT_DEFS.length }, 500);
    }
  });

  app.post(`${ROUTE_PREFIX}/achievements/:userId/track`, requireAuth, async (c: any) => {
    const userId = c.req.param("userId");
    try {
      const body = await c.req.json();
      const parsed = validate(achievementTrackSchema, body);
      if (!parsed.success) return c.json({ error: parsed.error }, 400);
      const { action } = parsed.data;

      const statsKey = `user:${userId}:achievement-stats`;
      const statsRaw = await kv.get(statsKey);
      const stats = statsRaw ? JSON.parse(statsRaw as string) : {
        totalWorks: 0, streakDays: 0, totalLikesReceived: 0, totalForks: 0,
        totalPlays: 0, totalMessages: 0, totalCapsules: 0, peakStarPower: 0,
        locationMessages: 0, voiceMessages: 0, lastActiveDate: '',
      };

      switch (action) {
        case 'create_work': stats.totalWorks = (stats.totalWorks || 0) + 1; break;
        case 'receive_like': stats.totalLikesReceived = (stats.totalLikesReceived || 0) + 1; break;
        case 'receive_fork': stats.totalForks = (stats.totalForks || 0) + 1; break;
        case 'send_message': stats.totalMessages = (stats.totalMessages || 0) + 1; break;
        case 'create_capsule': stats.totalCapsules = (stats.totalCapsules || 0) + 1; break;
        case 'send_voice': stats.voiceMessages = (stats.voiceMessages || 0) + 1; break;
        case 'send_location': stats.locationMessages = (stats.locationMessages || 0) + 1; break;
        case 'daily_login': {
          const today = new Date().toISOString().slice(0, 10);
          const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
          if (stats.lastActiveDate === yesterday) {
            stats.streakDays = (stats.streakDays || 0) + 1;
          } else if (stats.lastActiveDate !== today) {
            stats.streakDays = 1;
          }
          stats.lastActiveDate = today;
          break;
        }
      }

      if (body.starPower && body.starPower > (stats.peakStarPower || 0)) {
        stats.peakStarPower = body.starPower;
      }
      if (body.totalPlays) stats.totalPlays = body.totalPlays;

      await kv.set(statsKey, JSON.stringify(stats));
      console.log(`Achievement tracked for ${userId}: ${action}`);
      return c.json({ success: true, stats });
    } catch (error) {
      console.log(`Error tracking achievement for ${userId}:`, error);
      return c.json({ error: `Track failed: ${error}` }, 500);
    }
  });

  // ==========================================
  // Notifications
  // ==========================================
  // §v11.1 — Migrated from notifications:{userName} to notifications:user:{userId}
  // Backward-compatible: reads both old (userName-based) and new (userId-based) keys
  app.get(`${ROUTE_PREFIX}/notifications/:userId`, async (c: any) => {
    const userId = c.req.param("userId");
    try {
      // Read from new userId-based key
      const newKey = `notifications:user:${userId}`;
      const notifRaw = await kv.get(newKey);
      let notifications = notifRaw ? JSON.parse(notifRaw as string) : [];

      // Backward compatibility: also check old userName-based key if new key is empty
      if (notifications.length === 0) {
        // Try common userName patterns (email prefix, etc.)
        // This is best-effort migration for legacy data
        const profileRaw = await kv.get(`user:${userId}:profile`);
        if (profileRaw) {
          const profile = JSON.parse(profileRaw as string);
          const oldUserName = profile.displayName || profile.nickname || '';
          if (oldUserName) {
            const oldKey = `notifications:${oldUserName}`;
            const oldRaw = await kv.get(oldKey);
            if (oldRaw) {
              notifications = JSON.parse(oldRaw as string);
              // Migrate: copy to new key and delete old key
              await kv.set(newKey, JSON.stringify(notifications));
              await kv.del(oldKey);
              console.log(`[Notifications] Migrated ${notifications.length} notifications from userName "${oldUserName}" to userId "${userId}"`);
            }
          }
        }
      }

      return c.json({ notifications });
    } catch (error) {
      console.log(`Error fetching notifications for ${userId}:`, error);
      return c.json({ notifications: [] }, 500);
    }
  });

  app.post(`${ROUTE_PREFIX}/notifications/:userId/read`, async (c: any) => {
    const userId = c.req.param("userId");
    try {
      const notifKey = `notifications:user:${userId}`;
      const notifRaw = await kv.get(notifKey);
      let notifications = notifRaw ? JSON.parse(notifRaw as string) : [];
      notifications = notifications.map((n: any) => ({ ...n, read: true }));
      await kv.set(notifKey, JSON.stringify(notifications));
      return c.json({ success: true });
    } catch (error) {
      console.log(`Error marking notifications read for ${userId}:`, error);
      return c.json({ error: `Failed: ${error}` }, 500);
    }
  });

  // ==========================================
  // §19.x — Timeline Comments
  // ==========================================
  app.get(`${ROUTE_PREFIX}/timeline-comments/:songId`, async (c: any) => {
    try {
      const songId = c.req.param('songId');
      const raw = await kv.get(`timeline-comments:${songId}`);
      const comments = raw ? JSON.parse(raw as string) : [];
      return c.json({ comments });
    } catch (error) {
      console.log(`Timeline comments GET error:`, error);
      return c.json({ error: `Failed to get timeline comments: ${error}` }, 500);
    }
  });

  app.post(`${ROUTE_PREFIX}/timeline-comments/:songId`, requireAuth, rateLimit(RATE_STANDARD), async (c: any) => {
    try {
      const songId = c.req.param('songId');
      const body = await c.req.json();
      const { text, timestamp, userName, color } = body;
      if (!text || timestamp === undefined) {
        return c.json({ error: 'text and timestamp are required' }, 400);
      }
      const comment = {
        id: `tc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        text: String(text).slice(0, 100),
        timestamp: Number(timestamp),
        userName: String(userName || 'Anonymous').slice(0, 30),
        color: color || '#FFFFFF',
        createdAt: Date.now(),
        likes: 0,
      };
      const raw = await kv.get(`timeline-comments:${songId}`);
      let comments: any[] = raw ? JSON.parse(raw as string) : [];
      comments.push(comment);
      if (comments.length > 200) comments = comments.slice(-200);
      await kv.set(`timeline-comments:${songId}`, JSON.stringify(comments));
      console.log(`[TimelineComments] New comment on ${songId} at ${timestamp}s`);
      return c.json({ comment, total: comments.length });
    } catch (error) {
      console.log(`Timeline comments POST error:`, error);
      return c.json({ error: `Failed to post timeline comment: ${error}` }, 500);
    }
  });

  app.post(`${ROUTE_PREFIX}/timeline-comments/:songId/like/:commentId`, rateLimit(RATE_SENSITIVE), async (c: any) => {
    try {
      const songId = c.req.param('songId');
      const commentId = c.req.param('commentId');
      const raw = await kv.get(`timeline-comments:${songId}`);
      let comments: any[] = raw ? JSON.parse(raw as string) : [];
      const idx = comments.findIndex((cm: any) => cm.id === commentId);
      if (idx >= 0) {
        comments[idx].likes = (comments[idx].likes || 0) + 1;
        await kv.set(`timeline-comments:${songId}`, JSON.stringify(comments));
      }
      return c.json({ success: true });
    } catch (error) {
      console.log(`Timeline comment like error:`, error);
      return c.json({ error: `Failed to like timeline comment: ${error}` }, 500);
    }
  });

  // ==========================================
  // §20.x — Fork Tree
  // ==========================================
  app.get(`${ROUTE_PREFIX}/works/fork-tree/:workId`, async (c: any) => {
    try {
      const rootWorkId = c.req.param('workId');
      const allWorks: any[] = [];
      const queue = [rootWorkId];
      const visited = new Set<string>();

      while (queue.length > 0 && allWorks.length < 50) {
        const wid = queue.shift()!;
        if (visited.has(wid)) continue;
        visited.add(wid);

        const workRaw = await kv.get(`work:${wid}`);
        if (workRaw) {
          const work = JSON.parse(workRaw as string);
          allWorks.push(work);
        }

        const forksRaw = await kv.get(`work:${wid}:forks`);
        if (forksRaw) {
          const forkIds: string[] = JSON.parse(forksRaw as string);
          for (const fid of forkIds) {
            if (!visited.has(fid)) queue.push(fid);
          }
        }
      }

      return c.json({ tree: allWorks, rootId: rootWorkId });
    } catch (error) {
      console.log(`Fork tree GET error:`, error);
      return c.json({ error: `Failed to get fork tree: ${error}` }, 500);
    }
  });

  // ==========================================
  // §21.x — M Heart Value System
  // ==========================================
  app.get(`${ROUTE_PREFIX}/mheart/:userId`, async (c: any) => {
    try {
      const userId = c.req.param('userId');

      const histRaw = await kv.get(`user:${userId}:listening-history`);
      let emotionIntensity = 0;
      let emotionBreakdown: Record<string, number> = {};
      let totalListenDuration = 0;
      let totalSessions = 0;
      if (histRaw) {
        const history: any[] = JSON.parse(histRaw as string);
        totalSessions = history.length;
        const emotionWeights: Record<string, number> = {
          energetic: 1.0, happy: 0.8, calm: 0.5, sad: 0.7, neutral: 0.3,
        };
        let totalWeight = 0;
        for (const entry of history) {
          const w = emotionWeights[entry.emotion] || 0.3;
          const durationFactor = entry.listenDuration
            ? Math.min(2, 1 + Math.log10(1 + entry.listenDuration / 60))
            : 1;
          totalWeight += w * durationFactor;
          totalListenDuration += entry.listenDuration || 0;
          emotionBreakdown[entry.emotion] = (emotionBreakdown[entry.emotion] || 0) + 1;
        }
        const durationBonus = Math.min(2, totalListenDuration / 3600);
        emotionIntensity = Math.min(10, (totalWeight / Math.max(history.length, 1)) * (8 + durationBonus));
      }

      const profileRaw = await kv.get(`profile:${userId}`);
      let resonance = 0;
      if (profileRaw) {
        const profile = JSON.parse(profileRaw as string);
        const likes = profile.totalLikes || 0;
        const annos = profile.totalAnnotations || 0;
        resonance = Math.min(10, Math.log10(1 + likes * 2 + annos * 3) * 3);
      }
      if (totalSessions > 10) {
        resonance = Math.min(10, resonance + Math.log10(totalSessions) * 0.5);
      }

      const achievRaw = await kv.get(`achievements:${userId}`);
      let rarity = 0;
      const totalPossibleAchievements = 12;
      if (achievRaw) {
        const achievements: string[] = JSON.parse(achievRaw as string);
        const unlockRate = achievements.length / totalPossibleAchievements;
        rarity = Math.min(10, (1 - unlockRate) * 10 + unlockRate * 3);
      } else {
        rarity = 8;
      }

      const mheartScore = Math.round(
        emotionIntensity * 0.45 * 100 +
        resonance * 0.30 * 100 +
        rarity * 0.25 * 100
      );

      const mheartData = {
        score: mheartScore,
        emotionIntensity: Math.round(emotionIntensity * 10) / 10,
        resonance: Math.round(resonance * 10) / 10,
        rarity: Math.round(rarity * 10) / 10,
        emotionBreakdown,
        updatedAt: Date.now(),
        listeningMinutes: Math.round(totalListenDuration / 60),
        totalSessions,
      };
      await kv.set(`mheart:${userId}`, JSON.stringify(mheartData));

      const trendKey = `mheart-trend:${userId}`;
      const trendRaw = await kv.get(trendKey);
      let trend: any[] = trendRaw ? JSON.parse(trendRaw as string) : [];
      trend.push({ score: mheartScore, timestamp: Date.now() });
      if (trend.length > 30) trend = trend.slice(-30);
      await kv.set(trendKey, JSON.stringify(trend));

      return c.json({ mheart: mheartData, trend });
    } catch (error) {
      console.log(`MHeart GET error:`, error);
      return c.json({ error: `Failed to get MHeart value: ${error}` }, 500);
    }
  });
}