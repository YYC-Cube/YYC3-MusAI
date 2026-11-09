/**
 * @file SpeechSynthesisEngine 单元测试
 * @description 局部 mock window.speechSynthesis 与 SpeechSynthesisUtterance，覆盖初始化、
 *              语音选择、朗读/队列、暂停恢复停止、事件、历史与销毁。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SpeechSynthesisEngine } from '../src/SpeechSynthesisEngine'
import { createVoices, installSynthesisEnv, type SynthesisEnv } from './helpers/voice-env'

describe('SpeechSynthesisEngine', () => {
  let env: SynthesisEnv
  let engine: SpeechSynthesisEngine

  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    env = installSynthesisEnv()
    engine = new SpeechSynthesisEngine()
  })

  afterEach(() => {
    try {
      engine.destroy()
    } catch {
      // 浏览器不支持语音合成的用例中全局 API 已移除，销毁时忽略
    }
    env.restore()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('初始化', () => {
    it('浏览器不支持时返回 false 并派发 initialization 错误', async () => {
      env.restore()
      const errors: any[] = []
      engine.on('error', (e) => errors.push(e))

      await expect(engine.initialize()).resolves.toBe(false)
      expect(errors[0]).toMatchObject({ type: 'initialization', error: '浏览器不支持语音合成API' })
      expect(engine.getHistory()).toEqual([])
    })

    it('初始化成功时加载语音、选择默认语音并派发 initialized', async () => {
      const initialized = vi.fn()
      engine.on('initialized', initialized)

      await expect(engine.initialize()).resolves.toBe(true)

      const status = engine.getStatus()
      expect(status.isInitialized).toBe(true)
      expect(status.config.voice).toBe('zh-local')
      expect(initialized).toHaveBeenCalledTimes(1)
      expect(initialized.mock.calls[0][0]).toMatchObject({ voices: 4 })
      expect(engine.getVoices()).toHaveLength(4)
    })

    it('重复初始化直接返回 true', async () => {
      await expect(engine.initialize()).resolves.toBe(true)
      await expect(engine.initialize()).resolves.toBe(true)
      expect(env.synthesis.getVoices).toHaveBeenCalledTimes(1)
    })

    it('已配置语音时初始化不覆盖', async () => {
      const local = new SpeechSynthesisEngine({ voice: 'fr-remote' })
      await expect(local.initialize()).resolves.toBe(true)
      expect(local.getStatus().config.voice).toBe('fr-remote')
      local.destroy()
    })

    it('语音列表异步加载：voiceschanged 后完成初始化', async () => {
      env.setVoices([])
      const pending = engine.initialize()
      expect(env.hasVoicesListener()).toBe(true)

      env.setVoices(createVoices())
      env.emitVoicesChanged()

      await expect(pending).resolves.toBe(true)
      expect(env.hasVoicesListener()).toBe(false)
      expect(engine.getVoices()).toHaveLength(4)
      expect(engine.getStatus().config.voice).toBe('zh-local')
    })

    it('语音加载超时后仍完成初始化且无默认语音', async () => {
      vi.useFakeTimers()
      env.setVoices([])
      const pending = engine.initialize()

      await vi.advanceTimersByTimeAsync(5000)
      await expect(pending).resolves.toBe(true)

      expect(env.hasVoicesListener()).toBe(false)
      expect(engine.getVoices()).toEqual([])
      expect(engine.getStatus().config.voice).toBe('')
      expect(console.warn).toHaveBeenCalledWith('语音加载超时')
    })

    it('默认语音选择：同语言无本地方言时取首个匹配', async () => {
      env.setVoices([
        { voiceURI: 'zh-remote-a', name: 'Remote A', lang: 'zh-CN', localService: false, default: false },
        { voiceURI: 'zh-remote-b', name: 'Remote B', lang: 'zh-CN', localService: false, default: false },
      ])
      const local = new SpeechSynthesisEngine()
      await expect(local.initialize()).resolves.toBe(true)
      expect(local.getStatus().config.voice).toBe('zh-remote-a')
      local.destroy()
    })

    it('默认语音选择：语言不匹配时回退英语，再回退首个语音', async () => {
      env.setVoices([
        { voiceURI: 'fr-only', name: 'French', lang: 'fr-FR', localService: false, default: false },
        { voiceURI: 'en-first', name: 'English', lang: 'en-US', localService: false, default: false },
      ])
      const german = new SpeechSynthesisEngine({ language: 'de-DE' })
      await expect(german.initialize()).resolves.toBe(true)
      expect(german.getStatus().config.voice).toBe('en-first')
      german.destroy()

      env.setVoices([
        { voiceURI: 'fr-only', name: 'French', lang: 'fr-FR', localService: false, default: false },
      ])
      const german2 = new SpeechSynthesisEngine({ language: 'de-DE' })
      await expect(german2.initialize()).resolves.toBe(true)
      expect(german2.getStatus().config.voice).toBe('fr-only')
      german2.destroy()
    })
  })

  describe('朗读', () => {
    it('未初始化时 speak 自动初始化并播放', async () => {
      const started = vi.fn()
      engine.on('started', started)

      const id = await engine.speak('你好世界')

      expect(id).toMatch(/^tts-/)
      const utterance = env.utterances[0]
      expect(utterance.text).toBe('你好世界')
      expect(utterance.lang).toBe('zh-CN')
      expect(utterance.volume).toBe(1)
      expect(utterance.rate).toBe(1)
      expect(utterance.pitch).toBe(1)
      expect(utterance.voice).toMatchObject({ voiceURI: 'zh-local' })
      expect(env.synthesis.speak).toHaveBeenCalledWith(utterance)
      expect(started).toHaveBeenCalledTimes(1)
      expect(engine.getHistory()).toHaveLength(1)
      expect(engine.getStatus().currentItem?.text).toBe('你好世界')
    })

    it('初始化失败时 speak 抛出未初始化错误', async () => {
      env.restore()
      await expect(engine.speak('x')).rejects.toThrow('语音合成引擎未初始化')
    })

    it('speak 选项覆盖语言/语音/语速/音调/音量', async () => {
      await engine.initialize()
      await engine.speak('hello', {
        language: 'en-US',
        voice: 'en-local',
        rate: 1.5,
        pitch: 1.2,
        volume: 0.5,
      })
      const utterance = env.utterances[0]
      expect(utterance.lang).toBe('en-US')
      expect(utterance.rate).toBe(1.5)
      expect(utterance.pitch).toBe(1.2)
      expect(utterance.volume).toBe(0.5)
      expect(utterance.voice).toMatchObject({ voiceURI: 'en-local' })
    })

    it('指定的语音不存在时 utterance.voice 保持为空', async () => {
      await engine.initialize()
      await engine.speak('x', { voice: 'not-exists' })
      expect(env.utterances[0].voice).toBeNull()
    })

    it('播放中再次 speak 进入队列，上一段结束后自动播放下一段', async () => {
      await engine.initialize()
      const queued = vi.fn()
      const completed = vi.fn()
      engine.on('queued', queued)
      engine.on('completed', completed)

      await engine.speak('第一段')
      env.synthesis.speaking = true
      const secondId = await engine.speak('第二段')

      expect(secondId).toMatch(/^tts-/)
      expect(engine.getQueue()).toHaveLength(1)
      expect(engine.getQueue()[0]).toMatchObject({ text: '第二段', status: 'queued' })
      expect(queued).toHaveBeenCalledTimes(1)
      expect(env.synthesis.speak).toHaveBeenCalledTimes(1)

      env.utterances[0].onend!()

      expect(completed).toHaveBeenCalledTimes(1)
      expect(env.synthesis.speak).toHaveBeenCalledTimes(2)
      expect(env.utterances[1].text).toBe('第二段')
      expect(engine.getStatus().currentItem?.text).toBe('第二段')
    })

    it('关闭队列时新的 speak 会停止当前播放并立即播放', async () => {
      const local = new SpeechSynthesisEngine({ enableQueue: false })
      await local.initialize()
      await local.speak('第一段')
      env.synthesis.speaking = true

      await local.speak('第二段')

      expect(local.getQueue()).toHaveLength(0)
      expect(env.synthesis.cancel).toHaveBeenCalled()
      expect(env.utterances[1].text).toBe('第二段')
      expect(local.getStatus().currentItem?.text).toBe('第二段')
      local.destroy()
    })

    it('历史最多保留 100 条', async () => {
      await engine.initialize()
      for (let i = 0; i < 105; i += 1) {
        await engine.speak(`第${i}段`)
      }
      expect(engine.getHistory()).toHaveLength(100)
      expect(engine.getHistory()[99].text).toBe('第104段')
    })

    it('clearHistory 清空历史', async () => {
      await engine.speak('x')
      expect(engine.getHistory()).toHaveLength(1)
      engine.clearHistory()
      expect(engine.getHistory()).toEqual([])
    })
  })

  describe('utterance 事件', () => {
    it('onstart/onpause/onresume/onboundary/onmark 映射事件并更新状态', async () => {
      await engine.speak('测试文本')
      const utterance = env.utterances[0]
      const playing = vi.fn()
      const paused = vi.fn()
      const resumed = vi.fn()
      const boundary = vi.fn()
      const mark = vi.fn()
      engine.on('playing', playing)
      engine.on('paused', paused)
      engine.on('resumed', resumed)
      engine.on('boundary', boundary)
      engine.on('mark', mark)

      utterance.onstart!()
      expect(playing).toHaveBeenCalledTimes(1)
      expect(engine.getStatus().currentItem?.status).toBe('playing')

      utterance.onpause!()
      expect(paused).toHaveBeenCalledTimes(1)
      expect(engine.getStatus().currentItem?.status).toBe('paused')

      utterance.onresume!()
      expect(resumed).toHaveBeenCalledTimes(1)
      expect(engine.getStatus().currentItem?.status).toBe('playing')

      utterance.onboundary!({ charIndex: 2, charLength: 3, name: 'word' })
      expect(boundary).toHaveBeenCalledTimes(1)
      expect(boundary.mock.calls[0][0]).toMatchObject({ charIndex: 2, charLength: 3, name: 'word' })

      utterance.onmark!({ name: 'mark-1' })
      expect(mark).toHaveBeenCalledTimes(1)
      expect(mark.mock.calls[0][0]).toMatchObject({ name: 'mark-1' })
    })

    it('onend 标记完成、清空当前项并派发 completed', async () => {
      await engine.speak('x')
      const completed = vi.fn()
      engine.on('completed', completed)

      env.utterances[0].onend!()

      expect(completed).toHaveBeenCalledTimes(1)
      expect(completed.mock.calls[0][0]).toMatchObject({ text: 'x', status: 'completed' })
      expect(engine.getStatus().currentItem).toBeNull()
    })

    it('onerror 派发错误并继续播放队列', async () => {
      await engine.speak('第一段')
      env.synthesis.speaking = true
      await engine.speak('第二段')
      const errors: any[] = []
      engine.on('error', (e) => errors.push(e))

      env.utterances[0].onerror!({ error: 'synthesis-failed' })

      expect(errors[0]).toMatchObject({ type: 'synthesis', error: 'synthesis-failed' })
      expect(errors[0].item.status).toBe('error')
      expect(env.utterances[1].text).toBe('第二段')
      expect(env.synthesis.speak).toHaveBeenCalledTimes(2)
    })
  })

  describe('暂停 / 恢复 / 停止', () => {
    it('pause 仅在播放中且未暂停时生效', async () => {
      expect(engine.pause()).toBe(false)

      await engine.speak('x')
      env.synthesis.speaking = true
      env.synthesis.paused = false
      const paused = vi.fn()
      engine.on('paused', paused)

      expect(engine.pause()).toBe(true)
      expect(env.synthesis.pause).toHaveBeenCalledTimes(1)
      expect(engine.getStatus().currentItem?.status).toBe('paused')
      expect(paused).toHaveBeenCalledTimes(1)

      env.synthesis.paused = true
      expect(engine.pause()).toBe(false)
    })

    it('resume 仅在暂停时生效', async () => {
      expect(engine.resume()).toBe(false)

      await engine.speak('x')
      const resumed = vi.fn()
      engine.on('resumed', resumed)
      env.synthesis.speaking = true
      env.synthesis.paused = true

      expect(engine.resume()).toBe(true)
      expect(env.synthesis.resume).toHaveBeenCalledTimes(1)
      expect(engine.getStatus().currentItem?.status).toBe('playing')
      expect(resumed).toHaveBeenCalledTimes(1)

      env.synthesis.paused = false
      expect(engine.resume()).toBe(false)
    })

    it('stop 仅在播放中生效，标记取消并清空当前项', async () => {
      expect(engine.stop()).toBe(false)

      await engine.speak('x')
      env.synthesis.speaking = true
      const cancelled = vi.fn()
      engine.on('cancelled', cancelled)

      expect(engine.stop()).toBe(true)
      expect(env.synthesis.cancel).toHaveBeenCalledTimes(1)
      expect(cancelled).toHaveBeenCalledTimes(1)
      expect(cancelled.mock.calls[0][0]).toMatchObject({ text: 'x', status: 'cancelled' })
      expect(engine.getStatus().currentItem).toBeNull()
    })

    it('clearQueue 取消队列项并派发 queue-cleared', async () => {
      await engine.speak('第一段')
      env.synthesis.speaking = true
      await engine.speak('第二段')

      const cancelled = vi.fn()
      const cleared = vi.fn()
      engine.on('cancelled', cancelled)
      engine.on('queue-cleared', cleared)

      engine.clearQueue()

      expect(engine.getQueue()).toEqual([])
      expect(cancelled).toHaveBeenCalledTimes(1)
      expect(cancelled.mock.calls[0][0]).toMatchObject({ text: '第二段', status: 'cancelled' })
      expect(cleared).toHaveBeenCalledTimes(1)
    })
  })

  describe('语音与语言', () => {
    it('setVoice 切换已存在的语音并派发事件，不存在时返回 false', async () => {
      await engine.initialize()
      const listener = vi.fn()
      engine.on('voice-changed', listener)

      expect(engine.setVoice('not-exists')).toBe(false)
      expect(engine.setVoice('en-local')).toBe(true)
      expect(engine.getStatus().config.voice).toBe('en-local')
      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener.mock.calls[0][0]).toMatchObject({ voice: 'en-local', voiceName: 'English Local' })
      expect(console.warn).toHaveBeenCalledWith('语音不存在: not-exists')
    })

    it('setLanguage 自动选择匹配语音并派发事件', async () => {
      await engine.initialize()
      const listener = vi.fn()
      engine.on('language-changed', listener)

      engine.setLanguage('fr-FR')

      expect(engine.getStatus().config.language).toBe('fr-FR')
      expect(engine.getStatus().config.voice).toBe('fr-remote')
      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener.mock.calls[0][0]).toMatchObject({ language: 'fr-FR', voice: 'fr-remote' })
    })

    it('无可用语音时 setLanguage 保留原语音', async () => {
      vi.useFakeTimers()
      env.setVoices([])
      const local = new SpeechSynthesisEngine()
      const pending = local.initialize()
      await vi.advanceTimersByTimeAsync(5000)
      await pending

      expect(local.getStatus().config.voice).toBe('')
      local.setLanguage('de-DE')
      expect(local.getStatus().config.language).toBe('de-DE')
      expect(local.getStatus().config.voice).toBe('')
      local.destroy()
    })

    it('getVoices 与 getVoicesByLanguage 返回语音元数据', async () => {
      await engine.initialize()

      expect(engine.getVoices()[0]).toEqual({
        voiceURI: 'zh-local',
        name: 'Chinese Local Female',
        lang: 'zh-CN',
        localService: true,
        default: false,
      })
      const english = engine.getVoicesByLanguage('en')
      expect(english).toHaveLength(1)
      expect(english[0]).toEqual({
        voiceURI: 'en-local',
        name: 'English Local',
        localService: true,
        default: true,
      })
      expect(engine.getVoicesByLanguage('ja')).toEqual([])
    })
  })

  describe('状态、事件与销毁', () => {
    it('getStatus 反映合成器状态与配置副本', async () => {
      await engine.initialize()
      env.synthesis.speaking = true
      env.synthesis.paused = true

      const status = engine.getStatus()
      expect(status.isSpeaking).toBe(true)
      expect(status.isPaused).toBe(true)
      expect(status.queueLength).toBe(0)
      expect(status.historySize).toBe(0)
      expect(status.config).toEqual({
        language: 'zh-CN',
        voice: 'zh-local',
        volume: 1,
        rate: 1,
        pitch: 1,
        enableQueue: true,
        autoPlay: true,
        preload: true,
        speechService: 'web',
      })
      status.config.language = 'changed'
      expect(engine.getStatus().config.language).toBe('zh-CN')
    })

    it('getQueue 返回副本', async () => {
      await engine.speak('第一段')
      env.synthesis.speaking = true
      await engine.speak('第二段')
      const queue = engine.getQueue()
      queue.pop()
      expect(engine.getQueue()).toHaveLength(1)
    })

    it('on/off 管理监听器，无监听器时派发不报错', async () => {
      await engine.initialize()
      const listener = vi.fn()
      engine.on('language-changed', listener)
      engine.off('language-changed', listener)
      engine.off('language-changed', listener)
      engine.off('never-registered', listener)

      engine.setLanguage('en-US')
      expect(listener).not.toHaveBeenCalled()
    })

    it('destroy 停止播放、清空队列/历史/监听器', async () => {
      await engine.speak('第一段')
      env.synthesis.speaking = true
      await engine.speak('第二段')

      engine.destroy()

      expect(engine.getQueue()).toEqual([])
      expect(engine.getHistory()).toEqual([])
      expect(engine.getStatus().isInitialized).toBe(false)
    })
  })
})
