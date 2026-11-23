/**
 * @file ImageWithFallback 测试
 * @description 图片正常渲染、加载失败回退为占位图并保留原始地址
 */
// W7-P2-3 上游化收编：主仓独有测试归入源仓；以下环境自足化注入由收编流程生成
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

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


import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ImageWithFallback } from '../src'

describe('ImageWithFallback', () => {
  it('正常渲染原图并透传属性', () => {
    render(
      <ImageWithFallback
        src="/cover.png"
        alt="专辑封面"
        className="cover"
        style={{ width: 100 }}
        data-testid="cover"
      />
    )
    const img = screen.getByRole('img', { name: '专辑封面' })
    expect(img).toHaveAttribute('src', '/cover.png')
    expect(img).toHaveClass('cover')
    expect(img).toHaveStyle({ width: '100px' })
    expect(img).toHaveAttribute('data-testid', 'cover')
  })

  it('加载失败后显示回退占位图并记录原始地址', () => {
    render(
      <ImageWithFallback
        src="/broken.png"
        alt="损坏图片"
        className="broken"
        style={{ height: 80 }}
      />
    )
    fireEvent.error(screen.getByRole('img', { name: '损坏图片' }))
    const fallback = screen.getByRole('img', { name: 'Error loading image' })
    expect(fallback).toHaveAttribute('data-original-url', '/broken.png')
    expect(fallback.getAttribute('src')).toContain('data:image/svg+xml')
    const wrapper = fallback.parentElement?.parentElement as HTMLElement
    expect(wrapper).toHaveClass('inline-block', 'broken')
    expect(wrapper).toHaveStyle({ height: '80px' })
    expect(fallback.parentElement).toHaveClass('flex', 'items-center', 'justify-center')
  })

  it('未传 className 与 style 时仍可回退', () => {
    render(<ImageWithFallback src="/broken-2.png" alt="另一张" />)
    fireEvent.error(screen.getByRole('img', { name: '另一张' }))
    const wrapper = screen.getByRole('img', { name: 'Error loading image' }).parentElement
      ?.parentElement as HTMLElement
    expect(wrapper.className).toContain('inline-block')
    expect(wrapper.getAttribute('style')).toBeNull()
  })
})
