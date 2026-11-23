/**
 * @file LyricsDisplay 交互测试
 * @description 验证歌词行点击跳转与自定义歌词渲染
 */
// W7-P2-3 上游化收编：主仓独有测试归入源仓；以下环境自足化注入由收编流程生成
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// RTL 挂载手动清理：源仓 vitest 不依赖 globals auto-cleanup（W7-P2-3 环境自足化）
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

// jsdom 缺失浏览器 API 守卫（W7-P2-3 环境自足化；守卫式，不覆盖宿主已有实现）
if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    })
  }
  if (typeof (globalThis as { ResizeObserver?: unknown }).ResizeObserver === 'undefined') {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub
  }
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
}

// jsdom 未实现 scrollIntoView；守卫式 stub（W7-P2-3 环境自足化，不覆盖宿主已有实现）
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}


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
