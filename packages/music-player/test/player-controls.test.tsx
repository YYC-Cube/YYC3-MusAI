/**
 * @file PlayerControls 完整交互测试
 * @description 覆盖全部按钮、进度/音量滑块、情感筛选、快捷键面板、时间轴与无障碍名称，
 * 断言真实回调调用与 DOM 状态。
 */
import { createElement } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PlayerControls } from '../src'

const lyrics = [
  { time: 0, text: '第一句', emotion: 'happy' },
  { time: 4, text: '第二句' },
  { time: 100, text: '第三句', emotion: 'energetic' },
]

function makeHandlers() {
  return {
    onPlayPause: vi.fn(),
    onSeek: vi.fn(),
    onToggleMode: vi.fn(),
    onLike: vi.fn(),
    onVolumeChange: vi.fn(),
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onPlaylistToggle: vi.fn(),
    onShuffleToggle: vi.fn(),
    onRepeatCycle: vi.fn(),
    onEmotionFilter: vi.fn(),
  }
}

const requiredProps = {
  isPlaying: true,
  progress: 30,
  duration: 240,
  mValue: 2,
  volume: 0.8,
  songTitle: '月光信号',
  artist: 'YYC³',
  shuffleEnabled: false,
  repeatMode: 'all' as const,
  audioMode: 'demo' as const,
  lyrics,
  activeEmotionFilter: null,
  mode: 'audio' as const,
}

function setup(overrides: Record<string, unknown> = {}) {
  const handlers = makeHandlers()
  const utils = render(
    createElement(PlayerControls, { ...requiredProps, ...handlers, ...overrides } as never)
  )
  return { handlers, ...utils }
}

function findButtonByIcon(container: HTMLElement, icon: string): HTMLButtonElement {
  const svg = container.querySelector(`.lucide-${icon}`)
  const button = svg?.closest('button')
  if (!button) throw new Error(`未找到图标 ${icon} 对应的按钮`)
  return button as HTMLButtonElement
}

describe('PlayerControls 渲染状态', () => {
  it('渲染封面、HD 标记、曲目信息与播放态无障碍名称', () => {
    setup({
      albumArt: '/cover.jpg',
      audioMode: 'file',
      audioEnergy: 0.8,
      isPlaying: true,
      mValue: 2,
    })

    const cover = document.querySelector('img[src="/cover.jpg"]')
    expect(cover).not.toBeNull()
    expect(screen.getByText('HD')).toBeInTheDocument()
    expect(screen.getByText('月光信号')).toBeInTheDocument()
    expect(screen.getByText('YYC³')).toBeInTheDocument()
    expect(screen.getByText('M❤️ 2')).toBeInTheDocument()

    const playBtn = screen.getByRole('button', { name: /暂停 \/ Pause/ })
    expect(playBtn).toHaveAttribute('aria-pressed', 'true')
    expect(playBtn.style.boxShadow).toContain('rgba(255')

    expect(screen.getByRole('toolbar', { name: /音乐播放控制/ })).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: '0:30 / 4:00' })).toBeInTheDocument()
  })

  it('暂停 + SYNTH 音频 + 未点赞状态', () => {
    setup({ isPlaying: false, audioMode: 'demo', mValue: 0, emotion: 'sad' })

    expect(screen.getByText('SYNTH')).toBeInTheDocument()
    expect(screen.getByText('M♡ 0')).toBeInTheDocument()
    const playBtn = screen.getByRole('button', { name: /播放 \/ Play/ })
    expect(playBtn).toHaveAttribute('aria-pressed', 'false')

    const heart = document.querySelector('.lucide-heart') as SVGElement
    expect(heart.getAttribute('class')).toContain('text-pink-400')
    expect(heart.getAttribute('class')).not.toContain('fill-pink-500')

    // 有 emotion 时情感筛选触发器展示对应图标
    expect(document.querySelector('.lucide-frown')).not.toBeNull()
  })

  it('未传 emotion 时情感筛选触发器回退为 Sparkles', () => {
    setup({ emotion: undefined })
    const trigger = screen.getByTitle('Emotion Filter')
    expect(trigger.querySelector('.lucide-sparkles')).not.toBeNull()
  })

  it('随机/循环状态通过 aria 与样式反映', () => {
    setup({ shuffleEnabled: true, repeatMode: 'one' })
    const shuffle = screen.getByRole('button', { name: /Shuffle: ON/ })
    expect(shuffle).toHaveAttribute('aria-pressed', 'true')
    expect(shuffle.className).toContain('text-blue-400')

    const repeat = screen.getByRole('button', { name: /Repeat: one/ })
    expect(repeat.className).toContain('text-blue-400')
    expect(repeat.textContent).toContain('1')
  })

  it('循环关闭时按钮为弱化样式', () => {
    setup({ repeatMode: 'off' })
    const repeat = screen.getByRole('button', { name: /Repeat: off/ })
    expect(repeat.className).toContain('text-white/30')
  })

  it('时间显示按 mm:ss 格式化', () => {
    setup({ progress: 65, duration: 125 })
    expect(screen.getAllByText('1:05').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('2:05').length).toBeGreaterThanOrEqual(1)
  })
})

describe('PlayerControls 核心控制', () => {
  it('播放/暂停、上一首、下一首触发回调', async () => {
    const user = userEvent.setup()
    const { handlers } = setup()
    await user.click(screen.getByRole('button', { name: /暂停 \/ Pause/ }))
    await user.click(screen.getByRole('button', { name: /上一首 \/ Previous track/ }))
    await user.click(screen.getByRole('button', { name: /下一首 \/ Next track/ }))
    expect(handlers.onPlayPause).toHaveBeenCalledTimes(1)
    expect(handlers.onPrev).toHaveBeenCalledTimes(1)
    expect(handlers.onNext).toHaveBeenCalledTimes(1)
  })

  it('随机、循环、列表按钮触发回调', async () => {
    const user = userEvent.setup()
    const { handlers } = setup()
    await user.click(screen.getByRole('button', { name: /随机播放 \/ Shuffle/ }))
    await user.click(screen.getByRole('button', { name: /循环模式 \/ Repeat/ }))
    await user.click(screen.getByTitle('player.playlist'))
    expect(handlers.onShuffleToggle).toHaveBeenCalledTimes(1)
    expect(handlers.onRepeatCycle).toHaveBeenCalledTimes(1)
    expect(handlers.onPlaylistToggle).toHaveBeenCalledTimes(1)
  })

  it('进度滑块键盘调整触发 onSeek', () => {
    const { handlers } = setup()
    const thumb = screen.getByRole('slider', { name: '0:30 / 4:00' })
    fireEvent.keyDown(thumb, { key: 'ArrowRight' })
    expect(handlers.onSeek).toHaveBeenCalledTimes(1)
    expect(handlers.onSeek.mock.calls[0][0]).toBeCloseTo(30.5, 5)

    fireEvent.keyDown(thumb, { key: 'ArrowLeft' })
    expect(handlers.onSeek).toHaveBeenCalledTimes(2)
    expect(handlers.onSeek.mock.calls[1][0]).toBeCloseTo(29.5, 5)
  })

  it('喜欢按钮触发 onLike 并渲染粒子动画，600ms 后复位', async () => {
    const { handlers, container } = setup({ mValue: 0 })
    const likeBtn = screen.getByRole('button', { name: /M❤️值/ })

    fireEvent.click(likeBtn)
    expect(handlers.onLike).toHaveBeenCalledTimes(1)
    expect(likeBtn.querySelectorAll('.rounded-full').length).toBe(8)

    // 600ms 后定时器复位动画状态，粒子退出
    await waitFor(
      () => expect(likeBtn.querySelectorAll('.rounded-full').length).toBeLessThan(8),
      { timeout: 3000 }
    )
    expect(container).toBeTruthy()
  })
})

describe('PlayerControls 音量', () => {
  it('悬停展开音量滑块并键盘调整', async () => {
    const { handlers, container } = setup({ volume: 0.8 })
    expect(screen.getAllByRole('slider')).toHaveLength(1)

    const volumeBtn = findButtonByIcon(container, 'volume-2')
    const wrapper = volumeBtn.parentElement as HTMLElement
    fireEvent.mouseEnter(wrapper)
    expect(screen.getAllByRole('slider')).toHaveLength(2)

    const volumeThumb = screen
      .getAllByRole('slider')
      .find((el) => el.getAttribute('aria-valuenow') === '0.8')!
    fireEvent.keyDown(volumeThumb, { key: 'ArrowRight' })
    expect(handlers.onVolumeChange).toHaveBeenCalled()
    expect(handlers.onVolumeChange.mock.calls[0][0]).toBeCloseTo(0.81, 5)

    fireEvent.mouseLeave(wrapper)
    await waitFor(() => expect(screen.getAllByRole('slider')).toHaveLength(1))
  })

  it('音量大于 0 时点击图标静音为 0', async () => {
    const user = userEvent.setup()
    const { handlers, container } = setup({ volume: 0.8 })
    await user.click(findButtonByIcon(container, 'volume-2'))
    expect(handlers.onVolumeChange).toHaveBeenCalledWith(0)
  })

  it('静音态点击图标恢复为 0.7', async () => {
    const user = userEvent.setup()
    const { handlers, container } = setup({ volume: 0 })
    expect(container.querySelector('.lucide-volume-x')).not.toBeNull()
    await user.click(findButtonByIcon(container, 'volume-x'))
    expect(handlers.onVolumeChange).toHaveBeenCalledWith(0.7)
  })

  it('低音量使用 Volume1 图标', () => {
    const { container } = setup({ volume: 0.3 })
    expect(container.querySelector('.lucide-volume-1')).not.toBeNull()
  })
})

describe('PlayerControls 音频/视频切换', () => {
  it('音频模式下点击视频按钮切换，重复点击音频不触发', async () => {
    const user = userEvent.setup()
    const { handlers, container } = setup({ mode: 'audio' })
    await user.click(findButtonByIcon(container, 'video'))
    expect(handlers.onToggleMode).toHaveBeenCalledTimes(1)
    await user.click(findButtonByIcon(container, 'music'))
    expect(handlers.onToggleMode).toHaveBeenCalledTimes(1)
  })

  it('视频模式下点击音频按钮切换，重复点击视频不触发', async () => {
    const user = userEvent.setup()
    const { handlers, container } = setup({ mode: 'video' })
    await user.click(findButtonByIcon(container, 'music'))
    expect(handlers.onToggleMode).toHaveBeenCalledTimes(1)
    await user.click(findButtonByIcon(container, 'video'))
    expect(handlers.onToggleMode).toHaveBeenCalledTimes(1)
  })
})

describe('PlayerControls 工具栏', () => {
  it('点击快捷键按钮展开并收起快捷键面板', async () => {
    const user = userEvent.setup()
    const { container } = setup()
    const toggle = screen.getByTitle('player.keyboardShortcuts')

    await user.click(toggle)
    expect(screen.getByText('Space')).toBeInTheDocument()
    expect(screen.getByText('player.playPause')).toBeInTheDocument()

    await user.click(toggle)
    // 退出动画完成后面板移除
    await waitFor(() => expect(container.textContent).not.toContain('player.seek'))
  })

  it('未传可选工具栏回调时不渲染对应按钮', () => {
    setup()
    expect(screen.queryByTitle('header.community')).toBeNull()
    expect(screen.queryByTitle('player.comments')).toBeNull()
    expect(screen.queryByTitle('player.aiLyrics')).toBeNull()
    expect(screen.queryByTitle('player.leaderboard')).toBeNull()
    expect(screen.queryByTitle('player.analytics')).toBeNull()
  })

  it('传入可选工具栏回调时点击分别触发', async () => {
    const user = userEvent.setup()
    const handlers = makeHandlers()
    const optional = {
      onCommunityToggle: vi.fn(),
      onCommentsToggle: vi.fn(),
      onAILyricsToggle: vi.fn(),
      onLeaderboardToggle: vi.fn(),
      onAnalyticsToggle: vi.fn(),
    }
    render(
      createElement(PlayerControls, {
        ...requiredProps,
        ...handlers,
        ...optional,
      } as never)
    )

    await user.click(screen.getByTitle('header.community'))
    await user.click(screen.getByTitle('player.comments'))
    await user.click(screen.getByTitle('player.aiLyrics'))
    await user.click(screen.getByTitle('player.leaderboard'))
    await user.click(screen.getByTitle('player.analytics'))

    expect(optional.onCommunityToggle).toHaveBeenCalledTimes(1)
    expect(optional.onCommentsToggle).toHaveBeenCalledTimes(1)
    expect(optional.onAILyricsToggle).toHaveBeenCalledTimes(1)
    expect(optional.onLeaderboardToggle).toHaveBeenCalledTimes(1)
    expect(optional.onAnalyticsToggle).toHaveBeenCalledTimes(1)
  })
})

describe('PlayerControls 情感筛选', () => {
  it('展开面板并选择情绪触发 onEmotionFilter', async () => {
    const user = userEvent.setup()
    const { handlers } = setup({ emotion: 'happy' })
    await user.click(screen.getByTitle('Emotion Filter'))

    expect(screen.getByText('player.emotion')).toBeInTheDocument()
    await user.click(screen.getByTitle('player.happy'))
    expect(handlers.onEmotionFilter).toHaveBeenCalledWith('happy')
    await waitFor(() => expect(screen.queryByTitle('player.happy')).toBeNull())
  })

  it('已激活的情绪再次点击传 null 并高亮', async () => {
    const user = userEvent.setup()
    const { handlers } = setup({ emotion: 'happy', activeEmotionFilter: 'happy' })

    const trigger = screen.getByTitle('Emotion Filter')
    expect(trigger.className).toContain('text-yellow-400')

    await user.click(trigger)
    const active = screen.getByTitle('player.happy')
    expect(active.className).toContain('bg-white/15')
    await user.click(active)
    expect(handlers.onEmotionFilter).toHaveBeenCalledWith(null)
  })

  it('点击遮罩关闭面板', async () => {
    const user = userEvent.setup()
    const { container } = setup()
    await user.click(screen.getByTitle('Emotion Filter'))
    expect(screen.getByText('player.emotion')).toBeInTheDocument()

    const overlay = container.querySelector('[class*="fixed"][class*="inset-0"]') as HTMLElement
    expect(overlay).not.toBeNull()
    await user.click(overlay)
    await waitFor(() => expect(container.textContent).not.toContain('player.emotion'))
  })

  it('未传 onEmotionFilter 时点击情绪也不抛错', async () => {
    const user = userEvent.setup()
    const handlers = makeHandlers()
    const { onEmotionFilter: _omit, ...rest } = handlers
    render(createElement(PlayerControls, { ...requiredProps, ...rest } as never))

    await user.click(screen.getByTitle('Emotion Filter'))
    await user.click(screen.getByTitle('player.sad'))
    await waitFor(() => expect(screen.queryByTitle('player.sad')).toBeNull())
  })
})

describe('PlayerControls 情感时间轴', () => {
  it('根据歌词与播放进度绘制时间轴片段', () => {
    const { container } = setup({ progress: 200, duration: 240 })
    const segments = container.querySelectorAll('[style*="background-color"]')
    // 3 段底色 + 已播放片段
    expect(segments.length).toBeGreaterThanOrEqual(3)
  })

  it('未知情绪回退到中性色', () => {
    const { container } = setup({
      progress: 10,
      duration: 240,
      lyrics: [{ time: 0, text: 'x', emotion: 'unknown' }],
    })
    expect(container.querySelectorAll('[style*="background-color"]').length).toBeGreaterThanOrEqual(1)
  })

  it('duration 为 0 时不绘制时间轴', () => {
    const { container } = setup({ duration: 0, progress: 0 })
    expect(container.querySelectorAll('[style*="background-color"]')).toHaveLength(0)
  })

  it('无歌词或空歌词时不绘制时间轴', () => {
    const { container: c1 } = setup({ lyrics: undefined })
    expect(c1.querySelectorAll('[style*="background-color"]')).toHaveLength(0)

    const { container: c2 } = setup({ lyrics: [] })
    expect(c2.querySelectorAll('[style*="background-color"]')).toHaveLength(0)
  })
})
