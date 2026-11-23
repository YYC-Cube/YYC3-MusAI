// W7-P2-3 上游化收编：主仓独有测试归入源仓；以下环境自足化注入由收编流程生成
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

// YYC³ music-emotion — XiaoyuBubble 气泡组件测试
import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { XiaoyuBubble } from '../src'

// W7-P2-3 环境自足化：barrel 导入会连带加载同包 XiaoyuCharacter→lottie-web，
// jsdom 无 2D canvas 时 lottie-web 模块初始化即崩溃；就地 mock（同 XiaoyuCharacter.test.tsx 模式）
vi.mock('lottie-react', () => ({ default: () => null }))

describe('XiaoyuBubble', () => {
  it('可见时渲染文本内容', () => {
    render(<XiaoyuBubble text="今天想听什么歌？" emotion="neutral" isVisible />)
    expect(screen.getByText('今天想听什么歌？')).toBeTruthy()
  })

  it('不可见时不渲染内容', () => {
    const { container } = render(
      <XiaoyuBubble text="隐藏内容" emotion="happy" isVisible={false} />
    )
    expect(container.querySelector('.xiaoyu-bubble')).toBeNull()
    expect(screen.queryByText('隐藏内容')).toBeNull()
  })

  it('提供 onClose 时渲染关闭按钮并触发回调', () => {
    const onClose = vi.fn()
    render(<XiaoyuBubble text="关闭我" emotion="happy" isVisible onClose={onClose} />)

    const closeButton = screen.getByRole('button')
    expect(closeButton.textContent).toBe('×')

    fireEvent.click(closeButton)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('未提供 onClose 时不渲染关闭按钮', () => {
    render(<XiaoyuBubble text="无关闭" emotion="happy" isVisible />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('不同情绪生成不同的样式类名', () => {
    const { container: happy } = render(<XiaoyuBubble text="a" emotion="happy" isVisible />)
    const { container: anxious } = render(<XiaoyuBubble text="b" emotion="anxious" isVisible />)
    const { container: surprised } = render(<XiaoyuBubble text="c" emotion="surprised" isVisible />)
    const { container: neutral } = render(<XiaoyuBubble text="d" emotion="neutral" isVisible />)

    const classOf = (el: HTMLElement) => el.firstElementChild!.getAttribute('style')! +
      el.firstElementChild!.className
    expect(classOf(happy)).not.toBe(classOf(anxious))
    expect(classOf(surprised)).not.toBe(classOf(neutral))
  })

  it('未知情绪回退到 neutral 样式', () => {
    const { container: fallback } = render(
      <XiaoyuBubble text="x" emotion={'unknown' as any} isVisible />
    )
    const { container: neutral } = render(<XiaoyuBubble text="y" emotion="neutral" isVisible />)

    expect(fallback.firstElementChild!.className).toBe(neutral.firstElementChild!.className)
  })
})
