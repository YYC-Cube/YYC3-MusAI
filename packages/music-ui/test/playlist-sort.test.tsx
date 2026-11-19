/**
 * playlist-sort 单元测试 — dnd-kit 歌单排序渲染
 */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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
