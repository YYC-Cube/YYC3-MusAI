/**
 * @file TimelineComments 弹幕评论测试
 * @description 覆盖时间窗口过滤、显示开关、弹幕点赞、发送成功/失败与本地化
 */
import { createElement } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '@yyc3/music-utils'
import { TimelineComments } from '../src'

vi.mock('@yyc3/music-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@yyc3/music-utils')>()
  return { ...actual, apiFetch: vi.fn() }
})

const api = vi.mocked(apiFetch) as unknown as ReturnType<typeof vi.fn>
const user = { id: 'u1', email: 'tester@example.com' }

function makeComment(over: Record<string, unknown> = {}) {
  return {
    id: 't1',
    text: 'hello',
    timestamp: 10,
    userName: 'Alice',
    color: '#FF6B6B',
    createdAt: Date.now(),
    likes: 0,
    ...over,
  }
}

function setup(over: Record<string, unknown> = {}) {
  return render(
    createElement(TimelineComments, {
      songId: 'track-1',
      currentTime: 10,
      duration: 180,
      isPlaying: true,
      user,
      lang: 'zh',
      ...over,
    })
  )
}

function findButtonByIcon(container: HTMLElement, icon: string) {
  return Array.from(container.querySelectorAll('button')).find((b) =>
    b.querySelector(`svg.lucide-${icon}`)
  )!
}

function mockTimeline(comments: unknown[]) {
  api.mockImplementation((async (path: string, options?: RequestInit) => {
    if (path === '/timeline-comments/track-1' && !options?.method) return { comments }
    return null
  }) as never)
}

beforeEach(() => {
  api.mockReset()
  api.mockResolvedValue(null)
})

describe('TimelineComments', () => {
  it('只渲染时间窗口内的弹幕并展示总数', async () => {
    mockTimeline([
      makeComment({ id: 'in', text: 'in-window', timestamp: 12, likes: 0 }),
      makeComment({ id: 'past', text: 'too-late', timestamp: 18 }),
      makeComment({ id: 'early', text: 'too-early', timestamp: 2 }),
    ])
    const { container } = setup()
    await waitFor(() => expect(screen.getByText('in-window')).toBeInTheDocument())

    expect(screen.queryByText('too-late')).toBeNull()
    expect(screen.queryByText('too-early')).toBeNull()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(container.textContent).toContain('Alice')
  })

  it('关闭后隐藏弹幕，再次打开恢复', async () => {
    const viewer = userEvent.setup()
    mockTimeline([makeComment({ text: 'visible-one' })])
    setup()
    await waitFor(() => expect(screen.getByText('visible-one')).toBeInTheDocument())

    await viewer.click(screen.getByTitle('隐藏弹幕'))
    expect(screen.getByTitle('显示弹幕')).toBeInTheDocument()

    await viewer.click(screen.getByTitle('显示弹幕'))
    expect(screen.getByTitle('隐藏弹幕')).toBeInTheDocument()
  })

  it('点击弹幕点赞并调用接口', async () => {
    mockTimeline([makeComment({ text: 'like-me', likes: 0 })])
    const { container } = setup()
    await waitFor(() => expect(screen.getByText('like-me')).toBeInTheDocument())

    fireEvent.click(screen.getByText('like-me'))
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('/timeline-comments/track-1/like/t1', { method: 'POST' })
    )
    // 点赞数 +1 后展示心形计数
    expect(container.textContent).toContain('1')
  })

  it('输入并提交弹幕，成功后追加并关闭输入框', async () => {
    const viewer = userEvent.setup()
    api.mockImplementation((async (path: string, options?: RequestInit) => {
      if (options?.method === 'POST') {
        return { comment: makeComment({ id: 'new', text: 'fresh danmaku', timestamp: 10 }) }
      }
      if (path === '/timeline-comments/track-1') return { comments: [] }
      return null
    }) as never)
    const { container } = setup()

    await viewer.click(findButtonByIcon(container, 'message-circle'))
    const input = screen.getByPlaceholderText('发一条弹幕...')
    await viewer.type(input, 'fresh danmaku{enter}')

    await waitFor(() => expect(screen.getByText('fresh danmaku')).toBeInTheDocument())
    expect(screen.queryByPlaceholderText('发一条弹幕...')).toBeNull()
    expect(api).toHaveBeenCalledWith(
      '/timeline-comments/track-1',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('发送失败时记录错误并保留输入框', async () => {
    const viewer = userEvent.setup()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    api.mockImplementation((async (path: string, options?: RequestInit) => {
      if (options?.method === 'POST') throw new Error('boom')
      if (path === '/timeline-comments/track-1') return { comments: [] }
      return null
    }) as never)
    const { container } = setup()

    await viewer.click(findButtonByIcon(container, 'message-circle'))
    await viewer.type(screen.getByPlaceholderText('发一条弹幕...'), 'oops{enter}')
    await waitFor(() => expect(errorSpy).toHaveBeenCalled())
    expect(screen.getByPlaceholderText('发一条弹幕...')).toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('拉取失败时记录错误且不崩溃', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    api.mockRejectedValue(new Error('network') as never)
    const { container } = setup()
    await waitFor(() => expect(errorSpy).toHaveBeenCalled())
    expect(container.querySelector('div')).not.toBeNull()
    errorSpy.mockRestore()
  })

  it('未登录时不显示发送入口', () => {
    api.mockResolvedValue({ comments: [] } as never)
    const { container } = setup({ user: null })
    expect(findButtonByIcon(container, 'message-circle')).toBeUndefined()
  })

  it('英文语言渲染英文文案', async () => {
    const viewer = userEvent.setup()
    api.mockResolvedValue({ comments: [] } as never)
    const { container } = setup({ lang: 'en' })
    expect(screen.getByTitle('Hide danmaku')).toBeInTheDocument()
    await viewer.click(findButtonByIcon(container, 'message-circle'))
    expect(screen.getByPlaceholderText('Send a comment...')).toBeInTheDocument()
  })
})
