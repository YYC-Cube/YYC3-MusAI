// YYC³ music-data — 曲库扫描测试
// 并集覆盖两族 API：
//   1) 路径清单扫描：parseFileName / scanLibrary（文件名解析、扩展名过滤、路径与指纹去重、专辑归组、情绪/流派推断与统计）
//   2) 文件对象处理：hashFile / dedupeByHash / groupByTimeline / buildPlaylist（哈希去重 / 时间轴 / 歌单聚合）
import { webcrypto } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';

import {
  buildPlaylist,
  dedupeByHash,
  groupByTimeline,
  hashFile,
  parseFileName,
  scanLibrary,
  type TimelineGroup,
} from '../src/libraryScanner';
import type { MediaScanEntry } from '../src/mediaScanner';

describe('parseFileName', () => {
  it('按「艺术家 - 标题」拆分并去掉扩展名', () => {
    expect(parseFileName('周杰伦 - 晴天.mp3')).toEqual({ artist: '周杰伦', title: '晴天' })
  })

  it('支持下划线替换与长破折号', () => {
    expect(parseFileName('Aurora_—_Runaway.flac')).toEqual({ artist: 'Aurora', title: 'Runaway' })
  })

  it('无分隔符时艺术家回落为未知', () => {
    expect(parseFileName('demo-track.m4a')).toEqual({ artist: '未知艺术家', title: 'demo-track' })
  })

  it('无艺术家时标题保留原样', () => {
    expect(parseFileName('标题.wav')).toEqual({ artist: '未知艺术家', title: '标题' })
  })
})

describe('scanLibrary', () => {
  it('过滤非音频扩展名并记录', () => {
    const report = scanLibrary([
      { path: '/music/albums/夜曲/A - B.mp3' },
      { path: '/music/cover.jpg' },
      { path: '/music/readme.txt' },
    ])
    expect(report.tracks).toHaveLength(1)
    expect(report.unsupported).toEqual(['/music/cover.jpg', '/music/readme.txt'])
  })

  it('路径重复只保留首条', () => {
    const report = scanLibrary([
      { path: '/music/x.mp3', sizeBytes: 100 },
      { path: '/music/x.mp3', sizeBytes: 100 },
    ])
    expect(report.tracks).toHaveLength(1)
    expect(report.duplicates).toEqual(['/music/x.mp3'])
  })

  it('跨目录同艺术家/标题/大小视为重复', () => {
    const report = scanLibrary([
      { path: '/a/周杰伦 - 晴天.mp3', sizeBytes: 4096 },
      { path: '/b/周杰伦 - 晴天.mp3', sizeBytes: 4096 },
    ])
    expect(report.tracks).toHaveLength(1)
    expect(report.duplicates).toEqual(['/b/周杰伦 - 晴天.mp3'])
  })

  it('缺少 sizeBytes 时不做内容指纹去重，避免误删同名不同曲', () => {
    const report = scanLibrary([
      { path: '/a/周杰伦 - 晴天.mp3' },
      { path: '/b/周杰伦 - 晴天.mp3' },
    ])
    expect(report.tracks).toHaveLength(2)
    expect(report.duplicates).toEqual([])
  })

  it('按 albums 目录归组，缺失时归入单曲', () => {
    const report = scanLibrary([
      { path: '/lib/albums/叶惠美/周杰伦 - 晴天.mp3' },
      { path: '/lib/singles/周杰伦 - 七里香.mp3' },
    ])
    expect(report.tracks[0].album).toBe('叶惠美')
    expect(report.tracks[1].album).toBe('单曲')
  })

  it('情绪只看标题，流派看完整文件名', () => {
    const report = scanLibrary([
      // 艺术家名含 Sad，但标题不含 → 情绪应为 neutral；文件名含 piano → 流派钢琴曲
      { path: '/x/Sad Piano - Moonlight.mp3' },
    ])
    expect(report.tracks[0].artist).toBe('Sad Piano')
    expect(report.tracks[0].emotion).toBe('neutral')
    expect(report.tracks[0].genre).toBe('钢琴曲')
  })

  it('能从标题推断情绪', () => {
    const report = scanLibrary([{ path: '/x/某某 - 晚安放松曲.mp3' }])
    expect(report.tracks[0].emotion).toBe('calm')
  })

  it('扩展名小写化，未标注时长回落为 0', () => {
    const report = scanLibrary([{ path: '/x/某某 - 燃向摇滚.FLAC' }])
    expect(report.tracks[0].ext).toBe('flac')
    expect(report.tracks[0].duration).toBe(0)
    expect(report.tracks[0].emotion).toBe('energetic')
  })

  it('统计歌手/专辑数量与总字节数', () => {
    const report = scanLibrary([
      { path: '/m/albums/A/甲 - 一.mp3', sizeBytes: 10 },
      { path: '/m/albums/A/甲 - 二.mp3', sizeBytes: 20 },
      { path: '/m/albums/B/乙 - 三.mp3', sizeBytes: 30 },
    ])
    expect(report.byArtist).toEqual({ 甲: 2, 乙: 1 })
    expect(report.byAlbum).toEqual({ A: 2, B: 1 })
    expect(report.totalBytes).toBe(60)
  })

  it('同一路径生成稳定 id，不同路径 id 不重复', () => {
    const first = scanLibrary([{ path: '/m/甲 - 一.mp3' }])
    const second = scanLibrary([{ path: '/m/甲 - 一.mp3' }])
    expect(first.tracks[0].id).toBe(second.tracks[0].id)

    const many = scanLibrary([
      { path: '/m/甲 - 一.mp3' },
      { path: '/m/甲 - 二.mp3' },
      { path: '/m/甲 - 三.mp3' },
    ])
    expect(new Set(many.tracks.map((t) => t.id)).size).toBe(3)
  })
})

/**
 * hashFile 专用的 duck-typed File：
 * arrayBuffer 在当前 realm 构造，避免 jsdom File 跨 realm 传给 node webcrypto 失败
 */
function makeHashFile(name: string, content: string, lastModified = 1700000000000): File {
  const bytes = new TextEncoder().encode(content);
  const buf = new ArrayBuffer(bytes.length);
  new Uint8Array(buf).set(bytes);
  return {
    name,
    size: bytes.length,
    lastModified,
    webkitRelativePath: name,
    arrayBuffer: async () => buf,
  } as unknown as File;
}

describe('hashFile', () => {
  // jsdom 的 crypto 无 subtle，注入 node webcrypto 以测真实 SHA-256 路径
  const originalSubtle = (globalThis.crypto as any)?.subtle;
  afterEach(() => {
    Object.defineProperty(globalThis.crypto, 'subtle', {
      value: originalSubtle,
      configurable: true,
    });
  });

  it('同内容产出相同 SHA-256（node webcrypto 注入）', async () => {
    Object.defineProperty(globalThis.crypto, 'subtle', {
      value: webcrypto.subtle,
      configurable: true,
    });
    const a = await hashFile(makeHashFile('x.mp3', 'hello'));
    const b = await hashFile(makeHashFile('y.mp3', 'hello'));
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('不同内容产出不同哈希', async () => {
    Object.defineProperty(globalThis.crypto, 'subtle', {
      value: webcrypto.subtle,
      configurable: true,
    });
    const a = await hashFile(makeHashFile('x.mp3', 'hello'));
    const b = await hashFile(makeHashFile('x.mp3', 'world'));
    expect(a).not.toBe(b);
  });

  it('SubtleCrypto 不可用时回退为弱指纹', async () => {
    const original = globalThis.crypto?.subtle;
    // 临时移除 subtle 以触发回退分支
    Object.defineProperty(globalThis.crypto, 'subtle', { value: undefined, configurable: true });
    try {
      const fp = await hashFile(makeHashFile('x.mp3', 'hello', 123));
      expect(fp).toMatch(/^fp-/);
      expect(fp).toContain('123');
    } finally {
      Object.defineProperty(globalThis.crypto, 'subtle', { value: original, configurable: true });
    }
  });
});

describe('dedupeByHash', () => {
  it('同哈希保留首个，其余进 duplicates', () => {
    const entries = [
      { id: 'a', hash: 'h1' },
      { id: 'b', hash: 'h1' },
      { id: 'c', hash: 'h2' },
    ];
    const { unique, duplicates } = dedupeByHash(entries, (e) => e.hash);
    expect(unique.map((e) => e.id)).toEqual(['a', 'c']);
    expect(duplicates).toEqual([{ duplicateId: 'b', keptId: 'a' }]);
  });

  it('哈希缺失（undefined）的条目不去重', () => {
    const entries = [
      { id: 'a', hash: undefined },
      { id: 'b', hash: undefined },
    ];
    const { unique, duplicates } = dedupeByHash(entries, (e) => e.hash);
    expect(unique).toHaveLength(2);
    expect(duplicates).toHaveLength(0);
  });
});

describe('groupByTimeline', () => {
  const mk = (id: string, mtimeMs: number) => ({ id, mtimeMs });

  it('按月分组且新 → 旧排序', () => {
    const groups: TimelineGroup<{ id: string; mtimeMs: number }>[] = groupByTimeline(
      [mk('old', Date.UTC(2025, 0, 15)), mk('new', Date.UTC(2026, 10, 1))],
      'month',
    );
    expect(groups.map((g) => g.key)).toEqual(['2026-11', '2025-01']);
    expect(groups[0].entries[0].id).toBe('new');
    expect(groups[0].label).toContain('2026');
  });

  it('按天分组产出 YYYY-MM-DD 键', () => {
    const groups = groupByTimeline([mk('a', Date.UTC(2026, 0, 2))], 'day');
    expect(groups[0].key).toBe('2026-01-02');
  });

  it('空输入返回空数组', () => {
    expect(groupByTimeline([])).toEqual([]);
  });
});

describe('buildPlaylist', () => {
  const entry = (path: string, url?: string): MediaScanEntry => ({
    id: path,
    path,
    fileName: path.split('/').pop() || path,
    extension: 'mp3',
    mimeType: 'audio/mpeg',
    size: 1,
    mtimeMs: 0,
    url,
  });

  it('从 artist/album/track 布局推断元数据', () => {
    const tracks = buildPlaylist([entry('周杰伦/八度空间/晴天.mp3', 'blob:/1')]);
    expect(tracks[0].artist).toBe('周杰伦');
    expect(tracks[0].album).toBe('八度空间');
    expect(tracks[0].title).toBe('晴天');
    expect(tracks[0].audioUrl).toBe('blob:/1');
  });

  it('目录层级不足时 artist 退化为分组键（album 为空 → artist）', () => {
    const tracks = buildPlaylist([entry('song.mp3')], 'artist');
    expect(tracks[0].album).toBe('');
    expect(tracks[0].artist).toBe('');
    expect(tracks[0].title).toBe('song');
  });

  it('groupBy=artist 时 artist 取分组，album 保留', () => {
    const tracks = buildPlaylist([entry('a/b/c.mp3')], 'artist');
    expect(tracks[0].artist).toBe('a');
    expect(tracks[0].album).toBe('b');
  });

  it('每条产出完整 Track 骨架', () => {
    const tracks = buildPlaylist([entry('x/y/z.mp3')]);
    expect(tracks[0]).toMatchObject({
      duration: 0,
      lyrics: [],
      chordSet: 0,
      color: '#667eea',
    });
  });
});
