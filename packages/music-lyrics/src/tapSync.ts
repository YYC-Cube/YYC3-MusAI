/**
 * @file tapSync.ts
 * @description 打拍生成歌词时间轴：拍点清洗、时间分配与 LRC 序列化
 * @author YYC³ Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-11-10
 * @status stable
 * @license MIT
 * @tags lyrics,lrc,tapsync,typescript
 */

import type { LrcMetadata } from './parseLrc';

/** 时间单位毫秒；`null` 表示该行尚未分配时间（pad:false 且拍点不足） */
export interface LrcLine {
  time: number | null;
  text: string;
}

export interface AssignTimestampsOptions {
  /** 与 parseLrc 的 offset 语义一致：正值表示歌词整体提前 */
  offsetMs?: number;
  /** 拍点少于歌词行时是否按平均间隔补齐，默认 true */
  pad?: boolean;
}

/** 拍点不足 2 个时无法估算平均间隔，回退到 1 秒 */
const DEFAULT_PAD_GAP_MS = 1000;

const META_TAGS = [
  ['title', 'ti'],
  ['artist', 'ar'],
  ['album', 'al'],
  ['by', 'by']
] as const;

/**
 * 清洗拍点：过滤非有限数与负数，升序排序，并丢弃与上一保留拍点间隔过小的抖动点。
 */
export function normalizeTaps(taps: number[], minGapMs = 120): number[] {
  const valid = taps
    .filter((tap) => Number.isFinite(tap) && tap >= 0)
    .sort((a, b) => a - b);

  const result: number[] = [];
  for (const tap of valid) {
    const previous = result[result.length - 1];
    if (previous === undefined || tap - previous >= minGapMs) result.push(tap);
  }
  return result;
}

function estimateGap(times: number[]): number {
  if (times.length < 2) return DEFAULT_PAD_GAP_MS;
  const gap = (times[times.length - 1] - times[0]) / (times.length - 1);
  return gap > 0 ? gap : DEFAULT_PAD_GAP_MS;
}

/**
 * 把拍点按顺序映射到歌词行。
 *
 * - 拍点多于歌词行：多余拍点忽略。
 * - 拍点少于歌词行：默认按已有拍点平均间隔向后补齐；`pad: false` 时剩余行 `time` 为 `null`。
 * - `offsetMs` 为正表示整体提前（`time = 拍点 - offsetMs`，钳制到 0），与 parseLrc 一致。
 * - 输出按时间升序，未分配时间的行排在末尾。
 */
export function assignTimestamps(
  lines: string[],
  taps: number[],
  options: AssignTimestampsOptions = {}
): LrcLine[] {
  const offsetMs = Number.isFinite(options.offsetMs) ? (options.offsetMs as number) : 0;
  const shouldPad = options.pad !== false;
  const normalized = normalizeTaps(taps);

  const times: (number | null)[] = lines.map((_, index) => {
    const tap = normalized[index];
    return tap === undefined ? null : Math.max(0, tap - offsetMs);
  });

  const assigned = times.filter((time): time is number => time !== null);

  if (shouldPad && assigned.length > 0) {
    const gap = estimateGap(assigned);
    let next = assigned[assigned.length - 1];
    for (let index = assigned.length; index < times.length; index += 1) {
      next += gap;
      times[index] = next;
    }
  }

  return lines
    .map((text, index) => ({ time: times[index], text, order: index }))
    .sort((a, b) => (a.time ?? Infinity) - (b.time ?? Infinity) || a.order - b.order)
    .map(({ time, text }) => ({ time, text }));
}

function formatTime(ms: number): string {
  const centiseconds = Math.round(Math.max(0, ms) / 10);
  const minutes = Math.floor(centiseconds / 6000);
  const seconds = (centiseconds % 6000) / 100;
  return `${String(minutes).padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}`;
}

/**
 * 序列化为 LRC 文本，输出顺序固定为 `[ti:]`、`[ar:]`、`[al:]`、`[by:]`、`[offset:]`，随后按行输出。
 * `time` 为 `null` 的行跳过。
 */
export function serializeLrc(lines: LrcLine[], metadata: Partial<LrcMetadata> = {}): string {
  const output: string[] = [];

  for (const [field, tag] of META_TAGS) {
    const value = metadata[field];
    if (value) output.push(`[${tag}:${value}]`);
  }

  const offset = metadata.offset;
  if (offset !== undefined) output.push(`[offset:${offset}]`);

  const shift = Number.isFinite(offset) ? (offset as number) : 0;
  for (const line of lines) {
    if (line.time === null || !Number.isFinite(line.time)) continue;
    output.push(`[${formatTime(line.time + shift)}]${line.text}`);
  }

  return output.join('\n');
}
