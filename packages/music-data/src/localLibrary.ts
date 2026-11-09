/**
 * 本地曲库数据层 —— 收藏 / 歌单 / 播放队列
 *
 * 全部通过 music-utils 的 localApiFetch 读写，复用其统一缓存前缀与内存兜底；
 * 本模块不另建存储键，损坏数据一律按空库处理。
 */
import { localApiFetch } from '@yyc3/music-utils';

const FAVORITES_PATH = '/library/favorites';
const PLAYLISTS_PATH = '/library/playlists';
const QUEUE_PATH = '/library/queue';

export interface SavedPlaylist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
  updatedAt: number;
}

/** 过滤空值、非字符串并去重 */
function normalizeTrackIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  for (const item of value) {
    if (typeof item === 'string' && item.length > 0) ids.add(item);
  }
  return [...ids];
}

async function readRecord<T>(path: string): Promise<T | null> {
  try {
    return await localApiFetch<T>(path);
  } catch {
    return null;
  }
}

async function writeRecord(path: string, body: Record<string, unknown>): Promise<void> {
  await localApiFetch(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** 由歌单名派生稳定 id：同名歌单覆盖写入而非重复追加 */
function derivePlaylistId(name: string): string {
  let hash = 5381;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 33) ^ name.charCodeAt(i);
  }
  return `playlist-${(hash >>> 0).toString(36)}`;
}

function parsePlaylist(value: unknown): SavedPlaylist | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'string' || record.id.length === 0) return null;
  if (typeof record.name !== 'string') return null;
  if (!Array.isArray(record.trackIds)) return null;
  const now = Date.now();
  return {
    id: record.id,
    name: record.name,
    trackIds: normalizeTrackIds(record.trackIds),
    createdAt: typeof record.createdAt === 'number' ? record.createdAt : now,
    updatedAt: typeof record.updatedAt === 'number' ? record.updatedAt : now,
  };
}

/** 收藏曲目 id 列表（去重；无数据或数据损坏返回空数组） */
export async function getFavoriteIds(): Promise<string[]> {
  const record = await readRecord<{ trackIds?: unknown }>(FAVORITES_PATH);
  return normalizeTrackIds(record?.trackIds);
}

export async function isFavorite(trackId: string): Promise<boolean> {
  if (!trackId) return false;
  return (await getFavoriteIds()).includes(trackId);
}

/**
 * 切换收藏状态，返回切换后的结果。
 * 未收藏则追加、已收藏则移除；重复写入不会产生重复 id。
 */
export async function toggleFavorite(trackId: string): Promise<boolean> {
  if (!trackId) return false;
  const ids = await getFavoriteIds();
  const liked = !ids.includes(trackId);
  const next = liked ? [...ids, trackId] : ids.filter((id) => id !== trackId);
  await writeRecord(FAVORITES_PATH, { trackIds: next });
  return liked;
}

/** 已保存歌单列表；按 updatedAt 倒序，损坏项自动跳过 */
export async function getSavedPlaylists(): Promise<SavedPlaylist[]> {
  const record = await readRecord<{ playlists?: unknown }>(PLAYLISTS_PATH);
  if (!Array.isArray(record?.playlists)) return [];
  return record.playlists
    .map(parsePlaylist)
    .filter((item): item is SavedPlaylist => item !== null)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * 保存歌单：同名（id 相同）则原地覆盖并刷新 updatedAt，
 * 保留 createdAt；否则新增一条。
 */
export async function savePlaylist(name: string, trackIds: string[]): Promise<SavedPlaylist> {
  const trimmed = name.trim() || '未命名歌单';
  const id = derivePlaylistId(trimmed);
  const now = Date.now();
  const playlists = await getSavedPlaylists();
  const index = playlists.findIndex((item) => item.id === id);
  const saved: SavedPlaylist =
    index >= 0
      ? {
          ...playlists[index],
          name: trimmed,
          trackIds: normalizeTrackIds(trackIds),
          updatedAt: now,
        }
      : {
          id,
          name: trimmed,
          trackIds: normalizeTrackIds(trackIds),
          createdAt: now,
          updatedAt: now,
        };
  const next = index >= 0
    ? playlists.map((item, i) => (i === index ? saved : item))
    : [...playlists, saved];
  await writeRecord(PLAYLISTS_PATH, { playlists: next });
  return saved;
}

/** 删除歌单；返回是否真的删除了记录 */
export async function deletePlaylist(id: string): Promise<boolean> {
  const playlists = await getSavedPlaylists();
  const next = playlists.filter((item) => item.id !== id);
  if (next.length === playlists.length) return false;
  await writeRecord(PLAYLISTS_PATH, { playlists: next });
  return true;
}

/** 播放队列快照；无数据或损坏返回空数组 */
export async function getSavedQueue<T = unknown>(): Promise<T[]> {
  const record = await readRecord<{ tracks?: unknown }>(QUEUE_PATH);
  return Array.isArray(record?.tracks) ? (record.tracks as T[]) : [];
}

/** 覆盖保存播放队列快照 */
export async function saveQueue<T = unknown>(tracks: T[]): Promise<void> {
  await writeRecord(QUEUE_PATH, { tracks: Array.isArray(tracks) ? tracks : [] });
}
