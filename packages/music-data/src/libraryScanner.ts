/**
 * YYC³ music-data — 媒体库扫描与去重模型
 *
 * 借鉴架构（不引入原代码）：
 * - Immich：内容哈希去重（SHA-256）、时间轴（timeline）分组展示；
 * - Koel：按专辑/艺术家聚合歌单的模型语义。
 *
 * 与 `mediaScanner.ts` 衔接：`scanFiles` 产出条目 → 本模块做去重、
 * 时间轴分组与歌单聚合。哈希仅用于去重索引，非安全用途。
 *
 * 另含路径清单式曲库扫描（scanLibrary / parseFileName）：文件清单 →
 * 归一曲目元数据，扩展名过滤、路径与内容指纹去重、艺术家/专辑分组统计、
 * 情绪与流派按文件名关键词推断。纯函数、零外部依赖、零 DOM 依赖。
 *
 * 许可：MIT
 */

import type { MediaScanEntry } from './mediaScanner';
import type { Track } from './types';

// ============================================================
// 内容哈希（Immich 式去重）
// ============================================================

/**
 * 计算文件 SHA-256（hex）。SubtleCrypto 不可用时回退为
 * `size + mtime + path` 指纹（弱去重，仅排序/展示用）。
 * 哈希仅用于去重索引，非安全用途。
 */
export async function hashFile(file: File): Promise<string> {
  try {
    const subtle = globalThis.crypto?.subtle;
    if (subtle) {
      const buf = await file.arrayBuffer();
      const digest = await subtle.digest('SHA-256', buf);
      return toHex(new Uint8Array(digest));
    }
  } catch {
    /* 大文件读取失败时回退 */
  }
  return fallbackFingerprint(file);
}

function fallbackFingerprint(file: File): string {
  const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
  return `fp-${file.size}-${file.lastModified}-${rel.length}`;
}

function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

/** 去重结果 */
export interface DedupeResult<T> {
  /** 每组唯一内容保留的首个条目 */
  unique: T[];
  /** 与保留条目内容相同的后续条目（id → 保留条目 id） */
  duplicates: Array<{ duplicateId: string; keptId: string }>;
}

/**
 * 按内容哈希去重。`hashOf` 返回条目对应的哈希；
 * 同哈希保留第一个（调用方可先按偏好排序输入控制保留项）。
 */
export function dedupeByHash<T extends { id: string }>(
  entries: T[],
  hashOf: (entry: T) => string | undefined,
): DedupeResult<T> {
  const seen = new Map<string, T>();
  const unique: T[] = [];
  const duplicates: Array<{ duplicateId: string; keptId: string }> = [];

  for (const entry of entries) {
    const hash = hashOf(entry);
    if (!hash) {
      unique.push(entry);
      continue;
    }
    const kept = seen.get(hash);
    if (kept) {
      duplicates.push({ duplicateId: entry.id, keptId: kept.id });
    } else {
      seen.set(hash, entry);
      unique.push(entry);
    }
  }

  return { unique, duplicates };
}

// ============================================================
// 时间轴分组（Immich 式 timeline）
// ============================================================

export type TimelineGroupBy = 'day' | 'month';

export interface TimelineGroup<T> {
  /** 分组键：day → YYYY-MM-DD；month → YYYY-MM */
  key: string;
  label: string;
  entries: T[];
}

/** 按 mtime 分组（倒序：新 → 旧）。时间来源可用 file.lastModified 注入到 entry.mtimeMs。 */
export function groupByTimeline<T extends { mtimeMs: number }>(
  entries: T[],
  groupBy: TimelineGroupBy = 'month',
): TimelineGroup<T>[] {
  const groups = new Map<string, TimelineGroup<T>>();

  const sorted = [...entries].sort((a, b) => b.mtimeMs - a.mtimeMs);
  for (const entry of sorted) {
    const d = new Date(entry.mtimeMs);
    const key = groupBy === 'day'
      ? d.toISOString().slice(0, 10)
      : d.toISOString().slice(0, 7);
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        label: groupBy === 'day'
          ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          : `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`,
        entries: [],
      };
      groups.set(key, group);
    }
    group.entries.push(entry);
  }

  return [...groups.values()];
}

// ============================================================
// 歌单聚合（Koel 式按专辑/艺术家归组）
// ============================================================

export type PlaylistGroupKey = 'album' | 'artist';

/**
 * 将扫描条目聚合成歌单（Track[]）。
 * 标题取文件名（与 mediaScanner.entryToTrack 一致），
 * 艺术家/专辑可从条目所在目录名推断（`artist/album/track.mp3` 布局，Koel 常见）。
 */
export function buildPlaylist(
  entries: MediaScanEntry[],
  groupBy: PlaylistGroupKey = 'album',
): Track[] {
  return entries.map((entry) => {
    const segments = entry.path.split('/').filter(Boolean);
    // `artist/album/track.ext` → path 含 ≥3 段时取倒数第 2/3 段
    const album = segments.length >= 3 ? segments[segments.length - 2] : '';
    const artist = segments.length >= 3 ? segments[segments.length - 3] : '';
    const title = entry.fileName.replace(/\.[^.]+$/, '');
    const group = groupBy === 'album' ? album : artist;
    return {
      id: entry.id,
      title,
      artist: artist || group,
      album,
      duration: 0,
      albumArt: '',
      audioUrl: entry.url,
      lyrics: [],
      chordSet: 0,
      color: '#667eea',
    };
  });
}

// ============================================================
// 路径清单式曲库扫描（scanLibrary / parseFileName）
// 自 YYC3-CloudPivot-Intelli-Matrix/apps/yyc3-music 抽取
// ============================================================

export interface ScanEntry {
  /** 相对路径或 URL */
  path: string;
  /** 文件字节数，可选；提供后参与跨目录内容指纹去重 */
  sizeBytes?: number;
  /** 时长（秒），可来自既有清单 */
  durationSec?: number;
}

export type ScannedEmotion =
  | 'happy'
  | 'sad'
  | 'energetic'
  | 'calm'
  | 'love'
  | 'neutral';

export interface ScannedTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  /** 源路径，供上层生成 blob URL 或直链 */
  audioUrl: string;
  duration: number;
  ext: string;
  sizeBytes?: number;
  emotion: ScannedEmotion;
  genre: string;
}

export interface ScanReport {
  tracks: ScannedTrack[];
  /** 被去重剔除的路径 */
  duplicates: string[];
  /** 不支持的扩展名 */
  unsupported: string[];
  byArtist: Record<string, number>;
  byAlbum: Record<string, number>;
  totalBytes: number;
}

const AUDIO_EXT_RE = /\.(mp3|flac|m4a|ogg|wav|aac)$/i;

const EMOTION_KEYWORDS: Array<[RegExp, ScannedEmotion]> = [
  [/love|浪漫|甜|恋爱/i, 'love'],
  [/sad|悲伤|伤感|泪/i, 'sad'],
  [/energ|rock|燃|热血|电音/i, 'energetic'],
  [/happy|快乐|欢|喜/i, 'happy'],
  [/calm|轻|纯|放松|钢琴|晚安/i, 'calm'],
];

const GENRE_KEYWORDS: Array<[RegExp, string]> = [
  [/piano|钢琴/i, '钢琴曲'],
  [/rock|摇滚/i, '摇滚'],
  [/electr|edm|电音/i, '电子'],
  [/lofi|lo-fi|轻音/i, 'Lo-Fi'],
  [/pop|流行/i, '流行'],
  [/classical|古典/i, '古典'],
];

function inferEmotion(title: string): ScannedEmotion {
  for (const [re, emotion] of EMOTION_KEYWORDS) {
    if (re.test(title)) return emotion;
  }
  return 'neutral';
}

function inferGenre(fileName: string): string {
  for (const [re, genre] of GENRE_KEYWORDS) {
    if (re.test(fileName)) return genre;
  }
  return '未分类';
}

/** 从文件名抽取「艺术家 - 标题」；无分隔符时艺术家为「未知艺术家」 */
export function parseFileName(fileName: string): { artist: string; title: string } {
  const base = fileName.replace(AUDIO_EXT_RE, '').replace(/_/g, ' ').trim();
  const matched = base.match(/^(.{1,64}?)\s+[-–—]\s+(.{1,120})$/);
  if (matched) {
    return {
      artist: matched[1].trim() || '未知艺术家',
      title: matched[2].trim(),
    };
  }
  return { artist: '未知艺术家', title: base };
}

/** 路径中的专辑目录约定：**\/albums\/<专辑名>\/** ；否则归入「单曲」 */
function albumFromPath(path: string): string {
  const parts = path.split('/');
  const albumsIndex = parts.lastIndexOf('albums');
  if (albumsIndex >= 0 && parts[albumsIndex + 1]) {
    return parts[albumsIndex + 1];
  }
  return '单曲';
}

/** 稳定短哈希，用于生成可复现的曲目 id */
function stableHash(text: string): number {
  let value = 0;
  for (let i = 0; i < text.length; i++) {
    value = (Math.imul(value, 31) + text.charCodeAt(i)) | 0;
  }
  return value;
}

/**
 * 扫描文件清单 → 曲库报告
 *
 * 去重顺序：路径去重优先，其次在提供 sizeBytes 时按「艺术家::标题::大小」内容指纹去重。
 * 不提供 sizeBytes 的条目只参与路径去重，避免把同名不同曲误删。
 */
export function scanLibrary(entries: ScanEntry[]): ScanReport {
  const tracks: ScannedTrack[] = [];
  const duplicates: string[] = [];
  const unsupported: string[] = [];
  const seenPaths = new Set<string>();
  const seenFingerprints = new Set<string>();
  const byArtist: Record<string, number> = {};
  const byAlbum: Record<string, number> = {};
  let totalBytes = 0;

  for (const entry of entries) {
    const fileName = entry.path.split('/').pop() ?? entry.path;
    const extMatch = fileName.match(AUDIO_EXT_RE);
    if (!extMatch) {
      unsupported.push(entry.path);
      continue;
    }
    if (seenPaths.has(entry.path)) {
      duplicates.push(entry.path);
      continue;
    }
    seenPaths.add(entry.path);

    const { artist, title } = parseFileName(fileName);
    if (entry.sizeBytes !== undefined) {
      const fingerprint = `${artist}::${title}::${entry.sizeBytes}`;
      if (seenFingerprints.has(fingerprint)) {
        duplicates.push(entry.path);
        continue;
      }
      seenFingerprints.add(fingerprint);
    }

    const track: ScannedTrack = {
      id: `trk-${tracks.length + 1}-${Math.abs(stableHash(entry.path)).toString(36)}`,
      title,
      artist,
      album: albumFromPath(entry.path),
      audioUrl: entry.path,
      duration: entry.durationSec ?? 0,
      ext: extMatch[1].toLowerCase(),
      sizeBytes: entry.sizeBytes,
      // 情绪只看标题，避免「Sad Piano」这类艺术家名污染判定；流派看完整文件名
      emotion: inferEmotion(title),
      genre: inferGenre(fileName),
    };

    tracks.push(track);
    byArtist[artist] = (byArtist[artist] ?? 0) + 1;
    byAlbum[track.album] = (byAlbum[track.album] ?? 0) + 1;
    totalBytes += entry.sizeBytes ?? 0;
  }

  return { tracks, duplicates, unsupported, byArtist, byAlbum, totalBytes };
}
