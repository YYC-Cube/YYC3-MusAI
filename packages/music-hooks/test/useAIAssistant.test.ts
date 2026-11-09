// YYC³ music-hooks — useAIAssistant 智能助手测试（提示引擎 / 语音指令 / 行为洞察）
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAIAssistant, type AIAssistantConfig } from '../src/useAIAssistant'

type RecognitionResult = Array<{ transcript: string; confidence: number }> & { isFinal?: boolean }

class FakeRecognition {
  static instances: FakeRecognition[] = []
  static startThrows = false
  continuous = false
  interimResults = false
  lang = ''
  maxAlternatives = 1
  onresult: ((e: any) => void) | null = null
  onerror: ((e: any) => void) | null = null
  onend: (() => void) | null = null
  start = vi.fn(() => {
    if (FakeRecognition.startThrows) throw new Error('start failed')
  })
  stop = vi.fn()

  constructor() {
    FakeRecognition.instances.push(this)
  }

  emitResults(results: RecognitionResult[]) {
    this.onresult?.({ results })
  }
}

function makeConfig(overrides: Partial<AIAssistantConfig> = {}): AIAssistantConfig {
  return {
    isPlaying: false,
    currentEmotion: 'neutral',
    currentTrackId: 'track-1',
    currentTrackTitle: '星际漫游',
    starPower: 0,
    isLoggedIn: false,
    lang: 'zh',
    onPlay: vi.fn(),
    onPause: vi.fn(),
    onNext: vi.fn(),
    onPrev: vi.fn(),
    onShuffleToggle: vi.fn(),
    onVolumeUp: vi.fn(),
    onVolumeDown: vi.fn(),
    onMute: vi.fn(),
    onOpenPlaylist: vi.fn(),
    onOpenAILyrics: vi.fn(),
    onOpenLeaderboard: vi.fn(),
    onOpenComments: vi.fn(),
    onOpenCommunity: vi.fn(),
    onOpenAnalytics: vi.fn(),
    onOpenProfile: vi.fn(),
    onLike: vi.fn(),
    ...overrides,
  }
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

function advanceSeconds(seconds: number) {
  for (let i = 0; i < seconds; i++) advance(1000)
}

describe('useAIAssistant', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    FakeRecognition.instances = []
    FakeRecognition.startThrows = false
    Object.defineProperty(window, 'SpeechRecognition', {
      configurable: true,
      writable: true,
      value: undefined,
    })
    delete (window as any).SpeechRecognition
    try {
      delete (window as any).webkitSpeechRecognition
    } catch {
      // ignore
    }
  })

  afterEach(() => {
    vi.useRealTimers()
    try {
      delete (window as any).SpeechRecognition
    } catch {
      // ignore
    }
  })

  describe('初始状态与洞察', () => {
    it('初始行为快照与中文洞察', () => {
      const { result } = renderHook(() => useAIAssistant(makeConfig()))

      expect(result.current.activeTips).toEqual([])
      expect(result.current.isListening).toBe(false)
      expect(result.current.voiceSupported).toBe(false)
      expect(result.current.lastTranscript).toBe('')
      expect(result.current.voiceHistory).toEqual([])
      expect(result.current.voiceFeedback).toBe('')
      expect(result.current.behavior.tracksPlayed).toEqual(['track-1'])
      expect(result.current.behavior.sessionListeningSec).toBe(0)
      expect(result.current.sessionInsight).toBe('开始探索你的音乐旅程吧！')
    })

    it('英文初始洞察', () => {
      const { result } = renderHook(() => useAIAssistant(makeConfig({ lang: 'en' })))
      expect(result.current.sessionInsight).toBe('Start your musical journey!')
    })

    it('播放计时累加，洞察包含分钟数与曲目数', () => {
      const { result } = renderHook(() =>
        useAIAssistant(makeConfig({ isPlaying: true, currentEmotion: 'happy' }))
      )

      advanceSeconds(61)
      expect(result.current.behavior.sessionListeningSec).toBe(61)
      expect(result.current.behavior.totalListeningSec).toBe(61)
      expect(result.current.sessionInsight).toContain('已收听 1 分钟')
      expect(result.current.sessionInsight).toContain('1 首曲目')
      expect(result.current.sessionInsight).toContain('情感倾向: 快乐')
    })

    it('英文洞察包含 mood 标签', () => {
      const { result } = renderHook(() =>
        useAIAssistant(makeConfig({ isPlaying: true, lang: 'en', currentEmotion: 'calm' }))
      )
      advanceSeconds(60)
      expect(result.current.sessionInsight).toContain('1min')
      expect(result.current.sessionInsight).toContain('Mood: calm')
    })

    it('情绪历史与主导情绪随曲目变化更新', () => {
      const base = makeConfig()
      const { result, rerender } = renderHook((cfg) => useAIAssistant(cfg), {
        initialProps: base,
      })

      rerender({ ...base, currentEmotion: 'happy' })
      rerender({ ...base, currentEmotion: 'sad' })
      rerender({ ...base, currentEmotion: 'happy' })

      expect(result.current.behavior.emotionHistory).toEqual(['neutral', 'happy', 'sad', 'happy'])
      expect(result.current.behavior.dominantSessionEmotion).toBe('happy')
      expect(result.current.behavior.consecutiveSameEmotion).toBe(1)
    })

    it('曲目切换记录播放列表且不重复记录', () => {
      const base = makeConfig()
      const { result, rerender } = renderHook((cfg) => useAIAssistant(cfg), {
        initialProps: base,
      })

      rerender({ ...base, currentTrackId: 'track-2' })
      rerender({ ...base, currentTrackId: 'track-2' })
      rerender({ ...base, currentTrackId: 'track-3' })

      expect(result.current.behavior.tracksPlayed).toEqual(['track-1', 'track-2', 'track-3'])
    })

    it('非播放状态不累计收听时间', () => {
      const { result } = renderHook(() => useAIAssistant(makeConfig({ isPlaying: false })))
      advance(3000)
      expect(result.current.behavior.sessionListeningSec).toBe(0)
    })
  })

  describe('主动提示引擎', () => {
    it('达到条件时生成提示（互动 / 成就 / 登录）', () => {
      const cfg = makeConfig({ isPlaying: true, starPower: 90, isLoggedIn: false })
      const { result } = renderHook(() => useAIAssistant(cfg))

      advanceSeconds(121)
      advance(5000)

      const ids = result.current.activeTips.map((t) => t.id)
      expect(ids).toContain('no-annotation')
      expect(ids).toContain('star-milestone')
      expect(ids).toContain('login-nudge')
      expect(result.current.activeTips.length).toBeLessThanOrEqual(3)

      const star = result.current.activeTips.find((t) => t.id === 'star-milestone')!
      expect(star.message).toContain('星力值即将达到 100')
      expect(star.category).toBe('achievement')
      expect(star.priority).toBe('high')
      expect(star.actionKey).toBeUndefined()

      const annotation = result.current.activeTips.find((t) => t.id === 'no-annotation')!
      expect(annotation.icon).toBe('💫')
      expect(annotation.expiresAt).toBeGreaterThan(Date.now())
    })

    it('点赞提示带动作标签，并且可执行动作', () => {
      const cfg = makeConfig({ isPlaying: true, isLoggedIn: true })
      const { result, rerender } = renderHook((c) => useAIAssistant(c), { initialProps: cfg })

      rerender({ ...cfg, currentTrackId: 'track-2' })
      advanceSeconds(40)
      advance(5000)

      const likeTip = result.current.activeTips.find((t) => t.id === 'no-like')
      expect(likeTip).toBeTruthy()
      expect(likeTip!.actionKey).toBe('like')
      expect(likeTip!.actionLabel).toBe('点赞')

      act(() => {
        result.current.executeTipAction('like')
      })
      expect(cfg.onLike).toHaveBeenCalledTimes(1)

      act(() => {
        result.current.executeTipAction('shuffleEnergetic')
      })
      expect(cfg.onShuffleToggle).toHaveBeenCalled()
      expect(cfg.onNext).toHaveBeenCalled()

      act(() => {
        result.current.executeTipAction('shuffleCalm')
      })
      expect(cfg.onShuffleToggle).toHaveBeenCalledTimes(2)

      act(() => {
        result.current.executeTipAction('unknown-action')
      })
      expect(cfg.onNext).toHaveBeenCalledTimes(2)
    })

    it('英文提示与英文动作标签', () => {
      const cfg = makeConfig({ isPlaying: true, isLoggedIn: true, lang: 'en', starPower: 460 })
      const { result, rerender } = renderHook((c) => useAIAssistant(c), { initialProps: cfg })

      rerender({ ...cfg, currentTrackId: 'track-2' })
      advanceSeconds(40)
      advance(5000)

      const star = result.current.activeTips.find((t) => t.id === 'star-milestone')
      expect(star?.message).toContain('Your Star Power is approaching 500')

      const likeTip = result.current.activeTips.find((t) => t.id === 'no-like')
      expect(likeTip?.actionLabel).toBe('Like')
    })

    it('发现新曲目提示与空闲提示', () => {
      const cfg = makeConfig({ isPlaying: true, isLoggedIn: true })
      const { result } = renderHook(() => useAIAssistant(cfg))

      advanceSeconds(310)
      advance(5000)

      const ids = result.current.activeTips.map((t) => t.id)
      expect(ids).toContain('explore-tracks')
      expect(ids).toContain('idle-prompt')

      const idle = result.current.activeTips.find((t) => t.id === 'idle-prompt')!
      expect(idle.message).toContain('星际漫游')
    })

    it('收听里程碑提示（10 分钟）', () => {
      const cfg = makeConfig({ isPlaying: true, isLoggedIn: true })
      const { result, rerender } = renderHook((c) => useAIAssistant(c), { initialProps: cfg })

      advanceSeconds(600)
      rerender({ ...cfg, isPlaying: false })
      advance(5000)

      const ids = result.current.activeTips.map((t) => t.id)
      expect(ids).toContain('listening-milestone')
      const milestone = result.current.activeTips.find((t) => t.id === 'listening-milestone')!
      expect(milestone.message).toContain('10 分钟')
    })

    it('dismissTip 标记忽略，超过有效期后提示消失', () => {
      const cfg = makeConfig({ isPlaying: true, starPower: 90 })
      const { result } = renderHook(() => useAIAssistant(cfg))

      advanceSeconds(121)
      advance(5000)
      expect(result.current.activeTips.length).toBeGreaterThan(0)

      const first = result.current.activeTips[0]
      act(() => {
        result.current.dismissTip(first.id)
      })
      expect(result.current.activeTips.some((t) => t.id === first.id)).toBe(false)

      // 过期后清空
      advance(31000)
      advance(5000)
      expect(result.current.activeTips.every((t) => t.expiresAt > Date.now())).toBe(true)
    })

    it('冷却期内不会重复生成同一提示', () => {
      const cfg = makeConfig({ isPlaying: true, isLoggedIn: true })
      const { result } = renderHook(() => useAIAssistant(cfg))

      advanceSeconds(130)
      advance(5000)
      const countAfterFirst = result.current.activeTips.length
      const idsAfterFirst = result.current.activeTips.map((t) => t.id)

      advance(5000)
      expect(result.current.activeTips.length).toBe(countAfterFirst)
      expect(result.current.activeTips.map((t) => t.id)).toEqual(idsAfterFirst)
    })
  })

  describe('语音指令', () => {
    function enableSpeech() {
      Object.defineProperty(window, 'SpeechRecognition', {
        configurable: true,
        writable: true,
        value: FakeRecognition,
      })
    }

    it('不支持语音时 startListening 为 no-op', () => {
      const { result } = renderHook(() => useAIAssistant(makeConfig()))
      expect(result.current.voiceSupported).toBe(false)
      act(() => {
        result.current.startListening()
      })
      expect(result.current.isListening).toBe(false)
      expect(FakeRecognition.instances).toHaveLength(0)
    })

    it('SpeechRecognition 存在但构造器缺失时安全返回', () => {
      Object.defineProperty(window, 'SpeechRecognition', {
        configurable: true,
        writable: true,
        value: undefined,
      })
      const { result } = renderHook(() => useAIAssistant(makeConfig()))
      expect(result.current.voiceSupported).toBe(true)
      act(() => {
        result.current.startListening()
      })
      expect(result.current.isListening).toBe(false)
    })

    it('开始监听并识别播放指令（中文）', () => {
      enableSpeech()
      const vibrate = vi.fn()
      Object.defineProperty(navigator, 'vibrate', { configurable: true, writable: true, value: vibrate })
      const cfg = makeConfig()
      const { result } = renderHook(() => useAIAssistant(cfg))

      expect(result.current.voiceSupported).toBe(true)

      act(() => {
        result.current.startListening()
      })
      const rec = FakeRecognition.instances[0]
      expect(rec.continuous).toBe(false)
      expect(rec.interimResults).toBe(false)
      expect(rec.lang).toBe('zh-CN')
      expect(rec.maxAlternatives).toBe(1)
      expect(result.current.isListening).toBe(true)
      expect(result.current.voiceFeedback).toContain('请说指令')
      expect(vibrate).toHaveBeenCalledWith(8)

      act(() => {
        rec.emitResults([[{ transcript: '播放', confidence: 0.95 }]])
      })

      expect(cfg.onPlay).toHaveBeenCalledTimes(1)
      expect(result.current.lastTranscript).toBe('播放')
      expect(result.current.voiceFeedback).toBe('✅ 正在播放')
      expect(result.current.voiceHistory).toHaveLength(1)
      expect(result.current.voiceHistory[0]).toMatchObject({
        command: 'play',
        transcript: '播放',
        confidence: 0.95,
      })
      expect(vibrate).toHaveBeenCalledWith([5, 15, 5])

      // 反馈 3 秒后自动清除
      advance(3000)
      expect(result.current.voiceFeedback).toBe('')
    })

    it('无法识别的指令给出提示', () => {
      enableSpeech()
      const vibrate = vi.fn()
      Object.defineProperty(navigator, 'vibrate', { configurable: true, writable: true, value: vibrate })
      const { result } = renderHook(() => useAIAssistant(makeConfig()))

      act(() => {
        result.current.startListening()
      })
      const rec = FakeRecognition.instances[0]
      act(() => {
        rec.emitResults([[{ transcript: '随便说说', confidence: 0.3 }]])
      })

      expect(result.current.voiceFeedback).toContain('未识别')
      expect(result.current.voiceHistory).toHaveLength(0)
      expect(vibrate).toHaveBeenCalledWith(15)
    })

    it('英文模式反馈与未知指令', () => {
      enableSpeech()
      const cfg = makeConfig({ lang: 'en' })
      const { result } = renderHook(() => useAIAssistant(cfg))

      act(() => {
        result.current.startListening()
      })
      const rec = FakeRecognition.instances[0]
      expect(rec.lang).toBe('en-US')
      expect(result.current.voiceFeedback).toContain('Listening')

      act(() => {
        rec.emitResults([[{ transcript: 'next' } as any]])
      })
      expect(cfg.onNext).toHaveBeenCalled()
      expect(result.current.voiceFeedback).toBe('✅ Next track')

      act(() => {
        rec.emitResults([[{ transcript: 'what', confidence: 0.1 }]])
      })
      expect(result.current.voiceFeedback).toContain('Unknown')
    })

    it('连续模式下只处理最终结果', () => {
      enableSpeech()
      const cfg = makeConfig()
      const { result } = renderHook(() => useAIAssistant(cfg))

      act(() => {
        result.current.startListening(true)
      })
      const rec = FakeRecognition.instances[0]
      expect(rec.continuous).toBe(true)
      expect(rec.interimResults).toBe(true)
      expect(result.current.continuousMode).toBe(true)
      expect(result.current.voiceFeedback).toContain('免提模式已开启')

      const interim: RecognitionResult = [{ transcript: '播', confidence: 0.4 }]
      interim.isFinal = false
      act(() => {
        rec.emitResults([interim])
      })
      expect(result.current.lastTranscript).toBe('播')
      expect(cfg.onPlay).not.toHaveBeenCalled()

      const final: RecognitionResult = [{ transcript: '播放', confidence: 0.9 }]
      final.isFinal = true
      act(() => {
        rec.emitResults([interim, final])
      })
      expect(cfg.onPlay).toHaveBeenCalledTimes(1)
      expect(result.current.lastTranscript).toBe('播放')
    })

    it('连续模式 onend 后自动重启，重启失败则退出', () => {
      enableSpeech()
      const { result } = renderHook(() => useAIAssistant(makeConfig()))

      act(() => {
        result.current.startListening(true)
      })
      const rec = FakeRecognition.instances[0]
      expect(rec.start).toHaveBeenCalledTimes(1)

      act(() => {
        rec.onend?.()
      })
      advance(300)
      expect(rec.start).toHaveBeenCalledTimes(2)
      expect(result.current.isListening).toBe(true)

      // 重启抛错 → 优雅退出
      FakeRecognition.startThrows = true
      act(() => {
        rec.onend?.()
      })
      advance(300)
      expect(result.current.isListening).toBe(false)
    })

    it('非连续模式 onend 结束监听', () => {
      enableSpeech()
      const { result } = renderHook(() => useAIAssistant(makeConfig()))
      act(() => {
        result.current.startListening()
      })
      const rec = FakeRecognition.instances[0]
      act(() => {
        rec.onend?.()
      })
      expect(result.current.isListening).toBe(false)
    })

    it('错误处理：no-speech 在连续模式下静默、非连续模式结束监听', () => {
      enableSpeech()
      vi.spyOn(console, 'log').mockImplementation(() => {})
      const { result } = renderHook(() => useAIAssistant(makeConfig()))

      act(() => {
        result.current.startListening(true)
      })
      const rec = FakeRecognition.instances[0]
      act(() => {
        rec.onerror?.({ error: 'no-speech' })
      })
      expect(result.current.isListening).toBe(true)

      act(() => {
        result.current.stopListening()
      })
      act(() => {
        result.current.startListening()
      })
      const rec2 = FakeRecognition.instances[1]
      act(() => {
        rec2.onerror?.({ error: 'no-speech' })
      })
      expect(result.current.isListening).toBe(false)
    })

    it('错误处理：aborted 不显示错误反馈', () => {
      enableSpeech()
      vi.spyOn(console, 'log').mockImplementation(() => {})
      const { result } = renderHook(() => useAIAssistant(makeConfig()))
      act(() => {
        result.current.startListening()
      })
      const rec = FakeRecognition.instances[0]
      act(() => {
        rec.onerror?.({ error: 'aborted' })
      })
      expect(result.current.voiceFeedback).not.toContain('出错')
      expect(result.current.isListening).toBe(false)
    })

    it('错误处理：其他错误显示提示并触发警示振动', () => {
      enableSpeech()
      vi.spyOn(console, 'log').mockImplementation(() => {})
      const vibrate = vi.fn()
      Object.defineProperty(navigator, 'vibrate', { configurable: true, writable: true, value: vibrate })
      const { result } = renderHook(() => useAIAssistant(makeConfig()))

      act(() => {
        result.current.startListening()
      })
      const rec = FakeRecognition.instances[0]
      act(() => {
        rec.onerror?.({ error: 'network' })
      })

      expect(result.current.voiceFeedback).toContain('语音识别出错')
      expect(vibrate).toHaveBeenCalledWith([30, 50, 30])
      expect(result.current.isListening).toBe(false)
    })

    it('英文错误提示', () => {
      enableSpeech()
      vi.spyOn(console, 'log').mockImplementation(() => {})
      const { result } = renderHook(() => useAIAssistant(makeConfig({ lang: 'en' })))
      act(() => {
        result.current.startListening()
      })
      const rec = FakeRecognition.instances[0]
      act(() => {
        rec.onerror?.({ error: 'network' })
      })
      expect(result.current.voiceFeedback).toContain('Voice recognition error')
    })

    it('已在监听时重复 startListening 不会创建新实例', () => {
      enableSpeech()
      const { result } = renderHook(() => useAIAssistant(makeConfig()))
      act(() => {
        result.current.startListening()
      })
      act(() => {
        result.current.startListening()
      })
      expect(FakeRecognition.instances).toHaveLength(1)
    })

    it('start 抛错时记录错误且不进入监听状态', () => {
      enableSpeech()
      FakeRecognition.startThrows = true
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { result } = renderHook(() => useAIAssistant(makeConfig()))

      act(() => {
        result.current.startListening()
      })
      expect(errorSpy).toHaveBeenCalled()
      expect(result.current.isListening).toBe(false)
    })

    it('toggleListening 与 toggleContinuousMode 切换状态', () => {
      enableSpeech()
      const { result } = renderHook(() => useAIAssistant(makeConfig()))

      act(() => {
        result.current.toggleListening()
      })
      expect(result.current.isListening).toBe(true)

      act(() => {
        result.current.toggleListening()
      })
      expect(result.current.isListening).toBe(false)

      act(() => {
        result.current.toggleContinuousMode()
      })
      expect(result.current.isListening).toBe(true)
      expect(result.current.continuousMode).toBe(true)

      act(() => {
        result.current.toggleContinuousMode()
      })
      expect(result.current.isListening).toBe(false)
    })

    it('stopListening 清理重启定时器并停止识别', () => {
      enableSpeech()
      const { result } = renderHook(() => useAIAssistant(makeConfig()))
      act(() => {
        result.current.startListening(true)
      })
      const rec = FakeRecognition.instances[0]
      act(() => {
        rec.onend?.()
      })
      act(() => {
        result.current.stopListening()
      })
      expect(rec.stop).toHaveBeenCalled()
      advance(500)
      expect(rec.start).toHaveBeenCalledTimes(1)
    })

    it('未开始监听时 stopListening 安全', () => {
      const { result } = renderHook(() => useAIAssistant(makeConfig()))
      expect(() => {
        act(() => {
          result.current.stopListening()
        })
      }).not.toThrow()
      expect(result.current.isListening).toBe(false)
    })

    it('vibrate 抛错不影响语音指令执行', () => {
      enableSpeech()
      Object.defineProperty(navigator, 'vibrate', {
        configurable: true,
        writable: true,
        value: () => {
          throw new Error('no haptics')
        },
      })
      const cfg = makeConfig()
      const { result } = renderHook(() => useAIAssistant(cfg))

      expect(() => {
        act(() => {
          result.current.startListening()
        })
      }).not.toThrow()
      const rec = FakeRecognition.instances[0]
      act(() => {
        rec.emitResults([[{ transcript: 'pause', confidence: 0.8 }]])
      })
      expect(cfg.onPause).toHaveBeenCalled()
    })
  })
})
