/**
 * @file AudioVisualizer Canvas 绘制测试
 * @description mock canvas 2D 上下文，验证 circular / bars 两种模式的真实绘制调用、
 * 播放/暂停分支、频谱平滑与空上下文降级。
 */
import { createElement } from 'react'
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AudioVisualizer } from '../src'

function createMockContext() {
  const gradient = { addColorStop: vi.fn() }
  const ctx = {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    createRadialGradient: vi.fn(() => gradient),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    shadowColor: '',
    shadowBlur: 0,
  }
  return { ctx, gradient }
}

function renderVisualizer(props: Record<string, unknown>) {
  return render(createElement(AudioVisualizer, props))
}

describe('AudioVisualizer Canvas 绘制', () => {
  let getContextSpy: ReturnType<typeof vi.spyOn>
  let ctx: ReturnType<typeof createMockContext>['ctx']
  let gradient: ReturnType<typeof createMockContext>['gradient']

  beforeEach(() => {
    const mock = createMockContext()
    ctx = mock.ctx
    gradient = mock.gradient
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => ctx as unknown as CanvasRenderingContext2D)
  })

  afterEach(() => {
    getContextSpy.mockRestore()
  })

  it('circular + 播放态绘制外发光、频谱柱与内外圆环', () => {
    const data = new Uint8Array(64).fill(200)
    const { container } = renderVisualizer({
      frequencyData: data,
      emotion: 'happy',
      isPlaying: true,
      size: 160,
      mode: 'circular',
    })

    const canvas = container.querySelector('canvas') as HTMLCanvasElement
    expect(canvas).not.toBeNull()
    expect(canvas.width).toBe(160)
    expect(canvas.height).toBe(160)
    expect(canvas.style.width).toBe('160px')

    expect(getContextSpy).toHaveBeenCalledWith('2d')
    expect(ctx.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0)
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 160, 160)

    // 播放态才画径向发光渐变
    expect(ctx.createRadialGradient).toHaveBeenCalledTimes(1)
    expect(gradient.addColorStop).toHaveBeenCalledTimes(3)
    // 64 根柱 + 外发光弧 + 内环 + 外环
    expect(ctx.save).toHaveBeenCalledTimes(64)
    expect(ctx.restore).toHaveBeenCalledTimes(64)
    expect(ctx.quadraticCurveTo).toHaveBeenCalledTimes(128)
    expect(ctx.fill).toHaveBeenCalledTimes(65)
    expect(ctx.stroke).toHaveBeenCalledTimes(2)
    expect(ctx.arc).toHaveBeenCalledTimes(3)
    // 高能量柱 (>0.55) 触发阴影发光
    expect(ctx.shadowColor).toMatch(/^#[0-9a-f]{6}$/)
    expect(ctx.shadowBlur).toBe(0)
  })

  it('circular + 暂停态不绘制发光，柱高固定为 2', () => {
    const data = new Uint8Array(32).fill(255)
    const { container } = renderVisualizer({
      frequencyData: data,
      emotion: 'calm',
      isPlaying: false,
      size: 100,
      mode: 'circular',
    })

    expect(container.querySelector('canvas')?.width).toBe(100)
    expect(ctx.createRadialGradient).not.toHaveBeenCalled()
    // 暂停态不会设置阴影颜色
    expect(ctx.shadowColor).toBe('')
    expect(ctx.save).toHaveBeenCalledTimes(32)
    expect(ctx.fill).toHaveBeenCalledTimes(32)
  })

  it('bars + 播放态按 32 根柱绘制双层矩形', () => {
    const data = new Uint8Array(32).fill(120)
    const { container } = renderVisualizer({
      frequencyData: data,
      emotion: 'energetic',
      isPlaying: true,
      size: 120,
      mode: 'bars',
    })

    expect(container.querySelector('canvas')?.width).toBe(120)
    // 每根柱主矩形 + 倒影矩形
    expect(ctx.fillRect).toHaveBeenCalledTimes(64)
    expect(ctx.arc).not.toHaveBeenCalled()
    expect(ctx.createRadialGradient).not.toHaveBeenCalled()
    const firstRect = ctx.fillRect.mock.calls[0]
    expect(firstRect[0]).toBeCloseTo(1)
    expect(firstRect[2]).toBeCloseTo(120 / 32 - 2)
  })

  it('bars + 暂停态仍按频谱长度绘制双层矩形', () => {
    renderVisualizer({
      frequencyData: new Uint8Array(16).fill(80),
      emotion: 'sad',
      isPlaying: false,
      size: 90,
      mode: 'bars',
    })

    // 16 根柱 × 2（主矩形 + 倒影）
    expect(ctx.fillRect).toHaveBeenCalledTimes(32)
  })

  it('未传 mode 时默认使用 circular', () => {
    renderVisualizer({
      frequencyData: new Uint8Array(8).fill(10),
      emotion: 'neutral',
      isPlaying: true,
      size: 80,
    })

    expect(ctx.save).toHaveBeenCalledTimes(8)
    expect(ctx.fillRect).not.toHaveBeenCalled()
  })

  it('同长度频谱重渲染走平滑分支，长度变化时重置缓冲', () => {
    const { rerender } = renderVisualizer({
      frequencyData: new Uint8Array(32).fill(60),
      emotion: 'happy',
      isPlaying: true,
      size: 100,
      mode: 'bars',
    })
    expect(ctx.fillRect).toHaveBeenCalledTimes(64)

    // 相同 numBars：不重置 smoothedRef，只做插值
    rerender(
      createElement(AudioVisualizer, {
        frequencyData: new Uint8Array(32).fill(180),
        emotion: 'happy',
        isPlaying: true,
        size: 100,
        mode: 'bars',
      })
    )
    expect(ctx.fillRect).toHaveBeenCalledTimes(128)

    // 长度变短：numBars 重算为 16，缓冲重建
    rerender(
      createElement(AudioVisualizer, {
        frequencyData: new Uint8Array(16).fill(90),
        emotion: 'happy',
        isPlaying: true,
        size: 100,
        mode: 'bars',
      })
    )
    expect(ctx.fillRect).toHaveBeenCalledTimes(128 + 32)
  })

  it('五种情绪都能完成绘制', () => {
    const emotions = ['happy', 'sad', 'energetic', 'calm', 'neutral'] as const
    const { rerender } = renderVisualizer({
      frequencyData: new Uint8Array(64).fill(160),
      emotion: 'happy',
      isPlaying: true,
      size: 64,
      mode: 'circular',
    })

    for (const emotion of emotions.slice(1)) {
      rerender(
        createElement(AudioVisualizer, {
          frequencyData: new Uint8Array(64).fill(160),
          emotion,
          isPlaying: true,
          size: 64,
          mode: 'circular',
        })
      )
    }

    expect(ctx.save).toHaveBeenCalledTimes(64 * 5)
  })

  it('canvas 上下文不可用时安全降级', () => {
    getContextSpy.mockImplementation(() => null)
    const { container } = renderVisualizer({
      frequencyData: new Uint8Array(32).fill(20),
      emotion: 'neutral',
      isPlaying: true,
      size: 50,
    })
    expect(container.querySelector('canvas')).not.toBeNull()
    expect(ctx.clearRect).not.toHaveBeenCalled()
  })

  it('devicePixelRatio 大于 1 时按倍数缩放画布', () => {
    const original = window.devicePixelRatio
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 2 })
    try {
      act(() => {
        renderVisualizer({
          frequencyData: new Uint8Array(8).fill(1),
          emotion: 'neutral',
          isPlaying: true,
          size: 50,
          mode: 'bars',
        })
      })
      expect(ctx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0)
      const canvas = document.querySelector('canvas') as HTMLCanvasElement
      expect(canvas.width).toBe(100)
      expect(canvas.height).toBe(100)
    } finally {
      Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: original })
    }
  })
})
