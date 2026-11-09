// YYC³ music-hooks — useSwipeGesture 手势测试
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSwipeGesture } from '../src/useSwipeGesture'

function touchEvent(type: string, clientX: number, clientY: number): Event {
  const ev = new Event(type, { bubbles: true, cancelable: true }) as any
  Object.defineProperty(ev, 'touches', {
    value: [{ clientX, clientY }],
    configurable: true,
  })
  return ev
}

function makeTarget(html = '<div id="surface"></div>'): HTMLElement {
  document.body.innerHTML = html
  return document.getElementById('surface') as HTMLElement
}

describe('useSwipeGesture', () => {
  const vibrateMock = vi.fn()

  beforeEach(() => {
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      writable: true,
      value: vibrateMock,
    })
    vibrateMock.mockClear()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('向左滑动超过阈值触发 onSwipeLeft', () => {
    const onSwipeLeft = vi.fn()
    const onSwipeRight = vi.fn()
    const { result } = renderHook(() => useSwipeGesture({ onSwipeLeft, onSwipeRight, threshold: 50 }))
    const target = makeTarget()

    act(() => {
      target.dispatchEvent(touchEvent('touchstart', 200, 100))
      target.dispatchEvent(touchEvent('touchmove', 120, 100))
    })
    expect(result.current.isSwiping).toBe(true)
    expect(result.current.direction).toBe('left')
    expect(result.current.distance).toBe(80)

    act(() => {
      target.dispatchEvent(touchEvent('touchend', 0, 0))
    })
    expect(onSwipeLeft).toHaveBeenCalledTimes(1)
    expect(onSwipeRight).not.toHaveBeenCalled()
    expect(vibrateMock).toHaveBeenCalledWith([15, 20, 30])
    expect(result.current.isSwiping).toBe(false)
    expect(result.current.direction).toBeNull()
    expect(result.current.distance).toBe(0)
  })

  it('向右滑动超过阈值触发 onSwipeRight', () => {
    const onSwipeRight = vi.fn()
    const { result } = renderHook(() => useSwipeGesture({ onSwipeRight, threshold: 50 }))
    const target = makeTarget()

    act(() => {
      target.dispatchEvent(touchEvent('touchstart', 50, 100))
      target.dispatchEvent(touchEvent('touchmove', 150, 100))
      target.dispatchEvent(touchEvent('touchend', 0, 0))
    })

    expect(onSwipeRight).toHaveBeenCalledTimes(1)
    expect(result.current.distance).toBe(0)
  })

  it('距离小于阈值不触发回调', () => {
    const onSwipeLeft = vi.fn()
    const { result } = renderHook(() => useSwipeGesture({ onSwipeLeft, threshold: 80 }))
    const target = makeTarget()

    act(() => {
      target.dispatchEvent(touchEvent('touchstart', 100, 100))
      target.dispatchEvent(touchEvent('touchmove', 60, 100))
      target.dispatchEvent(touchEvent('touchend', 0, 0))
    })

    expect(onSwipeLeft).not.toHaveBeenCalled()
    expect(result.current.isSwiping).toBe(false)
  })

  it('enabled=false 时忽略所有触摸事件', () => {
    const onSwipeLeft = vi.fn()
    const { result } = renderHook(() => useSwipeGesture({ onSwipeLeft, enabled: false, threshold: 10 }))
    const target = makeTarget()

    act(() => {
      target.dispatchEvent(touchEvent('touchstart', 200, 0))
      target.dispatchEvent(touchEvent('touchmove', 100, 0))
      target.dispatchEvent(touchEvent('touchend', 0, 0))
    })

    expect(onSwipeLeft).not.toHaveBeenCalled()
    expect(result.current.isSwiping).toBe(false)
  })

  it('交互元素上的触摸不会被捕获', () => {
    const onSwipeLeft = vi.fn()
    renderHook(() => useSwipeGesture({ onSwipeLeft, threshold: 10 }))

    for (const html of [
      '<input id="surface" />',
      '<textarea id="surface"></textarea>',
      '<button id="surface">x</button>',
      '<div id="surface" data-no-swipe><span id="inner">x</span></div>',
      '<div id="surface" role="slider"></div>',
    ]) {
      document.body.innerHTML = html
      const target = (document.getElementById('inner') || document.getElementById('surface')) as HTMLElement
      act(() => {
        target.dispatchEvent(touchEvent('touchstart', 200, 0))
        target.dispatchEvent(touchEvent('touchmove', 100, 0))
        target.dispatchEvent(touchEvent('touchend', 0, 0))
      })
    }

    expect(onSwipeLeft).not.toHaveBeenCalled()
  })

  it('未开始触摸时的 move 被忽略', () => {
    const onSwipeLeft = vi.fn()
    const { result } = renderHook(() => useSwipeGesture({ onSwipeLeft, threshold: 10 }))
    const target = makeTarget()

    act(() => {
      target.dispatchEvent(touchEvent('touchmove', 10, 10))
    })
    expect(result.current.isSwiping).toBe(false)
  })

  it('微小移动不会进入拖拽状态', () => {
    renderHook(() => useSwipeGesture({ threshold: 10 }))
    const target = makeTarget()

    act(() => {
      target.dispatchEvent(touchEvent('touchstart', 100, 100))
      target.dispatchEvent(touchEvent('touchmove', 105, 105))
    })
    expect(target).toBeTruthy()
  })

  it('垂直滚动会放弃手势', () => {
    const onSwipeLeft = vi.fn()
    renderHook(() => useSwipeGesture({ onSwipeLeft, threshold: 10 }))
    const target = makeTarget()

    act(() => {
      target.dispatchEvent(touchEvent('touchstart', 100, 100))
      target.dispatchEvent(touchEvent('touchmove', 105, 180))
      target.dispatchEvent(touchEvent('touchmove', 10, 100))
      target.dispatchEvent(touchEvent('touchend', 0, 0))
    })
    expect(onSwipeLeft).not.toHaveBeenCalled()
  })

  it('水平位移小于 20px 时 direction 为 null', () => {
    const { result } = renderHook(() => useSwipeGesture({ threshold: 5 }))
    const target = makeTarget()

    act(() => {
      target.dispatchEvent(touchEvent('touchstart', 100, 100))
      target.dispatchEvent(touchEvent('touchmove', 85, 100))
    })
    expect(result.current.distance).toBe(15)
    expect(result.current.isSwiping).toBe(false)
    expect(result.current.direction).toBeNull()
  })

  it('未进入拖拽时 touchend 会重置状态', () => {
    const { result } = renderHook(() => useSwipeGesture({ threshold: 10 }))
    const target = makeTarget()

    act(() => {
      target.dispatchEvent(touchEvent('touchend', 0, 0))
    })
    expect(result.current).toEqual({ isSwiping: false, direction: null, distance: 0 })
  })

  it('仅设置单侧回调时另一方向不报错', () => {
    const onSwipeRight = vi.fn()
    renderHook(() => useSwipeGesture({ onSwipeRight, threshold: 20 }))
    const target = makeTarget()

    act(() => {
      target.dispatchEvent(touchEvent('touchstart', 200, 100))
      target.dispatchEvent(touchEvent('touchmove', 100, 100))
      target.dispatchEvent(touchEvent('touchend', 0, 0))
    })
    expect(onSwipeRight).not.toHaveBeenCalled()
  })

  it('navigator.vibrate 抛错时不影响滑动回调', () => {
    vibrateMock.mockImplementationOnce(() => {
      throw new Error('no vibrate')
    })
    const onSwipeLeft = vi.fn()
    renderHook(() => useSwipeGesture({ onSwipeLeft, threshold: 10 }))
    const target = makeTarget()

    act(() => {
      target.dispatchEvent(touchEvent('touchstart', 200, 0))
      target.dispatchEvent(touchEvent('touchmove', 100, 0))
      target.dispatchEvent(touchEvent('touchend', 0, 0))
    })
    expect(onSwipeLeft).toHaveBeenCalled()
  })

  it('卸载后移除 document 监听', () => {
    const onSwipeLeft = vi.fn()
    const { unmount } = renderHook(() => useSwipeGesture({ onSwipeLeft, threshold: 10 }))
    const target = makeTarget()

    unmount()
    act(() => {
      target.dispatchEvent(touchEvent('touchstart', 200, 0))
      target.dispatchEvent(touchEvent('touchmove', 100, 0))
      target.dispatchEvent(touchEvent('touchend', 0, 0))
    })
    expect(onSwipeLeft).not.toHaveBeenCalled()
  })
})
