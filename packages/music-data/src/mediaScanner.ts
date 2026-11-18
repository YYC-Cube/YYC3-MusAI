/**
 * YYC³ music-data — 媒体库扫描模型
 *
 * 参考 Navidrome 的媒体库扫描架构（仅借鉴模型与流程，不引入 GPL 代码）：
 * - 以 `path + mtime + size` 作为变更检测指纹，避免逐字节哈希全量对比；
 * - 全量扫描 → 与上一份索引 diff → 产出 added/updated/removed 三类变更；
 * - 扫描结果不可变，调用方持久化 `MediaScanIndex` 作为下一次 diff 基线。
 *
 * 许可：MIT
 */

import type { Track } from './types';

// ============================================================
// 扫描模型类型
// ============================================================

/** 扫描到的单个媒体文件条目 */
export interface MediaScanEntry {
  /** 稳定 ID：由相对路径派生（同一路径跨扫描恒定） */
  id: string;
  /** 库内相对路径 */
  path: string;
  /** 文件名（不含扩展名），作为标题猜测来源 */
  fileName: string;
  /** 扩展名（小写，不含点） */
  extension: string;
  /** MIME 类型（来自 File 对象；不可用时按扩展名猜测） */
  mimeType: string;
  /** 文件字节数 */
  size: number;
  /** 最后修改时间（epoch ms） */
  mtimeMs: number;
  /** 可播放地址（Blob URL / CDN URL），由调用方注入 */
  url?: string;
}

/** 扫描索引：一次完整扫描的不可变快照 */
export interface MediaScanIndex {
  /** id → entry */
  entries: Record<string, MediaScanEntry>;
  /** 本次扫描完成时间（epoch ms） */
  scannedAt: number;
}

/** diff 结果 */
export interface MediaScanDiff {
  /** 新增条目 */
  added: MediaScanEntry[];
  /** 内容有变化（mtime/size 变动）的条目 */
  updated: MediaScanEntry[];
  /** 上份索引有、本次扫描没有的条目 */
  removed: MediaScanEntry[];
}

/** 支持的音频/视频扩展名 */
export const SUPPORTED_EXTENSIONS = [
  'mp3', 'm4a', 'aac', 'flac', 'wav', 'ogg', 'opus', 'weba',
  'mp4', 'm4v', 'webm', 'mov',
] as const;

/** 扫描选项 */
export interface MediaScanOptions {
  /** 自定义可播放地址解析器（如把 path 映射到 Blob URL） */
  resolveUrl?: (entry: Omit<MediaScanEntry, 'id' | 'url'>) => string | undefined;
  /** 额外允许的扩展名 */
  extraExtensions?: string[];
}

// ============================================================
// 工具函数
// ============================================================

/** 由路径派生稳定 ID（FNV-1a 32 位，避免依赖 crypto） */
export function entryIdFromPath(path: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < path.length; i += 1) {
    hash ^= path.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `mscan-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase();
}

function isSupported(fileName: string, extra: string[] = []): boolean {
  const ext = extensionOf(fileName);
  return (SUPPORTED_EXTENSIONS as readonly string[]).includes(ext) || extra.includes(ext);
}

/**
 * 从 `File` 列表构建一份扫描索引。
 * 典型输入：`<input type="file" multiple>`、`DataTransfer.files` 或
 * `showDirectoryPicker()` 递归收集的文件。
 */
export async function scanFiles(
  files: Iterable<File>,
  options: MediaScanOptions = {},
): Promise<MediaScanIndex> {
  const extra = options.extraExtensions || [];
  const entries: Record<string, MediaScanEntry> = {};

  for (const file of files) {
    if (!isSupported(file.name, extra)) continue;

    const extension = extensionOf(file.name);
    const mtimeMs = file.lastModified;
    const base = {
      path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
      fileName: file.name,
      extension,
      mimeType: file.type || guessMime(extension),
      size: file.size,
      mtimeMs,
    };
    const id = entryIdFromPath(base.path);
    entries[id] = {
      ...base,
      id,
      url: options.resolveUrl?.(base),
    };
  }

  return { entries, scannedAt: Date.now() };
}

/** 与上一份索引 diff，产出 added/updated/removed */
export function diffIndexes(prev: MediaScanIndex | null, next: MediaScanIndex): MediaScanDiff {
  const prevEntries = prev?.entries ?? {};
  const added: MediaScanEntry[] = [];
  const updated: MediaScanEntry[] = [];
  const removed: MediaScanEntry[] = [];

  for (const entry of Object.values(next.entries)) {
    const before = prevEntries[entry.id];
    if (!before) {
      added.push(entry);
    } else if (before.mtimeMs !== entry.mtimeMs || before.size !== entry.size) {
      updated.push(entry);
    }
  }

  for (const entry of Object.values(prevEntries)) {
    if (!next.entries[entry.id]) removed.push(entry);
  }

  return { added, updated, removed };
}

/**
 * 将扫描条目映射为全局 `Track`（供播放列表直接消费）。
 * 标题取文件名（去扩展名），艺术家/专辑留空由调用方补全。
 */
export function entryToTrack(entry: MediaScanEntry): Track {
  const title = entry.fileName.replace(/\.[^.]+$/, '');
  return {
    id: entry.id,
    title,
    artist: '',
    album: '',
    duration: 0,
    albumArt: '',
    audioUrl: entry.url,
    lyrics: [],
    chordSet: 0,
    color: '#667eea',
  };
}

function guessMime(ext: string): string {
  const map: Record<string, string> = {
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    flac: 'audio/flac',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    opus: 'audio/ogg',
    weba: 'audio/webm',
    mp4: 'video/mp4',
    m4v: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
  };
  return map[ext] || 'application/octet-stream';
}
