// YYC³ music-hooks — useResponsive 断点测试
import { describe, it, expect, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useResponsive } from '../src/useResponsive'

function setViewport(width: number, height = 800) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width })
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: height })
}

function resizeTo(width: number, height = 800) {
  act(() => {
    setViewport(width, height)
    window.dispatchEvent(new Event('resize'))
  })
}

describe('useResponsive', () => {
  afterEach(() => setViewport(1200))

  it('默认断点下桌面端判定正确', () => {
    setViewport(1280)
    const { result } = renderHook(() => useResponsive())
    expect(result.current.width).toBe(1280)
    expect(result.current.isDesktop).toBe(true)
    expect(result.current.isTablet).toBe(false)
    expect(result.current.isMobile).toBe(false)
  })

  it('平板区间为 [768, 1024)', () => {
    setViewport(900)
    const { result } = renderHook(() => useResponsive())
    expect(result.current.isTablet).toBe(true)
    expect(result.current.isMobile).toBe(false)
    expect(result.current.isDesktop).toBe(false)
  })

  it('小于 768 判定为移动端', () => {
    setViewport(600)
    const { result } = renderHook(() => useResponsive())
    expect(result.current.isMobile).toBe(true)
  })

  it('窗口 resize 后更新并同步高度', () => {
    setViewport(1280)
    const { result } = renderHook(() => useResponsive())
    resizeTo(500, 700)
    expect(result.current.width).toBe(500)
    expect(result.current.height).toBe(700)
    expect(result.current.isMobile).toBe(true)
  })

  it('支持自定义断点', () => {
    setViewport(700)
    const { result } = renderHook(() => useResponsive({ mobileMax: 640, tabletMax: 1100 }))
    expect(result.current.isTablet).toBe(true)
    expect(result.current.isMobile).toBe(false)
  })

  it('卸载后不再响应 resize', () => {
    setViewport(1280)
    const { result, unmount } = renderHook(() => useResponsive())
    unmount()
    resizeTo(400)
    expect(result.current.width).toBe(1280)
  })
})
