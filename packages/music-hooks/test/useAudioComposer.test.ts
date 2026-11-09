// YYC³ music-hooks — useAudioComposer 离线合成测试
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAudioComposer, type CompositionParams } from '../src/useAudioComposer'

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

class OscillatorMock extends NodeMock {
  type = 'sine'
  frequency = new ParamMock()
  start = vi.fn()
  stop = vi.fn()
}

class GainMock extends NodeMock {
  gain = new ParamMock()
}

class BufferSourceMock extends NodeMock {
  buffer: unknown = null
  start = vi.fn()
  stop = vi.fn()
}

class FilterMock extends NodeMock {
  type = 'lowpass'
  frequency = new ParamMock()
}

class CompressorMock extends NodeMock {
  threshold = new ParamMock()
  knee = new ParamMock()
  ratio = new ParamMock()
  attack = new ParamMock()
  release = new ParamMock()
}

const renderedBuffer = {
  numberOfChannels: 2,
  sampleRate: 44100,
  length: 5,
  getChannelData: (ch: number) => {
    const data = new Float32Array([0.5, -0.5, 1.5, -1.5, 0])
    return ch === 0 ? data : new Float32Array([-0.2, 0.2, 0, 0.9, -0.9])
  },
}

class OfflineAudioContextMock {
  static instances: OfflineAudioContextMock[] = []
  static rejectWith: unknown = null
  sampleRate = 44100
  destination = new NodeMock()
  startRendering = vi.fn(() =>
    OfflineAudioContextMock.rejectWith !== null
      ? Promise.reject(OfflineAudioContextMock.rejectWith)
      : Promise.resolve(renderedBuffer)
  )
  createGain = vi.fn(() => new GainMock())
  createOscillator = vi.fn(() => new OscillatorMock())
  createDynamicsCompressor = vi.fn(() => new CompressorMock())
  createBufferSource = vi.fn(() => new BufferSourceMock())
  createBiquadFilter = vi.fn(() => new FilterMock())
  createBuffer = vi.fn((channels: number, length: number, sampleRate: number) => ({
    numberOfChannels: channels,
    length,
    sampleRate,
    getChannelData: () => new Float32Array(length).fill(0.1),
  }))

  constructor(public numberOfChannels: number, public length: number, sampleRate: number) {
    this.sampleRate = sampleRate
    OfflineAudioContextMock.instances.push(this)
  }
}

const params: CompositionParams = {
  tempo: 120,
  key: 'Am',
  scale: [220, 247, 262, 294],
  chordProgression: [
    [220, 0, 262],
    [196, 247, 294],
  ],
  bassLine: [110, 98],
  rhythmPattern: [1, 2, 3, 0],
  padFreqs: [110, 220],
  duration: 24, // 2s/bar → 12 bars
  mood: 'calm',
  sections: [
    { name: 'intro', startBar: 0, endBar: 1, intensity: 0.3 },
    { name: 'verse', startBar: 1, endBar: 4, intensity: 0.5 },
    { name: 'chorus', startBar: 4, endBar: 8, intensity: 0.9 },
    { name: 'bridge', startBar: 8, endBar: 9, intensity: 0.6 },
    { name: 'outro', startBar: 9, endBar: 11, intensity: 0.2 },
  ],
}

describe('useAudioComposer', () => {
  beforeEach(() => {
    OfflineAudioContextMock.instances = []
    OfflineAudioContextMock.rejectWith = null
    vi.stubGlobal('OfflineAudioContext', OfflineAudioContextMock as any)
    ;(URL as any).createObjectURL = vi.fn(() => 'blob:composed-track')
    ;(URL as any).revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('初始状态：progress=0、isComposing=false、error=null', () => {
    const { result } = renderHook(() => useAudioComposer())
    expect(result.current.progress).toBe(0)
    expect(result.current.isComposing).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('成功合成返回 blob URL，并构建完整音频图层', async () => {
    const { result } = renderHook(() => useAudioComposer())
    let url = ''

    await act(async () => {
      url = await result.current.compose(params)
    })

    expect(url).toBe('blob:composed-track')
    expect(result.current.progress).toBe(1)
    expect(result.current.isComposing).toBe(false)
    expect(result.current.error).toBeNull()

    const ctx = OfflineAudioContextMock.instances[0]
    expect(ctx.createGain).toHaveBeenCalled()
    expect(ctx.createOscillator).toHaveBeenCalled()
    expect(ctx.createDynamicsCompressor).toHaveBeenCalled()
    expect(ctx.startRendering).toHaveBeenCalledTimes(1)

    // 打击乐三要素（kick / snare / hihat）与噪声缓冲
    expect(ctx.createBiquadFilter).toHaveBeenCalled()
    expect(ctx.createBufferSource).toHaveBeenCalled()

    // WAV blob 已生成
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    const blob = (URL.createObjectURL as any).mock.calls[0][0] as Blob
    expect(blob.type).toBe('audio/wav')
    expect(blob.size).toBeGreaterThan(44)
  })

  it('WAV 头部编码写入正确（通过 audioBufferToWav 覆盖）', async () => {
    const { result } = renderHook(() => useAudioComposer())
    await act(async () => {
      await result.current.compose(params)
    })

    const blob = (URL.createObjectURL as any).mock.calls[0][0] as Blob
    expect(blob.type).toBe('audio/wav')
    // 2 声道 × 5 采样 × 2 字节 + 44 字节头
    expect(blob.size).toBe(44 + 2 * 5 * 2)
  })

  it('startRendering 失败时记录错误并继续抛出', async () => {
    OfflineAudioContextMock.rejectWith = new Error('render failed')
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderHook(() => useAudioComposer())

    await act(async () => {
      await expect(result.current.compose(params)).rejects.toThrow('render failed')
    })

    expect(result.current.error).toBe('render failed')
    expect(result.current.isComposing).toBe(false)
    expect(errorSpy).toHaveBeenCalled()
  })

  it('非 Error 异常也会转成字符串错误信息', async () => {
    OfflineAudioContextMock.rejectWith = 'bad-tape'
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderHook(() => useAudioComposer())

    await act(async () => {
      await expect(result.current.compose(params)).rejects.toBe('bad-tape')
    })
    expect(result.current.error).toBe('bad-tape')
  })

  it('构造函数抛错时进入错误状态', async () => {
    class ThrowingContext {
      constructor() {
        throw new Error('no audio context')
      }
    }
    vi.stubGlobal('OfflineAudioContext', ThrowingContext as any)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderHook(() => useAudioComposer())

    await act(async () => {
      await expect(result.current.compose(params)).rejects.toThrow('no audio context')
    })
    expect(result.current.error).toBe('no audio context')
    expect(result.current.isComposing).toBe(false)
  })

  it('小节数量不足时不会创建和弦/旋律/打击乐', async () => {
    const { result } = renderHook(() => useAudioComposer())
    await act(async () => {
      await result.current.compose({ ...params, duration: 1 })
    })
    const ctx = OfflineAudioContextMock.instances[OfflineAudioContextMock.instances.length - 1]
    expect(ctx.createBufferSource).not.toHaveBeenCalled()
    expect(ctx.createBiquadFilter).not.toHaveBeenCalled()
    // 仅 pad 层与 LFO 的振荡器
    expect(ctx.createOscillator).toHaveBeenCalledTimes(5)
    expect(URL.createObjectURL).toHaveBeenCalled()
  })
})
