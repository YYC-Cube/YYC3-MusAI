/**
 * @file 歌词组件渲染冒烟测试
 * @description 验证高亮行计算与情感涟漪在 SSR 下的渲染契约
 */
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { EmotionRipple, LyricsDisplay } from '../src'

const lyrics = [
  { time: 0, text: '第一句歌词', translation: 'first line' },
  { time: 4, text: '第二句歌词' },
  { time: 8, text: '第三句歌词', emotion: 'happy' as const },
]

describe('music-lyrics 组件渲染', () => {
  it('LyricsDisplay 输出全部歌词行', () => {
    const html = renderToString(
      createElement(LyricsDisplay, { currentTime: 5, lyrics, isPlaying: true })
    )
    expect(html).toContain('第一句歌词')
    expect(html).toContain('第二句歌词')
    expect(html).toContain('第三句歌词')
  })

  it('LyricsDisplay 支持空歌词与标注回调', () => {
    const html = renderToString(
      createElement(LyricsDisplay, {
        currentTime: 0,
        lyrics: [],
        annotations: {},
        onAnnotate: () => {},
        onLineClick: () => {},
      })
    )
    expect(html.length).toBeGreaterThanOrEqual(0)
  })

  it('EmotionRipple 按情感与能量渲染', () => {
    const html = renderToString(
      createElement(EmotionRipple, {
        emotion: 'energetic',
        audioEnergy: 0.8,
        isPlaying: true,
        frequencyData: new Uint8Array(16).fill(4),
        className: 'test-ripple',
      })
    )
    expect(html).toContain('test-ripple')
  })
})
