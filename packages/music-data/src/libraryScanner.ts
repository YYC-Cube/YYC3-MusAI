/**
 * YYC³ MusAI · 曲库扫描（自 YYC3-CloudPivot-Intelli-Matrix/apps/yyc3-music 抽取）
 *
 * 文件清单 → 归一曲目元数据：扩展名过滤、路径去重、跨目录内容指纹去重、
 * 艺术家/专辑分组统计、情绪与流派按文件名关键词推断。
 *
 * 纯函数、零外部依赖、零 DOM 依赖：可在浏览器、Node、测试环境直接调用。
 * 不返回 UI 展示模型（专辑封面/主题色/歌词等由应用层补全），避免数据层替应用做设计决策。
 */

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
function hash(text: string): number {
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
      id: `trk-${tracks.length + 1}-${Math.abs(hash(entry.path)).toString(36)}`,
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
