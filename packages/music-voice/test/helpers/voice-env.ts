/**
 * @file 语音测试环境辅助
 * @description 在单个测试内局部队列化语音识别/语音合成/麦克风等浏览器 API，
 *              不修改共享 setup，保证测试不真录音、不真发声、不挂起。
 */
import { vi } from 'vitest'

export interface MockVoice {
  voiceURI: string
  name: string
  lang: string
  localService: boolean
  default: boolean
}

/** 构造一组覆盖中/英/法，且包含本地与远端语音的测试数据 */
export function createVoices(): MockVoice[] {
  return [
    { voiceURI: 'zh-local', name: 'Chinese Local Female', lang: 'zh-CN', localService: true, default: false },
    { voiceURI: 'zh-remote', name: 'Chinese Remote', lang: 'zh-CN', localService: false, default: false },
    { voiceURI: 'en-local', name: 'English Local', lang: 'en-US', localService: true, default: true },
    { voiceURI: 'fr-remote', name: 'French Remote', lang: 'fr-FR', localService: false, default: false },
  ]
}

/** 音频节点工厂：createMediaStreamSource / createBiquadFilter / createGain / close */
export function createAudioContextMock() {
  const connectable = () => ({ connect: vi.fn() })
  return {
    destination: {},
    close: vi.fn(),
    createMediaStreamSource: vi.fn(() => connectable()),
    createBiquadFilter: vi.fn(() => ({
      type: '',
      frequency: { value: 0 },
      Q: { value: 0 },
      connect: vi.fn(),
    })),
    createGain: vi.fn(() => ({ gain: { value: 0 }, connect: vi.fn() })),
  }
}

export interface MicEnv {
  track: { stop: ReturnType<typeof vi.fn> }
  stream: { getTracks: () => Array<{ stop: ReturnType<typeof vi.fn> }> }
  getUserMedia: ReturnType<typeof vi.fn>
  audioContext: ReturnType<typeof createAudioContextMock>
  restore: () => void
}

/** 注入 navigator.mediaDevices 与 window.AudioContext */
export function installMicrophoneEnv(options: { reject?: boolean } = {}): MicEnv {
  const track = { stop: vi.fn() }
  const stream = { getTracks: () => [track] }
  const getUserMedia = options.reject
    ? vi.fn().mockRejectedValue(new Error('permission denied'))
    : vi.fn().mockResolvedValue(stream)

  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  })

  const audioContext = createAudioContextMock()

  class MockAudioContext {
    destination = audioContext.destination
    close = audioContext.close
    createMediaStreamSource = audioContext.createMediaStreamSource
    createBiquadFilter = audioContext.createBiquadFilter
    createGain = audioContext.createGain
  }

  Object.defineProperty(window, 'AudioContext', { configurable: true, writable: true, value: MockAudioContext })

  return {
    track,
    stream,
    getUserMedia,
    audioContext,
    restore: () => {
      delete (navigator as unknown as Record<string, unknown>).mediaDevices
      delete (window as unknown as Record<string, unknown>).AudioContext
    },
  }
}

export interface MockRecognitionInstance {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  audioContext?: unknown
  onstart?: () => void
  onresult?: (event: unknown) => void
  onend?: () => void
  onerror?: (event: unknown) => void
  onspeechend?: () => void
  onaudiostart?: () => void
  onaudioend?: () => void
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
}

export interface RecognitionEnv {
  instances: MockRecognitionInstance[]
  latest: () => MockRecognitionInstance
  restore: () => void
}

/** 注入窗口级 SpeechRecognition / webkitSpeechRecognition 构造器 */
export function installRecognitionEnv(options: {
  audioContext?: unknown
  global?: 'SpeechRecognition' | 'webkitSpeechRecognition'
} = {}): RecognitionEnv {
  const instances: MockRecognitionInstance[] = []
  const key = options.global ?? 'webkitSpeechRecognition'

  class MockSpeechRecognition {
    lang = ''
    continuous = false
    interimResults = false
    maxAlternatives = 1
    audioContext = options.audioContext
    onstart?: () => void
    onresult?: (event: unknown) => void
    onend?: () => void
    onerror?: (event: unknown) => void
    onspeechend?: () => void
    onaudiostart?: () => void
    onaudioend?: () => void
    start = vi.fn()
    stop = vi.fn()

    constructor() {
      instances.push(this as unknown as MockRecognitionInstance)
    }
  }

  Object.defineProperty(window, key, { configurable: true, writable: true, value: MockSpeechRecognition })

  return {
    instances,
    latest: () => instances[instances.length - 1],
    restore: () => {
      delete (window as unknown as Record<string, unknown>)[key]
    },
  }
}

export interface SynthesisEnv {
  synthesis: {
    speaking: boolean
    paused: boolean
    getVoices: ReturnType<typeof vi.fn>
    speak: ReturnType<typeof vi.fn>
    cancel: ReturnType<typeof vi.fn>
    pause: ReturnType<typeof vi.fn>
    resume: ReturnType<typeof vi.fn>
    addEventListener: ReturnType<typeof vi.fn>
    removeEventListener: ReturnType<typeof vi.fn>
  }
  utterances: Array<Record<string, any>>
  setVoices: (voices: MockVoice[]) => void
  emitVoicesChanged: () => void
  hasVoicesListener: () => boolean
  restore: () => void
}

/** 注入 window.speechSynthesis 与 SpeechSynthesisUtterance */
export function installSynthesisEnv(options: { voices?: MockVoice[] } = {}): SynthesisEnv {
  let voices = [...(options.voices ?? createVoices())]
  let voicesListener: (() => void) | null = null
  const utterances: Array<Record<string, any>> = []

  class MockUtterance {
    text: string
    lang = ''
    volume = 1
    rate = 1
    pitch = 1
    voice: unknown = null
    onstart?: () => void
    onend?: () => void
    onerror?: (event: { error: string }) => void
    onpause?: () => void
    onresume?: () => void
    onboundary?: (event: { charIndex: number; charLength: number; name: string }) => void
    onmark?: (event: { name: string }) => void

    constructor(text: string) {
      this.text = text
      utterances.push(this as unknown as Record<string, any>)
    }
  }

  const getVoices = vi.fn(() => voices)
  const synthesis = {
    speaking: false,
    paused: false,
    getVoices,
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    addEventListener: vi.fn((event: string, callback: () => void) => {
      if (event === 'voiceschanged') voicesListener = callback
    }),
    removeEventListener: vi.fn((event: string, callback: () => void) => {
      if (event === 'voiceschanged' && voicesListener === callback) voicesListener = null
    }),
  }

  Object.defineProperty(window, 'speechSynthesis', { configurable: true, writable: true, value: synthesis })
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    configurable: true,
    writable: true,
    value: MockUtterance,
  })
  // 兼容直接以全局变量访问的分支（jsdom 下 window 即 globalThis）
  ;(globalThis as unknown as Record<string, unknown>).speechSynthesis = synthesis
  ;(globalThis as unknown as Record<string, unknown>).SpeechSynthesisUtterance = MockUtterance

  return {
    synthesis,
    utterances,
    setVoices: (next: MockVoice[]) => {
      voices = next
    },
    emitVoicesChanged: () => voicesListener?.(),
    hasVoicesListener: () => voicesListener !== null,
    restore: () => {
      delete (window as unknown as Record<string, unknown>).speechSynthesis
      delete (window as unknown as Record<string, unknown>).SpeechSynthesisUtterance
      delete (globalThis as unknown as Record<string, unknown>).speechSynthesis
      delete (globalThis as unknown as Record<string, unknown>).SpeechSynthesisUtterance
    },
  }
}
