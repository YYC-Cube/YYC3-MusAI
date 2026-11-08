/**
 * D-Music §2.2 — Creative Challenge Routes (§23-§24)
 *
 * Routes: challenges/active, submit, entries, vote, champions, notifications, finalize
 * Extracted from index.tsx for modularization.
 */

import * as kv from "./kv_store.tsx";
import { requireAuth, ROUTE_PREFIX } from "./server-utils.ts";
import { aiModelManager } from "./ai-model-manager.ts";
import { validate, challengeSubmitSchema, challengeVoteSchema } from "./validation.ts";

const P = ROUTE_PREFIX;

const CHALLENGE_THEMES = [
  { id: 'summer-electronic', titleZh: '夏日电子乐', titleEn: 'Summer Electronic', descZh: '用电子音色捕捉夏日的热情与活力', descEn: 'Capture summer vibes with electronic sounds', tags: ['electronic', 'summer', 'upbeat'] },
  { id: 'midnight-jazz', titleZh: '午夜爵士', titleEn: 'Midnight Jazz', descZh: '深夜的慵懒与优雅', descEn: 'Late-night lazy elegance', tags: ['jazz', 'night', 'smooth'] },
  { id: 'starlight-ballad', titleZh: '星光叙事曲', titleEn: 'Starlight Ballad', descZh: '在星空下讲述一个故事', descEn: 'Tell a story under the stars', tags: ['ballad', 'story', 'stars'] },
  { id: 'cyber-punk', titleZh: '赛博朋克混响', titleEn: 'Cyberpunk Reverb', descZh: '未来都市的电子噪声', descEn: 'Electronic noise of future cities', tags: ['cyberpunk', 'noise', 'future'] },
  { id: 'ocean-ambient', titleZh: '深海环境音', titleEn: 'Ocean Ambient', descZh: '来自深海的宁静与神秘', descEn: 'Serenity and mystery from the deep', tags: ['ambient', 'ocean', 'calm'] },
  { id: 'retro-wave', titleZh: '复古浪潮', titleEn: 'Retro Wave', descZh: '80年代合成器的怀旧回忆', descEn: '80s synth nostalgia', tags: ['retro', 'synthwave', '80s'] },
  { id: 'folk-whisper', titleZh: '民谣轻语', titleEn: 'Folk Whisper', descZh: '用民谣诉说生活的诗意', descEn: 'Poetic folk storytelling', tags: ['folk', 'acoustic', 'poetry'] },
];

export function registerChallengeRoutes(app: any) {

  app.get(`${P}/challenges/active`, async (c: any) => {
    try {
      const challengeKey = `challenges:active`;
      let challengeRaw = await kv.get(challengeKey);
      let challenge = challengeRaw ? JSON.parse(challengeRaw as string) : null;
      const now = Date.now();
      let autoFinalizeResult: any = null;
      if (!challenge || challenge.endsAt < now) {
        // §24.x — Auto-finalize expired challenge before creating new one
        if (challenge && challenge.endsAt < now) {
          try {
            const oldId = challenge.id;
            const oldEntriesKey = `challenges:entries:${oldId}`;
            const oldEntriesRaw = await kv.get(oldEntriesKey);
            let oldEntries: any[] = oldEntriesRaw ? JSON.parse(oldEntriesRaw as string) : [];
            if (oldEntries.length > 0) {
              const maxV = Math.max(1, ...oldEntries.map((e: any) => e.communityVotes || 0));
              oldEntries = oldEntries.map((e: any) => ({
                ...e,
                communityScoreNorm: maxV > 0 ? ((e.communityVotes || 0) / maxV) * 100 : 0,
                totalScore: Math.round((e.judgeScore * 0.7 + ((e.communityVotes || 0) / maxV) * 100 * 0.3) * 10) / 10,
              }));
              oldEntries.sort((a: any, b: any) => b.totalScore - a.totalScore);
              await kv.set(oldEntriesKey, JSON.stringify(oldEntries));
              const spRewards = [500, 300, 200];
              for (let i = 0; i < Math.min(3, oldEntries.length); i++) {
                const ent = oldEntries[i];
                const spKey = `user:${ent.userId}:starpower`;
                const spRaw = await kv.get(spKey);
                await kv.set(spKey, String((spRaw ? parseInt(spRaw as string) : 0) + spRewards[i]));
                console.log(`[§24.x AutoFinalize] Awarded ${spRewards[i]} SP to ${ent.userName} (#${i + 1})`);
              }
              const champ = {
                challengeId: oldId,
                challengeTitle: { zh: challenge.titleZh, en: challenge.titleEn },
                winner: { userName: oldEntries[0].userName, workTitle: oldEntries[0].workTitle, totalScore: oldEntries[0].totalScore, userId: oldEntries[0].userId },
                runnerUp: oldEntries[1] ? { userName: oldEntries[1].userName, workTitle: oldEntries[1].workTitle, totalScore: oldEntries[1].totalScore, userId: oldEntries[1].userId } : null,
                thirdPlace: oldEntries[2] ? { userName: oldEntries[2].userName, workTitle: oldEntries[2].workTitle, totalScore: oldEntries[2].totalScore, userId: oldEntries[2].userId } : null,
                totalEntries: oldEntries.length, finalizedAt: now,
              };
              const champRaw = await kv.get('challenges:champions');
              let champs: any[] = champRaw ? JSON.parse(champRaw as string) : [];
              if (!champs.some((ch: any) => ch.challengeId === oldId)) {
                champs.unshift(champ);
                if (champs.length > 20) champs = champs.slice(0, 20);
                await kv.set('challenges:champions', JSON.stringify(champs));
              }
              const notifs = oldEntries.map((e: any, idx: number) => ({
                userId: e.userId, rank: idx + 1, spAwarded: idx < 3 ? spRewards[idx] : 0,
                isWinner: idx === 0, challengeTitle: { zh: challenge.titleZh, en: challenge.titleEn }, notifiedAt: now,
              }));
              await kv.set(`challenge-notifications:${oldId}`, JSON.stringify(notifs));
              autoFinalizeResult = { finalized: true, previousChallenge: { id: oldId, titleZh: challenge.titleZh, titleEn: challenge.titleEn }, winner: champ.winner, totalEntries: oldEntries.length };
              console.log(`[§24.x AutoFinalize] ${oldId} done: winner=${oldEntries[0].userName}, ${oldEntries.length} entries`);
            }
          } catch (fe) { console.log(`[§24.x AutoFinalize] Error:`, fe); }
        }
        const theme = CHALLENGE_THEMES[Math.floor(Math.random() * CHALLENGE_THEMES.length)];
        challenge = {
          id: `challenge-${Date.now()}`, ...theme,
          startsAt: now, endsAt: now + 7 * 86400000,
          week: Math.floor(now / (7 * 86400000)),
          judgeWeight: 0.7, communityWeight: 0.3,
          prizes: [
            { rank: 1, rewardZh: '首页聚光灯(7天) + 500 SP', rewardEn: 'Homepage Spotlight (7d) + 500 SP', sp: 500 },
            { rank: 2, rewardZh: '钻石徽章 + 300 SP', rewardEn: 'Diamond Badge + 300 SP', sp: 300 },
            { rank: 3, rewardZh: 'AI无限卡 + 200 SP', rewardEn: 'AI Unlimited Card + 200 SP', sp: 200 },
          ],
          entryCount: 0,
        };
        await kv.set(challengeKey, JSON.stringify(challenge));
        await kv.set(`challenges:entries:${challenge.id}`, JSON.stringify([]));
      }
      const entriesRaw = await kv.get(`challenges:entries:${challenge.id}`);
      challenge.entryCount = entriesRaw ? JSON.parse(entriesRaw as string).length : 0;
      return c.json({ challenge, serverTime: Date.now(), autoFinalizeResult });
    } catch (error) { console.log("Challenge active error:", error); return c.json({ error: `Challenge fetch failed: ${error}` }, 500); }
  });

  app.post(`${P}/challenges/:challengeId/submit`, requireAuth, async (c: any) => {
    const challengeId = c.req.param("challengeId");
    try {
      const body = await c.req.json();
      const parsed = validate(challengeSubmitSchema, body);
      if (!parsed.success) return c.json({ error: parsed.error }, 400);
      const { userId, userName, workId, workTitle, workTheme, workLyrics } = parsed.data;

      const entriesKey = `challenges:entries:${challengeId}`;
      const entriesRaw = await kv.get(entriesKey);
      let entries = entriesRaw ? JSON.parse(entriesRaw as string) : [];
      if (entries.some((e: any) => e.userId === userId)) return c.json({ error: 'Already submitted', alreadySubmitted: true }, 400);

      // §M-4 — AI-powered judge scoring via AIModelManager (replaces Math.random())
      // Fetches current challenge for context (theme/tags)
      let challengeTheme = '';
      let challengeTags: string[] = [];
      try {
        const challengeRaw = await kv.get('challenges:active');
        if (challengeRaw) {
          const ch = JSON.parse(challengeRaw as string);
          challengeTheme = ch.titleEn || ch.titleZh || '';
          challengeTags = ch.tags || [];
        }
      } catch { /* non-critical */ }

      let judgeScore: number;
      let aiBreakdown: any = null;
      let aiFeedback = '';
      let aiProvider = 'template';
      try {
        const emotionResult = await aiModelManager.analyzeEmotion({
          workTitle,
          workTheme: workTheme || '',
          workLyrics: workLyrics || [],
          challengeTheme,
          challengeTags,
        });
        judgeScore = emotionResult.score;
        aiBreakdown = emotionResult.breakdown;
        aiFeedback = emotionResult.feedback;
        aiProvider = emotionResult.provider;
        console.log(`[M-4] AI Judge (${aiProvider}): score=${judgeScore}, breakdown=${JSON.stringify(aiBreakdown)}`);
      } catch (aiErr) {
        // Ultimate fallback: deterministic score based on content
        console.log(`[M-4] AI Judge failed, using deterministic fallback: ${aiErr}`);
        const seed = workTitle.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
        judgeScore = 55 + (seed % 35);
        aiFeedback = 'Score generated via fallback algorithm.';
        aiProvider = 'fallback';
      }

      const entry = {
        id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId, userName: userName || 'Unknown', workId: workId || `work-${Date.now()}`,
        workTitle, workTheme: workTheme || '', workLyrics: workLyrics || [],
        submittedAt: Date.now(), judgeScore: Math.round(judgeScore * 10) / 10,
        communityVotes: 0, totalScore: 0,
        aiBreakdown, aiFeedback, aiProvider,
      };
      entries.push(entry);
      await kv.set(entriesKey, JSON.stringify(entries));
      const statsKey = `achievements:stats:${userId}`;
      const statsRaw = await kv.get(statsKey);
      const stats = statsRaw ? JSON.parse(statsRaw as string) : {};
      stats.challengesEntered = (stats.challengesEntered || 0) + 1;
      await kv.set(statsKey, JSON.stringify(stats));
      console.log(`Challenge entry: ${userName} submitted "${workTitle}" to ${challengeId}`);
      return c.json({ success: true, entry });
    } catch (error) { console.log(`Challenge submit error:`, error); return c.json({ error: `Submit failed: ${error}` }, 500); }
  });

  app.get(`${P}/challenges/:challengeId/entries`, async (c: any) => {
    const challengeId = c.req.param("challengeId");
    try {
      const entriesRaw = await kv.get(`challenges:entries:${challengeId}`);
      let entries = entriesRaw ? JSON.parse(entriesRaw as string) : [];
      const maxVotes = Math.max(1, ...entries.map((e: any) => e.communityVotes || 0));
      entries = entries.map((e: any) => ({
        ...e,
        communityScoreNorm: maxVotes > 0 ? ((e.communityVotes || 0) / maxVotes) * 100 : 0,
        totalScore: Math.round((e.judgeScore * 0.7 + ((e.communityVotes || 0) / maxVotes) * 100 * 0.3) * 10) / 10,
      }));
      entries.sort((a: any, b: any) => b.totalScore - a.totalScore);
      return c.json({ entries });
    } catch (error) { console.log(`Challenge entries error:`, error); return c.json({ entries: [] }, 500); }
  });

  app.post(`${P}/challenges/:challengeId/vote`, requireAuth, async (c: any) => {
    const challengeId = c.req.param("challengeId");
    try {
      const body = await c.req.json();
      const parsed = validate(challengeVoteSchema, body);
      if (!parsed.success) return c.json({ error: parsed.error }, 400);
      const { userId, entryId } = parsed.data;

      const voteDedupKey = `challenge-vote:${challengeId}:${userId}`;
      if (await kv.get(voteDedupKey)) return c.json({ error: 'Already voted', alreadyVoted: true }, 400);
      await kv.set(voteDedupKey, entryId);
      const entriesKey = `challenges:entries:${challengeId}`;
      const entriesRaw = await kv.get(entriesKey);
      let entries = entriesRaw ? JSON.parse(entriesRaw as string) : [];
      const idx = entries.findIndex((e: any) => e.id === entryId);
      if (idx === -1) return c.json({ error: 'Entry not found' }, 404);
      entries[idx].communityVotes = (entries[idx].communityVotes || 0) + 1;
      await kv.set(entriesKey, JSON.stringify(entries));
      console.log(`Challenge vote: ${userId} voted for ${entryId} in ${challengeId}`);
      return c.json({ success: true, votes: entries[idx].communityVotes });
    } catch (error) { console.log(`Challenge vote error:`, error); return c.json({ error: `Vote failed: ${error}` }, 500); }
  });

  app.get(`${P}/challenges/champions`, async (c: any) => {
    try {
      const champRaw = await kv.get('challenges:champions');
      const champions: any[] = champRaw ? JSON.parse(champRaw as string) : [];
      return c.json({ champions });
    } catch (error) {
      console.log("Champions fetch error:", error);
      return c.json({ champions: [] }, 500);
    }
  });

  app.get(`${P}/challenges/notifications/:userId`, async (c: any) => {
    const userId = c.req.param("userId");
    try {
      const champRaw = await kv.get('challenges:champions');
      const champions: any[] = champRaw ? JSON.parse(champRaw as string) : [];
      const userNotifications: any[] = [];
      for (const champ of champions.slice(0, 5)) {
        const notifRaw = await kv.get(`challenge-notifications:${champ.challengeId}`);
        if (notifRaw) {
          const notifs: any[] = JSON.parse(notifRaw as string);
          const userNotif = notifs.find((n: any) => n.userId === userId);
          if (userNotif) userNotifications.push(userNotif);
        }
      }
      return c.json({ notifications: userNotifications });
    } catch (error) {
      console.log("Challenge notifications error:", error);
      return c.json({ notifications: [] }, 500);
    }
  });

  app.post(`${P}/challenges/:challengeId/finalize`, requireAuth, async (c: any) => {
    const challengeId = c.req.param("challengeId");
    try {
      const entriesKey = `challenges:entries:${challengeId}`;
      const entriesRaw = await kv.get(entriesKey);
      let entries: any[] = entriesRaw ? JSON.parse(entriesRaw as string) : [];
      if (entries.length === 0) return c.json({ error: 'No entries to finalize' }, 400);

      const maxVotes = Math.max(1, ...entries.map((e: any) => e.communityVotes || 0));
      entries = entries.map((e: any) => ({
        ...e,
        communityScoreNorm: maxVotes > 0 ? ((e.communityVotes || 0) / maxVotes) * 100 : 0,
        totalScore: Math.round((e.judgeScore * 0.7 + ((e.communityVotes || 0) / maxVotes) * 100 * 0.3) * 10) / 10,
      }));
      entries.sort((a: any, b: any) => b.totalScore - a.totalScore);
      await kv.set(entriesKey, JSON.stringify(entries));

      const challengeRaw = await kv.get('challenges:active');
      const challenge = challengeRaw ? JSON.parse(challengeRaw as string) : null;

      const spRewards = [500, 300, 200];
      for (let i = 0; i < Math.min(3, entries.length); i++) {
        const entry = entries[i];
        const spKey = `user:${entry.userId}:starpower`;
        const spRaw = await kv.get(spKey);
        const currentSP = spRaw ? parseInt(spRaw as string) : 0;
        await kv.set(spKey, String(currentSP + spRewards[i]));
        console.log(`[Challenge] Awarded ${spRewards[i]} SP to ${entry.userName} (rank #${i + 1})`);
      }

      const champion = {
        challengeId,
        challengeTitle: challenge ? { zh: challenge.titleZh, en: challenge.titleEn } : { zh: '?', en: '?' },
        winner: { userName: entries[0].userName, workTitle: entries[0].workTitle, totalScore: entries[0].totalScore },
        runnerUp: entries[1] ? { userName: entries[1].userName, workTitle: entries[1].workTitle, totalScore: entries[1].totalScore } : null,
        thirdPlace: entries[2] ? { userName: entries[2].userName, workTitle: entries[2].workTitle, totalScore: entries[2].totalScore } : null,
        totalEntries: entries.length,
        finalizedAt: Date.now(),
      };
      const champRaw = await kv.get('challenges:champions');
      let champions: any[] = champRaw ? JSON.parse(champRaw as string) : [];
      champions.unshift(champion);
      if (champions.length > 20) champions = champions.slice(0, 20);
      await kv.set('challenges:champions', JSON.stringify(champions));

      console.log(`[Challenge] Finalized ${challengeId}: winner = ${entries[0].userName}`);
      return c.json({ success: true, champion, entries: entries.slice(0, 10) });
    } catch (error) {
      console.log(`Challenge finalize error:`, error);
      return c.json({ error: `Finalize failed: ${error}` }, 500);
    }
  });
}