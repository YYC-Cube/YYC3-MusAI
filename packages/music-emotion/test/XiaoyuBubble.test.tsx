// YYC³ music-emotion — XiaoyuBubble 气泡组件测试
import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import XiaoyuBubble from '../src/components/xiaoyu/XiaoyuBubble'

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
