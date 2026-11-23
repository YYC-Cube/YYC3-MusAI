/**
 * @file VisxCharts 四类 SVG 图表测试（W4 收编组件补测）
 * @description 覆盖 Bar/Line/Pie/Area 四个图表的渲染冒烟、比例尺计算（rect/path 几何断言）、
 *              默认标题与自定义标题、空数据与长列表边界。
 *              组件基于原生 SVG（无 @visx/* 运行时依赖），jsdom 下无需额外 stub。
 */
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'

// RTL 挂载手动清理：源仓 vitest 不依赖 globals auto-cleanup（W7-P2-3 环境自足化）
afterEach(() => { cleanup() })

// jsdom 缺失浏览器 API 守卫（W7-P2-3 环境自足化；守卫式，不覆盖宿主已有实现）
if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    })
  }
  if (typeof (globalThis as { ResizeObserver?: unknown }).ResizeObserver === 'undefined') {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub
  }
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
}


import { createElement } from 'react'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  VisxAreaChart,
  VisxBarChart,
  VisxLineChart,
  VisxPieChart,
} from '../src'

/** 几何基线：width=400/height=240 → xMax=310、yMax=150（margin 60/30/40/50） */
const BAR_DATA = [
  { name: 'A', value: 10 },
  { name: 'B', value: 20 },
]

describe('VisxBarChart', () => {
  it('默认标题 + 两个 rect 且几何符合 linear/band 比例尺', () => {
    const { container } = render(createElement(VisxBarChart, { data: BAR_DATA }))
    expect(screen.getByText('播放排行')).toBeInTheDocument()

    const rects = container.querySelectorAll('svg rect')
    expect(rects).toHaveLength(2)
    // bandScale: step=155, pad=31, bandwidth=124; A→15.5, B→170.5
    // linearScale: y(10)=75, y(20)=0; height=yMax-yv
    expect(rects[0]).toHaveAttribute('x', '15.5')
    expect(rects[0]).toHaveAttribute('y', '75')
    expect(rects[0]).toHaveAttribute('width', '124')
    expect(rects[0]).toHaveAttribute('height', '75')
    expect(rects[1]).toHaveAttribute('x', '170.5')
    expect(rects[1]).toHaveAttribute('y', '0')
    expect(rects[1]).toHaveAttribute('height', '150')
    expect(rects[0]).toHaveAttribute('fill', '#60a5fa')
  })

  it('自定义标题与画布尺寸生效', () => {
    const { container } = render(
      createElement(VisxBarChart, { data: BAR_DATA, title: '周榜 TOP', width: 800, height: 400 })
    )
    expect(screen.getByText('周榜 TOP')).toBeInTheDocument()
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('width', '800')
    expect(svg).toHaveAttribute('height', '400')
    // xMax=800-90=710, yMax=400-90=310 → step=355, pad=71, bandwidth=284; y(10)=155
    const rects = container.querySelectorAll('svg rect')
    expect(rects[0]).toHaveAttribute('width', '284')
    expect(rects[0]).toHaveAttribute('height', '155')
  })

  it('空数据不崩溃且不渲染 rect', () => {
    const { container } = render(createElement(VisxBarChart, { data: [] }))
    expect(screen.getByText('播放排行')).toBeInTheDocument()
    expect(container.querySelectorAll('svg rect')).toHaveLength(0)
  })

  it('长列表（40 条）渲染全部 rect', () => {
    const longData = Array.from({ length: 40 }, (_, i) => ({
      name: `song-${i}`,
      value: (i + 1) * 5,
    }))
    const { container } = render(createElement(VisxBarChart, { data: longData }))
    expect(container.querySelectorAll('svg rect')).toHaveLength(40)
  })
})

describe('VisxLineChart', () => {
  const LINE_DATA = [
    { date: '2026-01-01', value: 10 },
    { date: '2026-01-02', value: 20 },
  ]

  it('默认标题 + path 几何符合时间/线性比例尺', () => {
    const { container } = render(createElement(VisxLineChart, { data: LINE_DATA }))
    expect(screen.getByText('播放趋势')).toBeInTheDocument()
    const path = container.querySelector('svg path')!
    expect(path).toHaveAttribute('d', 'M0,75 L310,0')
    expect(path).toHaveAttribute('stroke', '#34d399')
    expect(path).toHaveAttribute('fill', 'none')
  })

  it('自定义标题', () => {
    render(createElement(VisxLineChart, { data: LINE_DATA, title: '近 7 日趋势' }))
    expect(screen.getByText('近 7 日趋势')).toBeInTheDocument()
  })

  it('空数据渲染空 path 不崩溃', () => {
    const { container } = render(createElement(VisxLineChart, { data: [] }))
    expect(container.querySelector('svg path')).not.toBeNull()
    expect(container.querySelector('svg path')).toHaveAttribute('d', '')
  })
})

describe('VisxPieChart', () => {
  it('默认标题 + 扇区数量与配色', () => {
    const { container } = render(
      createElement(VisxPieChart, {
        data: [
          { name: 'happy', value: 60 },
          { name: 'calm', value: 40 },
        ],
      })
    )
    expect(screen.getByText('情绪分布')).toBeInTheDocument()
    const paths = container.querySelectorAll('svg path')
    expect(paths).toHaveLength(2)
    expect(paths[0]).toHaveAttribute('fill', '#60a5fa')
    expect(paths[1]).toHaveAttribute('fill', '#fbbf24')
  })

  it('大于半圆的扇区使用 large-arc 标记且从原点起弧', () => {
    const { container } = render(
      createElement(VisxPieChart, {
        data: [
          { name: 'happy', value: 60 },
          { name: 'calm', value: 40 },
        ],
        width: 240,
        height: 240,
      })
    )
    const paths = container.querySelectorAll('svg path')
    // radius = 240/2-20 = 100；happy 占 0.6 > 0.5 → largeArc=1
    expect(paths[0].getAttribute('d')).toMatch(/^M0 0 L100 0 A100 100 0 1 1 /)
    // calm 占 0.4 → largeArc=0
    expect(paths[1].getAttribute('d')).toMatch(/A100 100 0 0 1 /)
  })

  it('五分类数据渲染五个扇区（颜色循环取色）', () => {
    const { container } = render(
      createElement(VisxPieChart, {
        data: [
          { name: 'happy', value: 1 },
          { name: 'sad', value: 1 },
          { name: 'energetic', value: 1 },
          { name: 'calm', value: 1 },
          { name: 'neutral', value: 1 },
        ],
      })
    )
    const paths = container.querySelectorAll('svg path')
    expect(paths).toHaveLength(5)
    expect(paths[4]).toHaveAttribute('fill', '#a78bfa')
  })
})

describe('VisxAreaChart', () => {
  const AREA_DATA = [
    { date: '2026-01-01', value: 10 },
    { date: '2026-01-02', value: 20 },
  ]

  it('默认标题 + path 几何与描边色', () => {
    const { container } = render(createElement(VisxAreaChart, { data: AREA_DATA }))
    expect(screen.getByText('用户增长')).toBeInTheDocument()
    const path = container.querySelector('svg path')!
    expect(path).toHaveAttribute('d', 'M0,75 L310,0')
    expect(path).toHaveAttribute('stroke', '#a78bfa')
    expect(path).toHaveAttribute('stroke-width', '2')
  })

  it('自定义标题', () => {
    render(createElement(VisxAreaChart, { data: AREA_DATA, title: '新增听众' }))
    expect(screen.getByText('新增听众')).toBeInTheDocument()
  })

  it('空数据渲染空 path 不崩溃', () => {
    const { container } = render(createElement(VisxAreaChart, { data: [] }))
    expect(container.querySelector('svg path')).toHaveAttribute('d', '')
  })
})
