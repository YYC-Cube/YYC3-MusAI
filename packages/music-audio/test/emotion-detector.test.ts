/**
 * @file EmotionDetector 单元测试
 * @description 覆盖 NLP 情感打分、行为模式分析、情绪合成与建议生成
 */
import { describe, expect, it, vi } from 'vitest'
import EmotionDetector from '../src/EmotionDetector'

const behavior = (overrides: Partial<Record<string, number>> = {}) => ({
  clickFrequency: 2,
  dwellTime: 5,
  scrollSpeed: 10,
  typingSpeed: 30,
  ...overrides,
})

describe('EmotionDetector', () => {
  const detector = new EmotionDetector()

  describe('detectUserEmotion', () => {
    it('积极文本识别为 happy', async () => {
      const result = await detector.detectUserEmotion('今天很开心，很喜欢这首歌，great', behavior())
      expect(result.emotion.emotion).toBe('happy')
      expect(result.sentiment).toBeGreaterThan(0.3)
      expect(result.emotion.intensity).toBeGreaterThanOrEqual(0.7)
      expect(result.suggestions.length).toBeGreaterThan(0)
    })

    it('消极文本且行为急躁时识别为 angry', async () => {
      const result = await detector.detectUserEmotion(
        '太难过了，好痛苦，讨厌',
        behavior({ clickFrequency: 20 })
      )
      expect(result.sentiment).toBeLessThan(-0.3)
      expect(result.emotion.emotion).toBe('angry')
      expect(result.emotion.intensity).toBeGreaterThanOrEqual(0.8)
    })

    it('消极文本且行为平缓时识别为 sad', async () => {
      const result = await detector.detectUserEmotion('难过 伤心 痛苦', behavior())
      expect(result.emotion.emotion).toBe('sad')
      expect(result.suggestions.length).toBe(3)
    })

    it('轻度消极文本识别为 anxious', async () => {
      const result = await detector.detectUserEmotion('有点焦虑', behavior())
      expect(result.sentiment).toBeCloseTo(-0.15, 5)
      expect(result.emotion.emotion).toBe('anxious')
    })

    it('中性文本且停留较久识别为 confused', async () => {
      const result = await detector.detectUserEmotion('嗯', behavior({ dwellTime: 60 }))
      expect(result.emotion.emotion).toBe('confused')
      expect(result.emotion.intensity).toBe(0.5)
    })

    it('中性文本默认识别为 neutral', async () => {
      const result = await detector.detectUserEmotion('播放音乐', behavior())
      expect(result.emotion.emotion).toBe('neutral')
      expect(result.emotion.intensity).toBe(0.3)
      expect(result.suggestions).toEqual(['保持良好的状态。'])
    })

    it('情感分数被限制在 -1 到 1 之间', async () => {
      const positive = await detector.detectUserEmotion(
        '开心 高兴 快乐 棒 好 喜欢 爱 happy good great love',
        behavior()
      )
      expect(positive.sentiment).toBeLessThanOrEqual(1)

      const negative = await detector.detectUserEmotion(
        '难过 伤心 痛苦 坏 讨厌 恨 sad bad hate angry',
        behavior()
      )
      expect(negative.sentiment).toBeGreaterThanOrEqual(-1)
    })

    it('内部异常时回退为 neutral 且不抛错', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const broken = new EmotionDetector()
      // 传入非法行为对象触发内部异常分支
      const result = await broken.detectUserEmotion('开心', null as any)
      expect(result.emotion.emotion).toBe('neutral')
      expect(result.suggestions).toEqual([])
      spy.mockRestore()
    })
  })

  describe('getIntensityDescription', () => {
    it('按强度区间返回中文描述', () => {
      expect(detector.getIntensityDescription(0.1)).toBe('轻微')
      expect(detector.getIntensityDescription(0.4)).toBe('中等')
      expect(detector.getIntensityDescription(0.7)).toBe('强烈')
      expect(detector.getIntensityDescription(0.95)).toBe('非常强烈')
    })
  })
})
