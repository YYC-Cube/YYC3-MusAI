/**
 * playlist-sort 单元测试 — dnd-kit 歌单排序渲染
 */
import { render, cleanup, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PlaylistSort } from '../src/ui/playlist-sort';

const ITEMS = [
  { id: 'a', title: '晴天' },
  { id: 'b', title: '七里香' },
  { id: 'c', title: '夜曲' },
];

describe('PlaylistSort', () => {
  it('渲染全部条目与序号', () => {
    const utils = render(<PlaylistSort items={ITEMS} onReorder={vi.fn()} />);
    const nodes = utils.container.querySelectorAll('[data-slot="playlist-sort-item"]');
    expect(nodes).toHaveLength(3);
    expect(utils.container.textContent).toContain('晴天');
    expect(utils.container.textContent).toContain('七里香');
    expect(utils.container.textContent).toContain('夜曲');
    expect(utils.container.textContent).toContain('#3');
  });

  it('暴露拖拽手柄 aria 标签', () => {
    const utils = render(<PlaylistSort items={ITEMS} onReorder={vi.fn()} />);
    expect(utils.container.querySelector('[aria-label="拖拽手柄"]')).toBeTruthy();
  });

  it('空列表渲染容器不崩溃', () => {
    const utils = render(<PlaylistSort items={[]} onReorder={vi.fn()} />);
    expect(utils.container.querySelector('[data-slot="playlist-sort"]')).toBeTruthy();
    expect(utils.container.querySelectorAll('[data-slot="playlist-sort-item"]')).toHaveLength(0);
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** 沿 fiber 祖先链取出 DndContext 的 onDragEnd 处理器（PlaylistSort 槽位仅经 dnd-kit 传感器触发） */
function getOnDragEnd(container: HTMLElement): (event: unknown) => void {
  const startNode = (container.firstElementChild as HTMLElement) ?? container;
  const key = Object.keys(startNode).find((k) => k.startsWith('__reactFiber$'));
  expect(key).toBeTruthy();
  let fiber = (startNode as unknown as Record<string, any>)[key!];
  for (let depth = 0; fiber && depth < 50; depth += 1) {
    // @dnd-kit/core 经 vite SSR interop 后导入绑定可能是命名空间对象，
    // 这里按组件函数名识别 DndContext fiber
    if (fiber.type?.name === 'DndContext') {
      const handler = fiber.pendingProps?.onDragEnd;
      expect(typeof handler).toBe('function');
      return handler;
    }
    fiber = fiber.return;
  }
  throw new Error('DndContext fiber not found');
}

/** 当前渲染的条目顺序（按 DOM 顺序取标题） */
function currentOrder(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('[data-slot="playlist-sort-item"] > span:first-of-type')).map(
    (n) => n.textContent ?? '',
  );
}

describe('PlaylistSort 拖拽排序分支（W5 补流）', () => {
  it('拖拽重排：更新条目顺序并回调 onReorder', () => {
    const onReorder = vi.fn();
    const utils = render(<PlaylistSort items={ITEMS} onReorder={onReorder} />);
    const handleDragEnd = getOnDragEnd(utils.container);

    // b 拖到 c 的位置：[a, b, c] → [a, c, b]
    act(() => handleDragEnd({ active: { id: 'b' }, over: { id: 'c' } }));

    expect(onReorder).toHaveBeenCalledTimes(1);
    expect(onReorder).toHaveBeenCalledWith(['a', 'c', 'b']);
    expect(currentOrder(utils.container)).toEqual(['晴天', '夜曲', '七里香']);
    // 序号随新顺序更新
    expect(utils.container.textContent).toContain('#3');
  });

  it('over 为 null（取消拖拽）时不重排不回调', () => {
    const onReorder = vi.fn();
    const utils = render(<PlaylistSort items={ITEMS} onReorder={onReorder} />);
    const handleDragEnd = getOnDragEnd(utils.container);

    act(() => handleDragEnd({ active: { id: 'a' }, over: null }));

    expect(onReorder).not.toHaveBeenCalled();
    expect(currentOrder(utils.container)).toEqual(['晴天', '七里香', '夜曲']);
  });

  it('active 与 over 相同时忽略', () => {
    const onReorder = vi.fn();
    const utils = render(<PlaylistSort items={ITEMS} onReorder={onReorder} />);
    const handleDragEnd = getOnDragEnd(utils.container);

    act(() => handleDragEnd({ active: { id: 'b' }, over: { id: 'b' } }));

    expect(onReorder).not.toHaveBeenCalled();
    expect(currentOrder(utils.container)).toEqual(['晴天', '七里香', '夜曲']);
  });

  it('active id 越界（不在列表中）时忽略', () => {
    const onReorder = vi.fn();
    const utils = render(<PlaylistSort items={ITEMS} onReorder={onReorder} />);
    const handleDragEnd = getOnDragEnd(utils.container);

    act(() => handleDragEnd({ active: { id: 'ghost-id' }, over: { id: 'a' } }));

    expect(onReorder).not.toHaveBeenCalled();
    expect(currentOrder(utils.container)).toEqual(['晴天', '七里香', '夜曲']);
  });

  it('over id 越界（不在列表中）时忽略', () => {
    const onReorder = vi.fn();
    const utils = render(<PlaylistSort items={ITEMS} onReorder={onReorder} />);
    const handleDragEnd = getOnDragEnd(utils.container);

    act(() => handleDragEnd({ active: { id: 'a' }, over: { id: 'ghost-id' } }));

    expect(onReorder).not.toHaveBeenCalled();
    expect(currentOrder(utils.container)).toEqual(['晴天', '七里香', '夜曲']);
  });

  it('单元素列表拖拽自身不崩溃且不回调', () => {
    const onReorder = vi.fn();
    const utils = render(<PlaylistSort items={[ITEMS[0]]} onReorder={onReorder} />);
    const handleDragEnd = getOnDragEnd(utils.container);

    act(() => handleDragEnd({ active: { id: 'a' }, over: { id: 'a' } }));

    expect(onReorder).not.toHaveBeenCalled();
    expect(currentOrder(utils.container)).toEqual(['晴天']);
    expect(utils.container.textContent).toContain('#1');
  });

  it('重排状态保留（items prop 变化不重置内部排序）', () => {
    const onReorder = vi.fn();
    const utils = render(<PlaylistSort items={ITEMS} onReorder={onReorder} />);
    const handleDragEnd = getOnDragEnd(utils.container);

    act(() => handleDragEnd({ active: { id: 'c' }, over: { id: 'a' } }));
    expect(onReorder).toHaveBeenCalledWith(['c', 'a', 'b']);

    // 内部 state 已更新；再拖一次基于新顺序 [c, a, b] 计算：c 拖到 b 的位置 → [a, b, c]
    const handleDragEnd2 = getOnDragEnd(utils.container);
    act(() => handleDragEnd2({ active: { id: 'c' }, over: { id: 'b' } }));
    expect(onReorder).toHaveBeenLastCalledWith(['a', 'b', 'c']);
    expect(onReorder).toHaveBeenCalledTimes(2);
  });
});
