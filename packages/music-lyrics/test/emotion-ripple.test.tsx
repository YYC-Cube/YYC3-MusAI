/**
 * @file EmotionRipple 深度测试
 * @description 通过受控 requestAnimationFrame + 假 2D 上下文覆盖涟漪/节拍/高潮/粒子分支
 */
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getCanvasPerf } from '@yyc3/music-utils'
import { EmotionRipple } from '../src'

type Ctx = ReturnType<typeof makeCtx>

function makeCtx() {
  return {
    scale: vi.fn(),
    clearRect: vi.fn(),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
  }
}

const frames: FrameRequestCallback[] = []
let nowMs = 1000
let ctx: Ctx
let contextReturn: Ctx | null
let cancelSpy: ReturnType<typeof vi.fn>

function makeRect(): DOMRect {
  return {
    width: 800,
    height: 600,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 800,
    bottom: 600,
    toJSON: () => ({}),
  } as DOMRect
}

function step(count: number, increment = 1000) {
  for (let i = 0; i < count; i++) {
    nowMs += increment
    const cb = frames.shift()
    if (!cb) return
    act(() => {
      cb(nowMs)
    })
  }
}

beforeEach(() => {
  nowMs = 1000
  frames.length = 0
  ctx = makeCtx()
  contextReturn = ctx

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => contextReturn as unknown as CanvasRenderingContext2D
  )
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue(makeRect())
  vi.spyOn(performance, 'now').mockImplementation(() => nowMs)
  vi.spyOn(Date, 'now').mockImplementation(() => nowMs)
  vi.spyOn(Math, 'random').mockReturnValue(0.5)

  cancelSpy = vi.fn()
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    frames.push(cb)
    return frames.length
  })
  vi.stubGlobal('cancelAnimationFrame', cancelSpy)

  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 2 })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('EmotionRipple 动画循环', () => {
  it('播放时按能量生成涟漪、节拍爆发与高潮粒子，并上报画布性能', () => {
    const freq = new Uint8Array(16)
    const { unmount } = render(
      <EmotionRipple emotion="happy" audioEnergy={0.8} isPlaying frequencyData={freq} />
    )
    expect(frames).toHaveLength(1)

    // 第一帧：常规涟漪 + 高能量额外涟漪
    step(1)
    // 突增低频 → 触发节拍爆发（3 圈）
    freq.fill(200)
    step(1)
    // 连续高能量 >3s → 高潮模式，持续生成粒子
    step(48)

    const perf = getCanvasPerf()
    expect(ctx.scale).toHaveBeenCalledWith(2, 2)
    expect(ctx.clearRect).toHaveBeenCalled()
    expect(ctx.fillRect).toHaveBeenCalled()
    expect(ctx.stroke).toHaveBeenCalled()
    expect(ctx.fill).toHaveBeenCalled()
    expect(perf.rippleCount).toBeGreaterThan(0)
    expect(perf.rippleCount).toBeLessThanOrEqual(60)
    expect(perf.particleCount).toBeGreaterThan(0)
    expect(perf.particleCount).toBeLessThanOrEqual(200)
    expect(perf.isClimax).toBe(true)
    expect(perf.canvasFps).toBeGreaterThan(0)

    unmount()
    expect(cancelSpy).toHaveBeenCalled()
  })

  it('能量回落、暂停与短频段数据分别走降级分支', () => {
    const { rerender } = render(<EmotionRipple emotion="energetic" audioEnergy={0.8} isPlaying />)
    step(6)
    expect(getCanvasPerf().isClimax).toBe(true)

    // 能量骤降 → 退出高潮
    frames.length = 0
    rerender(<EmotionRipple emotion="calm" audioEnergy={0.2} isPlaying />)
    step(1, 1200)
    expect(getCanvasPerf().isClimax).toBe(false)

    // 暂停 → 不再生成涟漪 / 粒子
    frames.length = 0
    rerender(<EmotionRipple emotion="neutral" audioEnergy={0.1} isPlaying={false} />)
    step(1, 1200)
    expect(getCanvasPerf().isClimax).toBe(false)

    // 频段过短 → 跳过节拍检测
    frames.length = 0
    rerender(
      <EmotionRipple
        emotion="sad"
        audioEnergy={0.5}
        isPlaying
        frequencyData={new Uint8Array(3)}
      />
    )
    step(2)
    expect(getCanvasPerf().isClimax).toBe(false)
    expect(ctx.stroke).toHaveBeenCalled()
  })

  it('Canvas 上下文不可用时安全退出', () => {
    contextReturn = null
    const { container } = render(
      <EmotionRipple emotion="happy" audioEnergy={0.5} isPlaying />
    )
    expect(container.querySelector('canvas')).not.toBeNull()
    expect(frames).toHaveLength(0)
  })

  it('未设置 devicePixelRatio 时按 1 倍缩放', () => {
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: undefined })
    const { container } = render(
      <EmotionRipple emotion="sad" audioEnergy={0} isPlaying={false} className="extra" />
    )
    expect(ctx.scale).toHaveBeenCalledWith(1, 1)
    const canvas = container.querySelector('canvas') as HTMLCanvasElement
    expect(canvas.width).toBe(800)
    expect(canvas.height).toBe(600)
    expect(canvas.className).toContain('extra')
    expect(canvas.getAttribute('aria-hidden')).toBe('true')
  })
})
