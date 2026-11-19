/**
 * ReactionBar 单元测试 — Misskey 式表情反应（toggle / 只读 / 选择器）
 */
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReactionBar } from '../src/components/ReactionBar';

afterEach(() => cleanup());

describe('ReactionBar', () => {
  it('渲染已有反应与计数', () => {
    render(<ReactionBar reactions={{ '❤️': 3, '👏': 1 }} myReactions={['❤️']} />);
    expect(screen.getByLabelText(/❤️ 3 次/)).toBeTruthy();
    expect(screen.getByLabelText(/👏 1 次/)).toBeTruthy();
  });

  it('我的反应点击触发 onUnreact（toggle 取消）', () => {
    const onReact = vi.fn();
    const onUnreact = vi.fn();
    render(<ReactionBar reactions={{ '❤️': 1 }} myReactions={['❤️']} onReact={onReact} onUnreact={onUnreact} />);
    fireEvent.click(screen.getByLabelText(/❤️ 1 次/));
    expect(onUnreact).toHaveBeenCalledWith('❤️');
    expect(onReact).not.toHaveBeenCalled();
  });

  it('非我的反应点击触发 onReact（toggle 添加）', () => {
    const onReact = vi.fn();
    const onUnreact = vi.fn();
    render(<ReactionBar reactions={{ '👏': 2 }} myReactions={[]} onReact={onReact} onUnreact={onUnreact} />);
    fireEvent.click(screen.getByLabelText(/👏 2 次/));
    expect(onReact).toHaveBeenCalledWith('👏');
    expect(onUnreact).not.toHaveBeenCalled();
  });

  it('只读模式点击不触发回调', () => {
    const onReact = vi.fn();
    render(<ReactionBar reactions={{ '❤️': 5 }} myReactions={[]} onReact={onReact} readOnly />);
    fireEvent.click(screen.getByLabelText(/❤️ 5 次/));
    expect(onReact).not.toHaveBeenCalled();
    // 只读时不渲染添加入口
    expect(screen.queryByLabelText('添加表情反应')).toBeNull();
  });

  it('选择器添加新反应', () => {
    const onReact = vi.fn();
    render(<ReactionBar reactions={{}} myReactions={[]} onReact={onReact} />);
    fireEvent.click(screen.getByLabelText('添加表情反应'));
    fireEvent.click(screen.getByLabelText('反应 🔥'));
    expect(onReact).toHaveBeenCalledWith('🔥');
  });

  it('计数为 0 的反应不显示', () => {
    render(<ReactionBar reactions={{ '❤️': 0 }} myReactions={[]} />);
    expect(screen.queryByLabelText(/❤️/)).toBeNull();
  });
});
