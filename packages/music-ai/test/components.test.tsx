/**
 * @file AI 组件渲染冒烟测试
 * @description 以 SSR 渲染 AI 助手/歌词生成/创作工作台/MV 创作器，验证渲染契约
 */
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DEMO_PLAYLIST } from '@yyc3/music-data'
import { AIAssistant, AILyricsGenerator, CreationStudio, MVCreator } from '../src'

const track = DEMO_PLAYLIST[0]
const noop = () => {}
const frequencyData = new Uint8Array(32)

describe('music-ai 组件渲染', () => {
  it('AIAssistant 渲染无提示的空闲态', () => {
    const html = renderToString(
      createElement(AIAssistant, {
        activeTips: [],
        onDismissTip: noop,
        onExecuteAction: noop,
        isListening: false,
        onToggleListening: noop,
        voiceSupported: true,
        voiceFeedback: '',
        voiceHistory: [],
        sessionInsight: '',
        isPlaying: false,
        audioEnergy: 0,
      })
    )
    expect(html.length).toBeGreaterThan(0)
  })

  it('AIAssistant 渲染提示与语音历史', () => {
    const html = renderToString(
      createElement(AIAssistant, {
        activeTips: [
          {
            id: 'tip-1',
            message: '试试语音点歌',
            category: 'voice',
            priority: 'high',
            icon: '🎵',
            actionLabel: '播放',
            actionKey: 'play',
            expiresAt: Date.now() + 60_000,
          },
        ],
        onDismissTip: noop,
        onExecuteAction: noop,
        isListening: true,
        onToggleListening: noop,
        voiceSupported: true,
        voiceFeedback: '正在聆听…',
        voiceHistory: [{ transcript: '播放月光信号', intent: 'play', timestamp: Date.now() } as any],
        sessionInsight: '你今天偏爱舒缓曲风',
        isPlaying: true,
        audioEnergy: 0.7,
      })
    )
    expect(html).toContain('试试语音点歌')
  })

  it('AILyricsGenerator 展开时渲染创作表单', () => {
    const html = renderToString(
      createElement(AILyricsGenerator, { isOpen: true, onClose: noop, onCreateTrack: noop })
    )
    expect(html.length).toBeGreaterThan(0)
    expect(renderToString(createElement(AILyricsGenerator, { isOpen: false, onClose: noop }))).toBe('')
  })

  it('CreationStudio 展开时渲染工作台', () => {
    const html = renderToString(
      createElement(CreationStudio, {
        isOpen: true,
        onClose: noop,
        onCreateTrack: noop,
        playlist: DEMO_PLAYLIST,
        currentTrackIndex: 0,
        user: { id: 'u1', name: 'Tester' },
        starPower: 500,
        onStarPowerUpdate: noop,
      })
    )
    expect(html.length).toBeGreaterThan(0)
  })

  it('MVCreator 展开时渲染 MV 创作器', () => {
    const html = renderToString(
      createElement(MVCreator, {
        isOpen: true,
        onClose: noop,
        track,
        isPlaying: true,
        audioEnergy: 0.6,
        frequencyData,
        currentTime: 20,
        emotion: 'happy',
        customLyrics: ['自定义歌词'],
      })
    )
    expect(html.length).toBeGreaterThan(0)
  })
})
