// YYC³ music-hooks — useHaptics 触感反馈测试
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useHaptics } from '../src/useHaptics'

describe('useHaptics', () => {
  const vibrateMock = vi.fn()

  beforeEach(() => {
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      writable: true,
      value: vibrateMock,
    })
  })

  afterEach(() => {
    try {
      delete (navigator as any).vibrate
    } catch {
      // ignore
    }
  })

  it('支持的设备返回 supported=true，并按预设模式调用 vibrate', () => {
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(1000)
    const { result } = renderHook(() => useHaptics())

    expect(result.current.supported).toBe(true)

    result.current.trigger('success')
    expect(vibrateMock).toHaveBeenLastCalledWith([10, 30, 10, 30, 40])

    nowSpy.mockReturnValue(1100)
    result.current.trigger('light')
    expect(vibrateMock).toHaveBeenLastCalledWith(10)
    expect(vibrateMock).toHaveBeenCalledTimes(2)
  })

  it('未知模式回退为 10ms', () => {
    vi.spyOn(performance, 'now').mockReturnValue(2000)
    const { result } = renderHook(() => useHaptics())

    result.current.trigger('unknown-pattern' as any)
    expect(vibrateMock).toHaveBeenCalledWith(10)
  })

  it('30ms 内重复触发会被节流', () => {
    const nowSpy = vi.spyOn(performance, 'now')
    nowSpy.mockReturnValue(1000)
    const { result } = renderHook(() => useHaptics())

    result.current.vibrate(10)
    nowSpy.mockReturnValue(1010)
    result.current.vibrate(10)
    expect(vibrateMock).toHaveBeenCalledTimes(1)

    nowSpy.mockReturnValue(1040)
    result.current.vibrate(10)
    expect(vibrateMock).toHaveBeenCalledTimes(2)
  })

  it('vibrate 抛错时静默失败', () => {
    vi.spyOn(performance, 'now').mockReturnValue(5000)
    vibrateMock.mockImplementationOnce(() => {
      throw new Error('unsupported')
    })
    const { result } = renderHook(() => useHaptics())

    expect(() => result.current.vibrate(20)).not.toThrow()
  })

  it('cancel 会以 0 调用 vibrate', () => {
    vi.spyOn(performance, 'now').mockReturnValue(6000)
    const { result } = renderHook(() => useHaptics())

    result.current.cancel()
    expect(vibrateMock).toHaveBeenCalledWith(0)
  })

  it('cancel 抛错时静默失败', () => {
    vi.spyOn(performance, 'now').mockReturnValue(7000)
    vibrateMock.mockImplementationOnce(() => {
      throw new Error('boom')
    })
    const { result } = renderHook(() => useHaptics())

    expect(() => result.current.cancel()).not.toThrow()
  })

  it('不支持振动时所有 API 均为 no-op', () => {
    delete (navigator as any).vibrate
    const { result } = renderHook(() => useHaptics())

    expect(result.current.supported).toBe(false)
    result.current.trigger('heavy')
    result.current.vibrate([10, 20])
    result.current.cancel()
    expect(vibrateMock).not.toHaveBeenCalled()
  })
})
