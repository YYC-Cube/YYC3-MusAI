/**
 * @file AILyricsGenerator 交互测试
 * @description 验证关键词添加、生成请求与结果渲染
 */
import { createElement } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '@yyc3/music-utils'
import { AILyricsGenerator } from '../src'

vi.mock('@yyc3/music-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@yyc3/music-utils')>()
  return { ...actual, apiFetch: vi.fn() }
})

const mockApiFetch = vi.mocked(apiFetch)

describe('AILyricsGenerator 交互', () => {
  beforeEach(() => {
    mockApiFetch.mockReset()
  })

  it('回车添加关键词并以标签展示', async () => {
    const viewer = userEvent.setup()
    render(createElement(AILyricsGenerator, { isOpen: true, onClose: vi.fn() }))

    const input = screen.getByPlaceholderText('aiLyrics.enterKeyword')
    await viewer.type(input, '夏天{enter}')

    expect(screen.getByText('夏天')).toBeInTheDocument()
    expect(input).toHaveValue('')
  })

  it('点击生成调用 /ai/lyrics 并渲染返回歌词', async () => {
    const viewer = userEvent.setup()
    mockApiFetch.mockResolvedValue({
      success: true,
      lyrics: ['第一句生成的歌词', '第二句生成的歌词'],
      theme: 'happy',
      themeLabel: '快乐',
    })

    render(createElement(AILyricsGenerator, { isOpen: true, onClose: vi.fn() }))
    await viewer.click(screen.getByRole('button', { name: /aiLyrics.generate/ }))

    expect(await screen.findByText('第一句生成的歌词')).toBeInTheDocument()
    expect(screen.getByText('第二句生成的歌词')).toBeInTheDocument()
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/ai/lyrics',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  it('请求失败时保持界面可用并输出错误日志', async () => {
    const viewer = userEvent.setup()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockApiFetch.mockRejectedValue(new Error('network down'))

    render(createElement(AILyricsGenerator, { isOpen: true, onClose: vi.fn() }))
    await viewer.click(screen.getByRole('button', { name: /aiLyrics.generate/ }))

    await waitFor(() => expect(errorSpy).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: /aiLyrics.generate/ })).toBeEnabled()
  })
})
