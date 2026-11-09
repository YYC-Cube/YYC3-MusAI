/**
 * @file MVCreator 画布与交互测试
 * @description 使用 2D 上下文替身逐帧覆盖五种视觉主题、歌词换行、频谱与截图/全屏
 */
import { act, createElement } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@yyc3/music-hooks'
import { DEMO_PLAYLIST } from '@yyc3/music-data'
import { MVCreator } from '../src'

const track = DEMO_PLAYLIST[0]

let ctx: Record<string, any>
let frameCb: FrameRequestCallback | null = null

function makeCtx() {
  const gradient = { addColorStop: vi.fn() }
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    globalAlpha: 1,
    shadowColor: '',
    shadowBlur: 0,
    fillRect: vi.fn(),
    createRadialGradient: vi.fn(() => gradient),
    createLinearGradient: vi.fn(() => gradient),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 100 })),
  }
}

function runFrame() {
  act(() => {
    frameCb?.(0)
  })
}

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    isOpen: true,
    onClose: vi.fn(),
    track,
    isPlaying: true,
    audioEnergy: 0.6,
    frequencyData: new Uint8Array(32).fill(200),
    currentTime: 20,
    emotion: 'happy',
    customLyrics: null,
    onHaptic: vi.fn(),
    ...overrides,
  }
}

describe('MVCreator 画布渲染', () => {
  beforeEach(() => {
    frameCb = null
    ctx = makeCtx()
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      frameCb = cb
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never)
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 640,
      height: 360,
      top: 0,
      left: 0,
      right: 640,
      bottom: 360,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect)
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,aa')
  })

  it('渲染状态信息与作品歌词，并绘制当前歌词', async () => {
    render(
      createElement(
        MVCreator,
        baseProps({ customLyrics: ['作品第一句', '作品第二句'], currentTime: 0 })
      )
    )

    expect(screen.getByText('MV 创作')).toBeInTheDocument()
    expect(screen.getByText('作品歌词')).toBeInTheDocument()
    expect(screen.getByText('播放中')).toBeInTheDocument()
    expect(screen.getByText(`${track.title} — ${track.artist}`)).toBeInTheDocument()

    runFrame()
    expect(ctx.fillText).toHaveBeenCalledWith('作品第一句', expect.any(Number), expect.any(Number))
    expect(ctx.fillText).toHaveBeenCalledWith(track.title, 20, 28)
    expect(ctx.fillRect).toHaveBeenCalled()
  })

  it('使用曲目歌词并绘制翻译行', () => {
    const lyricTrack = {
      ...track,
      duration: 120,
      lyrics: [
        { time: 0, text: 'hello world', translation: '你好世界' },
        { time: 30, text: 'second line' },
      ],
    }
    render(createElement(MVCreator, baseProps({ track: lyricTrack, currentTime: 0 })))

    runFrame()
    expect(ctx.fillText).toHaveBeenCalledWith('hello world', expect.any(Number), expect.any(Number))
    expect(ctx.fillText).toHaveBeenCalledWith('你好世界', expect.any(Number), expect.any(Number))
  })

  it('遍历五种主题并切换歌词显示', async () => {
    const viewer = userEvent.setup()
    const onHaptic = vi.fn()
    render(createElement(MVCreator, baseProps({ onHaptic })))

    for (const label of ['霓虹脉冲', '极光幻境', '水墨流韵', '赛博都市', '星空漫游']) {
      await viewer.click(screen.getByText(label).closest('button')!)
      runFrame()
    }
    expect(onHaptic).toHaveBeenCalledTimes(5)
    expect(ctx.ellipse).toHaveBeenCalled()
    expect(ctx.createLinearGradient).toHaveBeenCalled()
    expect(ctx.stroke).toHaveBeenCalled()

    const lyricsBtn = screen.getByText('歌词').closest('button')!
    const currentLyric = [...track.lyrics].reverse().find((line) => line.time <= 20)!
    await viewer.click(lyricsBtn)
    ctx.fillText.mockClear()
    runFrame()
    const hiddenTexts = ctx.fillText.mock.calls.map((call: unknown[]) => call[0])
    expect(hiddenTexts).not.toContain(currentLyric.text)

    await viewer.click(lyricsBtn)
    runFrame()
    expect(ctx.fillText).toHaveBeenCalled()
  })

  it('长歌词按词换行绘制', () => {
    ctx.measureText.mockReturnValue({ width: 9999 })
    render(
      createElement(
        MVCreator,
        baseProps({ customLyrics: ['alpha beta gamma'], currentTime: 0 })
      )
    )

    runFrame()
    const texts = ctx.fillText.mock.calls.map((call: unknown[]) => call[0])
    expect(texts).toContain('alpha')
    expect(texts).toContain('beta')
    expect(texts).toContain('gamma')
  })

  it('调节视觉强度且不越界', async () => {
    const viewer = userEvent.setup()
    const { container } = render(createElement(MVCreator, baseProps()))

    const bar = container.querySelector('[style*="width: 70%"]') as HTMLElement
    expect(bar).toBeTruthy()

    const container2 = screen.getByText('歌词').closest('div')!.parentElement!
    const buttons = Array.from(container2.querySelectorAll('button'))
    const minus = buttons.find((b) => b.querySelector('.lucide-minus'))!
    const plus = buttons.find((b) => b.querySelector('.lucide-plus'))!

    await viewer.click(plus)
    await viewer.click(plus)
    expect((container.querySelector('[style*="width: 100%"]') as HTMLElement)).toBeTruthy()

    for (let i = 0; i < 6; i += 1) await viewer.click(minus)
    expect((container.querySelector('[style*="width: 20%"]') as HTMLElement)).toBeTruthy()
  })

  it('截图下载并触发成功触感', async () => {
    const viewer = userEvent.setup()
    const onHaptic = vi.fn()
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(createElement(MVCreator, baseProps({ onHaptic })))

    await viewer.click(screen.getByTitle('截图'))
    expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledWith('image/png')
    expect(anchorClick).toHaveBeenCalled()
    expect(onHaptic).toHaveBeenCalledWith('success')
  })

  it('进入全屏并在已有全屏元素时退出', async () => {
    const viewer = userEvent.setup()
    const onHaptic = vi.fn()
    const requestFullscreen = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(HTMLCanvasElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen,
    })
    const exitFullscreen = vi.fn()
    Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exitFullscreen })
    const { container } = render(createElement(MVCreator, baseProps({ onHaptic })))

    await viewer.click(screen.getByTitle('全屏'))
    expect(requestFullscreen).toHaveBeenCalled()
    expect(onHaptic).toHaveBeenCalledWith('medium')

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: container.querySelector('canvas'),
    })
    await viewer.click(screen.getByTitle('全屏'))
    expect(exitFullscreen).toHaveBeenCalled()
    delete (document as any).fullscreenElement
  })

  it('点击头部关闭按钮与遮罩均触发 onClose', async () => {
    const viewer = userEvent.setup()
    const onClose = vi.fn()
    const { container } = render(createElement(MVCreator, baseProps({ onClose })))

    await viewer.click(screen.getAllByRole('button')[0])
    expect(onClose).toHaveBeenCalledTimes(1)
    await viewer.click(container.querySelector('.fixed.inset-0')!)
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('暂停、空频谱与零时长曲目也能渲染', () => {
    const pausedTrack = { ...track, duration: 0, lyrics: [] }
    render(
      createElement(
        MVCreator,
        baseProps({
          track: pausedTrack,
          isPlaying: false,
          frequencyData: new Uint8Array(0),
          customLyrics: ['唯一一句'],
          currentTime: 5,
        })
      )
    )

    expect(screen.getByText('已暂停')).toBeInTheDocument()
    runFrame()
    // duration 为 0 时自定义歌词时间间隔回退为 10 秒
    expect(ctx.fillText).toHaveBeenCalledWith('唯一一句', expect.any(Number), expect.any(Number))
    expect(ctx.fillText).toHaveBeenCalledWith('0:05', expect.any(Number), expect.any(Number))
  })

  it('isOpen 为 false 时不渲染画布', async () => {
    const { container } = render(createElement(MVCreator, baseProps({ isOpen: false })))
    expect(container.querySelector('canvas')).toBeNull()
    await waitFor(() => expect(frameCb).toBeNull())
  })

  it('高 DPI 屏下按两倍尺寸初始化画布', () => {
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 2 })
    const { container } = render(createElement(MVCreator, baseProps()))
    const canvas = container.querySelector('canvas')!
    expect(canvas.width).toBe(1280)
    expect(canvas.height).toBe(720)
    runFrame()
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 1 })
  })

  it('无法获取 2D 上下文时渲染循环安全退出', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null as never)
    render(createElement(MVCreator, baseProps()))
    runFrame()
    expect(ctx.fillRect).not.toHaveBeenCalled()
  })

  it('长时间运行会回收粒子并处理边界环绕', async () => {
    const viewer = userEvent.setup()
    render(createElement(MVCreator, baseProps()))
    await viewer.click(screen.getByText('霓虹脉冲').closest('button')!)
    for (let i = 0; i < 320; i += 1) runFrame()
    expect(ctx.fillRect).toHaveBeenCalled()
    expect(ctx.arc).toHaveBeenCalled()
  })

  it('换行时单个单词未超宽会继续拼接到当前行', () => {
    ctx.measureText.mockImplementation((value: string) =>
      value && value.includes(' ') ? { width: 9999 } : { width: 10 }
    )
    render(
      createElement(MVCreator, baseProps({ customLyrics: ['alpha beta gamma'], currentTime: 0 }))
    )

    runFrame()
    const texts = ctx.fillText.mock.calls.map((call: unknown[]) => call[0])
    expect(texts).toContain('alpha')
    expect(texts).toContain('beta')
    expect(texts).toContain('gamma')
  })

  it('英文模式渲染英文标题、状态与控制项', async () => {
    const viewer = userEvent.setup()
    localStorage.setItem('dmusic-prefs', JSON.stringify({ lang: 'en' }))
    render(
      createElement(
        I18nProvider,
        null,
        createElement(MVCreator, baseProps({ customLyrics: ['English line'] }))
      )
    )

    expect(screen.getByText('MV Creator')).toBeInTheDocument()
    expect(screen.getByText('Work Lyrics')).toBeInTheDocument()
    expect(screen.getByText('Playing')).toBeInTheDocument()
    expect(screen.getByText('Lyrics')).toBeInTheDocument()
    expect(screen.getByText('Starfield')).toBeInTheDocument()
    expect(screen.getByText('Cyber City')).toBeInTheDocument()
    expect(screen.getByTitle('Screenshot')).toBeInTheDocument()
    expect(screen.getByTitle('Fullscreen')).toBeInTheDocument()

    await viewer.click(screen.getByText('Neon Pulse').closest('button')!)
    runFrame()
    expect(ctx.fillRect).toHaveBeenCalled()
    localStorage.removeItem('dmusic-prefs')
  })
})
