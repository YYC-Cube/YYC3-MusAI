/**
 * Playlist Routes — 用户歌单 CRUD / 排序 / 分享
 *
 * KV 结构：
 *   playlist:{playlistId}          → 歌单 JSON
 *   playlist:user:{userId}:index   → string[]（新→旧）
 *   playlist:share:{slug}          → playlistId
 */

import { ROUTE_PREFIX, kv, requireAuth, getUserFromRequest } from "./server-utils.ts";
import { apiError, ERROR_CODES, parsePagination, pageMeta } from "./api-contract.ts";
import { rateLimit, RATE_STANDARD } from "./rate-limit.ts";
import { recordAudit } from "./audit.ts";

interface Playlist {
  id: string;
  userId: string;
  name: string;
  description: string;
  cover: string | null;
  isPublic: boolean;
  songIds: string[];
  shareSlug: string | null;
  createdAt: number;
  updatedAt: number;
}

const indexKey = (userId: string) => `playlist:user:${userId}:index`;
const shareKey = (slug: string) => `playlist:share:${slug}`;

async function readIndex(userId: string): Promise<string[]> {
  const raw = await kv.get(indexKey(userId));
  if (!raw) return [];
  try {
    const ids = JSON.parse(raw as string);
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

async function writeIndex(userId: string, ids: string[]): Promise<void> {
  await kv.set(indexKey(userId), JSON.stringify(ids.slice(0, 500)));
}

async function loadPlaylist(id: string): Promise<Playlist | null> {
  const raw = await kv.get(`playlist:${id}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw as string) as Playlist;
  } catch {
    return null;
  }
}

async function savePlaylist(p: Playlist): Promise<void> {
  await kv.set(`playlist:${p.id}`, JSON.stringify(p));
}

function summary(p: Playlist) {
  return {
    id: p.id,
    userId: p.userId,
    name: p.name,
    description: p.description,
    cover: p.cover,
    isPublic: p.isPublic,
    songCount: p.songIds.length,
    shareSlug: p.shareSlug,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

async function requireOwner(c: any, id: string): Promise<Playlist | Response> {
  const playlist = await loadPlaylist(id);
  if (!playlist) return apiError(c, 404, '歌单不存在', undefined, ERROR_CODES.NOT_FOUND);
  const user = c.get('authedUser');
  if (!user || playlist.userId !== user.id) {
    return apiError(c, 403, '无权操作该歌单', undefined, ERROR_CODES.FORBIDDEN);
  }
  return playlist;
}

function normalizeSongIds(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return [...new Set(
    input
      .filter((s) => typeof s === 'string' && s.trim())
      .map((s) => (s as string).trim()),
  )].slice(0, 500);
}

export function registerPlaylistRoutes(app: any) {
  // 创建歌单
  app.post(`${ROUTE_PREFIX}/playlists`, requireAuth, rateLimit(RATE_STANDARD), async (c: any) => {
    try {
      const body = await c.req.json();
      const user = c.get('authedUser');
      const name = typeof body?.name === 'string' ? body.name.trim() : '';
      if (!name || name.length > 80) {
        return apiError(c, 400, 'name 为必填项且不超过 80 字符', undefined, ERROR_CODES.VALIDATION_FAILED);
      }

      const now = Date.now();
      const playlist: Playlist = {
        id: crypto.randomUUID(),
        userId: user.id,
        name,
        description: typeof body.description === 'string' ? body.description.slice(0, 500) : '',
        cover: typeof body.cover === 'string' ? body.cover.slice(0, 500) : null,
        isPublic: body.isPublic === true,
        songIds: normalizeSongIds(body.songIds),
        shareSlug: null,
        createdAt: now,
        updatedAt: now,
      };

      await savePlaylist(playlist);
      const ids = await readIndex(user.id);
      await writeIndex(user.id, [playlist.id, ...ids.filter((id) => id !== playlist.id)]);
      await recordAudit({ action: 'playlist.create', actorId: user.id, targetId: playlist.id });

      return c.json({ success: true, playlist }, 201);
    } catch (error) {
      return apiError(c, 500, '创建歌单失败', { detail: String(error) }, ERROR_CODES.INTERNAL);
    }
  });

  // 分享访问（需在 /:playlistId 之前注册）
  app.get(`${ROUTE_PREFIX}/playlists/shared/:slug`, async (c: any) => {
    try {
      const slug = c.req.param('slug');
      const raw = await kv.get(shareKey(slug));
      if (!raw) return apiError(c, 404, '分享不存在或已失效', undefined, ERROR_CODES.NOT_FOUND);
      const id = JSON.parse(raw as string) as string;
      const playlist = await loadPlaylist(id);
      if (!playlist || !playlist.isPublic) {
        return apiError(c, 404, '分享不存在或已失效', undefined, ERROR_CODES.NOT_FOUND);
      }
      return c.json({ success: true, playlist });
    } catch (error) {
      return apiError(c, 500, '读取分享失败', { detail: String(error) }, ERROR_CODES.INTERNAL);
    }
  });

  // 歌单列表
  app.get(`${ROUTE_PREFIX}/playlists`, async (c: any) => {
    try {
      const user = await getUserFromRequest(c);
      const userId = c.req.query('userId') || user?.id;
      if (!userId) {
        return apiError(c, 400, 'userId 为必填项，或携带登录态查询本人歌单', undefined, ERROR_CODES.VALIDATION_FAILED);
      }

      const isOwner = user?.id === userId;
      const ids = await readIndex(userId);
      const all: Playlist[] = [];
      for (const id of ids) {
        const p = await loadPlaylist(id);
        if (p && (isOwner || p.isPublic)) all.push(p);
      }

      const pager = parsePagination(c, { defaultLimit: 20, maxLimit: 100 });
      const items = all.slice(pager.offset, pager.offset + pager.limit).map(summary);
      return c.json({ playlists: items, ...pageMeta(all.length, pager) });
    } catch (error) {
      return apiError(c, 500, '读取歌单列表失败', { detail: String(error) }, ERROR_CODES.INTERNAL);
    }
  });

  // 歌单详情
  app.get(`${ROUTE_PREFIX}/playlists/:playlistId`, async (c: any) => {
    try {
      const playlist = await loadPlaylist(c.req.param('playlistId'));
      if (!playlist) return apiError(c, 404, '歌单不存在', undefined, ERROR_CODES.NOT_FOUND);

      const user = await getUserFromRequest(c);
      if (!playlist.isPublic && user?.id !== playlist.userId) {
        return apiError(c, 403, '无权查看该歌单', undefined, ERROR_CODES.FORBIDDEN);
      }
      return c.json({ success: true, playlist });
    } catch (error) {
      return apiError(c, 500, '读取歌单失败', { detail: String(error) }, ERROR_CODES.INTERNAL);
    }
  });

  // 编辑歌单
  app.put(`${ROUTE_PREFIX}/playlists/:playlistId`, requireAuth, rateLimit(RATE_STANDARD), async (c: any) => {
    try {
      const owned = await requireOwner(c, c.req.param('playlistId'));
      if (owned instanceof Response) return owned;

      const body = await c.req.json();
      if (typeof body?.name === 'string') {
        const name = body.name.trim();
        if (!name || name.length > 80) {
          return apiError(c, 400, 'name 不能为空且不超过 80 字符', undefined, ERROR_CODES.VALIDATION_FAILED);
        }
        owned.name = name;
      }
      if (typeof body?.description === 'string') owned.description = body.description.slice(0, 500);
      if (typeof body?.cover === 'string' || body?.cover === null) owned.cover = body.cover;
      if (typeof body?.isPublic === 'boolean') owned.isPublic = body.isPublic;
      if (Array.isArray(body?.songIds)) owned.songIds = normalizeSongIds(body.songIds);
      owned.updatedAt = Date.now();

      await savePlaylist(owned);
      return c.json({ success: true, playlist: owned });
    } catch (error) {
      return apiError(c, 500, '更新歌单失败', { detail: String(error) }, ERROR_CODES.INTERNAL);
    }
  });

  // 删除歌单
  app.delete(`${ROUTE_PREFIX}/playlists/:playlistId`, requireAuth, rateLimit(RATE_STANDARD), async (c: any) => {
    try {
      const owned = await requireOwner(c, c.req.param('playlistId'));
      if (owned instanceof Response) return owned;

      await kv.del(`playlist:${owned.id}`);
      if (owned.shareSlug) await kv.del(shareKey(owned.shareSlug));
      const ids = await readIndex(owned.userId);
      await writeIndex(owned.userId, ids.filter((id) => id !== owned.id));
      await recordAudit({ action: 'playlist.delete', actorId: owned.userId, targetId: owned.id });

      return c.json({ success: true, deletedId: owned.id });
    } catch (error) {
      return apiError(c, 500, '删除歌单失败', { detail: String(error) }, ERROR_CODES.INTERNAL);
    }
  });

  // 添加歌曲
  app.post(`${ROUTE_PREFIX}/playlists/:playlistId/songs`, requireAuth, rateLimit(RATE_STANDARD), async (c: any) => {
    try {
      const owned = await requireOwner(c, c.req.param('playlistId'));
      if (owned instanceof Response) return owned;

      const body = await c.req.json();
      const songId = typeof body?.songId === 'string' ? body.songId.trim() : '';
      if (!songId) {
        return apiError(c, 400, 'songId 为必填项', undefined, ERROR_CODES.VALIDATION_FAILED);
      }
      if (owned.songIds.length >= 500) {
        return apiError(c, 409, '歌单歌曲已达上限 500', undefined, ERROR_CODES.CONFLICT);
      }
      if (!owned.songIds.includes(songId)) owned.songIds.push(songId);
      owned.updatedAt = Date.now();

      await savePlaylist(owned);
      return c.json({ success: true, playlist: owned });
    } catch (error) {
      return apiError(c, 500, '添加歌曲失败', { detail: String(error) }, ERROR_CODES.INTERNAL);
    }
  });

  // 移除歌曲
  app.delete(`${ROUTE_PREFIX}/playlists/:playlistId/songs/:songId`, requireAuth, rateLimit(RATE_STANDARD), async (c: any) => {
    try {
      const owned = await requireOwner(c, c.req.param('playlistId'));
      if (owned instanceof Response) return owned;

      const songId = c.req.param('songId');
      owned.songIds = owned.songIds.filter((id) => id !== songId);
      owned.updatedAt = Date.now();

      await savePlaylist(owned);
      return c.json({ success: true, playlist: owned });
    } catch (error) {
      return apiError(c, 500, '移除歌曲失败', { detail: String(error) }, ERROR_CODES.INTERNAL);
    }
  });

  // 重新排序
  app.put(`${ROUTE_PREFIX}/playlists/:playlistId/reorder`, requireAuth, rateLimit(RATE_STANDARD), async (c: any) => {
    try {
      const owned = await requireOwner(c, c.req.param('playlistId'));
      if (owned instanceof Response) return owned;

      const body = await c.req.json();
      const next = normalizeSongIds(body?.songIds);
      if (next.length !== owned.songIds.length || next.some((id) => !owned.songIds.includes(id))) {
        return apiError(c, 400, 'songIds 必须是当前歌单歌曲的完整排列', undefined, ERROR_CODES.VALIDATION_FAILED);
      }

      owned.songIds = next;
      owned.updatedAt = Date.now();
      await savePlaylist(owned);
      return c.json({ success: true, playlist: owned });
    } catch (error) {
      return apiError(c, 500, '排序失败', { detail: String(error) }, ERROR_CODES.INTERNAL);
    }
  });

  // 生成分享链接
  app.post(`${ROUTE_PREFIX}/playlists/:playlistId/share`, requireAuth, rateLimit(RATE_STANDARD), async (c: any) => {
    try {
      const owned = await requireOwner(c, c.req.param('playlistId'));
      if (owned instanceof Response) return owned;

      if (!owned.isPublic) {
        return apiError(c, 409, '请先将歌单设为公开再分享', undefined, ERROR_CODES.CONFLICT);
      }
      if (!owned.shareSlug) {
        owned.shareSlug = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
        owned.updatedAt = Date.now();
        await savePlaylist(owned);
        await kv.set(shareKey(owned.shareSlug), JSON.stringify(owned.id));
      }

      return c.json({
        success: true,
        shareSlug: owned.shareSlug,
        sharePath: `/playlists/shared/${owned.shareSlug}`,
      });
    } catch (error) {
      return apiError(c, 500, '生成分享链接失败', { detail: String(error) }, ERROR_CODES.INTERNAL);
    }
  });
}
