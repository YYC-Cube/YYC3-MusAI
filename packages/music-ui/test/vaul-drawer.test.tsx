/**
 * @file DrawerPanel（vaul-drawer）测试（W7 收编组件补测）
 * @description 注意：该组件 W7 收编时已核实实际基于 @radix-ui/react-dialog（非 vaul 包）。
 *              覆盖受控开关、标题与关闭按钮（X icon → DialogPrimitive.Close）、
 *              Escape 关闭、四个 side 方位样式、className 透传、无 title 边界。
 *              jsdom 兼容处理：Radix Dialog/Portal/DismissableLayer 需要
 *              matchMedia/hasPointerCapture/releasePointerCapture 守卫式 stub。
 */
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'

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


import { createElement } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DrawerPanel } from '../src'

function setup(over: { open?: boolean; side?: 'top' | 'right' | 'bottom' | 'left'; title?: string; className?: string } = {}) {
  const onOpenChange = vi.fn()
  const utils = render(
    createElement(DrawerPanel, {
      open: true,
      onOpenChange,
      title: '播放队列',
      children: createElement('p', null, '抽屉内容'),
      ...over,
    })
  )
  return { onOpenChange, ...utils }
}

describe('DrawerPanel 开关', () => {
  it('open=false 时不渲染 dialog', () => {
    setup({ open: false })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('抽屉内容')).not.toBeInTheDocument()
  })

  it('open=true 渲染 Portal 内容：遮罩、标题、children', () => {
    setup()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('播放队列')).toBeInTheDocument()
    expect(screen.getByText('抽屉内容')).toBeInTheDocument()
    // 遮罩层（Portal 内）
    expect(document.querySelector('.backdrop-blur-sm')).not.toBeNull()
    expect(screen.getByRole('dialog').getAttribute('data-state')).toBe('open')
  })

  it('点击标题栏关闭按钮（X icon）触发 onOpenChange(false)', async () => {
    const user = userEvent.setup()
    const { onOpenChange } = setup()
    const close = document.querySelector('svg.lucide-x')!
    expect(close).toBeInTheDocument()
    await user.click(close)
    expect(onOpenChange).toHaveBeenCalledWith(false)
    // 组件为受控模式：父组件不翻转 open 时内容仍在（data-state 变化由 Radix 管理）
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('Escape 触发 onOpenChange(false)', async () => {
    const user = userEvent.setup()
    const { onOpenChange } = setup()
    await user.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('翻转为 open=false 后内容卸载', async () => {
    const { rerender } = render(
      createElement(DrawerPanel, {
        open: true,
        onOpenChange: vi.fn(),
        title: '播放队列',
        children: createElement('p', null, '抽屉内容'),
      })
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    rerender(
      createElement(DrawerPanel, {
        open: false,
        onOpenChange: vi.fn(),
        title: '播放队列',
        children: createElement('p', null, '抽屉内容'),
      })
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.queryByText('抽屉内容')).not.toBeInTheDocument()
  })
})

describe('DrawerPanel 方位样式', () => {
  it.each(['top', 'right', 'bottom', 'left'] as const)('%s 侧应用对应定位类', (side) => {
    const { unmount } = setup({ side })
    const dialog = screen.getByRole('dialog')
    const sideClass = {
      top: 'rounded-b-xl',
      right: 'border-l',
      bottom: 'rounded-t-xl',
      left: 'border-r',
    }[side]
    expect(dialog.className).toContain(sideClass)
    unmount()
  })

  it('默认 side=right', () => {
    setup({ side: undefined })
    expect(screen.getByRole('dialog').className).toContain('md:w-[420px]')
    expect(screen.getByRole('dialog').className).toContain('border-l')
  })

  it('className 透传到 Content', () => {
    setup({ className: 'custom-drawer' })
    expect(screen.getByRole('dialog')).toHaveClass('custom-drawer')
  })
})

describe('DrawerPanel 无 title 边界', () => {
  it('无 title 时不渲染标题与关闭按钮，children 照常渲染', () => {
    setup({ title: undefined })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByText('播放队列')).not.toBeInTheDocument()
    expect(document.querySelector('svg.lucide-x')).toBeNull()
    expect(screen.getByText('抽屉内容')).toBeInTheDocument()
  })
})
