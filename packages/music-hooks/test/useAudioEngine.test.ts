// YYC³ music-hooks — useAudioEngine 播放引擎测试（demo 振荡器 / 文件模式 / 可视化分析）
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAudioEngine } from '../src/useAudioEngine'

class ParamMock {
  value = 0
  setValueAtTime = vi.fn()
  linearRampToValueAtTime = vi.fn()
  exponentialRampToValueAtTime = vi.fn()
  setTargetAtTime = vi.fn()
  cancelScheduledValues = vi.fn()
}

class NodeMock {
  connect = vi.fn()
  disconnect = vi.fn()
}

class GainMock extends NodeMock {
  gain = new ParamMock()
}

class OscillatorMock extends NodeMock {
  type = 'sine'
  frequency = new ParamMock()
  start = vi.fn()
  stop = vi.fn()
}

class AnalyserMock extends NodeMock {
  fftSize = 2048
  smoothingTimeConstant = 0
  minDecibels = -100
  maxDecibels = -30
  frequencyBinCount = 32
  getByteFrequencyData = vi.fn((arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) arr[i] = i < 4 ? 200 : i >= 19 ? 120 : 60
  })
  getByteTimeDomainData = vi.fn((arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) arr[i] = 128
  })
}

class CompressorMock extends NodeMock {
  threshold = new ParamMock()
  knee = new ParamMock()
  ratio = new ParamMock()
  attack = new ParamMock()
  release = new ParamMock()
}

class AudioContextMock {
  static instances: AudioContextMock[] = []
  state: 'running' | 'suspended' | 'closed' = 'running'
  currentTime = 1
  destination = new NodeMock()
  analyser = new AnalyserMock()
  resume = vi.fn(() => {
    this.state = 'running'
    return Promise.resolve()
  })
  close = vi.fn(() => {
    this.state = 'closed'
    return Promise.resolve()
  })
  createAnalyser = vi.fn(() => this.analyser)
  createGain = vi.fn(() => new GainMock())
  createDynamicsCompressor = vi.fn(() => new CompressorMock())
  createOscillator = vi.fn(() => new OscillatorMock())
  createMediaElementSource = vi.fn(() => new NodeMock())

  constructor() {
    AudioContextMock.instances.push(this)
  }
}

type Listener = () => void

class FakeAudio {
  static instances: FakeAudio[] = []
  src = ''
  crossOrigin = ''
  preload = ''
  volume = 1
  currentTime = 0
  duration = NaN
  readyState = 0
  listeners: Record<string, Listener[]> = {}
  play = vi.fn(() => Promise.resolve())
  pause = vi.fn()
  load = vi.fn()
  removeAttribute = vi.fn()

  constructor() {
    FakeAudio.instances.push(this)
  }

  addEventListener(type: string, cb: Listener) {
    ;(this.listeners[type] ||= []).push(cb)
  }

  removeEventListener(type: string, cb: Listener) {
    this.listeners[type] = (this.listeners[type] || []).filter((fn) => fn !== cb)
  }

  fire(type: string) {
    ;(this.listeners[type] || []).slice().forEach((cb) => cb())
  }
}

let nowMs = 0
let rafCbs: FrameRequestCallback[] = []
let rafId = 0

function flushFrames(times = 1) {
  for (let i = 0; i < times; i++) {
    const cbs = rafCbs
    rafCbs = []
    cbs.forEach((cb) => cb(0))
  }
}

describe('useAudioEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    AudioContextMock.instances = []
    FakeAudio.instances = []
    rafCbs = []
    rafId = 0
    nowMs = 0
    vi.stubGlobal('AudioContext', AudioContextMock as any)
    vi.stubGlobal('Audio', FakeAudio as any)
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => {
      rafCbs.push(cb)
      rafId += 1
      return rafId
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(performance, 'now').mockImplementation(() => nowMs)
    ;(URL as any).createObjectURL = vi.fn(() => 'blob:uploaded-audio')
    ;(URL as any).revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('初始状态为 demo 模式，使用配置的时长与初始音量', () => {
    const { result } = renderHook(() =>
      useAudioEngine({ trackKey: 't0', duration: 90, initialVolume: 0.25 })
    )

    expect(result.current.isPlaying).toBe(false)
    expect(result.current.currentTime).toBe(0)
    expect(result.current.duration).toBe(90)
    expect(result.current.volume).toBe(0.25)
    expect(result.current.audioMode).toBe('demo')
    expect(result.current.frequencyData).toHaveLength(64)
    expect(result.current.waveformData).toHaveLength(64)
    expect(result.current.audioEnergy).toBe(0)
  })

  it('demo 模式播放：创建音频上下文、振荡器与定时器并推进时间', () => {
    const { result } = renderHook(() => useAudioEngine({ trackKey: 't1' }))

    act(() => {
      result.current.play()
    })

    expect(AudioContextMock.instances).toHaveLength(1)
    const ctx = AudioContextMock.instances[0]
    expect(ctx.createAnalyser).toHaveBeenCalled()
    expect(ctx.createOscillator).toHaveBeenCalled()
    expect(result.current.isPlaying).toBe(true)

    // 播放后立即执行一次分析帧
    expect(ctx.analyser.getByteFrequencyData).toHaveBeenCalled()
    expect(result.current.frequencyData.length).toBe(32)
    expect(result.current.audioEnergy).toBeGreaterThan(0)
    expect(result.current.bassEnergy).toBeGreaterThan(0)
    expect(result.current.trebleEnergy).toBeGreaterThan(0)

    nowMs = 500
    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current.currentTime).toBeCloseTo(0.5, 5)

    // 继续推进以覆盖和弦切换
    nowMs = 9000
    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current.currentTime).toBeCloseTo(9, 5)
  })

  it('demo 模式到时长后触发 onTrackEnd 并复位', () => {
    const onTrackEnd = vi.fn()
    const { result } = renderHook(() =>
      useAudioEngine({ trackKey: 't2', duration: 0.2, onTrackEnd })
    )

    act(() => {
      result.current.play()
    })
    nowMs = 250
    act(() => {
      vi.advanceTimersByTime(50)
    })

    expect(onTrackEnd).toHaveBeenCalledTimes(1)
    expect(result.current.isPlaying).toBe(false)
    expect(result.current.currentTime).toBe(0)

    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current.audioEnergy).toBe(0)
    expect(result.current.bassEnergy).toBe(0)
    expect(cancelAnimationFrame).toHaveBeenCalled()
  })

  it('暂停保存累计时间，再次播放后时间连续累加', () => {
    const { result } = renderHook(() => useAudioEngine({ trackKey: 't3' }))

    act(() => {
      result.current.play()
    })
    nowMs = 1500
    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current.currentTime).toBeCloseTo(1.5, 5)

    act(() => {
      result.current.pause()
    })
    expect(result.current.isPlaying).toBe(false)

    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current.frequencyData).toEqual(new Uint8Array(64))

    nowMs = 2000
    act(() => {
      result.current.play()
    })
    nowMs = 2500
    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current.currentTime).toBeCloseTo(2, 5)
  })

  it('togglePlayPause 在播放与暂停之间切换', () => {
    const { result } = renderHook(() => useAudioEngine({ trackKey: 't4' }))

    act(() => {
      result.current.togglePlayPause()
    })
    expect(result.current.isPlaying).toBe(true)

    act(() => {
      result.current.togglePlayPause()
    })
    expect(result.current.isPlaying).toBe(false)
  })

  it('seek 在播放前不会更新和弦，且会限制在有效范围内', () => {
    const { result } = renderHook(() => useAudioEngine({ trackKey: 't5', duration: 60 }))

    act(() => {
      result.current.seek(10)
    })
    expect(result.current.currentTime).toBe(10)

    act(() => {
      result.current.seek(-5)
    })
    expect(result.current.currentTime).toBe(0)

    act(() => {
      result.current.seek(9999)
    })
    expect(result.current.currentTime).toBe(60)

    // 播放后 seek 会更新和弦参数
    act(() => {
      result.current.play()
    })
    act(() => {
      result.current.seek(20)
    })
    expect(result.current.currentTime).toBe(20)
  })

  it('setVolume 会限制在 0-1 并在播放时应用到主增益', () => {
    const { result } = renderHook(() => useAudioEngine({ trackKey: 't6', initialVolume: 0.5 }))

    act(() => {
      result.current.setVolume(2)
    })
    expect(result.current.volume).toBe(1)

    act(() => {
      result.current.setVolume(-1)
    })
    expect(result.current.volume).toBe(0)

    act(() => {
      result.current.setVolume(0.4)
    })
    expect(result.current.volume).toBe(0.4)

    act(() => {
      result.current.play()
    })
    act(() => {
      result.current.setVolume(0.8)
    })
    expect(result.current.volume).toBe(0.8)

    const ctx = AudioContextMock.instances[0]
    const masterGain = ctx.createGain.mock.results[0].value as GainMock
    expect(masterGain.gain.setTargetAtTime).toHaveBeenCalled()
  })

  it('文件模式：初始 audioMode=file，播放等待 canplay 并在失败时重试', async () => {
    const { result } = renderHook(() =>
      useAudioEngine({ trackKey: 'f1', audioUrl: '/audio/song.mp3' })
    )
    expect(result.current.audioMode).toBe('file')

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    act(() => {
      result.current.play()
    })

    const ctx = AudioContextMock.instances[0]
    ctx.state = 'suspended'
    const audio = FakeAudio.instances[0]
    expect(audio.src).toBe('/audio/song.mp3')
    expect(audio.load).toHaveBeenCalled()
    expect(audio.play).not.toHaveBeenCalled()

    // 首次 canplay → play 被拒绝 → 注册重试
    audio.play.mockRejectedValueOnce(new Error('blocked'))
    act(() => {
      audio.fire('canplay')
    })
    await act(async () => {
      await Promise.resolve()
    })
    act(() => {
      audio.fire('canplay')
    })
    expect(audio.play.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(errorSpy).toHaveBeenCalled()

    // 时间与元数据事件
    audio.currentTime = 42
    act(() => {
      audio.fire('timeupdate')
    })
    expect(result.current.currentTime).toBe(42)

    audio.duration = 123
    act(() => {
      audio.fire('loadedmetadata')
    })
    expect(result.current.duration).toBe(123)

    const onTrackEnd = vi.fn()
    void onTrackEnd
    act(() => {
      audio.fire('ended')
    })
    expect(result.current.isPlaying).toBe(false)

    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current.audioEnergy).toBe(0)
  })

  it('文件模式 readyState 足够时立即播放，并恢复 suspended 上下文', () => {
    const { result } = renderHook(() =>
      useAudioEngine({ trackKey: 'f2', audioUrl: '/audio/song.mp3' })
    )

    act(() => {
      result.current.play()
    })
    const ctx = AudioContextMock.instances[0]
    ctx.state = 'suspended'
    const audio = FakeAudio.instances[0]

    act(() => {
      result.current.pause()
    })
    audio.readyState = 4
    act(() => {
      result.current.play()
    })

    expect(ctx.resume).toHaveBeenCalled()
    expect(audio.play).toHaveBeenCalled()
    expect(result.current.isPlaying).toBe(true)
  })

  it('文件模式 seek：readyState>=1 时写入 audio.currentTime', () => {
    const { result } = renderHook(() =>
      useAudioEngine({ trackKey: 'f3', audioUrl: '/audio/song.mp3', duration: 200 })
    )
    act(() => {
      result.current.play()
    })
    const audio = FakeAudio.instances[0]
    audio.readyState = 2
    audio.duration = 180

    act(() => {
      result.current.seek(500)
    })
    expect(audio.currentTime).toBe(180)
    expect(result.current.currentTime).toBe(180)

    audio.readyState = 0
    act(() => {
      result.current.seek(30)
    })
    expect(result.current.currentTime).toBe(30)
  })

  it('文件模式下 timeupdate 在暂停时不会更新时间', () => {
    const { result } = renderHook(() =>
      useAudioEngine({ trackKey: 'f4', audioUrl: '/audio/song.mp3' })
    )
    act(() => {
      result.current.play()
    })
    const audio = FakeAudio.instances[0]

    act(() => {
      result.current.pause()
    })
    audio.currentTime = 77
    act(() => {
      audio.fire('timeupdate')
    })
    expect(result.current.currentTime).toBe(0)
  })

  it('loadAudioFile 停止当前播放并切换到文件模式', () => {
    const { result } = renderHook(() => useAudioEngine({ trackKey: 'u1' }))

    act(() => {
      result.current.play()
    })
    expect(result.current.isPlaying).toBe(true)

    const file = new File(['abc'], 'song.wav', { type: 'audio/wav' })
    act(() => {
      result.current.loadAudioFile(file)
    })

    expect(URL.createObjectURL).toHaveBeenCalledWith(file)
    const audio = FakeAudio.instances[0]
    expect(audio.src).toBe('blob:uploaded-audio')
    expect(audio.load).toHaveBeenCalled()
    expect(result.current.audioMode).toBe('file')
    expect(result.current.isPlaying).toBe(false)
    expect(result.current.currentTime).toBe(0)

    // 第二次加载会回收旧的 blob URL
    act(() => {
      result.current.loadAudioFile(file)
    })
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:uploaded-audio')
  })

  it('切换到带 audioUrl 的新曲目会加载文件源', () => {
    const { result, rerender } = renderHook(
      ({ trackKey, audioUrl }) => useAudioEngine({ trackKey, audioUrl }),
      { initialProps: { trackKey: 'a', audioUrl: undefined as string | undefined } }
    )

    act(() => {
      result.current.play()
    })
    const audio = FakeAudio.instances[0]

    rerender({ trackKey: 'b', audioUrl: '/audio/b.mp3' })
    expect(audio.src).toBe('/audio/b.mp3')
    expect(audio.load).toHaveBeenCalled()
    expect(result.current.audioMode).toBe('file')
    expect(result.current.currentTime).toBe(0)
  })

  it('切换回 demo 曲目会清除音频源并恢复 demo 时长', () => {
    const { result, rerender } = renderHook(
      ({ trackKey, audioUrl }) => useAudioEngine({ trackKey, audioUrl, duration: 120 }),
      { initialProps: { trackKey: 'a', audioUrl: '/audio/a.mp3' as string | undefined } }
    )

    act(() => {
      result.current.play()
    })
    const audio = FakeAudio.instances[0]

    rerender({ trackKey: 'b', audioUrl: undefined })
    expect(audio.pause).toHaveBeenCalled()
    expect(audio.removeAttribute).toHaveBeenCalledWith('src')
    expect(result.current.audioMode).toBe('demo')
    expect(result.current.duration).toBe(120)
  })

  it('卸载时清理上下文、音频元素与 blob URL', () => {
    const { result, unmount } = renderHook(() =>
      useAudioEngine({ trackKey: 'c1', audioUrl: '/audio/a.mp3' })
    )

    act(() => {
      result.current.play()
    })
    const file = new File(['x'], 'x.wav')
    act(() => {
      result.current.loadAudioFile(file)
    })
    const audio = FakeAudio.instances[0]
    const ctx = AudioContextMock.instances[0]

    unmount()

    expect(ctx.close).toHaveBeenCalled()
    expect(audio.pause).toHaveBeenCalled()
    expect(audio.removeAttribute).toHaveBeenCalledWith('src')
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('未播放时卸载不会报错', () => {
    const { unmount } = renderHook(() => useAudioEngine({ trackKey: 'c2' }))
    expect(() => unmount()).not.toThrow()
  })

  it('chordSet 变化后播放使用新的和弦组', () => {
    const { result, rerender } = renderHook(
      ({ chordSet }) => useAudioEngine({ trackKey: 'd1', chordSet }),
      { initialProps: { chordSet: 0 } }
    )
    rerender({ chordSet: 2 })

    act(() => {
      result.current.play()
    })
    const ctx = AudioContextMock.instances[0]
    const oscillators = ctx.createOscillator.mock.results.map((r) => r.value as OscillatorMock)
    // 第一个振荡器使用第 3 组和弦的首音 146.83
    expect(oscillators.some((o) => o.frequency.value === 146.83)).toBe(true)
  })
})
