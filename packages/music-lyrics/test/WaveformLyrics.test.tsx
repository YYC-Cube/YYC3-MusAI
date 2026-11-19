/**
 * WaveformLyrics 单元测试 — wavesurfer v8 + Regions 歌词联动（mock 内核）
 */
import { render } from '@testing-library/react';
import * as React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const wsMock = {
  on: vi.fn(),
  un: vi.fn(),
  destroy: vi.fn(),
  getDuration: vi.fn(() => 100),
  getCurrentTime: vi.fn(() => 5),
  setTime: vi.fn(),
  isPlaying: vi.fn(() => false),
  play: vi.fn(),
  pause: vi.fn(),
};

const regionsMock = {
  clearRegions: vi.fn(),
  addRegion: vi.fn(),
  getRegions: vi.fn(() => []),
  on: vi.fn(() => () => {}),
};

vi.mock('wavesurfer.js', () => ({
  default: { create: vi.fn(() => wsMock) },
}));

vi.mock('wavesurfer.js/plugins/regions', () => ({
  default: { create: vi.fn(() => regionsMock) },
}));

import WaveSurfer from 'wavesurfer.js';
import { WaveformLyrics, type WaveformLyricsHandle } from '../src/components/WaveformLyrics';

const LYRICS = [
  { time: 0, text: '第一句' },
  { time: 10, text: '第二句' },
  { time: 20, text: '第三句' },
];

describe('WaveformLyrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('渲染容器并创建 WaveSurfer 实例', () => {
    const utils = render(<WaveformLyrics audioUrl="audio.mp3" />);
    expect(utils.container.querySelector('[data-slot="waveform-lyrics"]')).toBeTruthy();
    expect(WaveSurfer.create).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'audio.mp3', height: 64 }),
    );
  });

  it('每行歌词生成一个 Region（末行 end=时长）', async () => {
    render(<WaveformLyrics audioUrl="audio.mp3" lyrics={LYRICS} />);
    // 等 effect 同步执行后断言
    expect(regionsMock.addRegion).toHaveBeenCalledTimes(LYRICS.length);
    const first = regionsMock.addRegion.mock.calls[0][0];
    expect(first).toMatchObject({ start: 0, end: 10 });
    const last = regionsMock.addRegion.mock.calls[2][0];
    expect(last.end).toBe(100);
  });

  it('audioUrl 变化时销毁旧实例（防泄漏）', async () => {
    const utils = render(<WaveformLyrics audioUrl="a.mp3" />);
    await utils.rerender(<WaveformLyrics audioUrl="b.mp3" />);
    expect(wsMock.destroy).toHaveBeenCalled();
  });

  it('imperative handle：seek 转发到 setTime', async () => {
    const ref = React.createRef<WaveformLyricsHandle>();
    render(<WaveformLyrics ref={ref} audioUrl="a.mp3" />);
    ref.current?.seek(42);
    expect(wsMock.setTime).toHaveBeenCalledWith(42);
  });

  it('imperative handle：play/pause/getTime/getDuration 转发', async () => {
    const ref = React.createRef<WaveformLyricsHandle>();
    render(<WaveformLyrics ref={ref} audioUrl="a.mp3" />);
    ref.current?.play();
    expect(wsMock.play).toHaveBeenCalled();
    ref.current?.pause();
    expect(wsMock.pause).toHaveBeenCalled();
    expect(ref.current?.getCurrentTime()).toBe(5);
    expect(ref.current?.getDuration()).toBe(100);
  });

  it('timeupdate 回调透传 currentTime 与 duration', async () => {
    const onTimeUpdate = vi.fn();
    render(<WaveformLyrics audioUrl="a.mp3" onTimeUpdate={onTimeUpdate} />);
    // 捕获 ws.on('timeupdate', fn) 注册的回调并触发
    const calls = wsMock.on.mock.calls as [string, Function][];
    const timeEntry = calls.find(([evt]) => evt === 'timeupdate');
    expect(timeEntry).toBeTruthy();
    timeEntry![1](12.5);
    expect(onTimeUpdate).toHaveBeenCalledWith(12.5, 100);
  });

  it('loopCurrentRegion：到达 Region 末尾回到起点', async () => {
    // 让 regions.getRegions 返回当前活动 region
    regionsMock.getRegions.mockReturnValue([{ id: 'lyric-0', start: 0, end: 10 }]);
    const calls = regionsMock.on.mock.calls as [string, Function][];
    render(<WaveformLyrics audioUrl="a.mp3" lyrics={LYRICS} loopCurrentRegion onTimeUpdate={() => {}} />);
    // region-in 设置活动 Region
    const inEntry = calls.find(([evt]) => evt === 'region-in');
    expect(inEntry).toBeTruthy();
    inEntry![1]({ id: 'lyric-0', start: 0, end: 10 });
    // 触发 timeupdate 至末尾前 0.05s
    const timeEntry = (wsMock.on.mock.calls as [string, Function][]).find(([evt]) => evt === 'timeupdate');
    timeEntry![1](9.98);
    expect(wsMock.setTime).toHaveBeenCalledWith(0);
    expect(wsMock.play).toHaveBeenCalled();
    wsMock.setTime.mockClear();
  });

  it('region-clicked：跳转到该行起点并播放', async () => {
    const calls = regionsMock.on.mock.calls as [string, Function][];
    render(<WaveformLyrics audioUrl="a.mp3" lyrics={LYRICS} />);
    const clickEntry = calls.find(([evt]) => evt === 'region-clicked');
    expect(clickEntry).toBeTruthy();
    clickEntry![1]({ id: 'lyric-1', start: 10, end: 20, play: vi.fn() }, new MouseEvent('click'));
    expect(wsMock.setTime).toHaveBeenCalledWith(10);
    expect(wsMock.play).toHaveBeenCalled();
  });

  it('showRegions=false 时不生成 Region', async () => {
    render(<WaveformLyrics audioUrl="a.mp3" lyrics={LYRICS} showRegions={false} />);
    expect(regionsMock.addRegion).not.toHaveBeenCalled();
  });
});
