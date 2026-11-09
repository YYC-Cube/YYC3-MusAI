/**
 * @file PlayerControls 交互测试
 * @description 验证播放/切歌/喜欢/随机/循环等控制按钮真实触发回调
 */
import { createElement } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PlayerControls } from '../src'

const lyrics = [
  { time: 0, text: '第一句' },
  { time: 4, text: '第二句' },
]

function setup(overrides: Record<string, unknown> = {}) {
  const handlers = {
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
  }
  render(
    createElement(PlayerControls, {
      isPlaying: true,
      progress: 30,
      duration: 240,
      mode: 'audio',
      mValue: 2,
      volume: 0.8,
      songTitle: '月光信号',
      artist: 'YYC³',
      shuffleEnabled: false,
      repeatMode: 'all',
      audioMode: 'demo',
      lyrics,
      activeEmotionFilter: null,
      ...handlers,
      ...overrides,
    })
  )
  return handlers
}

describe('PlayerControls 交互', () => {
  it('点击播放/暂停触发 onPlayPause', async () => {
    const user = userEvent.setup()
    const handlers = setup()
    await user.click(screen.getByRole('button', { name: /暂停 \/ Pause/ }))
    expect(handlers.onPlayPause).toHaveBeenCalledTimes(1)
  })

  it('暂停态显示播放按钮', () => {
    setup({ isPlaying: false })
    expect(screen.getByRole('button', { name: /播放 \/ Play/ })).toBeInTheDocument()
  })

  it('上一首/下一首分别触发对应回调', async () => {
    const user = userEvent.setup()
    const handlers = setup()
    await user.click(screen.getByRole('button', { name: /上一首 \/ Previous track/ }))
    await user.click(screen.getByRole('button', { name: /下一首 \/ Next track/ }))
    expect(handlers.onPrev).toHaveBeenCalledTimes(1)
    expect(handlers.onNext).toHaveBeenCalledTimes(1)
  })

  it('喜欢按钮触发 onLike', async () => {
    const user = userEvent.setup()
    const handlers = setup()
    await user.click(screen.getByRole('button', { name: /M❤️值/ }))
    expect(handlers.onLike).toHaveBeenCalledTimes(1)
  })

  it('随机与循环按钮触发对应回调', async () => {
    const user = userEvent.setup()
    const handlers = setup()
    await user.click(screen.getByRole('button', { name: /随机播放 \/ Shuffle/ }))
    await user.click(screen.getByRole('button', { name: /循环模式 \/ Repeat/ }))
    expect(handlers.onShuffleToggle).toHaveBeenCalledTimes(1)
    expect(handlers.onRepeatCycle).toHaveBeenCalledTimes(1)
  })

  it('工具栏具备可访问名称', () => {
    setup()
    expect(screen.getByRole('toolbar', { name: /音乐播放控制/ })).toBeInTheDocument()
  })
})
