/**
 * Follow Routes — 关注关系（关注/取关/粉丝/关注列表/统计）
 *
 * KV 结构：
 *   follow:following:{userId}  → string[] 该用户关注的人
 *   follow:followers:{userId}  → string[] 关注该用户的人
 *   follow:edge:{from}:{to}    → 关注时间戳
 */

import { ROUTE_PREFIX, kv, requireAuth, getUserFromRequest } from "../services/server-utils.ts";
import { apiError, ERROR_CODES, parsePagination, pageMeta } from "../services/api-contract.ts";
import { rateLimit, RATE_STANDARD } from "../services/rate-limit.ts";
import { recordAudit } from "../services/audit.ts";

const followingKey = (userId: string) => `follow:following:${userId}`;
const followersKey = (userId: string) => `follow:followers:${userId}`;
const edgeKey = (from: string, to: string) => `follow:edge:${from}:${to}`;

async function readIds(key: string): Promise<string[]> {
  const raw = await kv.get(key);
  if (!raw) return [];
  try {
    const ids = JSON.parse(raw as string);
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

async function writeIds(key: string, ids: string[]): Promise<void> {
  await kv.set(key, JSON.stringify(ids.slice(0, 10_000)));
}

export function registerFollowRoutes(app: any) {
  // 关注
  app.post(`${ROUTE_PREFIX}/follow/:targetUserId`, requireAuth, rateLimit(RATE_STANDARD), async (c: any) => {
    try {
      const user = c.get('authedUser');
      const targetUserId = c.req.param('targetUserId');
      if (!targetUserId || targetUserId === user.id) {
        return apiError(c, 400, '不能关注自己', undefined, ERROR_CODES.VALIDATION_FAILED);
      }

      const edge = await kv.get(edgeKey(user.id, targetUserId));
      if (edge) {
        return c.json({ success: true, following: true, alreadyFollowing: true });
      }

      const [following, followers] = await Promise.all([
        readIds(followingKey(user.id)),
        readIds(followersKey(targetUserId)),
      ]);
      if (!following.includes(targetUserId)) following.push(targetUserId);
      if (!followers.includes(user.id)) followers.push(user.id);

      await Promise.all([
        writeIds(followingKey(user.id), following),
        writeIds(followersKey(targetUserId), followers),
        kv.set(edgeKey(user.id, targetUserId), new Date().toISOString()),
      ]);
      await recordAudit({ action: 'follow.create', actorId: user.id, targetId: targetUserId });

      return c.json({
        success: true,
        following: true,
        followingCount: following.length,
        followerCount: followers.length,
      });
    } catch (error) {
      return apiError(c, 500, '关注失败', { detail: String(error) }, ERROR_CODES.INTERNAL);
    }
  });

  // 取关
  app.delete(`${ROUTE_PREFIX}/follow/:targetUserId`, requireAuth, rateLimit(RATE_STANDARD), async (c: any) => {
    try {
      const user = c.get('authedUser');
      const targetUserId = c.req.param('targetUserId');

      const [following, followers] = await Promise.all([
        readIds(followingKey(user.id)),
        readIds(followersKey(targetUserId)),
      ]);
      await Promise.all([
        writeIds(followingKey(user.id), following.filter((id) => id !== targetUserId)),
        writeIds(followersKey(targetUserId), followers.filter((id) => id !== user.id)),
        kv.del(edgeKey(user.id, targetUserId)),
      ]);
      await recordAudit({ action: 'follow.delete', actorId: user.id, targetId: targetUserId });

      return c.json({ success: true, following: false });
    } catch (error) {
      return apiError(c, 500, '取关失败', { detail: String(error) }, ERROR_CODES.INTERNAL);
    }
  });

  // 当前用户是否已关注目标
  app.get(`${ROUTE_PREFIX}/follow/status/:userId`, async (c: any) => {
    try {
      const user = await getUserFromRequest(c);
      if (!user) return c.json({ following: false, authenticated: false });
      const targetUserId = c.req.param('userId');
      const edge = await kv.get(edgeKey(user.id, targetUserId));
      return c.json({ following: !!edge, authenticated: true });
    } catch (error) {
      return apiError(c, 500, '查询关注状态失败', { detail: String(error) }, ERROR_CODES.INTERNAL);
    }
  });

  // 关注/粉丝统计
  app.get(`${ROUTE_PREFIX}/follow/counts/:userId`, async (c: any) => {
    try {
      const userId = c.req.param('userId');
      const [following, followers] = await Promise.all([
        readIds(followingKey(userId)),
        readIds(followersKey(userId)),
      ]);
      return c.json({ userId, followingCount: following.length, followerCount: followers.length });
    } catch (error) {
      return apiError(c, 500, '查询关注统计失败', { detail: String(error) }, ERROR_CODES.INTERNAL);
    }
  });

  // 粉丝列表
  app.get(`${ROUTE_PREFIX}/follow/followers/:userId`, async (c: any) => {
    try {
      const userId = c.req.param('userId');
      const ids = await readIds(followersKey(userId));
      const pager = parsePagination(c, { defaultLimit: 20, maxLimit: 100 });
      const items = ids.slice(pager.offset, pager.offset + pager.limit);
      return c.json({ userId, followers: items, ...pageMeta(ids.length, pager) });
    } catch (error) {
      return apiError(c, 500, '查询粉丝列表失败', { detail: String(error) }, ERROR_CODES.INTERNAL);
    }
  });

  // 关注列表
  app.get(`${ROUTE_PREFIX}/follow/following/:userId`, async (c: any) => {
    try {
      const userId = c.req.param('userId');
      const ids = await readIds(followingKey(userId));
      const pager = parsePagination(c, { defaultLimit: 20, maxLimit: 100 });
      const items = ids.slice(pager.offset, pager.offset + pager.limit);
      return c.json({ userId, following: items, ...pageMeta(ids.length, pager) });
    } catch (error) {
      return apiError(c, 500, '查询关注列表失败', { detail: String(error) }, ERROR_CODES.INTERNAL);
    }
  });
}
