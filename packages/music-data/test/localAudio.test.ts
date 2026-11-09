// YYC³ music-data — 本地音频持久化测试
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  deleteLocalAudio,
  getLocalAudio,
  listLocalAudioIds,
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
});
