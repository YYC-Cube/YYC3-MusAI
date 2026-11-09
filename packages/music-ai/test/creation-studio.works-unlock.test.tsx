/**
 * @file CreationStudio 作品管理与主题解锁测试
 * @description 覆盖本地作品读取/复制/删除/分享/MV，以及 SP 解锁、迁移和各类失败降级
 */
import { createElement } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '@yyc3/music-utils'
import { DEMO_PLAYLIST } from '@yyc3/music-data'
import { CreationStudio } from '../src'

const composeMock = vi.hoisted(() => vi.fn())

vi.mock('@yyc3/music-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@yyc3/music-utils')>()
  return { ...actual, apiFetch: vi.fn() }
})

vi.mock('@yyc3/music-hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@yyc3/music-hooks')>()
  return {
    ...actual,
    useAudioComposer: () => ({
      compose: composeMock,
      progress: 0.42,
      isComposing: false,
      error: null,
    }),
  }
})

const mockApiFetch = vi.mocked(apiFetch)

function setupClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
  return writeText
}

function renderStudio(overrides: Record<string, unknown> = {}) {
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    onCreateTrack: vi.fn(),
    playlist: DEMO_PLAYLIST,
    currentTrackIndex: 0,
    onHaptic: vi.fn(),
    onShareWork: vi.fn(),
    onOpenMV: vi.fn(),
    user: undefined as { id: string; name: string } | undefined,
    starPower: 0,
    onStarPowerUpdate: vi.fn(),
    ...overrides,
  }
  const result = render(createElement(CreationStudio, props))
  return { ...result, props }
}

const sampleWorks = [
  {
    id: 'w1',
    title: '快乐之歌',
    theme: 'happy',
    lyrics: ['第一句', '第二句'],
    createdAt: Date.now(),
    mode: 'quick',
  },
  {
    id: 'w2',
    title: '神秘之歌',
    theme: 'unknown-theme',
    lyrics: ['只有一句'],
    createdAt: Date.now(),
    mode: 'custom',
  },
]

describe('CreationStudio 作品管理', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApiFetch.mockReset()
    mockApiFetch.mockResolvedValue({})
    composeMock.mockReset()
    setupClipboard()
  })

  it('空作品时展示引导并可跳转极简写歌', async () => {
    const viewer = userEvent.setup()
    renderStudio()

    await viewer.click(screen.getByRole('button', { name: /作品管理/ }))
    expect(await screen.findByText(/还没有创作作品/)).toBeInTheDocument()

    await viewer.click(screen.getByRole('button', { name: /开始创作/ }))
    expect(await screen.findByRole('heading', { name: '极简写歌' })).toBeInTheDocument()
  })

  it('加载本地作品并支持复制、删除、分享与创建 MV', async () => {
    const viewer = userEvent.setup()
    const writeText = setupClipboard()
    localStorage.setItem('d-music-works', JSON.stringify(sampleWorks))
    const onShareWork = vi.fn()
    const onOpenMV = vi.fn()
    const { container } = renderStudio({ onShareWork, onOpenMV })

    await viewer.click(screen.getByRole('button', { name: /作品管理/ }))
    expect(await screen.findByText('快乐之歌')).toBeInTheDocument()
    expect(screen.getAllByText('2 首作品').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('神秘之歌')).toBeInTheDocument()
    expect(screen.getAllByText('极简写歌').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('custom')).toBeInTheDocument()

    await viewer.click(screen.getAllByTitle('复制歌词')[0])
    expect(writeText).toHaveBeenCalledWith('第一句\n第二句')

    await viewer.click(screen.getAllByTitle('分享作品')[1])
    expect(onShareWork).toHaveBeenCalledWith(sampleWorks[1])

    await viewer.click(screen.getAllByTitle('从此作品创建MV')[1])
    expect(onOpenMV).toHaveBeenCalledWith(['只有一句'])

    await viewer.click(screen.getAllByTitle('删除')[0])
    await waitFor(() => expect(screen.queryByText('快乐之歌')).not.toBeInTheDocument())
    expect(JSON.parse(localStorage.getItem('d-music-works')!)).toHaveLength(1)
    expect(container).toBeTruthy()
  })

  it('未提供分享/MV 回调时不渲染对应按钮', async () => {
    const viewer = userEvent.setup()
    localStorage.setItem('d-music-works', JSON.stringify([sampleWorks[0]]))
    renderStudio({ onShareWork: undefined, onOpenMV: undefined })

    await viewer.click(screen.getByRole('button', { name: /作品管理/ }))
    await screen.findByText('快乐之歌')
    expect(screen.queryByTitle('分享作品')).not.toBeInTheDocument()
    expect(screen.queryByTitle('从此作品创建MV')).not.toBeInTheDocument()
  })
})

describe('CreationStudio 主题解锁', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApiFetch.mockReset()
    composeMock.mockReset()
    setupClipboard()
  })

  it('未登录时从本地存储恢复已解锁主题', async () => {
    const viewer = userEvent.setup()
    localStorage.setItem('dmusic-unlocked-themes', JSON.stringify(['energetic']))
    mockApiFetch.mockResolvedValue({})
    renderStudio()

    await viewer.click(screen.getByRole('button', { name: /极简写歌/ }))
    await screen.findByPlaceholderText('输入关键词，用逗号分隔...')
    expect(screen.getAllByText('200SP')).toHaveLength(1)

    await viewer.click(screen.getByText('活力').closest('button')!)
    expect(mockApiFetch).not.toHaveBeenCalled()
  })

  it('登录后读取已解锁主题，并用 SP 解锁新主题', async () => {
    const viewer = userEvent.setup()
    const onStarPowerUpdate = vi.fn()
    mockApiFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === '/user/u1/unlocked-themes' && init?.method !== 'POST') {
        return { themes: ['energetic'] }
      }
      if (url === '/starpower/u1/consume') return { success: true, starPower: 300 }
      return {}
    })
    renderStudio({ user: { id: 'u1', name: 'Tester' }, starPower: 500, onStarPowerUpdate })

    await viewer.click(screen.getByRole('button', { name: /极简写歌/ }))
    await screen.findByPlaceholderText('输入关键词，用逗号分隔...')
    await waitFor(() => expect(screen.getAllByText('200SP')).toHaveLength(1))

    await viewer.click(screen.getByText('爱情').closest('button')!)
    await waitFor(() => expect(onStarPowerUpdate).toHaveBeenCalledWith(300))
    await waitFor(() => expect(screen.queryAllByText('200SP')).toHaveLength(0))

    const consumeCall = mockApiFetch.mock.calls.find(
      (call) => call[0] === '/starpower/u1/consume'
    )!
    expect(JSON.parse((consumeCall[1] as RequestInit).body as string)).toEqual({
      amount: 200,
      purpose: 'template_unlock',
      targetId: 'love',
    })
    const persistCall = mockApiFetch.mock.calls.find(
      (call) =>
        call[0] === '/user/u1/unlocked-themes' &&
        (call[1] as RequestInit | undefined)?.method === 'POST'
    )!
    expect(JSON.parse((persistCall[1] as RequestInit).body as string)).toEqual({ themeId: 'love' })
  })

  it('SP 不足时点击付费主题不发起消费请求', async () => {
    const viewer = userEvent.setup()
    mockApiFetch.mockImplementation(async (url: string) => {
      if (url === '/user/u1/unlocked-themes') return { themes: ['energetic'] }
      return {}
    })
    renderStudio({ user: { id: 'u1', name: 'Tester' }, starPower: 100 })

    await viewer.click(screen.getByRole('button', { name: /极简写歌/ }))
    await screen.findByPlaceholderText('输入关键词，用逗号分隔...')
    await waitFor(() => expect(screen.getAllByText('200SP')).toHaveLength(1))

    await viewer.click(screen.getByText('爱情').closest('button')!)
    expect(mockApiFetch.mock.calls.some((call) => call[0] === '/starpower/u1/consume')).toBe(false)
    expect(screen.getAllByText('200SP')).toHaveLength(1)
  })

  it('消费失败时不更新 SP 也不解锁主题', async () => {
    const viewer = userEvent.setup()
    const onStarPowerUpdate = vi.fn()
    mockApiFetch.mockImplementation(async (url: string) => {
      if (url === '/user/u1/unlocked-themes') return { themes: ['energetic'] }
      if (url === '/starpower/u1/consume') return { success: false }
      return {}
    })
    renderStudio({ user: { id: 'u1', name: 'Tester' }, starPower: 500, onStarPowerUpdate })

    await viewer.click(screen.getByRole('button', { name: /极简写歌/ }))
    await screen.findByPlaceholderText('输入关键词，用逗号分隔...')
    await waitFor(() => expect(screen.getAllByText('200SP')).toHaveLength(1))

    await viewer.click(screen.getByText('爱情').closest('button')!)
    await waitFor(() =>
      expect(mockApiFetch.mock.calls.some((call) => call[0] === '/starpower/u1/consume')).toBe(true)
    )
    expect(onStarPowerUpdate).not.toHaveBeenCalled()
    expect(screen.getAllByText('200SP')).toHaveLength(1)
  })

  it('消费接口异常时记录错误且保持锁定', async () => {
    const viewer = userEvent.setup()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockApiFetch.mockImplementation(async (url: string) => {
      if (url === '/user/u1/unlocked-themes') return { themes: ['energetic'] }
      if (url === '/starpower/u1/consume') throw new Error('consume down')
      return {}
    })
    renderStudio({ user: { id: 'u1', name: 'Tester' }, starPower: 500 })

    await viewer.click(screen.getByRole('button', { name: /极简写歌/ }))
    await screen.findByPlaceholderText('输入关键词，用逗号分隔...')
    await waitFor(() => expect(screen.getAllByText('200SP')).toHaveLength(1))

    await viewer.click(screen.getByText('爱情').closest('button')!)
    await waitFor(() =>
      expect(errorSpy).toHaveBeenCalledWith('Theme unlock error:', expect.any(Error))
    )
    expect(screen.getAllByText('200SP')).toHaveLength(1)
  })

  it('读取解锁接口失败时回退到本地存储', async () => {
    const viewer = userEvent.setup()
    localStorage.setItem('dmusic-unlocked-themes', JSON.stringify(['love']))
    mockApiFetch.mockRejectedValue(new Error('offline'))
    renderStudio({ user: { id: 'u1', name: 'Tester' }, starPower: 0 })

    await viewer.click(screen.getByRole('button', { name: /极简写歌/ }))
    await screen.findByPlaceholderText('输入关键词，用逗号分隔...')
    await waitFor(() => expect(screen.getAllByText('200SP')).toHaveLength(1))
  })

  it('服务端无解锁记录时迁移本地主题并清理缓存', async () => {
    const viewer = userEvent.setup()
    localStorage.setItem('dmusic-unlocked-themes', JSON.stringify(['energetic']))
    mockApiFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === '/user/u1/unlocked-themes' && init?.method !== 'POST') return { themes: [] }
      if (url === '/user/u1/unlocked-themes' && init?.method === 'POST') return {}
      return {}
    })
    renderStudio({ user: { id: 'u1', name: 'Tester' }, starPower: 0 })

    await waitFor(() =>
      expect(
        mockApiFetch.mock.calls.some(
          (call) =>
            call[0] === '/user/u1/unlocked-themes' &&
            (call[1] as RequestInit | undefined)?.method === 'POST'
        )
      ).toBe(true)
    )
    expect(localStorage.getItem('dmusic-unlocked-themes')).toBeNull()

    await viewer.click(screen.getByRole('button', { name: /极简写歌/ }))
    await screen.findByPlaceholderText('输入关键词，用逗号分隔...')
    expect(screen.getAllByText('200SP')).toHaveLength(1)
  })
})
