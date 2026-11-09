/**
 * @file parseLrc.ts
 * @description 标准 LRC 歌词解析：时间标签、元数据标签、offset 与多时间戳
 * @author YYC³ Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-11-09
 * @status stable
 * @license MIT
 * @tags lyrics,lrc,parser,typescript
 */

import type { LyricLine } from './components/LyricsDisplay';

export interface LrcMetadata {
  title?: string;
  artist?: string;
  album?: string;
  by?: string;
  /** LRC 原始 offset，单位毫秒；正值表示歌词整体提前 */
  offset: number;
}

export interface ParsedLrc {
  metadata: LrcMetadata;
  lines: LyricLine[];
}

export interface ParseLrcOptions {
  /** 覆盖文件内 offset（单位毫秒），用于用户校准 */
  offset?: number;
}

const META_TAG_RE = /\[(ti|ar|al|by|offset):([^\]]*)\]/gi;
const TIME_TAG_RE = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

const META_KEYS: Record<string, keyof LrcMetadata> = {
  ti: 'title',
  ar: 'artist',
  al: 'album',
  by: 'by'
};

function parseFraction(raw?: string): number {
  if (!raw) return 0;
  // `.3` = 300ms，`.34` = 340ms，`.345` = 345ms
  return Number(raw.padEnd(3, '0'));
}

function readMetadata(input: string): LrcMetadata {
  const metadata: LrcMetadata = { offset: 0 };
  for (const match of input.matchAll(META_TAG_RE)) {
    const key = match[1].toLowerCase();
    const value = match[2].trim();
    if (key === 'offset') {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isNaN(parsed)) metadata.offset = parsed;
      continue;
    }
    const field = META_KEYS[key];
    if (field && value) metadata[field] = value as never;
  }
  return metadata;
}

/**
 * 解析标准 LRC 文本。
 *
 * 支持：
 * - 元数据：`[ti:]`、`[ar:]`、`[al:]`、`[by:]`、`[offset:]`
 * - 时间标签：`[mm:ss]`、`[mm:ss.xx]`、`[mm:ss.xxx]`
 * - 一行多时间标签：`[00:01.00][00:05.00]同一句`
 * - CRLF / 前后空白 / 无效行
 *
 * offset 语义：正值表示歌词整体提前，`time = 原始时间 - offset / 1000` 并钳制到 0。
 * 返回的 `lines` 按时间升序排序，时间单位为秒。
 */
export function parseLrc(input: string, options: ParseLrcOptions = {}): ParsedLrc {
  const metadata = readMetadata(input);
  const offsetMs = options.offset ?? metadata.offset;
  const offsetSeconds = offsetMs / 1000;
  const lines: LyricLine[] = [];

  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const starts: number[] = [];
    const text = line
      .replace(TIME_TAG_RE, (match, minutes: string, seconds: string, fraction?: string) => {
        const total = Number(minutes) * 60 + Number(seconds) + parseFraction(fraction) / 1000;
        starts.push(Math.max(0, Number((total - offsetSeconds).toFixed(3))));
        return '';
      })
      .replace(META_TAG_RE, '')
      .trim();

    if (starts.length === 0 || !text) continue;

    for (const time of starts) {
      lines.push({ time, text });
    }
  }

  lines.sort((a, b) => a.time - b.time);

  return { metadata, lines };
}
