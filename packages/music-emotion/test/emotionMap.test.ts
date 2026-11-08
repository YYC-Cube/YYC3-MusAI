// YYC³ music-emotion — 小语情绪映射测试
import { describe, it, expect } from 'vitest'
import { emotionUIMap, getEmotionUI, getEmotionColor } from '../src/utils/emotionMap'
import type { XiaoyuEmotionType } from '../src/types/Xiaoyu.types'

const ALL_EMOTIONS: XiaoyuEmotionType[] = ['neutral', 'happy', 'anxious', 'surprised']

describe('情绪映射', () => {
  it('emotionUIMap 覆盖全部 4 种情绪', () => {
    for (const emotion of ALL_EMOTIONS) {
      expect(emotionUIMap[emotion]).toBeTruthy()
      expect(typeof emotionUIMap[emotion]).toBe('object')
    }
  })

  it('getEmotionUI 与 emotionUIMap 一致', () => {
    for (const emotion of ALL_EMOTIONS) {
      expect(getEmotionUI(emotion)).toBe(emotionUIMap[emotion])
    }
  })

  it('getEmotionColor 返回非空颜色值', () => {
    for (const emotion of ALL_EMOTIONS) {
      const color = getEmotionColor(emotion)
      expect(typeof color).toBe('string')
      expect(color.length).toBeGreaterThan(0)
    }
  })

  it('未知情绪回退到 neutral（UI 与颜色双回退）', () => {
    const ghost = 'ghost' as XiaoyuEmotionType
    expect(getEmotionUI(ghost)).toBe(emotionUIMap.neutral)
    expect(getEmotionColor(ghost)).toBe(getEmotionColor('neutral'))
  })
})
