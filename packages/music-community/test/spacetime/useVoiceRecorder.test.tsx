/**
 * @file useVoiceRecorder 直打 hook 测试
 * @description 既有 spacetime-panel.test.tsx 间接覆盖录制主链路；本文件直接 renderHook，
 *              聚焦权限拒绝、mimeType 回退、WebAudio 不可用/解码失败回退、
 *              试听播放/暂停/播完、丢弃与卸载清理分支。
 *              （music-community vitest project 仅匹配 *.test.tsx，故以 .tsx 承载）
 */
import { act, renderHook, waitFor, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Blob as NodeBlob } from 'node:buffer'
import { useVoiceRecorder } from '../../src/components/spacetime/useVoiceRecorder'

type AnyRec = Record<string, any>

const mocks = vi.hoisted(() => ({
  getSharedAudioContext: vi.fn(),
}))

vi.mock('@yyc3/music-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@yyc3/music-utils')>()
  return { ...actual, getSharedAudioContext: mocks.getSharedAudioContext }
})

class FakeMediaRecorder {
  static instances: FakeMediaRecorder[] = []
  static isTypeSupported = vi.fn(() => true)
  state = 'inactive'
  mimeType: string
  ondataavailable: ((e: AnyRec) => void) | null = null
  onstop: (() => void) | null = null
  constructor(public stream: AnyRec, opts?: AnyRec) {
    this.mimeType = opts?.mimeType || ''
    FakeMediaRecorder.instances.push(this)
  }
  start() {
    this.state = 'recording'
  }
  stop() {
    this.state = 'inactive'
    this.onstop?.()
  }
}

class FakeAudio {
  static instances: FakeAudio[] = []
  src: string
  onended: (() => void) | null = null
  play = vi.fn(async () => {})
  pause = vi.fn()
  constructor(src: string) {
    this.src = src
    FakeAudio.instances.push(this)
  }
}

/** 波形源数据：首块振幅 1.0，其余 0.5 → 归一化后 [1, 0.5, ...] */
function makeFakeBuffer() {
  const raw = new Float32Array(4000)
  for (let i = 0; i < 4000; i += 1) raw[i] = i < 100 ? 1 : 0.5
  return { numberOfChannels: 1, length: 4000, getChannelData: () => raw }
}

const getUserMedia = vi.fn()

beforeEach(() => {
  localStorage.clear()
  FakeMediaRecorder.instances = []
  FakeAudio.instances = []
  FakeMediaRecorder.isTypeSupported = vi.fn(() => true)
  getUserMedia.mockReset()
  getUserMedia.mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] })
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  })
  mocks.getSharedAudioContext.mockReset()
  mocks.getSharedAudioContext.mockReturnValue({
    decodeAudioData: vi.fn(async () => makeFakeBuffer()),
  })
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:preview'),
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  })
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder as unknown as typeof MediaRecorder)
  vi.stubGlobal('Audio', FakeAudio as unknown as typeof Audio)
  // jsdom 的 Blob 缺少 arrayBuffer()（波形解码依赖），以 Node 实现补齐
  vi.stubGlobal('Blob', NodeBlob as unknown as typeof Blob)
})

afterEach(() => {
  cleanup()
  delete (navigator as AnyRec).mediaDevices
  delete (URL as AnyRec).createObjectURL
  delete (URL as AnyRec).revokeObjectURL
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

/** 启动一次录音并触发 ondataavailable */
async function startWithChunk(result: AnyRec) {
  await act(async () => {
    await result.current.startRecording()
  })
  const recorder = FakeMediaRecorder.instances[0]
  act(() => {
    recorder.ondataavailable?.({ data: new Blob(['abc'], { type: 'audio/webm' }) })
  })
  return recorder
}

describe('useVoiceRecorder · 支持探测与录制', () => {
  it('无 mediaDevices 时 voiceSupported 为 false', () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined })
    const { result } = renderHook(() => useVoiceRecorder())
    expect(result.current.voiceSupported).toBe(false)
  })

  it('录制成功链路：计时、分片、停止后生成 blob/URL/波形', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    const { result } = renderHook(() => useVoiceRecorder())
    expect(result.current.voiceSupported).toBe(true)

    const recorder = await startWithChunk(result)

    expect(recorder.mimeType).toBe('audio/webm;codecs=opus')
    expect(result.current.isRecording).toBe(true)

    act(() => {
      vi.advanceTimersByTime(2100)
    })
    expect(result.current.recordingDuration).toBe(2)

    await act(async () => {
      result.current.stopRecording()
    })

    expect(result.current.isRecording).toBe(false)
    expect(result.current.audioBlob).toBeInstanceOf(Blob)
    expect(result.current.audioUrl).toBe('blob:preview')
    await waitFor(() => {
      expect(result.current.audioWaveform).toHaveLength(40)
    })
    // 首块归一化为 1，其余块为 0.5
    expect(result.current.audioWaveform[0]).toBeCloseTo(1, 5)
    expect(result.current.audioWaveform[10]).toBeCloseTo(0.5, 5)
  })

  it('权限拒绝时记录错误并标记不支持', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    getUserMedia.mockRejectedValue(new Error('NotAllowedError'))
    const { result } = renderHook(() => useVoiceRecorder())

    await act(async () => {
      await result.current.startRecording()
    })

    expect(errorSpy).toHaveBeenCalledWith('Mic access error:', expect.any(Error))
    expect(result.current.voiceSupported).toBe(false)
    expect(result.current.isRecording).toBe(false)
    expect(FakeMediaRecorder.instances).toHaveLength(0)
    errorSpy.mockRestore()
  })

  it('不支持 opus 编码时 mimeType 回退 audio/webm', async () => {
    FakeMediaRecorder.isTypeSupported = vi.fn(() => false)
    const { result } = renderHook(() => useVoiceRecorder())

    await act(async () => {
      await result.current.startRecording()
    })

    expect(FakeMediaRecorder.instances[0].mimeType).toBe('audio/webm')
  })

  it('未开始录音时 stopRecording 直接复位不报错', () => {
    const { result } = renderHook(() => useVoiceRecorder())
    expect(() => result.current.stopRecording()).not.toThrow()
    expect(result.current.isRecording).toBe(false)
  })

  it('空分片（size 为 0）被跳过且不影响录制状态', async () => {
    const { result } = renderHook(() => useVoiceRecorder())
    await act(async () => {
      await result.current.startRecording()
    })
    const recorder = FakeMediaRecorder.instances[0]
    expect(() => recorder.ondataavailable?.({ data: new Blob([], { type: 'audio/webm' }) })).not.toThrow()
    expect(result.current.isRecording).toBe(true)

    await act(async () => {
      result.current.stopRecording()
    })
    expect(result.current.audioUrl).toBe('blob:preview')
  })
})

describe('useVoiceRecorder · 波形与试听', () => {
  it('WebAudio 不可用时波形回退为 0.3 平值', async () => {
    mocks.getSharedAudioContext.mockReturnValue(null)
    const { result } = renderHook(() => useVoiceRecorder())
    await act(async () => {
      await result.current.startRecording()
    })
    await act(async () => {
      result.current.stopRecording()
    })
    await waitFor(() => {
      expect(result.current.audioWaveform).toHaveLength(40)
    })
    expect(result.current.audioWaveform.every((v: number) => v === 0.3)).toBe(true)
  })

  it('解码失败时波形回退为 0.3 平值', async () => {
    mocks.getSharedAudioContext.mockReturnValue({
      decodeAudioData: vi.fn(async () => {
        throw new Error('corrupt audio')
      }),
    })
    const { result } = renderHook(() => useVoiceRecorder())
    await act(async () => {
      await result.current.startRecording()
    })
    await act(async () => {
      result.current.stopRecording()
    })
    await waitFor(() => {
      expect(result.current.audioWaveform).toHaveLength(40)
    })
    expect(result.current.audioWaveform.every((v: number) => v === 0.3)).toBe(true)
  })

  it('无录音时 togglePreview 为 no-op', () => {
    const { result } = renderHook(() => useVoiceRecorder())
    act(() => result.current.togglePreview())
    expect(result.current.isPlayingPreview).toBe(false)
    expect(FakeAudio.instances).toHaveLength(0)
  })

  it('试听切换：播放、暂停与播完复位', async () => {
    const { result } = renderHook(() => useVoiceRecorder())
    await act(async () => {
      await result.current.startRecording()
    })
    await act(async () => {
      result.current.stopRecording()
    })
    await waitFor(() => expect(result.current.audioUrl).toBe('blob:preview'))

    act(() => result.current.togglePreview())
    expect(FakeAudio.instances).toHaveLength(1)
    expect(FakeAudio.instances[0].src).toBe('blob:preview')
    expect(FakeAudio.instances[0].play).toHaveBeenCalled()
    expect(result.current.isPlayingPreview).toBe(true)

    act(() => result.current.togglePreview())
    expect(FakeAudio.instances[0].pause).toHaveBeenCalled()
    expect(result.current.isPlayingPreview).toBe(false)

    act(() => result.current.togglePreview())
    expect(result.current.isPlayingPreview).toBe(true)
    act(() => FakeAudio.instances[0].onended?.())
    expect(result.current.isPlayingPreview).toBe(false)
  })

  it('discardRecording 释放 URL 并清空全部状态', async () => {
    const { result } = renderHook(() => useVoiceRecorder())
    await act(async () => {
      await result.current.startRecording()
    })
    await act(async () => {
      result.current.stopRecording()
    })
    await waitFor(() => expect(result.current.audioUrl).toBe('blob:preview'))
    act(() => result.current.togglePreview())

    act(() => result.current.discardRecording())

    expect(result.current.audioBlob).toBeNull()
    expect(result.current.audioUrl).toBeNull()
    expect(result.current.audioWaveform).toEqual([])
    expect(result.current.recordingDuration).toBe(0)
    expect(result.current.isPlayingPreview).toBe(false)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
  })

  it('卸载时释放已生成的 audio URL', async () => {
    const { result, unmount } = renderHook(() => useVoiceRecorder())
    await act(async () => {
      await result.current.startRecording()
    })
    await act(async () => {
      result.current.stopRecording()
    })
    await waitFor(() => expect(result.current.audioUrl).toBe('blob:preview'))

    unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
  })
})
