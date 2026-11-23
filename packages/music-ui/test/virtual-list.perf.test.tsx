/**
 * @file VirtualList 渲染性能 smoke — 1000 项（W8 §量化验收 — 离线可测部分）
 * @description 度量 mount→commit 耗时（performance.now）并断言 DOM 节点数远小于总条目数
 *              （虚拟化只渲染可视窗口）；3 轮取中位数抗偶发抖动，阈值放宽到 <1500ms 保 CI 稳定
 */
import '@testing-library/jest-dom/vitest'
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { VirtualList } from '../src'

const ITEMS = Array.from({ length: 1000 }, (_, i) => ({ id: `track-${i}`, title: `歌曲 ${i}` }));

// jsdom 无 ResizeObserver：守卫式 stub（不覆盖宿主已有实现）
if (typeof (globalThis as { ResizeObserver?: unknown }).ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub
}

// jsdom 无真实布局：给滚动容器一个 400x500 视口（rect 高度 ÷ estimateSize(48) ≈ 11 行可见）。
// 注意 TanStack virtual-core 3.19 的 observeElementRect 同步测量走 clientWidth/clientHeight
// （jsdom 恒为 0，会把可视窗口清空），必须一并 stub 才能让窗口化 DOM 真实提交。
const RECT = {
  width: 400,
  height: 500,
  top: 0,
  left: 0,
  bottom: 500,
  right: 400,
  x: 0,
  y: 0,
  toJSON: () => ({}),
} as DOMRect

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(RECT)
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(400)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(500)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

interface MountStats {
  elapsedMs: number;
  domNodes: number;
}

function mountOnce(): MountStats {
  const start = performance.now()
  const utils = render(
    <VirtualList
      items={ITEMS}
      overscan={5}
      initialRect={{ width: 400, height: 500 }}
      renderItem={(it: { title: string }) => <div>{it.title}</div>}
    />
  )
  const elapsedMs = performance.now() - start
  // 容器内全部 DOM 节点（含列表/spacer/inner 外壳 + 每项 wrapper/内容 ≈ 2 节点）
  const domNodes = utils.container.querySelectorAll('*').length
  utils.unmount()
  return { elapsedMs, domNodes }
}

describe('VirtualList 渲染性能 smoke（1000 项）', () => {
  it('mount→commit 中位数 <1500ms 且 DOM 节点数 <60（仅可视窗口）', () => {
    const rounds: MountStats[] = [mountOnce(), mountOnce(), mountOnce()]
    const median = [...rounds].sort((a, b) => a.elapsedMs - b.elapsedMs)[1]

    console.info(
      `[perf] VirtualList 1000 items mount=${median.elapsedMs.toFixed(1)}ms domNodes=${median.domNodes}`
    )
    console.info(
      `[perf] rounds=${rounds.map(r => `${r.elapsedMs.toFixed(1)}ms/${r.domNodes}n`).join(', ')}`
    )

    // 时间门禁：CI 波动安全阈值（实测通常 <100ms）
    expect(median.elapsedMs).toBeLessThan(1500)
    // 虚拟化门禁：1000 项只渲染可视窗口 + overscan，节点数远小于 1000
    for (const r of rounds) {
      expect(r.domNodes).toBeGreaterThan(0)
      expect(r.domNodes).toBeLessThan(60)
    }
  })
})
