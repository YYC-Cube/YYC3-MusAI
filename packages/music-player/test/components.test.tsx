/**
 * @file 播放器组件渲染冒烟测试
 * @description 以 SSR 方式渲染全部播放器导出组件，验证 props 契约与首屏渲染不抛错
 */
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AudioVisualizer, MediaDisplay, MobilePlayer, PlayerControls } from '../src'

const track = { id: 't1', title: '月光信号', artist: 'YYC³' }
const frequencyData = new Uint8Array(32).fill(8)
const lyrics = [
  { time: 0, text: '第一句歌词' },
  { time: 3, text: '第二句歌词', translation: 'second line' },
]
const noop = () => {}

const render = (element: React.ReactElement) => renderToString(element)

describe('music-player 组件渲染', () => {
  it('AudioVisualizer 在 circular/bars 两种模式下渲染', () => {
    expect(
      render(
        createElement(AudioVisualizer, {
          frequencyData,
          emotion: 'happy',
          isPlaying: true,
          size: 160,
          mode: 'circular',
        })
      ).length
    ).toBeGreaterThan(0)

    expect(
      render(
        createElement(AudioVisualizer, {
          frequencyData,
          emotion: 'calm',
          isPlaying: false,
          size: 120,
          mode: 'bars',
        })
      ).length
    ).toBeGreaterThan(0)
  })

  it('MediaDisplay 支持音频与视频模式', () => {
    const audio = render(
      createElement(MediaDisplay, {
        mode: 'audio',
        isPlaying: true,
        albumArtUrl: '/cover.jpg',
        frequencyData,
        emotion: 'happy',
        audioEnergy: 0.6,
        songTitle: track.title,
        artist: track.artist,
      })
    )
    expect(audio.length).toBeGreaterThan(0)

    const video = render(
      createElement(MediaDisplay, {
        mode: 'video',
        isPlaying: false,
        albumArtUrl: '/cover.jpg',
        frequencyData,
        emotion: 'sad',
        audioEnergy: 0.2,
        songTitle: track.title,
        artist: track.artist,
        videoUrl: '/demo.mp4',
      })
    )
    expect(video.length).toBeGreaterThan(0)
  })

  it('PlayerControls 渲染播放状态与曲目信息', () => {
    const html = render(
      createElement(PlayerControls, {
        isPlaying: true,
        onPlayPause: noop,
        progress: 30,
        onSeek: noop,
        duration: 240,
        mode: 'audio',
        onToggleMode: noop,
        mValue: 2,
        onLike: noop,
        volume: 0.8,
        onVolumeChange: noop,
        songTitle: track.title,
        artist: track.artist,
        onPrev: noop,
        onNext: noop,
        onPlaylistToggle: noop,
        shuffleEnabled: false,
        onShuffleToggle: noop,
        repeatMode: 'all',
        onRepeatCycle: noop,
        audioMode: 'demo',
        lyrics,
        activeEmotionFilter: null,
      })
    )
    expect(html.length).toBeGreaterThan(0)
    expect(html).toContain(track.title)
  })

  it('MobilePlayer 在展开时渲染完整控制区', () => {
    const html = render(
      createElement(MobilePlayer, {
        isOpen: true,
        onClose: noop,
        isPlaying: true,
        onPlayPause: noop,
        progress: 12,
        duration: 200,
        onSeek: noop,
        volume: 0.5,
        onVolumeChange: noop,
        songTitle: track.title,
        artist: track.artist,
        albumArt: '/cover.jpg',
        audioEnergy: 0.5,
        emotion: 'neutral',
        mValue: 1,
        onLike: noop,
        onPrev: noop,
        onNext: noop,
        shuffleEnabled: true,
        onShuffleToggle: noop,
        repeatMode: 'one',
        onRepeatCycle: noop,
        audioMode: 'file',
        onPlaylistToggle: noop,
        onCommentsToggle: noop,
        onAILyricsToggle: noop,
        onLeaderboardToggle: noop,
        onAnalyticsToggle: noop,
        lyrics,
        currentLyricText: '第一句歌词',
        frequencyData,
      })
    )
    expect(html.length).toBeGreaterThan(0)
  })

  it('MobilePlayer 关闭时不输出内容', () => {
    const html = render(
      createElement(MobilePlayer, {
        isOpen: false,
        onClose: noop,
        isPlaying: false,
        onPlayPause: noop,
        progress: 0,
        duration: 0,
        onSeek: noop,
        volume: 1,
        onVolumeChange: noop,
        songTitle: '',
        artist: '',
        albumArt: '',
        audioEnergy: 0,
        emotion: 'neutral',
        mValue: 0,
        onLike: noop,
        onPrev: noop,
        onNext: noop,
        shuffleEnabled: false,
        onShuffleToggle: noop,
        repeatMode: 'off',
        onRepeatCycle: noop,
        audioMode: 'demo',
        onPlaylistToggle: noop,
        onCommentsToggle: noop,
        onAILyricsToggle: noop,
        onLeaderboardToggle: noop,
        onAnalyticsToggle: noop,
      })
    )
    expect(html).toBe('')
  })
})
