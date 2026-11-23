/**
 * AdvancedPlayer 单元测试 — hls.js 自适应内核 + 原生 Audio 兜底（mock 依赖）
 * 纯 JS 测试文件（被测模块为 .js，避免 TS 语法解析错误）
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Hls from 'hls.js';

// ── mock 依赖（AdvancedPlayer 的全部外部依赖） ──
const hlsInstances = [];
vi.mock('hls.js', () => ({
  default: class MockHls {
    static isSupported = () => true;
    loadSource = vi.fn();
    attachMedia = vi.fn();
    destroy = vi.fn();
    constructor() {
      hlsInstances.push(this);
    }
  },
}));

vi.mock('../src/ui/PlayerUI.js', () => ({
  default: class MockPlayerUI {
    on = vi.fn();
    updatePlayerState = vi.fn();
    switchSkin = vi.fn();
  },
}));

vi.mock('../src/engines/SoundResourceManager.js', () => ({
  default: class MockSoundManager {
    preloadAllSounds = vi.fn();
    playSound = vi.fn();
    setVolume = vi.fn();
    setMuted = vi.fn();
    switchSoundSkin = vi.fn();
  },
}));

/** jsdom Audio 的可控替身 */
class FakeAudio {
  static instances = [];
  src = '';
  volume = 1;
  muted = false;
  currentTime = 0;
  duration = 0;
  listeners = new Map();
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
  addEventListener(evt, cb) {
    const arr = this.listeners.get(evt) || [];
    arr.push(cb);
    this.listeners.set(evt, arr);
  }
  removeEventListener() {}
  constructor(src) {
    if (src) this.src = src;
    FakeAudio.instances.push(this);
  }
}

vi.stubGlobal('Audio', FakeAudio);

import AdvancedPlayer from '../src/engines/AdvancedPlayer.js';

const PLAYLIST = [
  { src: 'https://cdn.example.com/live/stream.m3u8', title: '直播流' },
  { src: 'https://cdn.example.com/media/song.mp3', title: '本地曲' },
];

describe('AdvancedPlayer（W2 hls.js 内核）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    FakeAudio.instances.length = 0;
    hlsInstances.length = 0;
    Hls.isSupported = () => true;
  });

  it('m3u8 源经 hls.js 接管（loadSource + attachMedia）', () => {
    const player = new AdvancedPlayer(document.createElement('div'), {
      playlist: [PLAYLIST[0]],
      currentIndex: 0,
    });
    expect(hlsInstances).toHaveLength(1);
    expect(hlsInstances[0].loadSource).toHaveBeenCalledWith(PLAYLIST[0].src);
    expect(hlsInstances[0].attachMedia).toHaveBeenCalled();
    expect(player.currentTrack.title).toBe('直播流');
  });

  it('mp3 源走原生 Audio（src 直挂）', () => {
    new AdvancedPlayer(document.createElement('div'), { playlist: [PLAYLIST[1]] });
    expect(hlsInstances).toHaveLength(0);
    expect(FakeAudio.instances).toHaveLength(1);
    expect(FakeAudio.instances[0].src).toBe(PLAYLIST[1].src);
  });

  it('切歌时销毁上一首的 hls 实例（防泄漏）', () => {
    const player = new AdvancedPlayer(document.createElement('div'), { playlist: PLAYLIST });
    expect(hlsInstances).toHaveLength(1);
    // 切到 mp3 → 引擎销毁且不再创建新引擎（走原生分支）
    player.loadTrack(1);
    expect(hlsInstances[0].destroy).toHaveBeenCalled();
    expect(hlsInstances).toHaveLength(1);
    // 再切回 m3u8 → 销毁旧引擎并创建新引擎
    player.loadTrack(0);
    expect(hlsInstances).toHaveLength(2);
  });

  it('dispose 释放引擎与媒体元素', () => {
    const player = new AdvancedPlayer(document.createElement('div'), { playlist: PLAYLIST });
    const engine = hlsInstances[0];
    player.dispose();
    expect(engine.destroy).toHaveBeenCalled();
    expect(player.audio).toBeNull();
    expect(player.currentTrack).toBeNull();
    expect(player.isPlaying).toBe(false);
  });

  it('clearPlaylist 同步销毁引擎', () => {
    const player = new AdvancedPlayer(document.createElement('div'), { playlist: PLAYLIST });
    player.clearPlaylist();
    expect(hlsInstances[0].destroy).toHaveBeenCalled();
  });

  it('next/prev 循环越界', () => {
    const player = new AdvancedPlayer(document.createElement('div'), {
      playlist: PLAYLIST,
      currentIndex: 1,
    });
    player.next();
    expect(player.currentIndex).toBe(0);
    player.prev();
    expect(player.currentIndex).toBe(1);
  });

  it('addTrack / removeTrack 维护列表与当前索引', () => {
    const player = new AdvancedPlayer(document.createElement('div'), {
      playlist: [PLAYLIST[0], PLAYLIST[1]],
      currentIndex: 1,
    });
    player.addTrack({ src: 'c.mp3', title: '新增' });
    expect(player.playlist).toHaveLength(3);

    player.removeTrack(0); // 移除当前之前的 → 索引回退
    expect(player.currentIndex).toBe(0);

    player.removeTrack(0); // 移除当前曲目 → 重载同位置
    expect(player.playlist).toHaveLength(1);
  });

  it('seek 与 setVolume 透传媒体元素', () => {
    const player = new AdvancedPlayer(document.createElement('div'), { playlist: [PLAYLIST[1]] });
    const audio = FakeAudio.instances[0];
    player.seek(30);
    expect(audio.currentTime).toBe(30);
    player.setVolume(0.3);
    expect(audio.volume).toBe(0.3);
  });

  it('事件 emit/on 机制', () => {
    const player = new AdvancedPlayer(document.createElement('div'), { playlist: [PLAYLIST[1]] });
    const spy = vi.fn();
    player.on('trackLoaded', spy);
    player.loadTrack(0);
    expect(spy).toHaveBeenCalled();
  });

  it('播放中切歌先暂停旧曲目', () => {
    const player = new AdvancedPlayer(document.createElement('div'), { playlist: PLAYLIST });
    const firstAudio = FakeAudio.instances[0];
    player.play();
    expect(player.isPlaying).toBe(true);
    player.loadTrack(1);
    expect(firstAudio.pause).toHaveBeenCalled();
    expect(player.isPlaying).toBe(false);
  });

  it('audio error 事件派发 trackError', () => {
    const player = new AdvancedPlayer(document.createElement('div'), { playlist: [PLAYLIST[1]] });
    const onError = vi.fn();
    player.on('trackError', onError);
    const audio = FakeAudio.instances[0];
    const errorCbs = audio.listeners.get('error') || [];
    errorCbs.forEach((cb) => cb(new Event('error')));
    expect(onError).toHaveBeenCalled();
  });

  it('ended 事件派发 trackEnded 并自动下一首', () => {
    const player = new AdvancedPlayer(document.createElement('div'), { playlist: PLAYLIST });
    const endedSpy = vi.fn();
    player.on('trackEnded', endedSpy);
    const audio = FakeAudio.instances[0];
    (audio.listeners.get('ended') || []).forEach((cb) => cb(new Event('ended')));
    expect(endedSpy).toHaveBeenCalled();
    expect(player.currentIndex).toBe(1);
  });

  it('HLS 不支持时 m3u8 源降级原生 Audio', () => {
    Hls.isSupported = () => false;
    new AdvancedPlayer(document.createElement('div'), { playlist: [PLAYLIST[0]] });
    expect(hlsInstances).toHaveLength(0);
    expect(FakeAudio.instances).toHaveLength(1);
    expect(FakeAudio.instances[0].src).toBe(PLAYLIST[0].src);
  });
});
