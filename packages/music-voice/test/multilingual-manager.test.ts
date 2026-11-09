/**
 * @file MultilingualManager 单元测试
 * @description 覆盖语言注册、偏好持久化、语言检测、语音性别识别与统计能力
 */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { MultilingualManager } from '../src/MultilingualManager'

describe('MultilingualManager', () => {
  let manager: MultilingualManager

  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    manager = new MultilingualManager()
  })

  afterEach(() => {
    manager.destroy()
    vi.restoreAllMocks()
  })

  describe('初始化与配置', () => {
    it('默认当前语言为 zh-CN，且支持 7 种语言', () => {
      expect(manager.getCurrentLanguage()).toBe('zh-CN')
      expect(manager.getSupportedLanguages()).toHaveLength(7)
      expect(manager.getSupportedLanguages().map((l) => l.code)).toContain('ja-JP')
    })

    it('注册 12 种语言元数据，其中阿拉伯语不支持 TTS', () => {
      const all = manager.getAllLanguages()
      expect(all).toHaveLength(12)
      expect(manager.getLanguageInfo('ar-SA')?.voiceSupport).toBe(false)
      expect(manager.getLanguageInfo('zh-CN')?.recognitionSupport).toBe(true)
    })

    it('自定义配置覆盖默认值', () => {
      const custom = new MultilingualManager({
        defaultLanguage: 'en-US',
        autoDetect: false,
        saveUserPreference: false,
      })
      expect(custom.getCurrentLanguage()).toBe('en-US')
      expect(custom.autoSwitchLanguage('你好世界')).toBe(false)
      custom.destroy()
    })

    it('从 localStorage 恢复用户语言偏好', () => {
      localStorage.setItem('voice_language_preference', 'ja-JP')
      const restored = new MultilingualManager()
      expect(restored.getCurrentLanguage()).toBe('ja-JP')
      restored.destroy()
    })

    it('未知语言返回 null', () => {
      expect(manager.getLanguageInfo('xx-XX')).toBeNull()
    })
  })

  describe('setLanguage', () => {
    it('支持的语言切换成功并写入 localStorage', () => {
      expect(manager.setLanguage('en-US')).toBe(true)
      expect(manager.getCurrentLanguage()).toBe('en-US')
      expect(localStorage.getItem('voice_language_preference')).toBe('en-US')
    })

    it('不支持的语言切换失败且保持原语言', () => {
      expect(manager.setLanguage('xx-XX')).toBe(false)
      expect(manager.getCurrentLanguage()).toBe('zh-CN')
    })

    it('切换时派发 language-changed 事件并携带新旧语言', () => {
      const listener = vi.fn()
      manager.on('language-changed', listener)
      manager.setLanguage('ko-KR')
      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener.mock.calls[0][0]).toMatchObject({
        oldLanguage: 'zh-CN',
        newLanguage: 'ko-KR',
      })
    })
  })

  describe('detectLanguage', () => {
    it('简体中文文本识别为 zh-CN', () => {
      const result = manager.detectLanguage('今天天气很好')
      expect(result.language).toBe('zh-CN')
      expect(result.confidence).toBeGreaterThan(0.9)
      expect(result.details.method).toBe('character-analysis')
    })

    it('包含繁体字时识别为 zh-TW', () => {
      const result = manager.detectLanguage('我們都會學習')
      expect(result.language).toBe('zh-TW')
    })

    it('英文文本识别为 en-US', () => {
      const result = manager.detectLanguage('hello world this is a music test')
      expect(result.language).toBe('en-US')
      expect(result.confidence).toBeGreaterThan(0.8)
    })

    it('日文假名识别为 ja-JP', () => {
      expect(manager.detectLanguage('こんにちは').language).toBe('ja-JP')
    })

    it('韩文识别为 ko-KR', () => {
      expect(manager.detectLanguage('안녕하세요').language).toBe('ko-KR')
    })

    it('空文本回退默认语言，置信度 0.3', () => {
      const result = manager.detectLanguage('')
      expect(result.language).toBe('zh-CN')
      expect(result.confidence).toBe(0.3)
      expect(result.details).toEqual({ method: 'default' })
    })
  })

  describe('autoSwitchLanguage', () => {
    it('高置信度检测触发自动切换', () => {
      expect(manager.autoSwitchLanguage('안녕하세요 반갑습니다')).toBe(true)
      expect(manager.getCurrentLanguage()).toBe('ko-KR')
    })

    it('检测结果与当前语言相同时不切换', () => {
      expect(manager.autoSwitchLanguage('你好')).toBe(false)
      expect(manager.getCurrentLanguage()).toBe('zh-CN')
    })
  })

  describe('TTS 语音管理', () => {
    it('添加语音并按名称推断性别', () => {
      manager.addTTSVoice('en-US', {
        voiceURI: 'voice-1',
        name: 'Female English',
        localService: false,
      })
      manager.addTTSVoice('en-US', {
        voiceURI: 'voice-2',
        name: 'Male English',
        localService: false,
      })
      manager.addTTSVoice('en-US', {
        voiceURI: 'voice-3',
        name: 'System Voice',
        localService: false,
      })

      const voices = manager.getVoicesForLanguage('en-US')
      expect(voices).toHaveLength(3)
      expect(voices.map((v) => v.gender)).toEqual(['female', 'male', 'neutral'])
    })

    it('重复 voiceURI 不会重复注册', () => {
      const voice = { voiceURI: 'dup', name: 'Voice', localService: true }
      manager.addTTSVoice('fr-FR', voice)
      manager.addTTSVoice('fr-FR', voice)
      expect(manager.getVoicesForLanguage('fr-FR')).toHaveLength(1)
    })

    it('未知语言的语音注册被忽略', () => {
      manager.addTTSVoice('xx-XX', { voiceURI: 'a', name: 'a', localService: true })
      expect(manager.getVoicesForLanguage('xx-XX')).toEqual([])
    })

    it('推荐语音优先级：本地服务 > 女声 > 首个', () => {
      manager.addTTSVoice('de-DE', { voiceURI: 'remote-female', name: 'Female', localService: false })
      manager.addTTSVoice('de-DE', { voiceURI: 'local-male', name: 'Male', localService: true })
      expect(manager.getRecommendedVoice('de-DE')).toBe('local-male')

      const noLocal = new MultilingualManager({ saveUserPreference: false })
      noLocal.addTTSVoice('de-DE', { voiceURI: 'remote-male', name: 'Male', localService: false })
      noLocal.addTTSVoice('de-DE', { voiceURI: 'remote-female', name: 'Female', localService: false })
      expect(noLocal.getRecommendedVoice('de-DE')).toBe('remote-female')
      noLocal.destroy()
    })

    it('无可用语音时推荐结果为 null', () => {
      expect(manager.getRecommendedVoice('es-ES')).toBeNull()
    })
  })

  describe('检测历史与统计', () => {
    it('检测历史累计并按语言聚合统计', () => {
      manager.detectLanguage('你好')
      manager.detectLanguage('你好')
      manager.detectLanguage('hello world music test')

      const history = manager.getDetectionHistory()
      expect(history).toHaveLength(3)

      const stats = manager.getLanguageStatistics()
      expect(stats[0]).toMatchObject({ language: 'zh-CN', count: 2 })
      expect(stats[0].averageConfidence).toBeCloseTo(1, 5)
      expect(stats.map((s) => s.language)).toContain('en-US')
    })

    it('检测历史最多保留 100 条', () => {
      for (let i = 0; i < 105; i += 1) manager.detectLanguage('你好')
      expect(manager.getDetectionHistory()).toHaveLength(100)
    })
  })

  describe('事件与销毁', () => {
    it('off 可移除监听器', () => {
      const listener = vi.fn()
      manager.on('language-changed', listener)
      manager.off('language-changed', listener)
      manager.setLanguage('es-ES')
      expect(listener).not.toHaveBeenCalled()
    })

    it('destroy 清空历史与监听器', () => {
      const listener = vi.fn()
      manager.on('language-changed', listener)
      manager.detectLanguage('你好')
      manager.destroy()
      expect(manager.getDetectionHistory()).toEqual([])
      manager.setLanguage('en-US')
      expect(listener).not.toHaveBeenCalled()
    })
  })
})
