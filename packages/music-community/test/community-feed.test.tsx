/**
 * @file CommunityFeed 社区动态测试
 * @description 覆盖空态/加载态、四类动态渲染、时间格式化、统计、下拉刷新、增量加载与关闭
 */
import { createElement } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@yyc3/music-hooks'
import { CommunityFeed } from '../src'

class FakeIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return [] }
  root = null
  rootMargin = ''
  thresholds = []
}
vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)

const now = Date.now()

function activity(over: Record<string, unknown> = {}) {
  return {
    id: `a-${Math.random()}`,
    type: 'annotation',
    userId: 'u1',
    userName: 'Alice',
    songTitle: 'Cosmic Dreams',
    detail: 'happy',
    timestamp: now - 5000,
    ...over,
  }
}

function setup(over: Record<string, unknown> = {}) {
  const onClose = vi.fn()
  const onRefresh = vi.fn()
  const utils = render(
    createElement(CommunityFeed, {
      isOpen: true,
      onClose,
      activities: [] as any[],
      onRefresh,
      isLoading: false,
      ...over,
    })
  )
  return { onClose, onRefresh, ...utils }
}

function renderInEnglish(el: React.ReactElement) {
  localStorage.setItem('dmusic-prefs', JSON.stringify({ lang: 'en' }))
  return render(createElement(I18nProvider, null, el))
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})

describe('CommunityFeed', () => {
  it('无动态时展示空态并隐藏统计以外的列表', () => {
    setup()
    expect(screen.getByText('community.noActivity')).toBeInTheDocument()
    expect(screen.getByText('community.startListening')).toBeInTheDocument()
    expect(screen.getByRole('feed')).toHaveAttribute('aria-busy', 'false')
  })

  it('加载中时 feed 标记 aria-busy', () => {
    setup({ isLoading: true })
    expect(screen.getByRole('feed')).toHaveAttribute('aria-busy', 'true')
  })

  it('渲染四类动态及默认分支', () => {
    const activities = [
      activity({ id: '1', type: 'annotation', detail: 'happy', userName: 'Alice' }),
      activity({ id: '2', type: 'annotation', detail: 'mystery', userName: 'Bob' }),
      activity({ id: '3', type: 'like', songTitle: 'Nebula', userName: 'Alice' }),
      activity({ id: '4', type: 'achievement', detail: 'First Mix', userName: 'Cara' }),
      activity({ id: '5', type: 'play', songTitle: 'Starlight', userName: 'Dan' }),
      activity({ id: '6', type: 'unknown', detail: 'ghost', userName: 'Eve' }),
    ] as any[]
    setup({ activities })

    expect(screen.getAllByText('community.tagged').length).toBeGreaterThan(0)
    expect(screen.getByText('community.liked')).toBeInTheDocument()
    expect(screen.getByText('community.earned')).toBeInTheDocument()
    expect(screen.getByText('community.listeningTo')).toBeInTheDocument()
    expect(screen.getByText('ghost')).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(6)

    const stats = screen.getByRole('status', { name: '社区统计 / Community stats' })
    expect(stats.textContent).toContain('2') // annotations
    expect(stats.textContent).toContain('community.activeUsers')
  })

  it('格式化不同时间段的时间文案', () => {
    const activities = [
      activity({ id: 's', timestamp: now - 5 * 1000 }),
      activity({ id: 'm', timestamp: now - 5 * 60000 }),
      activity({ id: 'h', timestamp: now - 2 * 3600000 }),
      activity({ id: 'd', timestamp: now - 3 * 86400000 }),
      activity({ id: 'old', timestamp: now - 30 * 86400000 }),
    ] as any[]
    const { container } = setup({ activities })
    expect(screen.getByText('time.justNow')).toBeInTheDocument()
    expect(screen.getByText('5time.mAgo')).toBeInTheDocument()
    expect(screen.getByText('2time.hAgo')).toBeInTheDocument()
    expect(screen.getByText('3time.dAgo')).toBeInTheDocument()
    const times = Array.from(container.querySelectorAll('time')).map((t) => t.textContent)
    expect(times[4]).toBe(new Date(activities[4].timestamp).toLocaleDateString())
  })

  it('刷新按钮触发回调并进入刷新态', async () => {
    const viewer = userEvent.setup()
    const { onRefresh } = setup()
    const btn = screen.getByRole('button', { name: 'community.refreshFeed' })
    await viewer.click(btn)
    expect(onRefresh).toHaveBeenCalledTimes(1)
    expect(btn).toBeDisabled()
    expect(screen.getByRole('status', { name: '刷新中 / Refreshing' })).toBeInTheDocument()
  })

  it('下拉超过阈值触发刷新，未超过则仅显示指示器', async () => {
    const { onRefresh } = setup()
    const feed = screen.getByRole('feed')

    fireEvent.touchStart(feed, { touches: [{ clientY: 100 }] })
    fireEvent.touchMove(feed, { touches: [{ clientY: 130 }] })
    expect(screen.getByRole('status', { name: '下拉刷新 / Pull to refresh' })).toBeInTheDocument()
    fireEvent.touchEnd(feed)
    expect(onRefresh).not.toHaveBeenCalled()

    fireEvent.touchStart(feed, { touches: [{ clientY: 100 }] })
    fireEvent.touchMove(feed, { touches: [{ clientY: 220 }] })
    fireEvent.touchEnd(feed)
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('向上滑动或已滚动时不会触发下拉刷新', () => {
    const { onRefresh } = setup()
    const feed = screen.getByRole('feed')

    fireEvent.touchStart(feed, { touches: [{ clientY: 100 }] })
    fireEvent.touchMove(feed, { touches: [{ clientY: 50 }] })
    fireEvent.touchEnd(feed)

    Object.defineProperty(feed, 'scrollTop', { configurable: true, value: 20 })
    fireEvent.touchStart(feed, { touches: [{ clientY: 100 }] })
    fireEvent.touchMove(feed, { touches: [{ clientY: 220 }] })
    fireEvent.touchEnd(feed)
    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('超过 20 条时仅渲染前 20 条并展示加载更多哨兵', async () => {
    const activities = Array.from({ length: 25 }, (_, i) =>
      activity({ id: `n${i}`, userName: `U${i}` })
    ) as any[]
    setup({ activities })
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(20))
    expect(screen.getByText('加载更多动态 / Loading more...')).toBeInTheDocument()
  })

  it('关闭按钮与遮罩触发 onClose', async () => {
    const viewer = userEvent.setup()
    const { container, onClose } = setup()
    await viewer.click(screen.getByRole('button', { name: '关闭社区动态 / Close community feed' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.click(container.querySelector('.fixed.inset-0')!)
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('英文语言渲染英文文案', () => {
    renderInEnglish(
      createElement(CommunityFeed, {
        isOpen: true,
        onClose: vi.fn(),
        activities: [] as any[],
        onRefresh: vi.fn(),
        isLoading: false,
      })
    )
    expect(screen.getByText('Community')).toBeInTheDocument()
    expect(screen.getByText('Live activity feed')).toBeInTheDocument()
    expect(screen.getByText('No activity yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Refresh feed' })).toBeInTheDocument()
  })
})
