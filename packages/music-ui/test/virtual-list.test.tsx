/**
 * virtual-list 单元测试 — TanStack Virtual v3 虚拟化渲染
 */
import { render, screen } from '@testing-library/react';
import { afterAll, describe, expect, it, vi } from 'vitest';

import { VirtualList } from '../src/ui/virtual-list';

const ITEMS = Array.from({ length: 100 }, (_, i) => ({ id: `item-${i}`, title: `歌曲 ${i}` }));

// jsdom 无 ResizeObserver 且容器无尺寸 → stub 观察器并给定可见视口
vi.stubGlobal('ResizeObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
});
vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
  width: 400,
  height: 500,
  top: 0,
  left: 0,
  bottom: 500,
  right: 400,
  x: 0,
  y: 0,
  toJSON: () => ({}),
} as DOMRect);
afterAll(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('VirtualList', () => {
  it('渲染滚动容器与 spacer', () => {
    const { render: _unused } = { render }; // keep import shape stable
    const utils = render(<VirtualList items={ITEMS} renderItem={(it) => <div>{it.title}</div>} />);
    expect(utils.container.querySelector('[data-slot="virtual-list"]')).toBeTruthy();
    expect(utils.container.querySelector('[data-slot="virtual-list-spacer"]')).toBeTruthy();
  });

  it('虚拟化生效：renderItem 调用次数远小于数据条目数', () => {
    const renderItem = vi.fn((it: { title: string }) => <div>{it.title}</div>);
    render(
      <VirtualList
        items={ITEMS}
        estimateSize={48}
        overscan={5}
        initialRect={{ width: 400, height: 500 }}
        renderItem={renderItem}
      />,
    );
    // 首帧仅渲染可见窗口 + overscan（≈16 条），未渲染全部 100 条
    expect(renderItem.mock.calls.length).toBeGreaterThan(0);
    expect(renderItem.mock.calls.length).toBeLessThan(ITEMS.length);
  });

  it('renderItem 收到数据与索引', () => {
    const renderItem = vi.fn((it: { title: string }) => <div>{it.title}</div>);
    render(
      <VirtualList
        items={ITEMS.slice(0, 30)}
        initialRect={{ width: 400, height: 500 }}
        renderItem={renderItem}
      />,
    );
    expect(renderItem).toHaveBeenCalled();
    const secondArg = renderItem.mock.calls[0]?.[1];
    expect(typeof secondArg).toBe('number');
  });

  it('items 为空时不渲染条目且不崩溃', () => {
    const utils = render(<VirtualList items={[]} renderItem={(it: { title: string }) => <div>{it.title}</div>} />);
    expect(utils.container.querySelectorAll('[data-slot="virtual-list-item"]')).toHaveLength(0);
    expect(screen.queryByText('歌曲 0')).toBeNull();
  });
});
