/**
 * @file MobilePlayer 交互测试
 * @description 覆盖展开/关闭、进度与音量滑块、喜欢、播放控制、快捷入口、
 * 语言切换与麦克风入口等真实交互。
 */
import { createElement } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@yyc3/music-hooks'
import { MobilePlayer } from '../src'

const baseProps = {
  isOpen: true,
  isPlaying: true,
  progress: 12,
  duration: 200,
  volume: 0.3,
  songTitle: '月光信号',
  artist: 'YYC³',
  albumArt: '/cover.jpg',
  audioEnergy: 0.5,
  emotion: 'happy' as const,
  mValue: 7,
  shuffleEnabled: false,
  repeatMode: 'off' as const,
  audioMode: 'file' as const,
  lyrics: [],
  currentLyricText: '第一句歌词',
  currentLyricTranslation: 'first lyric',
  frequencyData: new Uint8Array(8).fill(30),
}

function makeHandlers() {
  return {
    onClose: vi.fn(),
    onPlayPause: vi.fn(),
    onSeek: vi.fn(),
    onVolumeChange: vi.fn(),
    onLike: vi.fn(),
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onShuffleToggle: vi.fn(),
    onRepeatCycle: vi.fn(),
    onPlaylistToggle: vi.fn(),
    onCommentsToggle: vi.fn(),
    onAILyricsToggle: vi.fn(),
    onLeaderboardToggle: vi.fn(),
    onAnalyticsToggle: vi.fn(),
  }
}

function setup(overrides: Record<string, unknown> = {}) {
  const handlers = makeHandlers()
  const utils = render(
    createElement(MobilePlayer, { ...baseProps, ...handlers, ...overrides } as never)
  )
  return { handlers, ...utils }
}

function findButtonByIcon(container: HTMLElement, icon: string): HTMLButtonElement {
  const svg = container.querySelector(`.lucide-${icon}`)
  const button = svg?.closest('button')
  if (!button) throw new Error(`未找到图标 ${icon} 对应的按钮`)
  return button as HTMLButtonElement
}

describe('MobilePlayer 渲染', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      null as unknown as CanvasRenderingContext2D
    )
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('关闭时不渲染任何内容', () => {
    setup({ isOpen: false })
    expect(screen.queryByText('月光信号')).toBeNull()
  })

  it('展开时渲染封面、歌词、翻译与 HD 标记', () => {
    const { container } = setup()

    const cover = container.querySelector('img[src="/cover.jpg"]')
    expect(cover).not.toBeNull()
    expect(screen.getByText('月光信号')).toBeInTheDocument()
    expect(screen.getByText('YYC³')).toBeInTheDocument()
    expect(screen.getByText('第一句歌词')).toBeInTheDocument()
    expect(screen.getByText('first lyric')).toBeInTheDocument()
    expect(screen.getByText('HD')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('0:12')).toBeInTheDocument()
    expect(screen.getByText('3:20')).toBeInTheDocument()

    const emoIcon = container.querySelector('.lucide-smile') as SVGElement
    expect(emoIcon).not.toBeNull()
  })

  it('demo 音频模式显示 SYNTH 且无翻译时只渲染原文', () => {
    setup({ audioMode: 'demo', currentLyricTranslation: undefined })
    expect(screen.getByText('SYNTH')).toBeInTheDocument()
    expect(screen.getByText('第一句歌词')).toBeInTheDocument()
    expect(screen.queryByText('first lyric')).toBeNull()
  })

  it('音量图标按音量档位切换', () => {
    const { container, unmount } = setup({ volume: 0 })
    expect(container.querySelector('.lucide-volume-x')).not.toBeNull()
    unmount()

    const { container: c2 } = setup({ volume: 0.2 })
    expect(c2.querySelector('.lucide-volume-1')).not.toBeNull()

    const { container: c3 } = setup({ volume: 1 })
    expect(c3.querySelector('.lucide-volume-2')).not.toBeNull()
  })

  it('播放/暂停按钮在两种状态下切换图标', () => {
    const { container, unmount } = setup({ isPlaying: true })
    expect(container.querySelector('.lucide-pause')).not.toBeNull()
    unmount()

    const { container: c2 } = setup({ isPlaying: false })
    expect(c2.querySelector('.lucide-play')).not.toBeNull()
  })

  it('循环 one 模式显示角标', () => {
    const { container } = setup({ repeatMode: 'one', shuffleEnabled: true })
    const repeat = findButtonByIcon(container, 'repeat')
    expect(repeat.textContent).toContain('1')
    expect(repeat.className).toContain('text-purple-400')
    expect(findButtonByIcon(container, 'shuffle').className).toContain('text-purple-400')
  })
})

describe('MobilePlayer 交互', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      null as unknown as CanvasRenderingContext2D
    )
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('点击关闭按钮触发 onClose', async () => {
    const user = userEvent.setup()
    const { handlers, container } = setup()
    await user.click(findButtonByIcon(container, 'chevron-down'))
    expect(handlers.onClose).toHaveBeenCalledTimes(1)
  })

  it('播放/上一首/下一首/随机/循环触发对应回调', async () => {
    const user = userEvent.setup()
    const { handlers, container } = setup()
    await user.click(findButtonByIcon(container, 'pause'))
    await user.click(findButtonByIcon(container, 'skip-back'))
    await user.click(findButtonByIcon(container, 'skip-forward'))
    await user.click(findButtonByIcon(container, 'shuffle'))
    await user.click(findButtonByIcon(container, 'repeat'))

    expect(handlers.onPlayPause).toHaveBeenCalledTimes(1)
    expect(handlers.onPrev).toHaveBeenCalledTimes(1)
    expect(handlers.onNext).toHaveBeenCalledTimes(1)
    expect(handlers.onShuffleToggle).toHaveBeenCalledTimes(1)
    expect(handlers.onRepeatCycle).toHaveBeenCalledTimes(1)
  })

  it('点击喜欢按钮触发 onLike', async () => {
    const user = userEvent.setup()
    const { handlers } = setup()
    await user.click(screen.getByText('7').closest('button') as HTMLElement)
    expect(handlers.onLike).toHaveBeenCalledTimes(1)
  })

  it('进度滑块键盘调整触发 onSeek', () => {
    const { handlers } = setup()
    const progressThumb = screen
      .getAllByRole('slider')
      .find((el) => el.getAttribute('aria-valuenow') === '12')!
    fireEvent.keyDown(progressThumb, { key: 'ArrowRight' })
    expect(handlers.onSeek).toHaveBeenCalledTimes(1)
    expect(handlers.onSeek.mock.calls[0][0]).toBeCloseTo(12.5, 5)
  })

  it('展开音量面板并键盘调整触发 onVolumeChange', async () => {
    const user = userEvent.setup()
    const { handlers, container } = setup()
    expect(screen.getAllByRole('slider')).toHaveLength(1)

    await user.click(findButtonByIcon(container, 'volume-1'))
    expect(screen.getAllByRole('slider')).toHaveLength(2)

    const volumeThumb = screen
      .getAllByRole('slider')
      .find((el) => el.getAttribute('aria-valuenow') === '0.3')!
    fireEvent.keyDown(volumeThumb, { key: 'ArrowRight' })
    expect(handlers.onVolumeChange).toHaveBeenCalled()
    expect(handlers.onVolumeChange.mock.calls[0][0]).toBeCloseTo(0.31, 5)

    // 再次点击收起
    await user.click(findButtonByIcon(container, 'volume-1'))
    await waitFor(() => expect(screen.getAllByRole('slider')).toHaveLength(1))
  })

  it('快捷入口点击执行动作并关闭播放器', async () => {
    const user = userEvent.setup()
    const { handlers } = setup()

    await user.click(screen.getByText('列表'))
    await user.click(screen.getByText('评论'))
    await user.click(screen.getByText('创作'))
    await user.click(screen.getByText('排行'))
    await user.click(screen.getByText('分析'))

    expect(handlers.onPlaylistToggle).toHaveBeenCalledTimes(1)
    expect(handlers.onCommentsToggle).toHaveBeenCalledTimes(1)
    expect(handlers.onAILyricsToggle).toHaveBeenCalledTimes(1)
    expect(handlers.onLeaderboardToggle).toHaveBeenCalledTimes(1)
    expect(handlers.onAnalyticsToggle).toHaveBeenCalledTimes(1)
    expect(handlers.onClose).toHaveBeenCalledTimes(5)
  })

  it('麦克风入口保持面板开启并高亮监听态', async () => {
    const user = userEvent.setup()
    const handlers = makeHandlers()
    const onMicToggle = vi.fn()
    const { container } = render(
      createElement(MobilePlayer, {
        ...baseProps,
        ...handlers,
        onMicToggle,
        isListening: true,
      } as never)
    )

    const voiceButton = screen.getByText('语音').closest('button') as HTMLElement
    expect(voiceButton.className).toContain('text-purple-400')
    await user.click(voiceButton)

    expect(onMicToggle).toHaveBeenCalledTimes(1)
    expect(handlers.onClose).not.toHaveBeenCalled()
    expect(container.querySelector('.lucide-mic')).not.toBeNull()
  })

  it('未传 onMicToggle 时不渲染麦克风入口', () => {
    setup()
    expect(screen.queryByText('语音')).toBeNull()
  })

  it('英文语言下快捷入口展示英文标签', () => {
    localStorage.setItem('dmusic-prefs', JSON.stringify({ lang: 'en' }))
    const handlers = makeHandlers()
    render(
      createElement(
        I18nProvider,
        null,
        createElement(MobilePlayer, {
          ...baseProps,
          ...handlers,
          onMicToggle: vi.fn(),
        } as never)
      )
    )

    expect(screen.getByText('List')).toBeInTheDocument()
    expect(screen.getByText('Chat')).toBeInTheDocument()
    expect(screen.getByText('AI')).toBeInTheDocument()
    expect(screen.getByText('Rank')).toBeInTheDocument()
    expect(screen.getByText('Data')).toBeInTheDocument()
    expect(screen.getByText('Voice')).toBeInTheDocument()
  })
})
