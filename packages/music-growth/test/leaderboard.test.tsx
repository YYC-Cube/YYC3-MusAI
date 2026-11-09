/**
 * @file LeaderboardPanel 深度测试
 * @description 覆盖排行榜加载/空态/排名变化/信息面板/刷新/助推与本地存储
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@yyc3/music-hooks'
import { apiFetch } from '@yyc3/music-utils'
import { LeaderboardPanel } from '../src'

vi.mock('@yyc3/music-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@yyc3/music-utils')>()
  return { ...actual, apiFetch: vi.fn() }
})

const api = vi.mocked(apiFetch)
const STORAGE_KEY = 'dmusic-leaderboard-prev'
const user = { id: 'u1', email: 'tester@example.com' }

const rankings = [
  { songId: 'track-1', likes: 10, plays: 100, comments: 5, wilsonScore: 0.8, engagement: 0.5 },
  { songId: 'missing-song', likes: 2, plays: 20, comments: 1, wilsonScore: 0.4, engagement: 0.2 },
  { songId: 'track-2', likes: 0, plays: 0, comments: 0, wilsonScore: 0.2, engagement: 0 },
  { songId: 'track-3', likes: 1, plays: 1, comments: 1, wilsonScore: 0.1, engagement: 0.1 },
]

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSelectTrack: vi.fn(),
  user,
  starPower: 500,
  onStarPowerUpdate: vi.fn(),
}

type Handler = (path: string, options?: any) => any

function mockApi(routes: Record<string, Handler | unknown>) {
  api.mockImplementation(async (path: any, options?: any) => {
    const key = `${options?.method ?? 'GET'} ${path}`
    const handler = routes[key] ?? routes[path as string]
    if (handler === undefined) return null
    return typeof handler === 'function' ? handler(path, options) : handler
  })
}

function refreshButton() {
  return document.querySelector('.lucide-refresh-cw')!.closest('button') as HTMLElement
}

beforeEach(() => {
  api.mockReset()
  api.mockResolvedValue(null)
  localStorage.clear()
  baseProps.onClose = vi.fn()
  baseProps.onSelectTrack = vi.fn()
  baseProps.onStarPowerUpdate = vi.fn()
})

describe('LeaderboardPanel 榜单渲染', () => {
  it('关闭时为空，加载中显示 spinner', async () => {
    let resolveBoard: (value: unknown) => void = () => {}
    const pending = new Promise((resolve) => {
      resolveBoard = resolve
    })
    mockApi({ 'GET /leaderboard': () => pending })

    const { container, rerender } = render(<LeaderboardPanel {...baseProps} isOpen={false} />)
    expect(container.firstChild).toBeNull()

    rerender(<LeaderboardPanel {...baseProps} />)
    expect(container.querySelector('.animate-spin')).not.toBeNull()

    await act(async () => {
      resolveBoard({ rankings })
    })
    expect(await screen.findByText('Cosmic Dreams')).toBeInTheDocument()
  })

  it('渲染榜单条目、未知曲目与威尔逊评分条', async () => {
    mockApi({ 'GET /leaderboard': { rankings } })
    render(<LeaderboardPanel {...baseProps} />)

    expect(await screen.findByText('Cosmic Dreams')).toBeInTheDocument()
    expect(screen.getByText('missing-song')).toBeInTheDocument()
    expect(screen.getByText('0.8000')).toBeInTheDocument()
    expect(screen.getByText('100.0%')).toBeInTheDocument()
    expect(screen.getByText('50.0%')).toBeInTheDocument()
    expect(screen.getByText('leaderboard.unknown')).toBeInTheDocument()
    expect(screen.getAllByText('leaderboard.score')).toHaveLength(4)
  })

  it('无榜单数据时展示空态', async () => {
    mockApi({ 'GET /leaderboard': { rankings: [] } })
    render(<LeaderboardPanel {...baseProps} />)
    expect(await screen.findByText('leaderboard.noRankings')).toBeInTheDocument()
    expect(screen.getByText('leaderboard.buildBoard')).toBeInTheDocument()
  })

  it('接口失败时记录错误并回落空态', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockApi({ 'GET /leaderboard': () => Promise.reject(new Error('down')) })
    render(<LeaderboardPanel {...baseProps} />)
    await waitFor(() =>
      expect(errorSpy).toHaveBeenCalledWith('Failed to fetch leaderboard:', expect.any(Error))
    )
    expect(await screen.findByText('leaderboard.noRankings')).toBeInTheDocument()
  })

  it('点击榜单条目回传歌曲 id', async () => {
    mockApi({ 'GET /leaderboard': { rankings } })
    render(<LeaderboardPanel {...baseProps} />)
    fireEvent.click(await screen.findByText('Cosmic Dreams'))
    expect(baseProps.onSelectTrack).toHaveBeenCalledWith('track-1')

    fireEvent.click(screen.getByText('missing-song'))
    expect(baseProps.onSelectTrack).toHaveBeenCalledWith('missing-song')
  })
})

describe('LeaderboardPanel 排名变化', () => {
  it('首次加载把当前榜单写入本地存储', async () => {
    mockApi({ 'GET /leaderboard': { rankings } })
    render(<LeaderboardPanel {...baseProps} />)
    await screen.findByText('Cosmic Dreams')

    await waitFor(() => expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull())
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) as string)).toEqual({
      'track-1': 1,
      'missing-song': 2,
      'track-2': 3,
      'track-3': 4,
    })
  })

  it('对比上次排名展示上升/持平/下降/新上榜', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ 'track-1': 3, 'missing-song': 2, 'track-2': 1 })
    )
    mockApi({ 'GET /leaderboard': { rankings } })
    render(<LeaderboardPanel {...baseProps} />)

    expect(await screen.findByText(/2 leaderboard\.rankUp/)).toBeInTheDocument()
    expect(screen.getByText(/leaderboard\.rankSame/)).toBeInTheDocument()
    expect(screen.getByText(/2 leaderboard\.rankDown/)).toBeInTheDocument()
    expect(screen.getByText(/leaderboard\.rankNew/)).toBeInTheDocument()
  })

  it('刷新按钮保存当前排名并重新请求', async () => {
    mockApi({ 'GET /leaderboard': { rankings } })
    render(<LeaderboardPanel {...baseProps} />)
    await screen.findByText('Cosmic Dreams')

    fireEvent.click(refreshButton())
    await waitFor(() =>
      expect(api.mock.calls.filter(([path]) => path === '/leaderboard')).toHaveLength(2)
    )
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) as string)['track-1']).toBe(1)
  })

  it('本地存储异常时仍可正常渲染', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('quota')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    mockApi({ 'GET /leaderboard': { rankings } })
    render(<LeaderboardPanel {...baseProps} />)
    expect(await screen.findByText('Cosmic Dreams')).toBeInTheDocument()
    expect(screen.getAllByText(/leaderboard\.rankNew/)).toHaveLength(4)
  })
})

describe('LeaderboardPanel 信息与助推', () => {
  it('切换威尔逊算法说明面板', async () => {
    mockApi({ 'GET /leaderboard': { rankings: [] } })
    render(<LeaderboardPanel {...baseProps} />)
    const infoButton = screen.getByTitle('leaderboard.aboutWilson')

    fireEvent.click(infoButton)
    expect(await screen.findByText('leaderboard.wilsonAlgorithm')).toBeInTheDocument()
    expect(screen.getByText('leaderboard.wilsonInfo')).toBeInTheDocument()

    fireEvent.click(infoButton)
    await waitFor(() => expect(screen.queryByText('leaderboard.wilsonAlgorithm')).toBeNull())
  })

  it('星力充足时助推成功并刷新榜单', async () => {
    mockApi({
      'GET /leaderboard': { rankings },
      'POST /leaderboard/boost': { success: true, starPower: 400 },
    })
    render(<LeaderboardPanel {...baseProps} />)
    const boostButtons = await screen.findAllByTitle('starpower.boostCost')
    expect(boostButtons).toHaveLength(4)

    fireEvent.click(boostButtons[0])

    await waitFor(() => expect(baseProps.onStarPowerUpdate).toHaveBeenCalledWith(400))
    expect(await screen.findByText('starpower.boostSuccess')).toBeInTheDocument()

    const boostCall = api.mock.calls.find(([path]) => path === '/leaderboard/boost')
    expect(JSON.parse((boostCall![1] as RequestInit).body as string)).toEqual({
      userId: 'u1',
      songId: 'track-1',
      amount: 100,
    })
    await waitFor(() =>
      expect(api.mock.calls.filter(([path]) => path === '/leaderboard').length).toBeGreaterThanOrEqual(2)
    )
  })

  it('助推失败不更新星力', async () => {
    mockApi({
      'GET /leaderboard': { rankings },
      'POST /leaderboard/boost': { success: false },
    })
    render(<LeaderboardPanel {...baseProps} />)
    fireEvent.click((await screen.findAllByTitle('starpower.boostCost'))[1])

    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('/leaderboard/boost', expect.anything())
    )
    expect(baseProps.onStarPowerUpdate).not.toHaveBeenCalled()
  })

  it('助推请求异常时记录错误', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockApi({
      'GET /leaderboard': { rankings },
      'POST /leaderboard/boost': () => Promise.reject(new Error('boost down')),
    })
    render(<LeaderboardPanel {...baseProps} />)
    fireEvent.click((await screen.findAllByTitle('starpower.boostCost'))[0])

    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('Boost error:', expect.any(Error)))
  })

  it('星力不足或未登录时展示总互动量而非助推按钮', async () => {
    mockApi({ 'GET /leaderboard': { rankings } })
    const { rerender } = render(<LeaderboardPanel {...baseProps} starPower={50} />)
    expect(await screen.findByText('Cosmic Dreams')).toBeInTheDocument()
    expect(screen.queryByTitle('starpower.boostCost')).toBeNull()
    expect(screen.getAllByText(/leaderboard\.totalEngagement/)).toHaveLength(4)

    rerender(<LeaderboardPanel {...baseProps} user={undefined} />)
    expect(screen.queryByTitle('starpower.boostCost')).toBeNull()
  })

  it('英文环境渲染排名徽标文案', async () => {
    localStorage.setItem('dmusic-prefs', JSON.stringify({ lang: 'en' }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ 'track-1': 2 }))
    mockApi({ 'GET /leaderboard': { rankings } })
    render(
      <I18nProvider>
        <LeaderboardPanel {...baseProps} />
      </I18nProvider>
    )

    expect(await screen.findByText(/1 up/)).toBeInTheDocument()
    expect(screen.getAllByText('NEW').length).toBeGreaterThan(0)
    expect(screen.getByText('0.8000')).toBeInTheDocument()
  })
})
