/**
 * @file CommentSystem 分支与交互测试
 * @description 覆盖加载/空态、排序、点赞/取消点赞、时间戳开关、未登录禁用与关闭操作
 */
import { createElement } from 'react'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '@yyc3/music-utils'
import { CommentSystem } from '../src'

vi.mock('@yyc3/music-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@yyc3/music-utils')>()
  return { ...actual, apiFetch: vi.fn() }
})

const api = vi.mocked(apiFetch) as unknown as ReturnType<typeof vi.fn>
const user = { id: 'u1', email: 'tester@example.com' }

function makeComment(over: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    userId: 'u2',
    userName: 'Alice',
    text: 'Comment A',
    timestamp: 0,
    createdAt: Date.now(),
    likes: 0,
    likedBy: [] as string[],
    ...over,
  }
}

function setup(over: Record<string, unknown> = {}) {
  const onClose = vi.fn()
  const utils = render(
    createElement(CommentSystem, {
      isOpen: true,
      onClose,
      songId: 'track-1',
      songTitle: 'Cosmic Dreams',
      currentTime: 65,
      user,
      ...over,
    })
  )
  return { onClose, ...utils }
}

beforeEach(() => {
  api.mockReset()
  api.mockResolvedValue(null)
})

describe('CommentSystem 数据渲染', () => {
  it('加载中显示 spinner', async () => {
    api.mockReturnValue(new Promise(() => {}) as never)
    const { container } = setup()
    expect(container.querySelector('.animate-spin')).not.toBeNull()
  })

  it('空评论展示空态文案', async () => {
    setup()
    await waitFor(() => expect(screen.getByText('comments.noComments')).toBeInTheDocument())
    expect(screen.getByText('comments.beFirst')).toBeInTheDocument()
  })

  it('渲染评论时间戳、相对时间与点赞数', async () => {
    const now = Date.now()
    api.mockResolvedValue({
      comments: [
        makeComment({ id: 'a', text: 'Comment A', timestamp: 65, likes: 2, createdAt: now - 5000 }),
        makeComment({ id: 'b', text: 'Comment B', timestamp: 0, likes: 0, createdAt: now - 5 * 60000 }),
        makeComment({ id: 'c', text: 'Comment C', viewed: true, createdAt: now - 2 * 3600000 }),
        makeComment({ id: 'd', text: 'Comment D', createdAt: now - 3 * 86400000 }),
      ],
    } as never)
    setup()
    await waitFor(() => expect(screen.getByText('Comment A')).toBeInTheDocument())

    expect(screen.getByText('1:05')).toBeInTheDocument()
    expect(screen.getByText('time.justNow')).toBeInTheDocument()
    expect(screen.getByText('5time.mAgo')).toBeInTheDocument()
    expect(screen.getByText('2time.hAgo')).toBeInTheDocument()
    expect(screen.getByText('3time.dAgo')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('在最新与热门排序间切换并调整顺序', async () => {
    const viewer = userEvent.setup()
    const now = Date.now()
    api.mockResolvedValue({
      comments: [
        makeComment({ id: 'a', text: 'Comment A', likes: 1, createdAt: now - 1000 }),
        makeComment({ id: 'b', text: 'Comment B', likes: 9, createdAt: now - 5000 }),
      ],
    } as never)
    setup()
    await waitFor(() => expect(screen.getByText('Comment A')).toBeInTheDocument())

    const order = () =>
      screen.getAllByText(/^Comment [AB]$/).map((el) => el.textContent)
    expect(order()).toEqual(['Comment A', 'Comment B'])

    await viewer.click(screen.getByRole('button', { name: 'comments.newest' }))
    expect(order()).toEqual(['Comment B', 'Comment A'])
    expect(screen.getByRole('button', { name: 'comments.popular' })).toBeInTheDocument()
  })
})

describe('CommentSystem 交互', () => {
  it('点赞后计数增加并调用接口，再次点击取消点赞', async () => {
    const viewer = userEvent.setup()
    api.mockImplementation((async (path: string) => {
      if (path === '/comments/track-1') {
        return {
          comments: [makeComment({ text: 'Liked one', likes: 2, likedBy: ['u1'] })],
        }
      }
      return null
    }) as never)
    setup()
    await waitFor(() => expect(screen.getByText('Liked one')).toBeInTheDocument())

    const likeButton = screen.getByText('2').closest('button')!
    await viewer.click(likeButton)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(api).toHaveBeenCalledWith('/comments/track-1/like/c1', expect.objectContaining({ method: 'POST' }))

    await viewer.click(screen.getByText('1').closest('button')!)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('关闭时间戳后提交的评论 timestamp 为 0', async () => {
    const viewer = userEvent.setup()
    api.mockImplementation((async (path: string) => {
      if (path === '/comments/track-1') return { comments: [] }
      return null
    }) as never)
    setup()

    const clock = screen.getByTitle('Attach at 1:05')
    await viewer.click(clock)
    expect(screen.getByTitle('No timestamp')).toBeInTheDocument()
    expect(screen.queryByText(/comments.timestampAt/)).toBeNull()

    await viewer.type(screen.getByPlaceholderText('comments.placeholder'), 'no stamp{enter}')
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        '/comments/track-1',
        expect.objectContaining({ method: 'POST' })
      )
    )
    const postCall = api.mock.calls.find((c) => c[1]?.method === 'POST')!
    expect(JSON.parse((postCall[1] as RequestInit).body as string)).toEqual(
      expect.objectContaining({ timestamp: 0 })
    )
  })

  it('提交成功后用服务端评论替换乐观条目', async () => {
    const viewer = userEvent.setup()
    api.mockImplementation((async (path: string, options?: RequestInit) => {
      if (options?.method === 'POST') {
        return {
          comment: makeComment({ id: 'server-1', text: 'server added', timestamp: 65 }),
        }
      }
      if (path === '/comments/track-1') return { comments: [] }
      return null
    }) as never)
    setup()
    await viewer.type(screen.getByPlaceholderText('comments.placeholder'), 'server added{enter}')
    expect(screen.getByText('server added')).toBeInTheDocument()
    expect(screen.getByText('1:05')).toBeInTheDocument()
  })

  it('未登录用户输入框禁用并显示登录提示', () => {
    setup({ user: null })
    const input = screen.getByPlaceholderText('comments.signInToComment')
    expect(input).toBeDisabled()
  })

  it('点击遮罩与关闭按钮都会触发 onClose', async () => {
    const viewer = userEvent.setup()
    const { container, onClose } = setup()
    const backdrop = container.querySelector('.fixed.inset-0')!
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)

    const buttons = Array.from(container.querySelectorAll('button'))
    const closeButton = buttons.find((b) => b.querySelector('svg.lucide-x'))!
    await viewer.click(closeButton)
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
