/**
 * @file CommentSystem 交互测试
 * @description 验证评论输入、回车提交、排序切换与本地模式下的乐观更新
 */
import { createElement } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '@yyc3/music-utils'
import { CommentSystem } from '../src'

vi.mock('@yyc3/music-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@yyc3/music-utils')>()
  return { ...actual, apiFetch: vi.fn() }
})

const user = { id: 'u1', name: 'Tester', email: 'tester@example.com' }
const mockApiFetch = vi.mocked(apiFetch)

function setup() {
  return render(
    createElement(CommentSystem, {
      isOpen: true,
      onClose: vi.fn(),
      songId: 'track-1',
      songTitle: 'Cosmic Dreams',
      currentTime: 12,
      user,
    })
  )
}

describe('CommentSystem 交互', () => {
  beforeEach(() => {
    mockApiFetch.mockReset()
    mockApiFetch.mockResolvedValue(null)
  })

  it('回车提交评论并调用后端接口', async () => {
    const viewer = userEvent.setup()
    setup()

    const textarea = screen.getByPlaceholderText('comments.placeholder')
    await viewer.type(textarea, '这首歌真好听{enter}')

    expect(screen.getByText('这首歌真好听')).toBeInTheDocument()
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/comments/track-1',
        expect.objectContaining({ method: 'POST' })
      )
    })
    expect(textarea).toHaveValue('')
  })

  it('空内容不会触发提交', async () => {
    const viewer = userEvent.setup()
    setup()

    await viewer.type(screen.getByPlaceholderText('comments.placeholder'), '   {enter}')
    expect(mockApiFetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/comments/track-1'),
      expect.anything()
    )
  })

  it('排序按钮在最新与热门之间切换', async () => {
    const viewer = userEvent.setup()
    setup()

    const sortButton = screen.getByRole('button', { name: 'comments.newest' })
    await viewer.click(sortButton)
    expect(screen.getByRole('button', { name: 'comments.popular' })).toBeInTheDocument()
  })
})
