// YYC³ music-data — 本地音频持久化测试
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  deleteLocalAudio,
  getAudioStorageUsage,
  getLocalAudio,
  listLocalAudioIds,
  pruneLocalAudio,
  saveLocalAudio,
} from '../src/localAudio';

const blob = () => new Blob(['fake-audio'], { type: 'audio/wav' });

describe('localAudio', () => {
  beforeEach(async () => {
    for (const id of await listLocalAudioIds()) {
      await deleteLocalAudio(id);
    }
  });

  it('保存后可读回文件与元数据', async () => {
    expect(await saveLocalAudio('custom-1', blob(), { title: '本地曲目', duration: 300 })).toBe(true);

    const stored = await getLocalAudio('custom-1');
    expect(stored?.meta.title).toBe('本地曲目');
    expect(stored?.meta.duration).toBe(300);
    expect(stored?.id).toBe('custom-1');
    // jsdom 的 Blob 经结构化克隆后不保留 size/type，文件本身的可恢复性由浏览器端 E2E 覆盖
  });

  it('未保存的 id 返回 null', async () => {
    expect(await getLocalAudio('missing')).toBeNull();
  });

  it('同 id 重复保存会覆盖旧值且不产生副本', async () => {
    await saveLocalAudio('custom-1', blob(), { title: '旧' });
    await saveLocalAudio('custom-1', new Blob(['v2']), { title: '新' });

    expect((await getLocalAudio('custom-1'))?.meta.title).toBe('新');
    expect(await listLocalAudioIds()).toEqual(['custom-1']);
  });

  it('删除后无法读回，重复删除不报错', async () => {
    await saveLocalAudio('custom-2', blob(), { title: '待删' });
    expect(await deleteLocalAudio('custom-2')).toBe(true);
    expect(await getLocalAudio('custom-2')).toBeNull();
    expect(await deleteLocalAudio('custom-2')).toBe(true);
  });

  it('列出全部已保存 id', async () => {
    await saveLocalAudio('custom-a', blob(), {});
    await saveLocalAudio('custom-b', blob(), {});
    expect((await listLocalAudioIds()).sort()).toEqual(['custom-a', 'custom-b']);
  });

  it('回收未被引用的音频，保留队列与歌单仍引用的', async () => {
    await saveLocalAudio('keep-queue', blob(), {});
    await saveLocalAudio('keep-playlist', blob(), {});
    await saveLocalAudio('orphan-1', blob(), {});
    await saveLocalAudio('orphan-2', blob(), {});

    const removed = await pruneLocalAudio(['keep-queue', 'keep-playlist']);

    expect(removed).toBe(2);
    expect((await listLocalAudioIds()).sort()).toEqual(['keep-playlist', 'keep-queue']);
  });

  it('回收时不误删：传入空集合会清空全部音频', async () => {
    await saveLocalAudio('only', blob(), {});
    expect(await pruneLocalAudio([])).toBe(1);
    expect(await listLocalAudioIds()).toEqual([]);
  });

  it('存储占用在无 navigator.storage 时返回 null', async () => {
    expect(await getAudioStorageUsage()).toBeNull();
  });
});

// ============================================================
// W5 补流：不支持 IndexedDB 的环境 / 损坏记录 / 存储配额查询
// ============================================================

describe('localAudio 环境降级与损坏数据分支', () => {
  // 与上方主 describe 平级，需自带清库（含直写的损坏记录）
  beforeEach(async () => {
    for (const id of await listLocalAudioIds()) {
      await deleteLocalAudio(id);
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('IndexedDB 不可用时保存失败并告警、读取/删除/枚举安全回退', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // dbPromise 已被既有用例缓存，仍须在每次调用时命中“不支持”短路分支
    vi.stubGlobal('indexedDB', undefined);

    expect(await saveLocalAudio('no-db', blob(), { title: '无法保存' })).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[localAudio] 保存失败'));
    expect(await getLocalAudio('no-db')).toBeNull();
    expect(await deleteLocalAudio('no-db')).toBe(false);
    expect(await listLocalAudioIds()).toEqual([]);

    warnSpy.mockRestore();
  });

  it('记录缺少 blob（损坏数据）时按不存在处理', async () => {
    expect(await saveLocalAudio('real-1', blob(), { title: '正常' })).toBe(true);

    // 直接向同一 object store 写入一条无 blob 的记录
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('yyc3-music-audio', 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('tracks', 'readwrite');
      tx.objectStore('tracks').put({ id: 'broken-no-blob', meta: { title: '损坏' }, updatedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();

    expect(await getLocalAudio('broken-no-blob')).toBeNull();
    expect(await getLocalAudio('real-1')).not.toBeNull();
  });

  it('navigator.storage.estimate 可用时返回占用与配额', async () => {
    const estimate = vi.fn(async () => ({ usage: 2048, quota: 8192 }));
    vi.stubGlobal('navigator', { ...navigator, storage: { estimate } });

    expect(await getAudioStorageUsage()).toEqual({ usage: 2048, quota: 8192 });
    expect(estimate).toHaveBeenCalledTimes(1);
  });

  it('estimate 拒绝时返回 null 不抛出', async () => {
    const estimate = vi.fn(async () => {
      throw new Error('denied');
    });
    vi.stubGlobal('navigator', { ...navigator, storage: { estimate } });

    expect(await getAudioStorageUsage()).toBeNull();
  });

  it('pruneLocalAudio 逐个删除孤儿并统计成功数', async () => {
    await saveLocalAudio('keep', blob(), {});
    await saveLocalAudio('orphan-a', blob(), {});
    await saveLocalAudio('orphan-b', blob(), {});

    const removed = await pruneLocalAudio(['keep']);
    expect(removed).toBe(2);
    expect(await listLocalAudioIds()).toEqual(['keep']);
  });
});
