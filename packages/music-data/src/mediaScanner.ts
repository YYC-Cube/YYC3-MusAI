/**
 * YYC³ music-data · 媒体库扫描（mediaScanner）
 * ============================================================
 * 借鉴 Navidrome 的媒体库扫描与资产管理模型（仅架构参考，不引入任何 GPL-3.0 代码）。
 *
 * 职责：将原始媒体文件清单转化为可被 music-player / music-lyrics 消费的
 * 资产索引（Track / Album / Artist），支持：
 *   1. 扩展名过滤与媒体类型识别（音频/视频/封面）
 *   2. 路径与内容指纹去重
 *   3. 艺术家/专辑/年份分组聚合
 *   4. 封面资产定位（同目录 cover.jpg / folder.png 等）
 *   5. 时长/码率等元数据占位（由后端或 ffprobe 补充，此处仅本地推断）
 *
 * 设计原则：纯函数、零外部依赖、零 DOM，可在浏览器/Node/测试环境直接调用。
 * 不返回 UI 展示模型，避免数据层替应用层做设计决策。
 */

import type { Emotion, Track } from './types';

const AUDIO_EXT_RE = /\.(mp3|flac|m4a|ogg|wav|aac|opus)$/i;
const VIDEO_EXT_RE = /\.(mp4|mkv|webm|mov|m3u8)$/i;
const IMAGE_EXT_RE = /\.(jpg|jpeg|png|webp|gif)$/i;

export type MediaType = 'audio' | 'video' | 'image';

export interface MediaEntry {
  /** 相对路径或 URL */
  path: string;
  /** 文件字节数（可选，用于指纹去重） */
  sizeBytes?: number;
  /** 修改时间戳（可选，用于增量扫描） */
  mtimeMs?: number;
}

export interface MediaAsset {
  /** 资产唯一 ID（稳定，由路径哈希生成） */
  id: string;
  /** 资产类型 */
  type: MediaType;
  /** 资产路径 / URL */
  url: string;
  /** 文件名（不含扩展名） */
  name: string;
  /** 扩展名（小写） */
  ext: string;
  /** 字节数 */
  sizeBytes?: number;
  /** 修改时间戳 */
  mtimeMs?: number;
}

export interface MediaTrack extends Track {
  /** 封面资产 URL（若找到同目录封面） */
  coverUrl?: string;
  /** 归属专辑 ID */
  albumId?: string;
  /** 归属艺术家 ID */
  artistId?: string;
  /** 扫描来源路径 */
  sourcePath: string;
}

export interface MediaAlbum {
  id: string;
  title: string;
  /** 专辑封面 URL */
  coverUrl?: string;
  /** 所属艺术家 */
  artist: string;
  /** 曲目数量 */
  trackCount: number;
  /** 总时长（秒） */
  totalDuration: number;
  /** 年份（由文件名或路径推断，可空） */
  year?: number;
}

export interface MediaArtist {
  id: string;
  name: string;
  /** 曲目数量 */
  trackCount: number;
  /** 专辑数量 */
  albumCount: number;
}

export interface MediaScanReport {
  /** 所有音频/视频资产 */
  assets: MediaAsset[];
  /** 转换为 Track 形式的音频曲目 */
  tracks: MediaTrack[];
  /** 聚合的专辑 */
  albums: MediaAlbum[];
  /** 聚合的艺术家 */
  artists: MediaArtist[];
  /** 被剔除的重复路径 */
  duplicates: string[];
  /** 不支持的扩展名 */
  unsupported: string[];
  /** 统计 */
  stats: {
    totalAssets: number;
    audioCount: number;
    videoCount: number;
    imageCount: number;
    totalBytes: number;
  };
}

/** 稳定短哈希，用于生成可复现的资产 ID */
function hash(text: string): number {
  let value = 0;
  for (let i = 0; i < text.length; i++) {
    value = (Math.imul(value, 31) + text.charCodeAt(i)) | 0;
  }
  return value;
}

function fileNameOf(path: string): string {
  return path.split('/').pop() ?? path;
}

function extOf(fileName: string): string {
  const m = fileName.match(/\.([^.]+)$/);
  return m ? m[1].toLowerCase() : '';
}

function mediaTypeOf(ext: string): MediaType | null {
  if (AUDIO_EXT_RE.test('.' + ext)) return 'audio';
  if (VIDEO_EXT_RE.test('.' + ext)) return 'video';
  if (IMAGE_EXT_RE.test('.' + ext)) return 'image';
  return null;
}

/** 同目录封面候选文件名 */
const COVER_CANDIDATES = ['cover.jpg', 'cover.jpeg', 'cover.png', 'cover.webp', 'folder.jpg', 'folder.png'];

/** 推断专辑名：路径含 albums/ 时取下一级，否则「单曲」 */
function albumFromPath(path: string): string {
  const parts = path.split('/');
  const idx = parts.lastIndexOf('albums');
  if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  return '单曲';
}

/** 推断艺术家：文件名「艺术家 - 标题」格式，否则「未知艺术家」 */
function artistFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim();
  const matched = base.match(/^(.{1,64}?)\s+[-–—]\s+(.{1,120})$/);
  return matched ? matched[1].trim() || '未知艺术家' : '未知艺术家';
}

/** 推断标题：文件名「艺术家 - 标题」格式，否则基础文件名 */
function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim();
  const matched = base.match(/^(.{1,64}?)\s+[-–—]\s+(.{1,120})$/);
  return matched ? matched[2].trim() : base;
}

/** 推断情绪（仅看标题，避免艺术家名污染） */
function _inferEmotion(title: string): Emotion {
  const keywords: Array<[RegExp, Emotion]> = [
    [/sad|悲伤|伤感|泪/i, 'sad'],
    [/energ|rock|燃|热血|电音/i, 'energetic'],
    [/happy|快乐|欢|喜/i, 'happy'],
    [/calm|轻|纯|放松|钢琴|晚安/i, 'calm'],
  ];
  for (const [re, emotion] of keywords) {
    if (re.test(title)) return emotion;
  }
  return 'neutral';
}

/** 查找同目录封面资产 */
function findCoverUrl(dirPath: string, allAssets: Map<string, MediaAsset>): string | undefined {
  const dir = dirPath.split('/').slice(0, -1).join('/');
  const prefix = dir ? dir + '/' : '';
  for (const cand of COVER_CANDIDATES) {
    const coverPath = prefix + cand;
    if (allAssets.has(coverPath)) {
      return allAssets.get(coverPath)!.url;
    }
  }
  return undefined;
}

/**
 * 扫描媒体文件清单 → 媒体资产索引报告
 *
 * 去重顺序：路径去重优先，其次按「艺术家::标题::大小」内容指纹去重。
 * 不提供 sizeBytes 的条目只参与路径去重。
 */
export function scanMedia(entries: MediaEntry[]): MediaScanReport {
  const assets: MediaAsset[] = [];
  const duplicates: string[] = [];
  const unsupported: string[] = [];
  const seenPaths = new Set<string>();
  const seenFingerprints = new Set<string>();
  let totalBytes = 0;
  let audioCount = 0;
  let videoCount = 0;
  let imageCount = 0;

  // 先收集所有资产，用于后续封面查找
  const allAssetsMap = new Map<string, MediaAsset>();

  for (const entry of entries) {
    const fileName = fileNameOf(entry.path);
    const ext = extOf(fileName);
    const type = mediaTypeOf(ext);

    if (!type) {
      unsupported.push(entry.path);
      continue;
    }
    if (seenPaths.has(entry.path)) {
      duplicates.push(entry.path);
      continue;
    }
    seenPaths.add(entry.path);

    // 内容指纹去重
    const artist = artistFromFileName(fileName);
    const title = titleFromFileName(fileName);
    if (entry.sizeBytes !== undefined) {
      const fingerprint = `${artist}::${title}::${entry.sizeBytes}`;
      if (seenFingerprints.has(fingerprint)) {
        duplicates.push(entry.path);
        continue;
      }
      seenFingerprints.add(fingerprint);
    }

    const id = `asset-${Math.abs(hash(entry.path)).toString(36)}`;
    const asset: MediaAsset = {
      id,
      type,
      url: entry.path,
      name: baseName(fileName),
      ext,
      sizeBytes: entry.sizeBytes,
      mtimeMs: entry.mtimeMs,
    };
    assets.push(asset);
    allAssetsMap.set(entry.path, asset);

    totalBytes += entry.sizeBytes ?? 0;
    if (type === 'audio') audioCount++;
    else if (type === 'video') videoCount++;
    else if (type === 'image') imageCount++;
  }

  // ---------- 构建 Track（仅音频） ----------
  const tracks: MediaTrack[] = [];
  const artistMap = new Map<string, { name: string; trackCount: number; albumCount: number; albums: Map<string, MediaAlbum> }>();
  const albumMap = new Map<string, MediaAlbum>();

  for (const asset of assets) {
    if (asset.type !== 'audio') continue;

    const fileName = asset.name + '.' + asset.ext;
    const artistName = artistFromFileName(fileName);
    const trackTitle = titleFromFileName(fileName);
    const albumTitle = albumFromPath(asset.url);
    const coverUrl = findCoverUrl(asset.url, allAssetsMap);

    // 艺术家聚合
    let artistAgg = artistMap.get(artistName);
    if (!artistAgg) {
      artistAgg = { name: artistName, trackCount: 0, albumCount: 0, albums: new Map() };
      artistMap.set(artistName, artistAgg);
    }
    artistAgg.trackCount++;

    // 专辑聚合（按 艺术家::专辑 唯一）
    const albumKey = `${artistName}::${albumTitle}`;
    let album = albumMap.get(albumKey);
    if (!album) {
      album = {
        id: `album-${Math.abs(hash(albumKey)).toString(36)}`,
        title: albumTitle,
        artist: artistName,
        coverUrl: undefined,
        trackCount: 0,
        totalDuration: 0,
      };
      albumMap.set(albumKey, album);
      artistAgg.albums.set(albumTitle, album);
      artistAgg.albumCount++;
    }
    album.trackCount++;
    if (coverUrl && !album.coverUrl) album.coverUrl = coverUrl;

    const track: Track = {
      id: asset.id,
      title: trackTitle,
      artist: artistName,
      album: albumTitle,
      audioUrl: asset.url,
      duration: 0,
      albumArt: coverUrl ?? '',
      color: '',
      lyrics: [],
      chordSet: 0,
    };
    tracks.push(track as MediaTrack);
  }

  // ---------- 填充专辑封面 ----------
  for (const album of albumMap.values()) {
    // 若专辑无封面，尝试从该专辑任一曲目的同目录查找
    if (!album.coverUrl) {
      const track = tracks.find((t) => t.album === album.title && t.artist === album.artist);
      if (track) {
        const cover = findCoverUrl(track.sourcePath, allAssetsMap);
        if (cover) album.coverUrl = cover;
      }
    }
  }

  const artists: MediaArtist[] = [];
  for (const [name, agg] of artistMap) {
    artists.push({
      id: `artist-${Math.abs(hash(name)).toString(36)}`,
      name: agg.name,
      trackCount: agg.trackCount,
      albumCount: agg.albumCount,
    });
  }

  const albums: MediaAlbum[] = Array.from(albumMap.values());

  return {
    assets,
    tracks,
    albums,
    artists,
    duplicates,
    unsupported,
    stats: {
      totalAssets: assets.length,
      audioCount,
      videoCount,
      imageCount,
      totalBytes,
    },
  };
}

/** 去除扩展名的基础文件名 */
function baseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '');
}
