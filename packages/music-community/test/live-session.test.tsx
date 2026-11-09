/**
 * @file LiveSessionPanel 实时互动测试
 * @description 覆盖在线听众、弹幕拉取/发送、发送失败、未登录态、退出与会话终止
 */
import { createElement } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '@yyc3/music-utils'
import { I18nProvider } from '@yyc3/music-hooks'
import { LiveSessionPanel } from '../src'

vi.mock('@yyc3/music-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@yyc3/music-utils')>()
  return { ...actual, apiFetch: vi.fn() }
})

const api = vi.mocked(apiFetch) as unknown as ReturnType<typeof vi.fn>
const now = Date.now()

function listener(over: Record<string, unknown> = {}) {
  return {
    userId: 'other',
    userName: 'Listener',
    trackTitle: 'Cosmic Dreams',
    emotion: 'happy',
    lastSeen: now,
    isPlaying: false,
    ...over,
  }
}

function mockSession(messages: unknown[] = []) {
  api.mockImplementation((async (path: string, options?: RequestInit) => {
    if (path === '/live-session/heartbeat') return null
    if (path === '/live-session/presence') return { listeners: [] }
    if (path === '/live-session/danmaku' && !options?.method) return { messages }
    return null
  }) as never)
}

function setup(over: Record<string, unknown> = {}) {
  const onClose = vi.fn()
  const utils = render(
    createElement(LiveSessionPanel, {
      isOpen: true,
      onClose,
      userId: 'me',
      userName: 'Me',
      currentTrackId: 'track-1',
      currentTrackTitle: 'Cosmic Dreams',
      isPlaying: true,
      currentEmotion: 'happy',
      ...over,
    })
  )
  return { onClose, ...utils }
}

function findSendButton(container: HTMLElement) {
  return Array.from(container.querySelectorAll('button')).find((b) =>
    b.querySelector('svg.lucide-send')
  )!
}

function findButtonByIcon(container: HTMLElement, icon: string) {
  return Array.from(container.querySelectorAll('button')).find((b) =>
    b.querySelector(`svg.lucide-${icon}`)
  )!
}

beforeEach(() => {
  api.mockReset()
  localStorage.clear()
  mockSession()
})

afterEach(() => {
  localStorage.clear()
})

describe('LiveSessionPanel', () => {
  it('渲染在线听众、在线人数与弹幕消息', async () => {
    const listeners = [
      ...Array.from({ length: 12 }, (_, i) =>
        listener({ userId: `u${i}`, userName: `U${i}`, isPlaying: i === 0 ? true : undefined })
      ),
      listener({ userId: 'me', userName: 'Me', isPlaying: true }),
      listener({ userId: 'stale', userName: 'Ghost', lastSeen: now - 60000 }),
    ]
    api.mockImplementation((async (path: string, options?: RequestInit) => {
      if (path === '/live-session/presence') return { listeners }
      if (path === '/live-session/danmaku' && !options?.method) {
        return {
          messages: [
            { id: 'm1', userId: 'u1', userName: 'Alice', text: 'hello live', trackId: 'track-1', timestamp: now, color: '#FFD700' },
          ],
        }
      }
      return null
    }) as never)
    setup()

    await waitFor(() => expect(screen.getByText('hello live')).toBeInTheDocument())
    expect(screen.getByText('13 人在线')).toBeInTheDocument()
    expect(screen.getByText('在线听众')).toBeInTheDocument()
    expect(screen.getByText('+2')).toBeInTheDocument()
    expect(screen.getByText('U0')).toBeInTheDocument()
    expect(api).toHaveBeenCalledWith(
      '/live-session/heartbeat',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('无消息时展示首条弹幕引导', () => {
    setup()
    expect(screen.getByText('发送第一条弹幕吧!')).toBeInTheDocument()
    expect(screen.getByText('与其他听众实时互动')).toBeInTheDocument()
  })

  it('通过回车发送弹幕并清空输入', async () => {
    const viewer = userEvent.setup()
    setup()
    const input = screen.getByPlaceholderText('发送弹幕...')
    await viewer.type(input, 'hi there{enter}')
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        '/live-session/danmaku',
        expect.objectContaining({ method: 'POST' })
      )
    )
    const call = api.mock.calls.find((c) => c[0] === '/live-session/danmaku' && c[1]?.method === 'POST')!
    expect(JSON.parse((call[1] as RequestInit).body as string)).toEqual(
      expect.objectContaining({ text: 'hi there', userId: 'me' })
    )
    expect(input).toHaveValue('')
  })

  it('通过发送按钮发送且空输入时按钮禁用', async () => {
    const viewer = userEvent.setup()
    const { container } = setup()
    const send = findSendButton(container)
    expect(send).toBeDisabled()

    await viewer.type(screen.getByPlaceholderText('发送弹幕...'), 'button send')
    expect(send).not.toBeDisabled()
    await viewer.click(send)
    await waitFor(() =>
      expect(
        api.mock.calls.some((c) => c[0] === '/live-session/danmaku' && c[1]?.method === 'POST')
      ).toBe(true)
    )
  })

  it('发送失败时记录错误并恢复可发送状态', async () => {
    const viewer = userEvent.setup()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    api.mockImplementation((async (path: string, options?: RequestInit) => {
      if (path === '/live-session/danmaku' && options?.method === 'POST') throw new Error('nope')
      if (path === '/live-session/presence') return { listeners: [] }
      return null
    }) as never)
    setup()
    await viewer.type(screen.getByPlaceholderText('发送弹幕...'), 'fail{enter}')
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('Send danmaku error:', expect.any(Error)))
    expect(screen.getByPlaceholderText('发送弹幕...')).toHaveValue('fail')
    errorSpy.mockRestore()
  })

  it('心跳失败时记录错误', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    api.mockImplementation((async (path: string) => {
      if (path === '/live-session/heartbeat') throw new Error('offline')
      if (path === '/live-session/presence') return { listeners: [] }
      return null
    }) as never)
    setup()
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('Heartbeat error:', expect.any(Error)))
    errorSpy.mockRestore()
  })

  it('未登录时显示登录提示且不发送心跳', () => {
    setup({ userId: undefined })
    expect(screen.getByText('登录后可发送弹幕')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('发送弹幕...')).toBeNull()
    expect(api).not.toHaveBeenCalledWith('/live-session/heartbeat', expect.anything())
  })

  it('关闭按钮与遮罩触发 onClose，卸载时发送离开请求', async () => {
    const viewer = userEvent.setup()
    const { container, onClose, unmount } = setup()

    await viewer.click(findButtonByIcon(container, 'x'))
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.click(container.querySelector('.fixed.inset-0')!)
    expect(onClose).toHaveBeenCalledTimes(2)

    unmount()
    expect(api).toHaveBeenCalledWith('/live-session/leave', expect.objectContaining({ method: 'POST' }))
  })

  it('英文语言渲染英文文案', async () => {
    localStorage.setItem('dmusic-prefs', JSON.stringify({ lang: 'en' }))
    mockSession([])
    render(
      createElement(I18nProvider, null,
        createElement(LiveSessionPanel, {
          isOpen: true,
          onClose: vi.fn(),
          userId: 'me',
          userName: 'Me',
          currentTrackId: 'track-1',
          currentTrackTitle: 'Cosmic Dreams',
          isPlaying: true,
          currentEmotion: 'happy',
        })
      )
    )
    expect(screen.getByText('Live Session')).toBeInTheDocument()
    expect(screen.getByText('Send the first message!')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Send message...')).toBeInTheDocument()
  })
})
