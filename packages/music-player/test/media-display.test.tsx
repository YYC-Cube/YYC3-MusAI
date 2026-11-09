/**
 * @file MediaDisplay 分支测试
 * @description 覆盖音频/视频模式、有无视频源、五种情绪辉光、移动端/桌面端尺寸
 * 以及 resize 监听注册与清理。
 */
import { createElement } from 'react'
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MediaDisplay } from '../src'

const baseProps = {
  mode: 'audio' as const,
  isPlaying: true,
  albumArtUrl: '/cover.jpg',
  frequencyData: new Uint8Array(32).fill(12),
  emotion: 'happy' as const,
  audioEnergy: 0.6,
  songTitle: '月光信号',
  artist: 'YYC³',
}

function renderDisplay(overrides: Record<string, unknown> = {}) {
  return render(createElement(MediaDisplay, { ...baseProps, ...overrides }))
}

describe('MediaDisplay 分支渲染', () => {
  let getContextSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(null as unknown as CanvasRenderingContext2D)
  })

  afterEach(() => {
    getContextSpy.mockRestore()
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 })
  })

  it('音频模式渲染专辑封面、曲目信息与旋转黑胶', () => {
    const { container } = renderDisplay()

    const album = screen.getByAltText('Album Art') as HTMLImageElement
    expect(album.getAttribute('src')).toBe('/cover.jpg')
    expect(screen.getByText('月光信号')).toBeInTheDocument()
    expect(screen.getByText('YYC³')).toBeInTheDocument()

    // 旋转轨道圆环
    const rings = Array.from(container.querySelectorAll('div')).filter(
      (el) => el.style.borderRadius === '9999px' || el.className.includes('rounded-full')
    )
    expect(rings.length).toBeGreaterThan(0)

    // 播放态：中心轴带情绪辉光
    const spindle = Array.from(container.querySelectorAll('div')).find(
      (el) => el.style.width === '16px' && el.style.height === '16px'
    )
    expect(spindle).toBeTruthy()
    expect(spindle!.style.boxShadow).toMatch(/rgba\(255,\s*215,\s*0/)
    expect(container.querySelector('[class*="bg-yellow-500/50"]')).not.toBeNull()
  })

  it('暂停态移除辉光并隐藏封面高亮', () => {
    const { container } = renderDisplay({ isPlaying: false })

    const spindle = Array.from(container.querySelectorAll('div')).find(
      (el) => el.style.width === '16px' && el.style.height === '16px'
    )
    expect(spindle!.style.boxShadow).toBe('none')
    // 情绪背景仍然渲染
    expect(container.querySelector('[class*="bg-yellow-500/50"]')).not.toBeNull()
  })

  it('移动端 innerWidth 使用 200，resize 到桌面端后变为 380', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 500 })
    const { container } = renderDisplay()

    const canvas = container.querySelector('canvas') as HTMLCanvasElement
    expect(canvas.style.width).toBe('200px')

    act(() => {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 })
      window.dispatchEvent(new Event('resize'))
    })
    expect(canvas.style.width).toBe('380px')
  })

  it('挂载/卸载时注册并清理 resize 监听', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = renderDisplay()
    expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function))

    unmount()
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function))
  })

  it.each([
    ['happy', 'bg-yellow-500/50'],
    ['sad', 'bg-blue-600/50'],
    ['energetic', 'bg-red-500/50'],
    ['calm', 'bg-cyan-500/50'],
    ['neutral', 'bg-purple-800/50'],
  ] as const)('情绪 %s 渲染对应背景辉光', (emotion, className) => {
    const { container, unmount } = renderDisplay({ emotion })
    expect(container.querySelector(`[class*="${className}"]`)).not.toBeNull()
    unmount()
  })

  it('视频模式且提供视频源时渲染 video 并自动播放', () => {
    const { container } = renderDisplay({
      mode: 'video',
      videoUrl: '/demo.mp4',
      isPlaying: true,
      emotion: 'calm',
    })

    const video = container.querySelector('video') as HTMLVideoElement
    expect(video).not.toBeNull()
    expect(video.getAttribute('src')).toBe('/demo.mp4')
    expect(video.autoplay).toBe(true)
    expect(video.hasAttribute('controls')).toBe(true)
    expect(video.hasAttribute('loop')).toBe(true)
    // 视频模式底部仍渲染 bars 频谱
    expect(container.querySelector('canvas')).not.toBeNull()
  })

  it('视频模式无视频源时展示占位提示', () => {
    const { container } = renderDisplay({
      mode: 'video',
      videoUrl: undefined,
      isPlaying: false,
      emotion: 'sad',
    })

    expect(container.querySelector('video')).toBeNull()
    expect(container.textContent).toContain('media.videoMode')
  })
})
