/**
 * @file AnalyticsDashboard 运营看板测试（W4 收编组件补测）
 * @description 覆盖指标卡片（数值/趋势）、recharts 折线图/柱状图（经 ResponsiveContainer 渲染）、
 *              情绪分布饼图卡片、歌曲明细表格、songBreakdown 存在与缺省两条情绪分支、leaderboard 边界。
 *              jsdom 兼容处理：recharts ResponsiveContainer 在 useEffect 里读取
 *              getBoundingClientRect 计算尺寸 —— 守卫式 ResizeObserver stub 之外，
 *              spyOn Element.prototype.getBoundingClientRect 注入非零尺寸（afterEach 统一 restore）。
 *              注意：EmotionPie 的 <PieChart> 未包 ResponsiveContainer 且未传数值 width/height，
 *              recharts validateWidthHeight 判空后不渲染画布 —— 属组件实现行为，仅断言卡片层。
 */
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'

// RTL 挂载手动清理：源仓 vitest 不依赖 globals auto-cleanup（W7-P2-3 环境自足化）
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
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
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnalyticsData, LeaderboardEntry } from '@yyc3/music-data'
import { AnalyticsDashboard } from '../src'

// recharts ResponsiveContainer 需要 getBoundingClientRect 返回非零尺寸才会渲染子图表
beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: Element
  ) {
    return {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      bottom: 300,
      right: 600,
      width: 600,
      height: 300,
      toJSON: () => ({}),
    } as DOMRect
  })
})

const ANALYTICS: AnalyticsData = {
  totalPlays: 12400,
  totalLikes: 3840,
  totalComments: 1260,
  totalEngagement: 9800,
  songBreakdown: [
    { songId: 'song-1', plays: 1240, likes: 320, comments: 45 },
    { songId: 'song-2', plays: 980, likes: 210, comments: 30 },
  ],
}

function makeEntry(i: number): LeaderboardEntry {
  return {
    songId: `song-${i}`,
    title: `歌曲${i}`,
    artist: 'Nova',
    positiveVotes: 90,
    totalVotes: 100,
    playCount: 1000 + i,
    wilsonScore: 0.83,
    finalScore: 9.1,
    rank: i + 1,
  }
}

const LEADERBOARD: LeaderboardEntry[] = [makeEntry(0), makeEntry(1)]

function setup(over: { data?: AnalyticsData; leaderboard?: LeaderboardEntry[]; className?: string } = {}) {
  return render(
    createElement(AnalyticsDashboard, {
      data: ANALYTICS,
      leaderboard: LEADERBOARD,
      ...over,
    })
  )
}

describe('AnalyticsDashboard 指标卡片', () => {
  it('渲染四张指标卡：数值、趋势与较上月标签', () => {
    setup()
    expect(screen.getByText('总播放次数')).toBeInTheDocument()
    expect(screen.getByText('12400')).toBeInTheDocument()
    expect(screen.getByText('总点赞数')).toBeInTheDocument()
    expect(screen.getByText('3840')).toBeInTheDocument()
    expect(screen.getByText('总评论数')).toBeInTheDocument()
    expect(screen.getByText('1260')).toBeInTheDocument()
    expect(screen.getByText('总互动值')).toBeInTheDocument()
    expect(screen.getByText('9800')).toBeInTheDocument()
    expect(screen.getAllByText('较上月')).toHaveLength(4)
    expect(screen.getByText('+12.4%')).toBeInTheDocument()
    expect(screen.getByText('+8.2%')).toBeInTheDocument()
    expect(screen.getByText('+5.1%')).toBeInTheDocument()
    expect(screen.getByText('+10.3%')).toBeInTheDocument()
  })

  it('className 透传到根容器', () => {
    const { container } = setup({ className: 'custom-dashboard' })
    expect(container.firstChild).toHaveClass('space-y-4', 'custom-dashboard')
  })
})

describe('AnalyticsDashboard 图表行', () => {
  it('渲染趋势/情绪/排行三个图表卡片', () => {
    setup()
    expect(screen.getByText('播放趋势')).toBeInTheDocument()
    expect(screen.getByText('情绪分布')).toBeInTheDocument()
    expect(screen.getByText('热门歌曲')).toBeInTheDocument()
  })

  it('折线图经 ResponsiveContainer 实际挂载（播放/点赞两条曲线）', () => {
    const { container } = setup()
    const wrapper = container.querySelector('.recharts-wrapper')
    expect(wrapper).not.toBeNull()
    // TrendChart 的两条 Line
    expect(container.querySelectorAll('.recharts-line')).toHaveLength(2)
    // XAxis/YAxis 各自挂载（注：mock 的 rect 全部 600 宽导致 recharts 刻度防重叠后
    // 每条轴仅渲染最后一个刻度 —— text+tspan 双层均含文本，用 getAllByText）
    expect(container.querySelectorAll('.recharts-cartesian-axis').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('12月').length).toBeGreaterThanOrEqual(1)
  })

  it('leaderboard 透传给柱状图（默认取前 8 条）', () => {
    const long: LeaderboardEntry[] = Array.from({ length: 12 }, (_, i) => makeEntry(i))
    const { container } = setup({ leaderboard: long })
    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(8)
    // BarXAxis dataKey=title → 前 8 条渲染刻度，第 9 条被截断
    expect(screen.getAllByText('歌曲7').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('歌曲8')).not.toBeInTheDocument()
  })

  it('leaderboard 缺省时排行卡片仍渲染（空数据边界）', () => {
    setup({ leaderboard: undefined })
    expect(screen.getByText('热门歌曲')).toBeInTheDocument()
    // SongRankChart data=[] → BarChart 画布存在但无柱体
    const { container } = render(
      createElement(AnalyticsDashboard, { data: ANALYTICS, leaderboard: undefined })
    )
    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(0)
  })
})

describe('AnalyticsDashboard 歌曲明细表格', () => {
  it('渲染表头与 songBreakdown 行', () => {
    setup()
    expect(screen.getByText('歌曲明细')).toBeInTheDocument()
    for (const label of ['歌曲', '播放', '点赞', '评论']) {
      expect(screen.getByRole('columnheader', { name: label })).toBeInTheDocument()
    }
    expect(screen.getByRole('cell', { name: 'song-1' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'song-2' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '1240' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '45' })).toBeInTheDocument()
  })

  it('songBreakdown 为空数组时表格只剩表头（空态）', () => {
    setup({ data: { ...ANALYTICS, songBreakdown: [] } })
    expect(screen.getByText('歌曲明细')).toBeInTheDocument()
    expect(screen.queryByRole('cell', { name: 'song-1' })).not.toBeInTheDocument()
  })
})

describe('AnalyticsDashboard 情绪分布分支', () => {
  // EmotionPie 的 <PieChart> 未包 ResponsiveContainer 且无数值宽高，
  // recharts validateWidthHeight 判空 → 画布不渲染；两条分支仅能断言卡片层不崩溃
  it('songBreakdown 有数据时按权重构造五个情绪分类（分支不崩溃）', () => {
    setup()
    expect(screen.getByText('情绪分布')).toBeInTheDocument()
  })

  it('songBreakdown 缺省时使用默认情绪分布（分支不崩溃）', () => {
    setup({ data: { ...ANALYTICS, songBreakdown: [] } })
    expect(screen.getByText('情绪分布')).toBeInTheDocument()
  })
})
