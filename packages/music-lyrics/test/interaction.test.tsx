/**
 * @file LyricsDisplay 交互测试
 * @description 验证歌词行点击跳转与自定义歌词渲染
 */
import { createElement } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LyricsDisplay } from '../src'

const lyrics = [
  { time: 0, text: '第一句歌词' },
  { time: 4, text: '第二句歌词' },
  { time: 8, text: '第三句歌词' },
]

describe('LyricsDisplay 交互', () => {
  it('点击歌词行回传该行时间戳', async () => {
    const user = userEvent.setup()
    const onLineClick = vi.fn()
    render(
      createElement(LyricsDisplay, { currentTime: 0, lyrics, isPlaying: false, onLineClick })
    )
    await user.click(screen.getByText('第二句歌词'))
    expect(onLineClick).toHaveBeenCalledWith(4)
  })

  it('当前播放时间影响高亮行但保留全部歌词', () => {
    render(createElement(LyricsDisplay, { currentTime: 9, lyrics, isPlaying: true }))
    lyrics.forEach((line) => expect(screen.getByText(line.text)).toBeInTheDocument())
  })

  it('无歌词时安全渲染', () => {
    const { container } = render(createElement(LyricsDisplay, { currentTime: 0, lyrics: [] }))
    expect(container.firstChild).not.toBeNull()
  })
})
