/**
 * music-mv · MvScene 场景组件测试（覆盖率提升：全包 0% → >80%）
 *
 * 覆盖：五主题背景分支、歌词时间轴取行、进度条计算与封顶、
 * 默认导出与命名导出一致性。
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import MvScene, { MvScene as NamedMvScene } from '../src/MvScene';
import type { MvTrack } from '../src/types';

afterEach(cleanup);

const track: MvTrack = {
  id: 'mv-001',
  title: '星海回响',
  audioUrl: 'https://cdn.example.com/a.mp3',
  coverUrl: 'https://cdn.example.com/cover.jpg',
  color: '#667eea',
  lyrics: [
    { time: 0, text: '第一句' },
    { time: 10, text: '第二句' },
    { time: 20, text: '第三句' },
  ],
};

const baseProps = { track, width: 1280, height: 720 };

describe('MvScene 场景组件', () => {
  it('默认导出与命名导出为同一组件', () => {
    expect(MvScene).toBe(NamedMvScene);
  });

  it('渲染标题/封面与容器尺寸', () => {
    const { container, getByText } = render(<MvScene {...baseProps} theme="starfield" currentTime={0} />);
    expect(getByText('星海回响')).toBeTruthy();
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.width).toBe('1280px');
    expect(root.style.height).toBe('720px');
    expect(root.style.background).toContain('rgb(11, 14, 22)'); // starfield 主题底色（jsdom 规范化为 rgb）
  });

  it('歌词按 currentTime 取最近一行', () => {
    const { getByText, rerender } = render(<MvScene {...baseProps} theme="aurora" currentTime={0} />);
    expect(getByText('第一句')).toBeTruthy();

    rerender(<MvScene {...baseProps} theme="aurora" currentTime={12} />);
    expect(getByText('第二句')).toBeTruthy();

    rerender(<MvScene {...baseProps} theme="aurora" currentTime={25} />);
    expect(getByText('第三句')).toBeTruthy();
  });

  it('播放前（currentTime 超前首行）仍渲染首句；时间早于全部行时不渲染歌词层', () => {
    // time=0 的第一行在 currentTime=0 已命中（<=）
    const { getByText } = render(<MvScene {...baseProps} theme="inkWash" currentTime={0} />);
    expect(getByText('第一句')).toBeTruthy();

    const empty = render(
      <MvScene
        {...baseProps}
        track={{ ...track, lyrics: [{ time: 5, text: '五秒后' }] }}
        theme="inkWash"
        currentTime={2}
      />,
    );
    expect(empty.queryByText('五秒后')).toBeNull();
  });

  it('五主题背景分支全覆盖（含 inkWash 浅色进度条）', () => {
    const themes = ['starfield', 'neonPulse', 'aurora', 'inkWash', 'cyberCity'] as const;
    for (const theme of themes) {
      const { unmount } = render(<MvScene {...baseProps} theme={theme} currentTime={10} />);
      unmount();
    }
    // inkWash 进度条为纯黑填充（浅色主题）
    const { container } = render(<MvScene {...baseProps} theme="inkWash" currentTime={10} />);
    const fill = container.querySelector('.h-full') as HTMLElement;
    expect(fill.style.background).toContain('rgb(0, 0, 0)');
  });

  it('进度条随时间增长且封顶 100%', () => {
    const { container, rerender } = render(<MvScene {...baseProps} theme="cyberCity" currentTime={5} />);
    const pct = () => (container.querySelector('.h-full') as HTMLElement).style.width;
    const half = pct();
    expect(half).toBeTruthy();

    rerender(<MvScene {...baseProps} theme="cyberCity" currentTime={10} />);
    expect(parseFloat(pct())).toBeGreaterThan(parseFloat(half)); // 递增

    rerender(<MvScene {...baseProps} theme="cyberCity" currentTime={999} />);
    expect(pct()).toBe('100%'); // 封顶
  });

  it('空歌词曲目：进度条以 1s 兜底不 NaN', () => {
    const { container } = render(
      <MvScene {...baseProps} track={{ ...track, lyrics: [] }} theme="neonPulse" currentTime={3} />,
    );
    const fill = container.querySelector('.h-full') as HTMLElement;
    expect(fill.style.width).not.toBe('NaN%');
  });
});
