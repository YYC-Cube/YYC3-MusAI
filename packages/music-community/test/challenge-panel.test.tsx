/**
 * @file ChallengePanel 创作挑战赛测试
 * @description 覆盖加载/空赛事、详情页（倒计时/奖励/CTA）、排行榜（领奖台/AI 拆解/投票）、
 *              荣耀殿堂、提交表单的成功/各类失败/异常、自动结算横幅与本地化
 */
import { createElement } from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '@yyc3/music-utils'
import { I18nProvider } from '@yyc3/music-hooks'
import { ChallengePanel } from '../src'

vi.mock('@yyc3/music-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@yyc3/music-utils')>()
  return { ...actual, apiFetch: vi.fn() }
})

const api = vi.mocked(apiFetch) as unknown as ReturnType<typeof vi.fn>
const user = { id: 'u1', email: 'alice@example.com' }

const challenge = {
  id: 'ch1',
  titleZh: '星际主题赛',
  titleEn: 'Interstellar Theme',
  descZh: '以星空为灵感创作',
  descEn: 'Create inspired by the stars',
  tags: ['space', 'dream'],
  startsAt: Date.now() - 86400000,
  endsAt: Date.now() + 2 * 86400000 + 5 * 3600000,
  judgeWeight: 0.7,
  communityWeight: 0.3,
  entryCount: 12,
  prizes: [
    { rank: 1, rewardZh: '金奖', rewardEn: 'Gold', sp: 100 },
    { rank: 2, rewardZh: '银奖', rewardEn: 'Silver', sp: 50 },
    { rank: 3, rewardZh: '铜奖', rewardEn: 'Bronze', sp: 20 },
  ],
}

function entry(over: Record<string, unknown> = {}) {
  return {
    id: 'e1',
    userId: 'u2',
    userName: 'bob',
    workTitle: 'Entry One',
    workTheme: 'space',
    submittedAt: Date.now(),
    judgeScore: 88.5,
    communityVotes: 10,
    communityScoreNorm: 30,
    totalScore: 82.3,
    ...over,
  }
}

function setup(over: Record<string, unknown> = {}) {
  const onClose = vi.fn()
  const onOpenCreationStudio = vi.fn()
  const utils = render(
    createElement(ChallengePanel, {
      isOpen: true,
      onClose,
      user,
      onOpenCreationStudio,
      ...over,
    })
  )
  return { onClose, onOpenCreationStudio, ...utils }
}

function mockChallenge({
  active = { challenge },
  entries = [] as unknown[],
  champions = [] as unknown[],
}: {
  active?: unknown
  entries?: unknown[]
  champions?: unknown[]
} = {}) {
  api.mockImplementation((async (path: string, options?: RequestInit) => {
    if (path === '/challenges/active') return active
    if (path === '/challenges/champions') return { champions }
    if (path.endsWith('/entries')) return { entries }
    return null
  }) as never)
}

beforeEach(() => {
  api.mockReset()
  localStorage.clear()
  mockChallenge()
})

afterEach(() => {
  localStorage.clear()
  vi.useRealTimers()
})

describe('ChallengePanel 基础与详情页', () => {
  it('加载中展示 spinner', () => {
    api.mockReturnValue(new Promise(() => {}) as never)
    const { container } = setup()
    expect(container.querySelector('.animate-spin')).not.toBeNull()
  })

  it('无赛事时展示空态', async () => {
    mockChallenge({ active: null })
    setup()
    await waitFor(() => expect(screen.getByText('暂无活动赛事')).toBeInTheDocument())
  })

  it('详情页展示标题、标签、倒计时、参赛数与奖励', async () => {
    mockChallenge({ entries: [] })
    setup()
    await waitFor(() => expect(screen.getByText('星际主题赛')).toBeInTheDocument())

    expect(screen.getByText('以星空为灵感创作')).toBeInTheDocument()
    expect(screen.getByText('space')).toBeInTheDocument()
    expect(screen.getByText('dream')).toBeInTheDocument()
    expect(screen.getByText(/2天 [45]小时/)).toBeInTheDocument()
    expect(screen.getByText('12 参赛')).toBeInTheDocument()
    expect(screen.getByText('金奖')).toBeInTheDocument()
    expect(screen.getByText('银奖')).toBeInTheDocument()
    expect(screen.getByText('铜奖')).toBeInTheDocument()
    expect(screen.getByText('提交参赛作品')).toBeInTheDocument()
  })

  it('已结束赛事展示已结束', async () => {
    mockChallenge({ active: { challenge: { ...challenge, endsAt: Date.now() - 1000 } } })
    setup()
    await waitFor(() => expect(screen.getByText('已结束')).toBeInTheDocument())
  })

  it('已有参赛记录时展示等待结果且隐藏 CTA', async () => {
    mockChallenge({ entries: [entry({ userId: 'u1' })] })
    setup()
    await waitFor(() => expect(screen.getByText('你已参赛，等待结果!')).toBeInTheDocument())
    expect(screen.queryByText('提交参赛作品')).toBeNull()
  })

  it('拉取赛事失败时记录错误并展示空态', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    api.mockRejectedValue(new Error('boom') as never)
    setup()
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('Challenge fetch error:', expect.any(Error)))
    expect(screen.getByText('暂无活动赛事')).toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('荣耀殿堂拉取失败时记录错误', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    api.mockImplementation((async (path: string) => {
      if (path === '/challenges/champions') throw new Error('champ down')
      if (path === '/challenges/active') return { challenge }
      if (path.endsWith('/entries')) return { entries: [] }
      return null
    }) as never)
    setup()
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('Champions fetch error:', expect.any(Error)))
    errorSpy.mockRestore()
  })
})

describe('ChallengePanel 排行榜', () => {
  const boardEntries = [
    entry({ id: 'e1', userId: 'u2', workTitle: 'First', userName: 'bob', totalScore: 95.4, judgeScore: 90, communityVotes: 30 }),
    entry({
      id: 'e2',
      userId: 'u3',
      workTitle: 'Second',
      userName: 'cara',
      totalScore: 88.2,
      workTheme: '',
      aiBreakdown: { themeRelevance: 20, emotionalDepth: 0, creativity: 25, technicalQuality: undefined },
      aiFeedback: 'Great emotion',
      aiProvider: 'openai',
    }),
    entry({ id: 'e3', userId: 'u4', workTitle: 'Third', userName: 'dan', totalScore: 70 }),
    entry({
      id: 'e4',
      userId: 'u1',
      workTitle: 'Mine',
      userName: 'alice',
      totalScore: 40,
      aiFeedback: 'Needs work',
      aiProvider: 'local',
    }),
  ]

  it('渲染领奖台、AI 拆解、反馈与投票，投票后显示已投', async () => {
    const viewer = userEvent.setup()
    api.mockImplementation((async (path: string, options?: RequestInit) => {
      if (path === '/challenges/active') return { challenge }
      if (path === '/challenges/champions') return { champions: [] }
      if (path.endsWith('/entries')) return { entries: boardEntries }
      if (path.endsWith('/vote') && options?.method === 'POST') return { success: true, votes: 42 }
      return null
    }) as never)
    setup()
    await waitFor(() => expect(screen.getByText('星际主题赛')).toBeInTheDocument())
    await viewer.click(screen.getByRole('button', { name: '排行榜' }))

    expect(screen.getAllByText('First').length).toBeGreaterThan(0)
    expect(screen.getByText('Mine')).toBeInTheDocument()
    expect(screen.getAllByText('@bob').length).toBeGreaterThan(0)
    expect(screen.getByText('Great emotion')).toBeInTheDocument()
    expect(screen.getByText('Needs work')).toBeInTheDocument()
    expect(screen.getByText('主题 20')).toBeInTheDocument()
    expect(screen.getByText('技术 0')).toBeInTheDocument()
    expect(screen.getByText('#4')).toBeInTheDocument()
    expect(screen.getAllByText('投票')).toHaveLength(3)

    await viewer.click(screen.getAllByText('投票')[0])
    await waitFor(() => expect(screen.getAllByText('已投')).toHaveLength(4))
    const voteCall = api.mock.calls.find((c) => String(c[0]).endsWith('/vote'))!
    expect(JSON.parse((voteCall[1] as RequestInit).body as string)).toEqual(
      expect.objectContaining({ userId: 'u1', entryId: 'e1' })
    )
    expect(screen.getByText(/票数: 42/)).toBeInTheDocument()
  })

  it('投票接口异常时静默处理', async () => {
    const viewer = userEvent.setup()
    api.mockImplementation((async (path: string, options?: RequestInit) => {
      if (path === '/challenges/active') return { challenge }
      if (path === '/challenges/champions') return { champions: [] }
      if (path.endsWith('/entries')) return { entries: boardEntries }
      if (path.endsWith('/vote') && options?.method === 'POST') throw new Error('vote fail')
      return null
    }) as never)
    setup()
    await waitFor(() => expect(screen.getByText('星际主题赛')).toBeInTheDocument())
    await viewer.click(screen.getByRole('button', { name: '排行榜' }))
    await viewer.click(screen.getAllByText('投票')[0])
    await waitFor(() => expect(api.mock.calls.some((c) => String(c[0]).endsWith('/vote'))).toBe(true))
    expect(screen.queryAllByText('已投')).toHaveLength(0)
  })

  it('无参赛作品时展示空态', async () => {
    const viewer = userEvent.setup()
    setup()
    await waitFor(() => expect(screen.getByText('星际主题赛')).toBeInTheDocument())
    await viewer.click(screen.getByRole('button', { name: '排行榜' }))
    expect(screen.getByText('暂无参赛作品')).toBeInTheDocument()
    expect(screen.getByText('成为第一个参赛者!')).toBeInTheDocument()
  })
})

describe('ChallengePanel 荣耀殿堂与自动结算', () => {
  const champions = [
    {
      challengeId: 'c0',
      challengeTitle: { zh: '上期赛事', en: 'Previous' },
      finalizedAt: Date.now(),
      totalEntries: 9,
      winner: { workTitle: 'Champion Work', userName: 'winner', totalScore: 99.1 },
      runnerUp: null,
      thirdPlace: { workTitle: 'Third Work', userName: 'third', totalScore: 70.5 },
    },
  ]

  it('荣耀殿堂展示冠军与参赛人数', async () => {
    const viewer = userEvent.setup()
    mockChallenge({ champions })
    setup()
    await waitFor(() => expect(screen.getByText('星际主题赛')).toBeInTheDocument())
    await viewer.click(screen.getByRole('button', { name: '荣耀殿堂' }))

    expect(screen.getByText('上期赛事')).toBeInTheDocument()
    expect(screen.getByText('Champion Work')).toBeInTheDocument()
    expect(screen.getByText('@winner')).toBeInTheDocument()
    expect(screen.getByText('Third Work')).toBeInTheDocument()
    expect(screen.getByText('9 位参赛者')).toBeInTheDocument()
  })

  it('无历史冠军时展示空态', async () => {
    const viewer = userEvent.setup()
    setup()
    await waitFor(() => expect(screen.getByText('星际主题赛')).toBeInTheDocument())
    await viewer.click(screen.getByRole('button', { name: '荣耀殿堂' }))
    expect(screen.getByText('暂无历史冠军')).toBeInTheDocument()
    expect(screen.getByText('本赛季结束后将在此展示')).toBeInTheDocument()
  })

  it('自动结算横幅可跳转荣耀殿堂', async () => {
    const viewer = userEvent.setup()
    mockChallenge({
      active: {
        challenge,
        autoFinalizeResult: {
          finalized: true,
          previousChallenge: { titleZh: '秋季赛', titleEn: 'Autumn' },
          winner: { userName: 'luna' },
          totalEntries: 21,
        },
      },
      champions,
    })
    setup()
    await waitFor(() => expect(screen.getByText('上期赛事已结算!')).toBeInTheDocument())
    expect(screen.getByText(/luna/)).toBeInTheDocument()

    await viewer.click(screen.getByRole('button', { name: '查看' }))
    expect(screen.queryByText('上期赛事已结算!')).toBeNull()
    expect(screen.getByText('Champion Work')).toBeInTheDocument()
  })
})

describe('ChallengePanel 提交表单', () => {
  async function openSubmitForm(viewer: ReturnType<typeof userEvent.setup>) {
    await waitFor(() => expect(screen.getByText('星际主题赛')).toBeInTheDocument())
    await viewer.click(screen.getByRole('button', { name: '提交' }))
  }

  it('未登录时提示登录', async () => {
    const viewer = userEvent.setup()
    setup({ user: null })
    await openSubmitForm(viewer)
    expect(screen.getByText('请先登录')).toBeInTheDocument()
  })

  it('已提交时提示并可跳转排行榜', async () => {
    const viewer = userEvent.setup()
    mockChallenge({ entries: [entry({ userId: 'u1' })] })
    setup()
    await waitFor(() => expect(screen.getByText('星际主题赛')).toBeInTheDocument())
    await viewer.click(screen.getByRole('button', { name: '提交' }))
    expect(screen.getByText('你已提交参赛作品')).toBeInTheDocument()

    await viewer.click(screen.getByRole('button', { name: '查看排行榜' }))
    expect(screen.getByText('Entry One')).toBeInTheDocument()
  })

  it('提交成功后跳转排行榜并传递过滤后的歌词', async () => {
    const viewer = userEvent.setup()
    api.mockImplementation((async (path: string, options?: RequestInit) => {
      if (path === '/challenges/active') return { challenge }
      if (path === '/challenges/champions') return { champions: [] }
      if (path.endsWith('/entries')) return { entries: [] }
      if (path.endsWith('/submit') && options?.method === 'POST') return { success: true }
      return null
    }) as never)
    setup()
    await openSubmitForm(viewer)

    const submitBtn = screen.getByRole('button', { name: '提交参赛' })
    expect(submitBtn).toBeDisabled()

    await viewer.type(screen.getByPlaceholderText('输入你的作品标题...'), 'My Song')
    await viewer.type(screen.getByPlaceholderText('星际主题赛'), 'space')
    await viewer.type(screen.getByPlaceholderText('在此输入歌词...'), 'line one\n\nline two')
    await viewer.click(submitBtn)

    await waitFor(() => expect(screen.getByText('暂无参赛作品')).toBeInTheDocument())
    const call = api.mock.calls.find((c) => String(c[0]).endsWith('/submit'))!
    expect(JSON.parse((call[1] as RequestInit).body as string)).toEqual(
      expect.objectContaining({
        userId: 'u1',
        userName: 'alice',
        workTitle: 'My Song',
        workTheme: 'space',
        workLyrics: ['line one', 'line two'],
      })
    )
  })

  it('已提交过时展示对应消息', async () => {
    const viewer = userEvent.setup()
    api.mockImplementation((async (path: string, options?: RequestInit) => {
      if (path === '/challenges/active') return { challenge }
      if (path === '/challenges/champions') return { champions: [] }
      if (path.endsWith('/entries')) return { entries: [] }
      if (path.endsWith('/submit') && options?.method === 'POST') return { success: false, alreadySubmitted: true }
      return null
    }) as never)
    setup()
    await openSubmitForm(viewer)
    await viewer.type(screen.getByPlaceholderText('输入你的作品标题...'), 'Dup')
    await viewer.click(screen.getByRole('button', { name: '提交参赛' }))
    await waitFor(() => expect(screen.getByText('你已提交过作品')).toBeInTheDocument())
  })

  it('服务端返回错误信息时展示', async () => {
    const viewer = userEvent.setup()
    api.mockImplementation((async (path: string, options?: RequestInit) => {
      if (path === '/challenges/active') return { challenge }
      if (path === '/challenges/champions') return { champions: [] }
      if (path.endsWith('/entries')) return { entries: [] }
      if (path.endsWith('/submit') && options?.method === 'POST') return { success: false, error: '配额不足' }
      return null
    }) as never)
    setup()
    await openSubmitForm(viewer)
    await viewer.type(screen.getByPlaceholderText('输入你的作品标题...'), 'Bad')
    await viewer.click(screen.getByRole('button', { name: '提交参赛' }))
    await waitFor(() => expect(screen.getByText('配额不足')).toBeInTheDocument())
  })

  it('失败且无错误信息时展示默认失败文案', async () => {
    const viewer = userEvent.setup()
    api.mockImplementation((async (path: string, options?: RequestInit) => {
      if (path === '/challenges/active') return { challenge }
      if (path === '/challenges/champions') return { champions: [] }
      if (path.endsWith('/entries')) return { entries: [] }
      if (path.endsWith('/submit') && options?.method === 'POST') return { success: false }
      return null
    }) as never)
    setup()
    await openSubmitForm(viewer)
    await viewer.type(screen.getByPlaceholderText('输入你的作品标题...'), 'Bad')
    await viewer.click(screen.getByRole('button', { name: '提交参赛' }))
    await waitFor(() => expect(screen.getByText('提交失败')).toBeInTheDocument())
  })

  it('提交异常时展示网络错误', async () => {
    const viewer = userEvent.setup()
    api.mockImplementation((async (path: string, options?: RequestInit) => {
      if (path === '/challenges/active') return { challenge }
      if (path === '/challenges/champions') return { champions: [] }
      if (path.endsWith('/entries')) return { entries: [] }
      if (path.endsWith('/submit') && options?.method === 'POST') throw new Error('offline')
      return null
    }) as never)
    setup()
    await openSubmitForm(viewer)
    await viewer.type(screen.getByPlaceholderText('输入你的作品标题...'), 'Bad')
    await viewer.click(screen.getByRole('button', { name: '提交参赛' }))
    await waitFor(() => expect(screen.getByText('网络错误')).toBeInTheDocument())
  })
})

describe('ChallengePanel 其他', () => {
  it('每分钟刷新倒计时定时器可执行', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    mockChallenge({ entries: [] })
    setup()
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(screen.getByText('星际主题赛')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(60000)
    })
    expect(screen.getByText('星际主题赛')).toBeInTheDocument()
  })

  it('关闭按钮与遮罩触发 onClose', async () => {
    const viewer = userEvent.setup()
    const { container, onClose } = setup()
    await viewer.click(container.querySelector('button')!)
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.click(container.querySelector('.fixed.inset-0')!)
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('英文语言渲染英文文案', async () => {
    localStorage.setItem('dmusic-prefs', JSON.stringify({ lang: 'en' }))
    mockChallenge({ entries: [] })
    render(
      createElement(I18nProvider, null,
        createElement(ChallengePanel, {
          isOpen: true,
          onClose: vi.fn(),
          user,
          onOpenCreationStudio: vi.fn(),
        })
      )
    )
    await waitFor(() => expect(screen.getByText('Creative Challenge')).toBeInTheDocument())
    expect(screen.getByText('Interstellar Theme')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Details' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Board' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hall' })).toBeInTheDocument()
    expect(screen.getByText('Submit Entry')).toBeInTheDocument()
  })
})
