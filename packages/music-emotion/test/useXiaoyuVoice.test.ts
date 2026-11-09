// YYC³ music-emotion — useXiaoyuVoice 语音播放 Hook 测试
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useXiaoyuVoice from '../src/hooks/useXiaoyuVoice'

class FakeAudio {
  static instances: FakeAudio[] = []
  initialSrc: string
  src: string
  volume = 1
  onended: (() => void) | null = null
  play = vi.fn(() => Promise.resolve())
  pause = vi.fn()

  constructor(src: string) {
    this.src = src
    this.initialSrc = src
    FakeAudio.instances.push(this)
  }
}

describe('useXiaoyuVoice', () => {
  beforeEach(() => {
    FakeAudio.instances = []
    vi.stubGlobal('Audio', FakeAudio as any)
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

    expect(FakeAudio.instances.map((a) => a.initialSrc)).toEqual([
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

  it('cleanup 停止当前音频并可重复调用', async () => {
    const { result } = renderHook(() => useXiaoyuVoice())

    await act(async () => {
      await result.current.playEmotionSound('happy')
    })
    const audio = FakeAudio.instances[0]

    act(() => {
      result.current.cleanup()
    })
    expect(audio.pause).toHaveBeenCalledTimes(1)
    expect(audio.src).toBe('')
    expect(result.current.isPlaying).toBe(false)

    expect(() => {
      act(() => {
        result.current.cleanup()
      })
    }).not.toThrow()
  })

  it('播放新音频时停止上一条，避免叠加播放', async () => {
    const { result } = renderHook(() => useXiaoyuVoice())

    await act(async () => {
      await result.current.playEmotionSound('happy')
    })
    const first = FakeAudio.instances[0]

    await act(async () => {
      await result.current.playVoice('hi', 'happy')
    })

    expect(first.pause).toHaveBeenCalledTimes(1)
    expect(result.current.isPlaying).toBe(true)
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
