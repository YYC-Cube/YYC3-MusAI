/**
 * mediaScanner 单元测试 — 扫描索引 / diff / Track 映射
 */
import { describe, expect, it } from 'vitest';

import {
  diffIndexes,
  entryIdFromPath,
  entryToTrack,
  scanFiles,
  SUPPORTED_EXTENSIONS,
  type MediaScanEntry,
  type MediaScanIndex,
} from '../src/mediaScanner';

/** 构造类 File 测试对象 */
function makeFile(
  name: string,
  opts: { size?: number; lastModified?: number; type?: string; relPath?: string } = {},
): File {
  const file = new File(['x'.repeat(opts.size ?? 10)], name, { type: opts.type ?? '' });
  Object.defineProperty(file, 'lastModified', { value: opts.lastModified ?? 1700000000000 });
  Object.defineProperty(file, 'webkitRelativePath', { value: opts.relPath ?? name });
  return file;
}

describe('entryIdFromPath', () => {
  it('同一路径产出恒定 ID', () => {
    expect(entryIdFromPath('a/b.mp3')).toBe(entryIdFromPath('a/b.mp3'));
  });

  it('不同路径产出不同 ID', () => {
    expect(entryIdFromPath('a/b.mp3')).not.toBe(entryIdFromPath('a/c.mp3'));
  });

  it('ID 前缀与 8 位十六进制格式', () => {
    const id = entryIdFromPath('x.flac');
    expect(id).toMatch(/^mscan-[0-9a-f]{8}$/);
  });
});

describe('scanFiles', () => {
  it('只收录受支持的扩展名', async () => {
    const index = await scanFiles([
      makeFile('a.mp3'),
      makeFile('b.txt'),
      makeFile('c.flac'),
      makeFile('d.webm'),
      makeFile('e.exe'),
    ]);
    expect(Object.keys(index.entries)).toHaveLength(3);
  });

  it('extraExtensions 放行自定义扩展', async () => {
    const index = await scanFiles([makeFile('track.aw')], { extraExtensions: ['aw'] });
    expect(Object.keys(index.entries)).toHaveLength(1);
    expect(index.entries[entryIdFromPath('track.aw')]?.extension).toBe('aw');
  });

  it('webkitRelativePath 作为 path 参与 ID 派生', async () => {
    const index = await scanFiles([makeFile('song.mp3', { relPath: 'Artist/Album/song.mp3' })]);
    const entry = Object.values(index.entries)[0];
    expect(entry.path).toBe('Artist/Album/song.mp3');
    expect(entry.id).toBe(entryIdFromPath('Artist/Album/song.mp3'));
  });

  it('MIME 缺失时按扩展名猜测', async () => {
    // 'xyz' 需 extraExtensions 放行才能收录，进而验证未知类型的兜底 MIME
    const index = await scanFiles([makeFile('u.xyz')], { extraExtensions: ['xyz'] });
    expect(index.entries[entryIdFromPath('u.xyz')]?.mimeType).toBe('application/octet-stream');
    const known = await scanFiles([makeFile('a.mp3'), makeFile('v.mp4')]);
    expect(known.entries[entryIdFromPath('a.mp3')]?.mimeType).toBe('audio/mpeg');
    expect(known.entries[entryIdFromPath('v.mp4')]?.mimeType).toBe('video/mp4');
  });

  it('resolveUrl 注入可播放地址', async () => {
    const index = await scanFiles([makeFile('a.mp3')], {
      resolveUrl: (e) => `blob:/${e.path}`,
    });
    expect(Object.values(index.entries)[0].url).toBe('blob:/a.mp3');
  });

  it('scannedAt 为当前时间附近', async () => {
    const before = Date.now();
    const index = await scanFiles([]);
    expect(index.scannedAt).toBeGreaterThanOrEqual(before);
    expect(index.scannedAt).toBeLessThanOrEqual(Date.now());
  });
});

describe('diffIndexes', () => {
  const e = (over: Partial<MediaScanEntry> & { id: string }): MediaScanEntry => ({
    path: over.id,
    fileName: over.id,
    extension: 'mp3',
    mimeType: 'audio/mpeg',
    size: 100,
    mtimeMs: 1,
    ...over,
  });

  it('空上一份索引 → 全部 added', () => {
    const next: MediaScanIndex = { entries: { a: e({ id: 'a' }), b: e({ id: 'b' }) }, scannedAt: 0 };
    const diff = diffIndexes(null, next);
    expect(diff.added.map((x) => x.id).sort()).toEqual(['a', 'b']);
    expect(diff.updated).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
  });

  it('mtime 或 size 变化 → updated', () => {
    const prev: MediaScanIndex = { entries: { a: e({ id: 'a' }) }, scannedAt: 0 };
    const nextA: MediaScanIndex = { entries: { a: e({ id: 'a', mtimeMs: 2 }) }, scannedAt: 1 };
    const nextB: MediaScanIndex = { entries: { a: e({ id: 'a', size: 999 }) }, scannedAt: 1 };
    expect(diffIndexes(prev, nextA).updated).toHaveLength(1);
    expect(diffIndexes(prev, nextB).updated).toHaveLength(1);
  });

  it('无变化 → 三个桶皆空', () => {
    const prev: MediaScanIndex = { entries: { a: e({ id: 'a' }) }, scannedAt: 0 };
    const next: MediaScanIndex = { entries: { a: e({ id: 'a' }) }, scannedAt: 1 };
    const diff = diffIndexes(prev, next);
    expect(diff.added).toHaveLength(0);
    expect(diff.updated).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
  });

  it('上一份有、本次没有 → removed', () => {
    const prev: MediaScanIndex = { entries: { a: e({ id: 'a' }), gone: e({ id: 'gone' }) }, scannedAt: 0 };
    const next: MediaScanIndex = { entries: { a: e({ id: 'a' }) }, scannedAt: 1 };
    expect(diffIndexes(prev, next).removed.map((x) => x.id)).toEqual(['gone']);
  });
});

describe('entryToTrack', () => {
  it('映射必需的 Track 字段，标题去扩展名', () => {
    const entry: MediaScanEntry = {
      id: 'mscan-00000001',
      path: 'a/b.song.mp3',
      fileName: 'b.song.mp3',
      extension: 'mp3',
      mimeType: 'audio/mpeg',
      size: 1,
      mtimeMs: 0,
      url: 'blob:/x',
    };
    const track = entryToTrack(entry);
    expect(track.id).toBe(entry.id);
    expect(track.title).toBe('b.song');
    expect(track.audioUrl).toBe('blob:/x');
    expect(track.lyrics).toEqual([]);
    expect(track.duration).toBe(0);
  });
});

describe('SUPPORTED_EXTENSIONS', () => {
  it('包含音频与视频主流格式且全小写', () => {
    expect(SUPPORTED_EXTENSIONS).toContain('mp3');
    expect(SUPPORTED_EXTENSIONS).toContain('flac');
    expect(SUPPORTED_EXTENSIONS).toContain('mp4');
    for (const ext of SUPPORTED_EXTENSIONS) {
      expect(ext).toBe(ext.toLowerCase());
    }
  });
});
