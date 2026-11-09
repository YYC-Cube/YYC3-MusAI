// YYC³ music-emotion — useXiaoyuVoice 语音播放 Hook 测试
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useXiaoyuVoice from '../src/hooks/useXiaoyuVoice'

class FakeAudioContext {
  static instances: FakeAudioContext[] = []
  close = vi.fn()
  constructor() {
    FakeAudioContext.instances.push(this)
  }
}

class FakeAudio {
  static instances: FakeAudio[] = []
  src: string
  volume = 1
  onended: (() => void) | null = null
  play = vi.fn(() => Promise.resolve())

  constructor(src: string) {
    this.src = src
    FakeAudio.instances.push(this)
  }
}

describe('useXiaoyuVoice', () => {
  beforeEach(() => {
    FakeAudio.instances = []
    FakeAudioContext.instances = []
    vi.stubGlobal('AudioContext', FakeAudioContext as any)
    vi.stubGlobal('Audio', FakeAudio as any)
    delete (window as any).webkitAudioContext
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('playEmotionSound 播放对应情绪音效并管理 isPlaying', async () => {
    const { result } = renderHook(() => useXiaoyuVoice())

    await act(async () => {
      await result.current.playEmotionSound('happy')
    })

    const audio = FakeAudio.instances[0]
    expect(audio.src).toBe('/assets/sounds/happy.wav')
    expect(audio.volume).toBe(0.7)
    expect(audio.play).toHaveBeenCalledTimes(1)
    expect(result.current.isPlaying).toBe(true)

    act(() => {
      audio.onended?.()
    })
    expect(result.current.isPlaying).toBe(false)
  })

  it('anxious 音效使用较低音量', async () => {
    const { result } = renderHook(() => useXiaoyuVoice())
    await act(async () => {
      await result.current.playEmotionSound('anxious')
    })
    expect(FakeAudio.instances[0].volume).toBe(0.4)
  })

  it('playVoice 播放语气音效', async () => {
    const { result } = renderHook(() => useXiaoyuVoice())
    await act(async () => {
      await result.current.playVoice('你好呀', 'surprised')
    })

    const audio = FakeAudio.instances[0]
    expect(audio.src).toBe('/assets/sounds/ya-surprised.wav')
    expect(audio.volume).toBe(0.5)

    act(() => {
      audio.onended?.()
    })
    expect(result.current.isPlaying).toBe(false)
  })

  it('playVoiceWithEmotion 依次播放情绪与语气音效', async () => {
    const { result } = renderHook(() => useXiaoyuVoice())
    await act(async () => {
      await result.current.playVoiceWithEmotion('一起听歌吧', 'neutral')
    })

    expect(FakeAudio.instances.map((a) => a.src)).toEqual([
      '/assets/sounds/click.wav',
      '/assets/sounds/ya-neutral.wav',
    ])
    expect(result.current.isPlaying).toBe(true)
  })

  it('转换后未知情绪音效地址为空字符串', async () => {
    const { result } = renderHook(() => useXiaoyuVoice())
    await act(async () => {
      await result.current.playEmotionSound('unknown' as any)
    })
    expect(FakeAudio.instances[0].src).toBeUndefined()
  })

  it('复用同一个 AudioContext', async () => {
    const Ctor = vi.fn(() => new FakeAudioContext())
    vi.stubGlobal('AudioContext', Ctor as any)
    const { result } = renderHook(() => useXiaoyuVoice())

    await act(async () => {
      await result.current.playEmotionSound('happy')
      await result.current.playVoice('hi', 'happy')
    })

    expect(Ctor).toHaveBeenCalledTimes(1)
  })

  it('cleanup 关闭 AudioContext 且可重复调用', async () => {
    const { result } = renderHook(() => useXiaoyuVoice())

    await act(async () => {
      await result.current.playEmotionSound('happy')
    })

    act(() => {
      result.current.cleanup()
    })
    expect(FakeAudioContext.instances[0].close).toHaveBeenCalledTimes(1)

    expect(() => {
      act(() => {
        result.current.cleanup()
      })
    }).not.toThrow()
  })

  it('webkitAudioContext 回退可用', async () => {
    delete (globalThis as any).AudioContext
    const Ctor = vi.fn(() => new FakeAudioContext())
    ;(window as any).webkitAudioContext = Ctor

    const { result } = renderHook(() => useXiaoyuVoice())
    await act(async () => {
      await result.current.playEmotionSound('happy')
    })
    expect(Ctor).toHaveBeenCalledTimes(1)
    delete (window as any).webkitAudioContext
  })

  it('播放失败时 Promise 拒绝', async () => {
    vi.stubGlobal('Audio', class extends FakeAudio {
      play = vi.fn(() => Promise.reject(new Error('autoplay blocked')))
    } as any)

    const { result } = renderHook(() => useXiaoyuVoice())
    await act(async () => {
      await expect(result.current.playEmotionSound('happy')).rejects.toThrow('autoplay blocked')
    })
  })
})
