/**
 * D-Music §2.2 — Analytics & Recommendations Routes
 * Routes: analytics overview, listening history, recommendations, listening-stats, smart-playlist, leaderboard
 *
 * §6.2 — QueryCache applied to leaderboard (TTL 30s) and analytics overview (TTL 20s)
 */

import { ROUTE_PREFIX, kv, wilsonScore, getAllSongIds, registerSongId, queryCache } from "./server-utils.ts";
import { aiModelManager } from "./ai-model-manager.ts";

// ==========================================
// Internal: compute leaderboard data (reused by cache)
// ==========================================
async function computeLeaderboard() {
  const songIds = await getAllSongIds();
  const rankings: Array<{
    songId: string; likes: number; plays: number; comments: number;
    wilsonScore: number; engagement: number;
  }> = [];

  for (const songId of songIds) {
    const statsVal = await kv.get(`song:${songId}:stats`);
    const stats = statsVal ? JSON.parse(statsVal as string) : { plays: 0, likes: 0, comments: 0 };
    const likesVal = await kv.get(`song:${songId}:likes`);
    const likes = likesVal ? parseInt(likesVal as string) : 0;
    stats.likes = likes;

    const total = stats.plays + stats.likes + stats.comments;
    const positive = stats.likes + stats.comments;
    const ws = wilsonScore(positive, Math.max(total, 1));
    const engagement = total > 0 ? positive / total : 0;

    rankings.push({
      songId, likes: stats.likes, plays: stats.plays,
      comments: stats.comments,
      wilsonScore: Math.round(ws * 10000) / 10000,
      engagement: Math.round(engagement * 100),
    });
  }

  rankings.sort((a, b) => b.wilsonScore - a.wilsonScore);
  return rankings;
}

// ==========================================
// Internal: compute analytics overview (reused by cache)
// ==========================================
async function computeAnalyticsOverview() {
  const songIds = await getAllSongIds();
  let totalPlays = 0, totalLikes = 0, totalComments = 0;
  const songBreakdown: Array<{ songId: string; plays: number; likes: number; comments: number }> = [];

  for (const sid of songIds) {
    const statsVal = await kv.get(`song:${sid}:stats`);
    const st = statsVal ? JSON.parse(statsVal as string) : { plays: 0, likes: 0, comments: 0 };
    const likesVal = await kv.get(`song:${sid}:likes`);
    st.likes = likesVal ? parseInt(likesVal as string) : st.likes || 0;
    totalPlays += st.plays;
    totalLikes += st.likes;
    totalComments += st.comments || 0;
    songBreakdown.push({ songId: sid, ...st });
  }

  const hourlyPlays: Array<{ hour: string; count: number }> = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 3600000);
    const hourKey = d.toISOString().slice(0, 13);
    const val = await kv.get(`analytics:plays:${hourKey}`);
    hourlyPlays.push({
      hour: d.toISOString().slice(11, 16),
      count: val ? parseInt(val as string) : 0,
    });
  }

  const emotionDist: Record<string, number> = { happy: 0, sad: 0, energetic: 0, calm: 0, neutral: 0 };
  for (const sid of songIds) {
    const annoVal = await kv.get(`song:${sid}:annotations`);
    if (annoVal) {
      const annos = JSON.parse(annoVal as string);
      Object.values(annos).forEach((lineData: any) => {
        Object.entries(lineData).forEach(([emo, count]: [string, any]) => {
          if (emotionDist[emo] !== undefined) emotionDist[emo] += count;
        });
      });
    }
  }

  return {
    totalPlays, totalLikes, totalComments,
    totalEngagement: totalPlays + totalLikes + totalComments,
    songBreakdown, hourlyPlays,
    emotionDistribution: Object.entries(emotionDist).map(([name, value]) => ({ name, value })),
  };
}

export function registerAnalyticsRoutes(app: any) {
  // ==========================================
  // Wilson Interval Leaderboard (§6.2 cached, TTL 30s)
  // ==========================================
  app.get(`${ROUTE_PREFIX}/leaderboard`, async (c: any) => {
    try {
      const rankings = await queryCache.getOrFetch(
        'cache:leaderboard',
        computeLeaderboard,
        30_000, // 30s TTL
      );
      return c.json({ rankings });
    } catch (error) {
      console.log("Error computing leaderboard:", error);
      return c.json({ error: `Leaderboard failed: ${error}` }, 500);
    }
  });

  // ==========================================
  // Analytics Overview (§6.2 cached, TTL 20s)
  // ==========================================
  app.get(`${ROUTE_PREFIX}/analytics/overview`, async (c: any) => {
    try {
      const overview = await queryCache.getOrFetch(
        'cache:analytics:overview',
        computeAnalyticsOverview,
        20_000, // 20s TTL
      );
      return c.json(overview);
    } catch (error) {
      console.log("Analytics error:", error);
      return c.json({ error: `Analytics failed: ${error}` }, 500);
    }
  });

  // ==========================================
  // Listening History
  // ==========================================
  app.post(`${ROUTE_PREFIX}/listening-history`, async (c: any) => {
    try {
      const body = await c.req.json();
      const {
        userId = 'anon', songId, songTitle, emotion,
        listenDuration, totalDuration, completionRate,
        skipped = false, timestamp = Date.now(),
      } = body;

      if (!songId) return c.json({ error: "Missing songId" }, 400);

      const entry = {
        userId, songId, songTitle: songTitle || '',
        emotion: emotion || 'neutral',
        listenDuration: listenDuration || 0,
        totalDuration: totalDuration || 0,
        completionRate: completionRate || 0,
        skipped, timestamp,
      };

      const historyKey = `user:${userId}:listening-history`;
      const existing = await kv.get(historyKey);
      let history = existing ? JSON.parse(existing as string) : [];
      history = [entry, ...history].slice(0, 200);
      await kv.set(historyKey, JSON.stringify(history));

      const prefKey = `user:${userId}:emotion-prefs`;
      const prefVal = await kv.get(prefKey);
      let prefs: Record<string, number> = prefVal
        ? JSON.parse(prefVal as string)
        : { happy: 0, sad: 0, energetic: 0, calm: 0, neutral: 0 };

      const weight = Math.max(0.1, completionRate || 0.5);
      if (emotion && prefs[emotion] !== undefined) {
        prefs[emotion] = (prefs[emotion] || 0) + weight;
      }
      await kv.set(prefKey, JSON.stringify(prefs));

      const popularityKey = `song:${songId}:popularity`;
      const popVal = await kv.get(popularityKey);
      const popularity = popVal ? parseFloat(popVal as string) : 0;
      const newPopularity = popularity + (skipped ? 0.1 : weight);
      await kv.set(popularityKey, newPopularity.toString());

      // §6.2 — Invalidate analytics cache after new listen event
      queryCache.invalidatePrefix('cache:analytics');
      queryCache.invalidate('cache:leaderboard');

      return c.json({ success: true });
    } catch (error) {
      console.log("Listening history error:", error);
      return c.json({ error: `Failed to record listening history: ${error}` }, 500);
    }
  });

  // Get Personalized Recommendations
  app.get(`${ROUTE_PREFIX}/recommendations/:userId`, async (c: any) => {
    const userId = c.req.param("userId");
    try {
      const prefVal = await kv.get(`user:${userId}:emotion-prefs`);
      const prefs: Record<string, number> = prefVal
        ? JSON.parse(prefVal as string)
        : { happy: 0, sad: 0, energetic: 0, calm: 0, neutral: 0 };

      const historyVal = await kv.get(`user:${userId}:listening-history`);
      const history = historyVal ? JSON.parse(historyVal as string) : [];
      const recentSongIds = new Set(history.slice(0, 10).map((h: any) => h.songId));

      const totalWeight = Object.values(prefs).reduce((a, b) => a + b, 0);
      let emotionScores: Array<{ emotion: string; score: number }> = [];
      if (totalWeight > 0) {
        emotionScores = Object.entries(prefs)
          .map(([emotion, weight]) => ({ emotion, score: weight / totalWeight }))
          .sort((a, b) => b.score - a.score);
      }

      const songIds = await getAllSongIds();
      const recommendations: Array<{
        songId: string; score: number; reason: string; reasonZh: string; isNew: boolean;
      }> = [];

      for (const sid of songIds) {
        const statsVal = await kv.get(`song:${sid}:stats`);
        const stats = statsVal ? JSON.parse(statsVal as string) : { plays: 0, likes: 0, comments: 0 };
        const popularityVal = await kv.get(`song:${sid}:popularity`);
        const popularity = popularityVal ? parseFloat(popularityVal as string) : 0;

        const annoVal = await kv.get(`song:${sid}:annotations`);
        const annos = annoVal ? JSON.parse(annoVal as string) : {};
        const songEmotions: Record<string, number> = { happy: 0, sad: 0, energetic: 0, calm: 0, neutral: 0 };
        Object.values(annos).forEach((lineData: any) => {
          Object.entries(lineData).forEach(([emo, count]: [string, any]) => {
            if (songEmotions[emo] !== undefined) songEmotions[emo] += count;
          });
        });

        let score = 0;
        let reason = 'Popular in community';
        let reasonZh = '社区热门';

        if (emotionScores.length > 0 && totalWeight > 2) {
          const topEmotion = emotionScores[0].emotion;
          const songTotal = Object.values(songEmotions).reduce((a, b) => a + b, 0);
          if (songTotal > 0 && songEmotions[topEmotion]) {
            const emotionMatch = songEmotions[topEmotion] / songTotal;
            score += emotionMatch * 0.4;
            const emotionLabelsEn: Record<string, string> = { happy: 'happy', sad: 'melancholic', energetic: 'energetic', calm: 'calm', neutral: 'balanced' };
            const emotionLabelsZh: Record<string, string> = { happy: '欢快', sad: '忧伤', energetic: '充满活力', calm: '宁静', neutral: '平衡' };
            reason = `Matches your ${emotionLabelsEn[topEmotion] || topEmotion} mood`;
            reasonZh = `匹配你的${emotionLabelsZh[topEmotion] || topEmotion}偏好`;
          }
        }

        const maxPop = Math.max(popularity, 1);
        score += (Math.log(maxPop + 1) / Math.log(100)) * 0.3;

        const totalEngagement = stats.plays + stats.likes * 2 + stats.comments * 3;
        score += Math.min(totalEngagement / 50, 1) * 0.2;

        const isNew = !recentSongIds.has(sid);
        if (isNew) {
          score += 0.1;
          if (score > 0.3) { reason = 'Fresh pick for you'; reasonZh = '为你推荐的新发现'; }
        }

        recommendations.push({
          songId: sid,
          score: Math.round(score * 1000) / 1000,
          reason, reasonZh, isNew,
        });
      }

      recommendations.sort((a, b) => b.score - a.score);
      return c.json({
        userId, recommendations,
        dominantMood: emotionScores.length > 0 ? emotionScores[0].emotion : 'neutral',
        totalListeningEvents: history.length,
      });
    } catch (error) {
      console.log(`Recommendations error for user ${userId}:`, error);
      return c.json({ error: `Recommendations failed: ${error}` }, 500);
    }
  });

  // Get Listening History Summary
  app.get(`${ROUTE_PREFIX}/listening-history/:userId`, async (c: any) => {
    const userId = c.req.param("userId");
    try {
      const historyVal = await kv.get(`user:${userId}:listening-history`);
      const history = historyVal ? JSON.parse(historyVal as string) : [];
      const prefVal = await kv.get(`user:${userId}:emotion-prefs`);
      const prefs = prefVal ? JSON.parse(prefVal as string) : {};
      return c.json({ userId, history: history.slice(0, 50), emotionPreferences: prefs, totalEvents: history.length });
    } catch (error) {
      console.log(`Listening history fetch error for ${userId}:`, error);
      return c.json({ error: `Failed: ${error}` }, 500);
    }
  });

  // Listening Stats (§18.x)
  app.get(`${ROUTE_PREFIX}/listening-stats/:userId`, async (c: any) => {
    const userId = c.req.param("userId");
    try {
      const historyVal = await kv.get(`user:${userId}:listening-history`);
      const history = historyVal ? JSON.parse(historyVal as string) : [];
      console.log(`[ListeningStats] Retrieved ${history.length} entries for user ${userId}`);
      return c.json({ history });
    } catch (error) {
      console.log(`Listening stats fetch error for ${userId}:`, error);
      return c.json({ error: `Failed: ${error}` }, 500);
    }
  });

  // ==========================================
  // §25.x — Smart Playlist
  // ==========================================
  app.get(`${ROUTE_PREFIX}/smart-playlist/:userId`, async (c: any) => {
    try {
      const userId = c.req.param("userId");
      const currentEmotion = c.req.query("emotion") || "neutral";

      const histKey = `user:${userId}:listening-history`;
      const histRaw = await kv.get(histKey);
      const history: any[] = histRaw ? JSON.parse(histRaw as string) : [];

      const emotionCounts: Record<string, number> = { happy: 0, sad: 0, energetic: 0, calm: 0, neutral: 0 };
      let totalCompletion = 0;
      for (const entry of history) {
        const emo = entry.emotion || 'neutral';
        emotionCounts[emo] = (emotionCounts[emo] || 0) + 1;
        totalCompletion += entry.completionRate || 0;
      }
      const total = Math.max(history.length, 1);
      const distribution = Object.entries(emotionCounts)
        .map(([emotion, count]) => ({ emotion, pct: Math.round((count / total) * 100) }))
        .sort((a, b) => b.pct - a.pct);
      const dominant = distribution[0]?.emotion || currentEmotion;

      const analysis = {
        dominant, distribution,
        listenCount: history.length,
        avgCompletionRate: Math.round((totalCompletion / total) * 100) / 100,
      };

      const indexRaw = await kv.get('song-index');
      let songIds: string[] = indexRaw ? JSON.parse(indexRaw as string) : [];
      if (songIds.length === 0) {
        songIds = [...new Set(history.map((h: any) => h.songId).filter(Boolean))];
      }

      const listenMap = new Map<string, any[]>();
      for (const entry of history) {
        if (!listenMap.has(entry.songId)) listenMap.set(entry.songId, []);
        listenMap.get(entry.songId)!.push(entry);
      }

      const queue = songIds.map((songId: string, i: number) => {
        const entries = listenMap.get(songId) || [];
        let matchScore = 50 + Math.floor(Math.random() * 20);
        let reason = 'Discover something new';
        let reasonZh = '探索新体验';

        if (entries.length > 0) {
          const emoMatch = entries.filter((e: any) => e.emotion === currentEmotion).length;
          const completionAvg = entries.reduce((sum: number, e: any) => sum + (e.completionRate || 0), 0) / entries.length;
          matchScore = Math.min(99, Math.round(
            (emoMatch / entries.length) * 40 +
            completionAvg * 30 +
            Math.min(entries.length * 5, 20) +
            (Math.random() * 10)
          ));

          if (matchScore > 70) { reason = 'Strong mood alignment'; reasonZh = '心情高度契合'; }
          else if (matchScore > 50) { reason = 'Frequently enjoyed'; reasonZh = '经常收听'; }
          else { reason = 'Complementary energy'; reasonZh = '能量互补'; }
        }

        const title = entries[0]?.songTitle || `Track ${i + 1}`;
        return { index: i, id: songId, title, artist: '', matchScore, reason, reasonZh };
      });

      queue.sort((a: any, b: any) => b.matchScore - a.matchScore);
      console.log(`[SmartPlaylist] Generated for ${userId}: ${queue.length} tracks, dominant=${dominant}`);
      return c.json({ analysis, queue: queue.slice(0, 30) });
    } catch (error) {
      console.log("Smart playlist error:", error);
      return c.json({ error: `Smart playlist failed: ${error}` }, 500);
    }
  });

  // ==========================================
  // §6.2 — Cache Stats (diagnostic endpoint)
  // ==========================================
  app.get(`${ROUTE_PREFIX}/cache/stats`, async (c: any) => {
    return c.json({ cache: queryCache.stats() });
  });

  // ==========================================
  // §5.1 AI-Powered Recommendation Analysis (GPT user preference insights)
  // ==========================================
  app.get(`${ROUTE_PREFIX}/recommendations/:userId/ai-analysis`, async (c: any) => {
    const userId = c.req.param("userId");
    try {
      // Gather user data
      const prefVal = await kv.get(`user:${userId}:emotion-prefs`);
      const emotionPrefs: Record<string, number> = prefVal
        ? JSON.parse(prefVal as string)
        : { happy: 0, sad: 0, energetic: 0, calm: 0, neutral: 0 };

      const historyVal = await kv.get(`user:${userId}:listening-history`);
      const history = historyVal ? JSON.parse(historyVal as string) : [];

      const totalWeight = Object.values(emotionPrefs).reduce((a, b) => a + b, 0);
      const sorted = Object.entries(emotionPrefs).sort(([, a], [, b]) => b - a);
      const dominantMood = totalWeight > 0 ? sorted[0][0] : 'neutral';

      const recentHistory = history.slice(0, 15).map((h: any) => ({
        songId: h.songId || '',
        songTitle: h.songTitle || '',
        emotion: h.emotion || 'neutral',
        completionRate: h.completionRate || 0,
      }));

      const analysis = await aiModelManager.analyzeUserPreferences({
        userId,
        emotionPrefs,
        recentHistory,
        dominantMood,
        totalListeningEvents: history.length,
      });

      console.log(`[RecommendationAI] Analysis for ${userId}: personality="${analysis.personalityTag}", provider=${analysis.provider}`);

      return c.json({
        userId,
        analysis,
      });
    } catch (error) {
      console.log(`Recommendation AI analysis error for ${userId}:`, error);
      return c.json({ error: `AI recommendation analysis failed: ${error}` }, 500);
    }
  });
}