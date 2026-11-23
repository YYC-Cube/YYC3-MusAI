/**
 * @file VisxChartsDashboard 运营数据看板面板测试（SCE-005 收编组件补测）
 * @description 覆盖关闭态渲染 null、开启态冒烟（头部/指标卡/默认热门歌曲 tab）、四个 tab 切换
 *              对应 Visx 图表切换、/api/analytics/* 数据替换 demo 数据、接口失败回退 demo、
 *              头部关闭按钮触发 onClose。
 *              jsdom 兼容处理：组件用全局 fetch（非 apiFetch）→ vi.stubGlobal 成对
 *              vi.unstubAllGlobals；motion/react 在 jsdom 可直接渲染（同 LiveSessionPanel 等既有测试）。
 */
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'

// RTL 挂载手动清理：源仓 vitest 不依赖 globals auto-cleanup（W7-P2-3 环境自足化）
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

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
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VisxChartsDashboard } from '../src'

const FETCH_PAYLOADS: Record<string, unknown> = {
  '/api/analytics/metrics': { totalPlays: 999000, totalLikes: 5000, totalComments: 1500, activeUsers: 900 },
  '/api/analytics/trend': [{ date: '2026-11-01', value: 100 }, { date: '2026-11-02', value: 200 }],
  '/api/analytics/emotion': [{ name: 'happy', value: 70 }, { name: 'calm', value: 30 }],
  '/api/analytics/top-songs': [{ name: 'Fetched Song', value: 500 }],
  '/api/analytics/growth': [{ date: '2026-11-01', value: 10 }, { date: '2026-11-08', value: 30 }],
}

function setup(over: { isOpen?: boolean; onClose?: () => void } = {}) {
  const onClose = over.onClose ?? vi.fn()
  const utils = render(
    createElement(VisxChartsDashboard, {
      isOpen: true,
      onClose,
      ...over,
    })
  )
  return { onClose, ...utils }
}

/** 关闭按钮 = 头部含 svg.lucide-x 的按钮（同 live-session.test.tsx 的查找方式） */
function findCloseButton(container: HTMLElement) {
  return Array.from(container.querySelectorAll('button')).find((b) =>
    b.querySelector('svg.lucide-x')
  )!
}

describe('VisxChartsDashboard 开关与冒烟', () => {
  it('isOpen=false 渲染 null 且不发起请求', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { container } = setup({ isOpen: false })
    expect(container).toBeEmptyDOMElement()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('开启态渲染头部、四个 tab、demo 指标与默认热门歌曲柱状图', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { container } = setup()

    expect(screen.getByText('VisxCharts 运营数据看板')).toBeInTheDocument()
    for (const tab of ['热门歌曲', '播放趋势', '情绪分布', '用户增长']) {
      expect(screen.getByRole('button', { name: tab })).toBeInTheDocument()
    }
    // demo 指标卡（DEMO_METRICS 经 toLocaleString 千分位）
    expect(screen.getByText('12,400')).toBeInTheDocument()
    expect(screen.getByText('3,840')).toBeInTheDocument()
    expect(screen.getByText('1,260')).toBeInTheDocument()
    expect(screen.getByText('890')).toBeInTheDocument()
    // 默认 songs tab → BarChart 渲染 8 条 demo 歌曲 rect + 图表卡片标题
    expect(screen.getByText('热门歌曲排行')).toBeInTheDocument()
    expect(container.querySelectorAll('svg rect')).toHaveLength(8)
    // 关闭按钮存在
    expect(findCloseButton(container)).toBeTruthy()
  })
})

describe('VisxChartsDashboard tab 切换', () => {
  it('四个 tab 分别切换 Bar/Line/Pie/Area 图表', async () => {
    const viewer = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn())
    const { container } = setup()

    // trend（tab 文案与 CardTitle 文案相同 → getAllByText）
    await viewer.click(screen.getByRole('button', { name: '播放趋势' }))
    expect(screen.getAllByText('播放趋势').length).toBeGreaterThanOrEqual(2)
    // lucide 图标也渲染 path → 用描边色定位图表折线
    expect(container.querySelectorAll('path[stroke="#34d399"]')).toHaveLength(1)

    // emotion：5 类情绪 → 5 个扇区（扇区有 fill，图标 path 无 fill）
    await viewer.click(screen.getByRole('button', { name: '情绪分布' }))
    expect(screen.getAllByText('情绪分布').length).toBeGreaterThanOrEqual(2)
    expect(container.querySelectorAll('svg path[fill]')).toHaveLength(5)
    expect(container.querySelector('path[fill="#60a5fa"]')).toBeTruthy()

    // growth：AreaChart 折线色
    await viewer.click(screen.getByRole('button', { name: '用户增长' }))
    expect(screen.getAllByText('用户增长').length).toBeGreaterThanOrEqual(2)
    expect(container.querySelectorAll('path[stroke="#a78bfa"]')).toHaveLength(1)

    // 回到 songs
    await viewer.click(screen.getByRole('button', { name: '热门歌曲' }))
    expect(screen.getByText('热门歌曲排行')).toBeInTheDocument()
    expect(container.querySelectorAll('svg rect')).toHaveLength(8)
  })
})

describe('VisxChartsDashboard 数据获取', () => {
  it('开启时并发请求 5 个 /api/analytics/* 接口并用响应替换 demo 数据', async () => {
    const fetchMock = vi.fn(async (url: string) => ({
      json: async () => FETCH_PAYLOADS[url],
    }))
    vi.stubGlobal('fetch', fetchMock)
    const { container } = setup()

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/analytics/metrics'))
    const calledUrls = fetchMock.mock.calls.map((c) => c[0])
    expect(calledUrls).toEqual(
      expect.arrayContaining([
        '/api/analytics/metrics',
        '/api/analytics/trend',
        '/api/analytics/emotion',
        '/api/analytics/top-songs',
        '/api/analytics/growth',
      ])
    )
    // 指标卡替换为接口数据
    await waitFor(() => expect(screen.getByText('999,000')).toBeInTheDocument())
    expect(screen.getByText('5,000')).toBeInTheDocument()
    // top-songs 替换后柱状图仅 1 条 rect（demo 为 8 条）
    await waitFor(() => expect(container.querySelectorAll('svg rect')).toHaveLength(1))
  })

  it('接口失败时回退 demo 数据（allSettled 吞错）', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fetchMock = vi.fn(async () => {
      throw new Error('network down')
    })
    vi.stubGlobal('fetch', fetchMock)
    setup()

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    // demo 数据保持
    expect(screen.getByText('12,400')).toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('isOpen 再次开启时重新拉取', async () => {
    const fetchMock = vi.fn(async (url: string) => ({ json: async () => FETCH_PAYLOADS[url] }))
    vi.stubGlobal('fetch', fetchMock)
    const { rerender } = render(
      createElement(VisxChartsDashboard, { isOpen: false, onClose: vi.fn() })
    )
    expect(fetchMock).not.toHaveBeenCalled()
    rerender(createElement(VisxChartsDashboard, { isOpen: true, onClose: vi.fn() }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/analytics/metrics'))
    await waitFor(() => expect(screen.getByText('999,000')).toBeInTheDocument())
  })
})

describe('VisxChartsDashboard 关闭', () => {
  it('点击头部关闭按钮触发 onClose', async () => {
    const viewer = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn())
    const { container, onClose } = setup()
    await viewer.click(findCloseButton(container))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
