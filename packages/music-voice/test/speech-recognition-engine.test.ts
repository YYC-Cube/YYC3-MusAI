/**
 * @file SpeechRecognitionEngine 单元测试
 * @description 局部 mock 浏览器语音识别 / 麦克风 / AudioContext，覆盖初始化、启停、
 *              结果与事件、语言切换、静音检测、错误处理、历史与销毁。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SpeechRecognitionEngine } from '../src/SpeechRecognitionEngine'
import {
  createAudioContextMock,
  installMicrophoneEnv,
  installRecognitionEnv,
  type MicEnv,
  type RecognitionEnv,
} from './helpers/voice-env'

/** 构造 SpeechRecognitionEvent 形状的结果事件 */
const resultEvent = (entries: Array<[string, number]>, isFinal: boolean) => {
  const alternatives = entries.map(([transcript, confidence]) => ({ transcript, confidence })) as any[]
  alternatives.isFinal = isFinal
  return { results: [alternatives] }
}

describe('SpeechRecognitionEngine', () => {
  let mic: MicEnv
  let env: RecognitionEnv
  let engine: SpeechRecognitionEngine

  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    mic = installMicrophoneEnv()
    env = installRecognitionEnv()
    engine = new SpeechRecognitionEngine()
  })

  afterEach(() => {
    engine.destroy()
    env.restore()
    mic.restore()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('初始化', () => {
    it('浏览器不支持时返回 false 并派发 initialization 错误', async () => {
      env.restore()
      const errors: any[] = []
      engine.on('error', (e) => errors.push(e))

      await expect(engine.initialize()).resolves.toBe(false)
      expect(errors).toHaveLength(1)
      expect(errors[0]).toMatchObject({ type: 'initialization', error: '浏览器不支持语音识别API' })
      expect(engine.getStatus().isInitialized).toBe(false)
    })

    it('初始化成功时配置识别器并派发 initialized 事件', async () => {
      const initialized = vi.fn()
      engine.on('initialized', initialized)

      await expect(engine.initialize()).resolves.toBe(true)

      const instance = env.latest()
      expect(instance.lang).toBe('zh-CN')
      expect(instance.continuous).toBe(true)
      expect(instance.interimResults).toBe(true)
      expect(instance.maxAlternatives).toBe(3)
      expect(initialized).toHaveBeenCalledTimes(1)
      expect(engine.getStatus()).toMatchObject({
        isInitialized: true,
        isListening: false,
        language: 'zh-CN',
        historySize: 0,
      })
    })

    it('重复初始化直接返回 true 且不重复创建识别器', async () => {
      await expect(engine.initialize()).resolves.toBe(true)
      await expect(engine.initialize()).resolves.toBe(true)
      expect(env.instances).toHaveLength(1)
    })

    it('自定义配置覆盖默认值并透传给识别器', async () => {
      const local = new SpeechRecognitionEngine({
        language: 'en-US',
        continuous: false,
        interimResults: false,
        maxAlternatives: 1,
        noiseSuppression: false,
      })
      await expect(local.initialize()).resolves.toBe(true)
      const instance = env.instances[env.instances.length - 1]
      expect(instance.lang).toBe('en-US')
      expect(instance.continuous).toBe(false)
      expect(instance.interimResults).toBe(false)
      expect(instance.maxAlternatives).toBe(1)
      expect(mic.getUserMedia).toHaveBeenCalledWith({
        audio: expect.objectContaining({ noiseSuppression: false, sampleRate: 16000, channelCount: 1 }),
      })
      local.destroy()
    })

    it('麦克风权限失败时返回 false 并携带错误信息', async () => {
      mic.restore()
      mic = installMicrophoneEnv({ reject: true })
      const errors: any[] = []
      engine.on('error', (e) => errors.push(e))

      await expect(engine.initialize()).resolves.toBe(false)
      expect(errors[0].type).toBe('initialization')
      expect(errors[0].error).toContain('麦克风权限获取失败')
    })

    it('仅提供标准 SpeechRecognition 时也能初始化', async () => {
      env.restore()
      env = installRecognitionEnv({ global: 'SpeechRecognition' })
      const local = new SpeechRecognitionEngine()

      await expect(local.initialize()).resolves.toBe(true)
      expect(env.instances).toHaveLength(1)
      local.destroy()
    })

    it('识别器自带 audioContext 时搭建降噪与增益链路', async () => {
      env.restore()
      const audioContext = createAudioContextMock()
      env = installRecognitionEnv({ audioContext })
      const local = new SpeechRecognitionEngine()

      await expect(local.initialize()).resolves.toBe(true)

      expect(audioContext.createMediaStreamSource).toHaveBeenCalledTimes(1)
      const filter = audioContext.createBiquadFilter.mock.results[0].value
      expect(filter.type).toBe('bandpass')
      expect(filter.frequency.value).toBe(300)
      expect(filter.Q.value).toBe(1)
      const gain = audioContext.createGain.mock.results[0].value
      expect(gain.gain.value).toBe(2)
      expect(audioContext.destination).toBeDefined()
      local.destroy()
    })
  })

  describe('启动与停止', () => {
    it('start 调用识别器，onstart 进入监听并派发 start，onend 退出监听', async () => {
      const started = vi.fn()
      const ended = vi.fn()
      engine.on('start', started)
      engine.on('end', ended)

      await expect(engine.start()).resolves.toBe(true)
      expect(env.latest().start).toHaveBeenCalledTimes(1)
      expect(engine.getStatus().isListening).toBe(false)

      env.latest().onstart!()
      expect(engine.getStatus().isListening).toBe(true)
      expect(started).toHaveBeenCalledTimes(1)
      expect(engine.getStatus().lastResultTime).toBeGreaterThan(0)

      env.latest().onend!()
      expect(engine.getStatus().isListening).toBe(false)
      expect(ended).toHaveBeenCalledTimes(1)
    })

    it('已在监听时重复 start 直接返回 true 且不重复调用识别器', async () => {
      await engine.start()
      env.latest().onstart!()

      await expect(engine.start()).resolves.toBe(true)
      expect(env.latest().start).toHaveBeenCalledTimes(1)
      expect(console.warn).toHaveBeenCalledWith('语音识别已经在进行中')
    })

    it('初始化失败时 start 返回 false', async () => {
      env.restore()
      await expect(engine.start()).resolves.toBe(false)
    })

    it('识别器 start 抛错时返回 false 并派发 start 错误', async () => {
      await engine.initialize()
      env.latest().start.mockImplementation(() => {
        throw new Error('boom')
      })
      const errors: any[] = []
      engine.on('error', (e) => errors.push(e))

      await expect(engine.start()).resolves.toBe(false)
      expect(errors[0]).toMatchObject({ type: 'start', error: 'boom' })
    })

    it('未监听时 stop 不调用识别器；监听中 stop 调用且异常被捕获', async () => {
      engine.stop()
      await engine.start()
      const instance = env.latest()
      expect(instance.stop).not.toHaveBeenCalled()

      instance.onstart!()
      engine.stop()
      expect(instance.stop).toHaveBeenCalledTimes(1)

      instance.stop.mockImplementation(() => {
        throw new Error('stop-fail')
      })
      engine.stop()
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('识别结果', () => {
    beforeEach(async () => {
      await engine.initialize()
      env.latest().onstart!()
    })

    it('最终结果写入历史、派发 result/final/command 并持久化命令历史', () => {
      const results: any[] = []
      const finals: any[] = []
      const commands: any[] = []
      engine.on('result', (r) => results.push(r))
      engine.on('final', (r) => finals.push(r))
      engine.on('command', (c) => commands.push(c))

      env.latest().onresult!(resultEvent([['创建弹窗!', 0.9], ['创建', 0.5]], true))

      expect(results).toHaveLength(1)
      expect(results[0]).toMatchObject({
        transcript: '创建弹窗!',
        confidence: 0.9,
        isFinal: true,
        language: 'zh-CN',
      })
      expect(results[0].alternatives).toHaveLength(2)
      expect(results[0].alternatives[1]).toEqual({ transcript: '创建', confidence: 0.5 })
      expect(finals).toHaveLength(1)
      expect(commands).toHaveLength(1)
      expect(commands[0]).toMatchObject({ transcript: '创建弹窗', original: '创建弹窗!' })
      expect(engine.getHistory()).toHaveLength(1)

      const saved = JSON.parse(localStorage.getItem('voice_command_history')!)
      expect(saved).toHaveLength(1)
      expect(saved[0]).toMatchObject({ command: '创建弹窗', language: 'zh-CN' })
    })

    it('非最终且低置信度结果被丢弃', () => {
      const results = vi.fn()
      engine.on('result', results)

      env.latest().onresult!(resultEvent([['嗯', 0.2]], false))

      expect(results).not.toHaveBeenCalled()
      expect(engine.getHistory()).toHaveLength(0)
    })

    it('非最终但高置信度结果派发 result 且不派发 final', () => {
      const results = vi.fn()
      const finals = vi.fn()
      engine.on('result', results)
      engine.on('final', finals)

      env.latest().onresult!(resultEvent([['正在输入', 0.8]], false))

      expect(results).toHaveBeenCalledTimes(1)
      expect(finals).not.toHaveBeenCalled()
      expect(engine.getHistory()).toHaveLength(1)
    })

    it('识别历史与命令历史最多保留 100 条', () => {
      for (let i = 0; i < 105; i += 1) {
        env.latest().onresult!(resultEvent([[`命令${i}`, 0.9]], true))
      }
      expect(engine.getHistory()).toHaveLength(100)
      expect(engine.getHistory()[99].transcript).toBe('命令104')
      const saved = JSON.parse(localStorage.getItem('voice_command_history')!)
      expect(saved).toHaveLength(100)
    })

    it('清除历史后 getHistory 返回空数组', () => {
      env.latest().onresult!(resultEvent([['你好', 0.9]], true))
      expect(engine.getHistory()).toHaveLength(1)
      engine.clearHistory()
      expect(engine.getHistory()).toEqual([])
      expect(engine.getStatus().historySize).toBe(0)
    })
  })

  describe('识别器事件映射', () => {
    it('speechend / audiostart / audioend 映射为对应引擎事件', async () => {
      await engine.initialize()
      const noSpeech = vi.fn()
      const audioStart = vi.fn()
      const audioEnd = vi.fn()
      engine.on('no-speech', noSpeech)
      engine.on('audio-start', audioStart)
      engine.on('audio-end', audioEnd)

      env.latest().onspeechend!()
      env.latest().onaudiostart!()
      env.latest().onaudioend!()

      expect(noSpeech).toHaveBeenCalledTimes(1)
      expect(audioStart).toHaveBeenCalledTimes(1)
      expect(audioEnd).toHaveBeenCalledTimes(1)
    })

    it('识别错误派发 error，未知错误类型回退为 unknown', async () => {
      await engine.initialize()
      const errors: any[] = []
      engine.on('error', (e) => errors.push(e))

      env.latest().onerror!({})
      expect(errors[0]).toMatchObject({ type: 'recognition', error: 'unknown' })
    })

    it('网络错误 1 秒后自动重启，非网络错误不重启', async () => {
      vi.useFakeTimers()
      await engine.initialize()
      const instance = env.latest()

      instance.onerror!({ error: 'network' })
      expect(instance.start).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1000)
      expect(instance.start).toHaveBeenCalledTimes(1)

      instance.onerror!({ error: 'aborted' })
      vi.advanceTimersByTime(2000)
      expect(instance.start).toHaveBeenCalledTimes(1)
    })

    it('监听后已在监听时网络错误不会重复启动', async () => {
      vi.useFakeTimers()
      await engine.initialize()
      const instance = env.latest()
      instance.onstart!()

      instance.onerror!({ error: 'network' })
      vi.advanceTimersByTime(1000)
      expect(instance.start).not.toHaveBeenCalled()
    })
  })

  describe('静音检测', () => {
    it('超过静音阈值自动停止并派发 silence-timeout', async () => {
      vi.useFakeTimers()
      await engine.initialize()
      const instance = env.latest()
      const silence = vi.fn()
      engine.on('silence-timeout', silence)

      instance.onstart!()
      vi.advanceTimersByTime(2000)
      expect(instance.stop).not.toHaveBeenCalled()

      vi.advanceTimersByTime(2000)
      expect(instance.stop).toHaveBeenCalledTimes(1)
      expect(silence).toHaveBeenCalledTimes(1)
    })

    it('onend 会停止静音检测计时器', async () => {
      vi.useFakeTimers()
      await engine.initialize()
      const instance = env.latest()
      const silence = vi.fn()
      engine.on('silence-timeout', silence)

      instance.onstart!()
      instance.onend!()
      vi.advanceTimersByTime(6000)
      expect(silence).not.toHaveBeenCalled()
    })
  })

  describe('语言与状态', () => {
    it('setLanguage 在未初始化与已初始化时都更新配置并派发事件', async () => {
      const listener = vi.fn()
      engine.on('language-changed', listener)

      engine.setLanguage('en-US')
      expect(engine.getStatus().language).toBe('en-US')
      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener.mock.calls[0][0]).toMatchObject({ language: 'en-US' })

      await engine.initialize()
      engine.setLanguage('ja-JP')
      expect(env.latest().lang).toBe('ja-JP')
      expect(listener).toHaveBeenCalledTimes(2)
    })

    it('getSupportedLanguages 返回 12 种语言', () => {
      const languages = SpeechRecognitionEngine.getSupportedLanguages()
      expect(languages).toHaveLength(12)
      expect(languages.map((l) => l.code)).toEqual(
        expect.arrayContaining(['zh-CN', 'en-US', 'ja-JP', 'ar-SA'])
      )
      expect(languages[0]).toEqual({ code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' })
    })

    it('on/off 管理监听器，无监听器时派发不报错', async () => {
      const listener = vi.fn()
      engine.on('language-changed', listener)
      engine.off('language-changed', listener)
      engine.off('language-changed', listener)
      engine.off('never-registered', listener)

      engine.setLanguage('en-US')
      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('销毁', () => {
    it('销毁时停止媒体流、关闭音频上下文并清空状态与监听器', async () => {
      await engine.initialize()
      env.latest().onstart!()

      engine.destroy()

      expect(mic.track.stop).toHaveBeenCalledTimes(1)
      expect(mic.audioContext.close).toHaveBeenCalledTimes(1)
      expect(engine.getStatus()).toMatchObject({
        isInitialized: false,
        isListening: false,
        historySize: 0,
      })

      const listener = vi.fn()
      engine.on('language-changed', listener)
      engine.destroy()
      engine.setLanguage('en-US')
      expect(listener).not.toHaveBeenCalled()
    })
  })
})
