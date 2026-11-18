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
