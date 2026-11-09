/**
 * @file AchievementsPanel 深度测试
 * @description 覆盖登录态/加载态/进度/统计/新解锁庆祝/空数据/错误与英文分支
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@yyc3/music-hooks'
import { apiFetch } from '@yyc3/music-utils'
import { AchievementsPanel } from '../src'

vi.mock('@yyc3/music-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@yyc3/music-utils')>()
  return { ...actual, apiFetch: vi.fn() }
})

const api = vi.mocked(apiFetch)
const user = { id: 'u1', email: 'tester@example.com' }

const achievements = [
  {
    id: 'a1',
    nameZh: '初次发声',
    nameEn: 'First Voice',
    descZh: '发布第一首作品',
    descEn: 'Publish your first work',
    icon: '⭐',
    unlocked: true,
    newlyUnlocked: true,
  },
  {
    id: 'a2',
    nameZh: '坚持不懈',
    nameEn: 'Persistent',
    descZh: '连续创作 7 天',
    descEn: 'Create for 7 days',
    icon: '🔥',
    unlocked: false,
    newlyUnlocked: false,
  },
]

type Handler = (path: string, options?: any) => any

function mockApi(routes: Record<string, Handler | unknown>) {
  api.mockImplementation(async (path: any, options?: any) => {
    const key = `${options?.method ?? 'GET'} ${path}`
    const handler = routes[key] ?? routes[path as string]
    if (handler === undefined) return null
    return typeof handler === 'function' ? handler(path, options) : handler
  })
}

const data = {
  achievements,
  stats: { totalWorks: 3, streakDays: 7, totalLikesReceived: 42 },
  totalUnlocked: 1,
  totalAchievements: 2,
}

const baseProps = { isOpen: true, onClose: vi.fn(), user, starPower: 800 }

function defaultRoutes(overrides: Record<string, Handler | unknown> = {}) {
  return {
    'POST /achievements/u1/track': {},
    'GET /achievements/u1': data,
    ...overrides,
  }
}

beforeEach(() => {
  api.mockReset()
  api.mockResolvedValue(null)
  localStorage.clear()
  baseProps.onClose = vi.fn()
})

describe('AchievementsPanel 基础', () => {
  it('关闭时为空；未登录显示登录提示且不请求', () => {
    const { container, rerender } = render(<AchievementsPanel {...baseProps} isOpen={false} />)
    expect(container.firstChild).toBeNull()

    rerender(<AchievementsPanel {...baseProps} user={null} />)
    expect(screen.getByText('登录后查看成就')).toBeInTheDocument()
    expect(api).not.toHaveBeenCalled()
  })

  it('点击关闭按钮与遮罩均触发 onClose', async () => {
    mockApi(defaultRoutes())
    const { container } = render(<AchievementsPanel {...baseProps} />)
    await screen.findAllByText('初次发声')

    fireEvent.click(container.querySelector('.lucide-x')!.closest('button') as HTMLElement)
    expect(baseProps.onClose).toHaveBeenCalledTimes(1)

    fireEvent.click(container.querySelector('.fixed.inset-0') as HTMLElement)
    expect(baseProps.onClose).toHaveBeenCalledTimes(2)
  })

  it('加载中显示 spinner，加载后展示进度、统计与徽章', async () => {
    let resolveData: (value: unknown) => void = () => {}
    const pending = new Promise((resolve) => {
      resolveData = resolve
    })
    mockApi(defaultRoutes({ 'GET /achievements/u1': () => pending }))

    const { container } = render(<AchievementsPanel {...baseProps} />)
    expect(container.querySelector('.animate-spin')).not.toBeNull()

    await act(async () => {
      resolveData(data)
    })

    expect(await screen.findByText('1 / 2')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('achievements.allBadges')).toBeInTheDocument()
    expect(screen.getByText('已解锁')).toBeInTheDocument()
    expect(screen.getByText('🔒')).toBeInTheDocument()
    expect(screen.getAllByText('初次发声').length).toBeGreaterThan(0)
    expect(screen.getByText('新成就解锁!')).toBeInTheDocument()

    expect(screen.getByText('总作品').previousElementSibling).toHaveTextContent('3')
    expect(screen.getByText('连续天数').previousElementSibling).toHaveTextContent('7')
    expect(screen.getByText('获赞').previousElementSibling).toHaveTextContent('42')
    expect(screen.getByText('喊话').previousElementSibling).toHaveTextContent('0')

    // 每日登录上报携带星力
    const trackCall = api.mock.calls.find(([path]) => path === '/achievements/u1/track')
    expect(JSON.parse((trackCall![1] as RequestInit).body as string)).toEqual({
      action: 'daily_login',
      starPower: 800,
    })
  })

  it('新解锁庆祝 4 秒后自动消失', async () => {
    mockApi(defaultRoutes())
    render(<AchievementsPanel {...baseProps} />)
    expect(await screen.findByText('新成就解锁!')).toBeInTheDocument()

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 4200))
    })
    await waitFor(() => expect(screen.queryByText('新成就解锁!')).toBeNull())
  }, 10000)

  it('无新解锁与零成就时展示 0% 进度且无庆祝', async () => {
    mockApi(
      defaultRoutes({
        'GET /achievements/u1': {
          achievements: [{ ...achievements[0], newlyUnlocked: false }, achievements[1]],
          stats: {},
          totalUnlocked: 0,
          totalAchievements: 0,
        },
      })
    )
    render(<AchievementsPanel {...baseProps} />)

    expect(await screen.findByText('0 / 0')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.queryByText('新成就解锁!')).toBeNull()
    expect(screen.getByText('总作品').previousElementSibling).toHaveTextContent('0')
  })

  it('接口失败时记录错误', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockApi(defaultRoutes({ 'GET /achievements/u1': () => Promise.reject(new Error('down')) }))
    render(<AchievementsPanel {...baseProps} />)
    await waitFor(() =>
      expect(errorSpy).toHaveBeenCalledWith('Achievements fetch error:', expect.any(Error))
    )
  })
})

describe('AchievementsPanel 英文环境', () => {
  it('使用英文成就名称、统计标签与庆祝文案', async () => {
    localStorage.setItem('dmusic-prefs', JSON.stringify({ lang: 'en' }))
    mockApi(defaultRoutes())
    render(
      <I18nProvider>
        <AchievementsPanel {...baseProps} />
      </I18nProvider>
    )

    expect(await screen.findByText('Achievement Unlocked!')).toBeInTheDocument()
    expect(screen.getAllByText('First Voice').length).toBeGreaterThan(0)
    expect(screen.getByText('Unlocked')).toBeInTheDocument()
    expect(screen.getByText('Works')).toBeInTheDocument()
    expect(screen.getByText('Streak')).toBeInTheDocument()
  })

  it('英文未登录提示', () => {
    localStorage.setItem('dmusic-prefs', JSON.stringify({ lang: 'en' }))
    mockApi(defaultRoutes())
    render(
      <I18nProvider>
        <AchievementsPanel {...baseProps} user={null} />
      </I18nProvider>
    )
    expect(screen.getByText('Sign in to view achievements')).toBeInTheDocument()
  })
})
