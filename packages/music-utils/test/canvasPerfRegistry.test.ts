// YYC³ music-utils — Canvas 性能注册表测试（window 单例数据总线）
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getCanvasPerf, setCanvasPerf } from '../src/canvasPerfRegistry'

const REGISTRY_KEY = '__dmusic_canvas_perf__'

beforeEach(() => {
  delete (window as any)[REGISTRY_KEY]
})

afterEach(() => {
  vi.restoreAllMocks()
  delete (window as any)[REGISTRY_KEY]
})

describe('Canvas 性能注册表', () => {
  it('未写入时返回全零默认数据', () => {
    expect(getCanvasPerf()).toEqual({
      rippleCount: 0,
      particleCount: 0,
      drawTimeMs: 0,
      canvasFps: 0,
      isClimax: false,
      lastUpdate: 0,
    })
  })

  it('setCanvasPerf 合并默认值并写入 lastUpdate', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000)
    setCanvasPerf({ rippleCount: 3, isClimax: true })

    expect(getCanvasPerf()).toEqual({
      rippleCount: 3,
      particleCount: 0,
      drawTimeMs: 0,
      canvasFps: 0,
      isClimax: true,
      lastUpdate: 1700000000000,
    })
    expect((window as any)[REGISTRY_KEY].lastUpdate).toBe(1700000000000)
  })

  it('多次写入保留未覆盖字段并更新其余字段', () => {
    setCanvasPerf({ rippleCount: 1, particleCount: 20, canvasFps: 60 })
    vi.spyOn(Date, 'now').mockReturnValue(1700000001000)
    setCanvasPerf({ drawTimeMs: 4.5, rippleCount: 2 })

    const perf = getCanvasPerf()
    expect(perf).toMatchObject({
      rippleCount: 2,
      particleCount: 20,
      drawTimeMs: 4.5,
      canvasFps: 60,
      lastUpdate: 1700000001000,
    })
  })

  it('写入的数据与返回值共享同一引用', () => {
    setCanvasPerf({ canvasFps: 30 })
    expect(getCanvasPerf()).toBe((window as any)[REGISTRY_KEY])
  })
})
