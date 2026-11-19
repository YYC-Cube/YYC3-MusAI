/**
 * MediaDisplay 单元测试 — Video.js 10 + hls.js 集成分支（mock 内核）
 */
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPlayer = {
  el: vi.fn(() => ({ src: '' })),
  currentSrc: vi.fn(() => ''),
  play: vi.fn(),
  pause: vi.fn(),
  dispose: vi.fn(),
  src: vi.fn(),
};

vi.mock('video.js', () => ({
  // 真实 videojs 会在初始化完成后回调 onReady，mock 同步模拟该行为
  default: vi.fn((_el: any, _opts: any, onReady?: () => void) => {
    onReady?.();
    return mockPlayer;
  }),
}));

const hlsInstances: any[] = [];
vi.mock('hls.js', () => ({
  default: class MockHls {
    static isSupported = vi.fn(() => true);
    loadSource = vi.fn();
    attachMedia = vi.fn();
    destroy = vi.fn();
    constructor() {
      hlsInstances.push(this);
    }
  },
}));

vi.mock('@yyc3/music-ui', () => ({
  ImageWithFallback: (props: any) => <img alt={props.alt || ''} src={props.src || ''} />,
}));

import videojs from 'video.js';
import Hls from 'hls.js';
import { MediaDisplay } from '../src/components/MediaDisplay';

const baseProps = {
  isPlaying: false,
  albumArtUrl: 'art.png',
  frequencyData: new Uint8Array(64),
  emotion: 'neutral' as const,
  audioEnergy: 0,
  songTitle: '晴天',
  artist: '周杰伦',
};

describe('MediaDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hlsInstances.length = 0;
    vi.mocked(videojs).mockClear();
    (Hls.isSupported as any).mockClear?.();
    (Hls.isSupported as any) = vi.fn(() => true);
  });

  it('audio 模式渲染黑胶可视化（canvas + 专辑图）', () => {
    const utils = render(<MediaDisplay {...baseProps} mode="audio" />);
    expect(utils.container.querySelector('canvas')).toBeTruthy();
    expect(utils.container.textContent).not.toContain('media.videoMode');
  });

  it('video 模式无 url 时渲染占位', () => {
    const utils = render(<MediaDisplay {...baseProps} mode="video" />);
    // 占位 play svg 路径
    expect(utils.container.querySelector('svg')).toBeTruthy();
    expect(utils.container.querySelector('video')).toBeNull();
  });

  it('video 模式 m3u8 源由 hls.js 接管（loadSource + attachMedia）', () => {
    const utils = render(
      <MediaDisplay {...baseProps} mode="video" videoUrl="https://cdn.example.com/live/index.m3u8" />,
    );
    expect(utils.container.querySelector('video')).toBeTruthy();
    expect(hlsInstances).toHaveLength(1);
    expect(hlsInstances[0].loadSource).toHaveBeenCalledWith('https://cdn.example.com/live/index.m3u8');
    expect(hlsInstances[0].attachMedia).toHaveBeenCalled();
    expect(videojs).not.toHaveBeenCalled();
  });

  it('HLS 不支持时回退（不实例化 Hls）', () => {
    (Hls.isSupported as any) = vi.fn(() => false);
    render(
      <MediaDisplay {...baseProps} mode="video" videoUrl="https://cdn.example.com/live/index.m3u8" />,
    );
    expect(hlsInstances).toHaveLength(0);
  });

  it('卸载时销毁 hls 实例（防泄漏）', () => {
    const utils = render(
      <MediaDisplay {...baseProps} mode="video" videoUrl="https://cdn.example.com/live/index.m3u8" />,
    );
    expect(hlsInstances).toHaveLength(1);
    utils.unmount();
    expect(hlsInstances[0].destroy).toHaveBeenCalled();
  });

  it('mp4 源走 Video.js 原生（videojs 被创建并设置 src）', () => {
    render(
      <MediaDisplay {...baseProps} isPlaying mode="video" videoUrl="https://cdn.example.com/media/movie.mp4" />,
    );
    expect(videojs).toHaveBeenCalled();
    expect(mockPlayer.src).toHaveBeenCalledWith({
      src: 'https://cdn.example.com/media/movie.mp4',
      type: 'video/mp4',
    });
    expect(mockPlayer.play).toHaveBeenCalled();
  });

  it('同源复用实例：仅同步播放状态不重建', () => {
    mockPlayer.currentSrc.mockReturnValue('https://cdn.example.com/media/movie.mp4');
    const utils = render(
      <MediaDisplay {...baseProps} isPlaying mode="video" videoUrl="https://cdn.example.com/media/movie.mp4" />,
    );
    const created = vi.mocked(videojs).mock.calls.length;
    // isPlaying 翻转（同 url）→ 复用实例，仅 pause
    utils.rerender(
      <MediaDisplay {...baseProps} isPlaying={false} mode="video" videoUrl="https://cdn.example.com/media/movie.mp4" />,
    );
    expect(vi.mocked(videojs).mock.calls.length).toBe(created);
    expect(mockPlayer.pause).toHaveBeenCalled();
    mockPlayer.currentSrc.mockReturnValue('');
  });
});
