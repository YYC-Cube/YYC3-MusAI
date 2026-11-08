/**
 * D-Music §2.2 — Star Power Routes
 * Routes: starpower CRUD, checkin, transactions, VIP level, consume, leaderboard boost, shop
 */

import { ROUTE_PREFIX, kv, requireAuth } from "./server-utils.ts";
import { rateLimit, RATE_STARPOWER } from "./rate-limit.ts";
import { validate, starPowerAddSchema, starPowerConsumeSchema, leaderboardBoostSchema, shopPurchaseSchema } from "./validation.ts";

// ==========================================
// VIP Level Definitions (exported for cross-module use)
// ==========================================
export const VIP_LEVELS = [
  { level: 1, label: '新星', labelEn: 'Newstar', threshold: 0, color: '#808080', dailyReward: 10 },
  { level: 2, label: '明星', labelEn: 'Rising', threshold: 500, color: '#C0C0C0', dailyReward: 15 },
  { level: 3, label: '巨星', labelEn: 'Star', threshold: 2000, color: '#FFD700', dailyReward: 20 },
  { level: 4, label: '超星', labelEn: 'Superstar', threshold: 5000, color: '#FF6B6B', dailyReward: 30 },
  { level: 5, label: '传奇', labelEn: 'Legend', threshold: 15000, color: '#A855F7', dailyReward: 50 },
];

export function getVIPLevel(starPower: number) {
  let result = VIP_LEVELS[0];
  for (const vl of VIP_LEVELS) {
    if (starPower >= vl.threshold) result = vl;
  }
  const nextIdx = VIP_LEVELS.findIndex(v => v.level === result.level) + 1;
  const next = nextIdx < VIP_LEVELS.length ? VIP_LEVELS[nextIdx] : null;
  return { ...result, nextThreshold: next?.threshold || null, nextLabel: next?.label || null };
}

// ==========================================
// Shop Items
// ==========================================
const SHOP_ITEMS = [
  { id: 'theme-neon', category: 'theme', nameZh: '霓虹都市主题', nameEn: 'Neon City Theme', descZh: '解锁赛博朋克 MV 风格', descEn: 'Unlock Cyberpunk MV style', cost: 200, icon: '🌃', rarity: 'rare' },
  { id: 'theme-aurora', category: 'theme', nameZh: '极光幻境主题', nameEn: 'Aurora Theme', descZh: '解锁极光 MV 风格', descEn: 'Unlock Aurora MV style', cost: 350, icon: '🌌', rarity: 'epic' },
  { id: 'sound-synth', category: 'sound', nameZh: '合成器音色包', nameEn: 'Synth Sound Pack', descZh: '8种电子合成器音色', descEn: '8 electronic synth tones', cost: 150, icon: '🎹', rarity: 'common' },
  { id: 'sound-orchestra', category: 'sound', nameZh: '管弦乐音色包', nameEn: 'Orchestra Pack', descZh: '交响乐团完整音色', descEn: 'Full orchestra sounds', cost: 500, icon: '🎻', rarity: 'legendary' },
  { id: 'badge-diamond', category: 'badge', nameZh: '钻石创作者徽章', nameEn: 'Diamond Creator Badge', descZh: '个人主页闪钻特效', descEn: 'Diamond effect on profile', cost: 300, icon: '💎', rarity: 'epic' },
  { id: 'badge-flame', category: 'badge', nameZh: '烈焰徽章', nameEn: 'Flame Badge', descZh: '作品卡片火焰边框', descEn: 'Fire border on works', cost: 180, icon: '🔥', rarity: 'rare' },
  { id: 'ai-unlimited', category: 'ai', nameZh: 'AI创作无限次卡', nameEn: 'Unlimited AI Card', descZh: '7天内AI作曲无限使用', descEn: '7-day unlimited AI composition', cost: 400, icon: '🤖', rarity: 'epic' },
  { id: 'ai-premium', category: 'ai', nameZh: '高级AI参数', nameEn: 'Premium AI Params', descZh: '解锁AI隐藏创作参数', descEn: 'Unlock hidden AI parameters', cost: 250, icon: '✨', rarity: 'rare' },
  { id: 'boost-spotlight', category: 'boost', nameZh: '首页聚光灯', nameEn: 'Spotlight Boost', descZh: '作品首页推荐24小时', descEn: '24h homepage spotlight', cost: 600, icon: '🔦', rarity: 'legendary' },
  { id: 'boost-share', category: 'boost', nameZh: '社交加速器', nameEn: 'Social Booster', descZh: '作品分享曝光量x3', descEn: '3x share exposure', cost: 200, icon: '🚀', rarity: 'rare' },
];

export function registerStarpowerRoutes(app: any) {
  // GET Star Power
  app.get(`${ROUTE_PREFIX}/starpower/:userId`, async (c: any) => {
    const userId = c.req.param("userId");
    try {
      const value = await kv.get(`user:${userId}:starpower`);
      const starPower = value ? parseInt(value as string) : 0;
      return c.json({ userId, starPower });
    } catch (error) {
      console.log(`Error fetching star power for user ${userId}:`, error);
      return c.json({ userId, starPower: 0 }, 500);
    }
  });

  // POST Star Power (add)
  app.post(`${ROUTE_PREFIX}/starpower/:userId`, requireAuth, rateLimit(RATE_STARPOWER), async (c: any) => {
    const userId = c.req.param("userId");
    try {
      const body = await c.req.json();
      const parsed = validate(starPowerAddSchema, body);
      if (!parsed.success) return c.json({ error: parsed.error }, 400);
      const { amount, reason } = parsed.data;

      const value = await kv.get(`user:${userId}:starpower`);
      const currentPower = value ? parseInt(value as string) : 0;
      const newPower = currentPower + amount;
      await kv.set(`user:${userId}:starpower`, newPower.toString());

      console.log(`Star power: user=${userId} +${amount} (${reason}). Total=${newPower}`);
      return c.json({ userId, starPower: newPower, added: amount, reason: reason || 'unspecified' });
    } catch (error) {
      console.log(`Error updating star power for user ${userId}:`, error);
      return c.json({ error: `Failed to update star power: ${error}` }, 500);
    }
  });

  // Daily Check-in
  app.post(`${ROUTE_PREFIX}/starpower/:userId/checkin`, requireAuth, rateLimit(RATE_STARPOWER), async (c: any) => {
    const userId = c.req.param("userId");
    try {
      const today = new Date().toISOString().slice(0, 10);
      const checkinKey = `user:${userId}:checkin`;
      const lastCheckin = await kv.get(checkinKey);

      if (lastCheckin === today) {
        return c.json({ success: false, alreadyCheckedIn: true, message: "今日已签到", messageEn: "Already checked in today" });
      }

      const streakKey = `user:${userId}:checkin-streak`;
      const streakVal = await kv.get(streakKey);
      let streak = streakVal ? parseInt(streakVal as string) : 0;

      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (lastCheckin === yesterday) {
        streak += 1;
      } else {
        streak = 1;
      }

      const spVal = await kv.get(`user:${userId}:starpower`);
      const currentSP = spVal ? parseInt(spVal as string) : 0;
      const vip = getVIPLevel(currentSP);

      const baseReward = vip.dailyReward || 10;
      const streakBonus = Math.min(streak * 2, 20);
      const totalReward = baseReward + streakBonus;

      const newSP = currentSP + totalReward;
      await kv.set(`user:${userId}:starpower`, newSP.toString());
      await kv.set(checkinKey, today);
      await kv.set(streakKey, streak.toString());

      // Transaction record
      const txn = {
        id: `txn-${Date.now()}`, type: 'earn', amount: totalReward,
        reason: 'daily_checkin', detail: `Day ${streak} streak (+${streakBonus} bonus)`,
        timestamp: Date.now(), balance: newSP,
      };
      const txnKey = `user:${userId}:transactions`;
      const existingTxns = await kv.get(txnKey);
      let txns = existingTxns ? JSON.parse(existingTxns as string) : [];
      txns = [txn, ...txns].slice(0, 100);
      await kv.set(txnKey, JSON.stringify(txns));

      console.log(`Check-in: user=${userId}, streak=${streak}, reward=${totalReward}, newSP=${newSP}`);
      return c.json({
        success: true, reward: totalReward, baseReward,
        streakBonus, streak, starPower: newSP, vipLevel: vip,
      });
    } catch (error) {
      console.log(`Error during check-in for ${userId}:`, error);
      return c.json({ error: `Check-in failed: ${error}` }, 500);
    }
  });

  // Transactions History
  app.get(`${ROUTE_PREFIX}/starpower/:userId/transactions`, async (c: any) => {
    const userId = c.req.param("userId");
    try {
      // §L-5 — Proper pagination instead of hard slice truncation
      const page = Math.max(1, parseInt(c.req.query('page') || '1'));
      const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20')));
      const offset = (page - 1) * limit;

      const txnKey = `user:${userId}:transactions`;
      const raw = await kv.get(txnKey);
      const allTransactions = raw ? JSON.parse(raw as string) : [];
      const total = allTransactions.length;
      const transactions = allTransactions.slice(offset, offset + limit);
      const totalPages = Math.ceil(total / limit);

      return c.json({
        transactions,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
    } catch (error) {
      console.log(`Error fetching transactions for ${userId}:`, error);
      return c.json({ transactions: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false } }, 500);
    }
  });

  // VIP Level Info
  app.get(`${ROUTE_PREFIX}/starpower/:userId/level`, async (c: any) => {
    const userId = c.req.param("userId");
    try {
      const spVal = await kv.get(`user:${userId}:starpower`);
      const sp = spVal ? parseInt(spVal as string) : 0;
      const vip = getVIPLevel(sp);
      const streakVal = await kv.get(`user:${userId}:checkin-streak`);
      const streak = streakVal ? parseInt(streakVal as string) : 0;
      const lastCheckin = await kv.get(`user:${userId}:checkin`);

      return c.json({
        userId, starPower: sp, vipLevel: vip,
        allLevels: VIP_LEVELS, streak,
        lastCheckin: lastCheckin || null,
      });
    } catch (error) {
      console.log(`Error fetching VIP level for ${userId}:`, error);
      return c.json({ error: `Failed: ${error}` }, 500);
    }
  });

  // Consume Star Power
  app.post(`${ROUTE_PREFIX}/starpower/:userId/consume`, requireAuth, rateLimit(RATE_STARPOWER), async (c: any) => {
    const userId = c.req.param("userId");
    try {
      const body = await c.req.json();
      const parsed = validate(starPowerConsumeSchema, body);
      if (!parsed.success) return c.json({ error: parsed.error }, 400);
      const { amount, purpose, targetId } = parsed.data;

      const spVal = await kv.get(`user:${userId}:starpower`);
      const currentSP = spVal ? parseInt(spVal as string) : 0;
      if (currentSP < amount) return c.json({ success: false, error: "Insufficient SP", current: currentSP, required: amount }, 400);

      const newSP = currentSP - amount;
      await kv.set(`user:${userId}:starpower`, newSP.toString());

      const txn = { id: `txn-${Date.now()}`, type: 'spend', amount, reason: purpose, detail: targetId ? `Target: ${targetId}` : purpose, timestamp: Date.now(), balance: newSP };
      const txnKey = `user:${userId}:transactions`;
      const existingTxns = await kv.get(txnKey);
      let txns = existingTxns ? JSON.parse(existingTxns as string) : [];
      txns = [txn, ...txns].slice(0, 100);
      await kv.set(txnKey, JSON.stringify(txns));

      console.log(`SP consumed: user=${userId}, -${amount} for ${purpose}. Balance=${newSP}`);
      return c.json({ success: true, starPower: newSP, consumed: amount, purpose });
    } catch (error) {
      console.log(`SP consume error for ${userId}:`, error);
      return c.json({ error: `Failed: ${error}` }, 500);
    }
  });

  // Leaderboard Boost
  app.post(`${ROUTE_PREFIX}/leaderboard/boost`, requireAuth, rateLimit(RATE_STARPOWER), async (c: any) => {
    try {
      const body = await c.req.json();
      const parsed = validate(leaderboardBoostSchema, body);
      if (!parsed.success) return c.json({ error: parsed.error }, 400);
      const { userId, songId, amount, starPowerCost } = parsed.data;
      const boostCost = amount || starPowerCost || 100;

      const spVal = await kv.get(`user:${userId}:starpower`);
      const currentSP = spVal ? parseInt(spVal as string) : 0;
      if (currentSP < boostCost) return c.json({ success: false, error: "Insufficient SP", current: currentSP }, 400);

      const newSP = currentSP - boostCost;
      await kv.set(`user:${userId}:starpower`, newSP.toString());

      const statsKey = `song:${songId}:stats`;
      const existingStats = await kv.get(statsKey);
      let stats = existingStats ? JSON.parse(existingStats as string) : { plays: 0, likes: 0, comments: 0 };
      const boostPlays = Math.floor(boostCost / 10);
      stats.plays = (stats.plays || 0) + boostPlays;
      await kv.set(statsKey, JSON.stringify(stats));

      const txn = { id: `txn-${Date.now()}`, type: 'spend', amount: boostCost, reason: 'ranking_boost', detail: `Boost ${songId} +${boostPlays} plays`, timestamp: Date.now(), balance: newSP };
      const txnKey = `user:${userId}:transactions`;
      const existingTxns = await kv.get(txnKey);
      let txns = existingTxns ? JSON.parse(existingTxns as string) : [];
      txns = [txn, ...txns].slice(0, 100);
      await kv.set(txnKey, JSON.stringify(txns));

      console.log(`Leaderboard boost: user=${userId}, song=${songId}, cost=${boostCost}SP, +${boostPlays} plays`);
      return c.json({ success: true, starPower: newSP, boostPlays, songId });
    } catch (error) {
      console.log("Leaderboard boost error:", error);
      return c.json({ error: `Failed: ${error}` }, 500);
    }
  });

  // ==========================================
  // Star Power Shop
  // ==========================================
  app.get(`${ROUTE_PREFIX}/starpower/shop/items`, async (c: any) => {
    return c.json({ items: SHOP_ITEMS });
  });

  app.post(`${ROUTE_PREFIX}/starpower/shop/purchase`, requireAuth, async (c: any) => {
    try {
      const body = await c.req.json();
      const parsed = validate(shopPurchaseSchema, body);
      if (!parsed.success) return c.json({ error: parsed.error }, 400);
      const { userId, itemId } = parsed.data;
      const item = SHOP_ITEMS.find(i => i.id === itemId);
      if (!item) return c.json({ error: 'Item not found' }, 404);

      const spKey = `user:${userId}:starpower`;
      const spRaw = await kv.get(spKey);
      let sp = spRaw ? parseInt(spRaw as string) : 0;
      if (sp < item.cost) {
        const txnKey = `user:${userId}:transactions`;
        const txnRaw = await kv.get(txnKey);
        let txns = txnRaw ? JSON.parse(txnRaw as string) : [];
        txns = [{ id: `txn-fail-${Date.now()}`, type: 'failed_spend', amount: 0, reason: 'insufficient_funds', detail: `Tried to buy ${itemId}`, timestamp: Date.now(), balance: sp }, ...txns].slice(0, 500);
        await kv.set(txnKey, JSON.stringify(txns));
        return c.json({ error: 'Insufficient Star Power', required: item.cost, current: sp }, 400);
      }

      const spCheck = await kv.get(spKey);
      const currentSp = spCheck ? parseInt(spCheck as string) : 0;
      if (currentSp < item.cost) return c.json({ error: 'Insufficient Star Power (race condition)', required: item.cost, current: currentSp }, 400);

      sp = currentSp - item.cost;
      await kv.set(spKey, sp.toString());

      const invKey = `user:${userId}:inventory`;
      const invRaw = await kv.get(invKey);
      let inventory = invRaw ? JSON.parse(invRaw as string) : [];
      if (['theme', 'sound', 'badge'].includes(item.category) && inventory.some((i: any) => i.itemId === itemId)) {
        sp += item.cost; await kv.set(spKey, sp.toString());
        return c.json({ error: 'Already owned', starPower: sp }, 400);
      }
      inventory.push({ itemId, purchasedAt: Date.now(), expiresAt: item.category === 'ai' ? Date.now() + 7 * 86400000 : null });
      await kv.set(invKey, JSON.stringify(inventory));

      const txnKey = `user:${userId}:transactions`;
      const txnRaw = await kv.get(txnKey);
      let txns = txnRaw ? JSON.parse(txnRaw as string) : [];
      txns = [{ id: `txn-${Date.now()}`, type: 'spend', amount: -item.cost, reason: 'shop_purchase', detail: item.nameEn, timestamp: Date.now(), balance: sp }, ...txns].slice(0, 500);
      await kv.set(txnKey, JSON.stringify(txns));
      console.log(`Shop purchase: ${userId} bought ${itemId} for ${item.cost} SP`);
      return c.json({ success: true, starPower: sp, item });
    } catch (error) { console.log("Shop purchase error:", error); return c.json({ error: `Purchase failed: ${error}` }, 500); }
  });

  app.get(`${ROUTE_PREFIX}/starpower/shop/inventory/:userId`, async (c: any) => {
    const userId = c.req.param("userId");
    try {
      const invRaw = await kv.get(`user:${userId}:inventory`);
      const inventory = invRaw ? JSON.parse(invRaw as string) : [];
      const activeInventory = inventory.filter((i: any) => !i.expiresAt || i.expiresAt > Date.now());
      return c.json({ inventory: activeInventory });
    } catch (error) { console.log(`Inventory error:`, error); return c.json({ inventory: [] }, 500); }
  });
}