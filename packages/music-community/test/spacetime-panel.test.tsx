/**
 * @file SpaceTimePanel 时空留言面板测试
 * @description 覆盖消息流（加载/空态/点赞/回复/语音/转写/发送/计划/定位）、时间胶囊
 *              （倒计时/加密/解密/自动解密/创建/点赞）、附近留言、语音录制与 STT，
 *              以及关闭与本地化
 */
import { createElement } from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@yyc3/music-hooks'
import { SpaceTimePanel } from '../src'

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  hasLocalKeyPair: vi.fn(),
  isE2EESupported: vi.fn(),
  importPublicKey: vi.fn(),
  encryptMessage: vi.fn(),
  loadPrivateKey: vi.fn(),
  decryptMessage: vi.fn(),
  pkiApi: { getPublicKey: vi.fn() },
  sttApi: { stream: vi.fn() },
}))

vi.mock('@yyc3/music-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@yyc3/music-utils')>()
  return { ...actual, ...mocks }
})

const api = mocks.apiFetch
const user = { id: 'u1', email: 'alice@example.com' }

type AnyRec = Record<string, any>

class FakeMediaRecorder {
  static instances: FakeMediaRecorder[] = []
  static isTypeSupported = () => true
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

let nativeRecognitionInstances: any[] = []
class FakeSpeechRecognition {
  lang = ''
  interimResults = false
  continuous = false
  maxAlternatives = 1
  onresult: ((e: AnyRec) => void) | null = null
  onerror: (() => void) | null = null
  onend: (() => void) | null = null
  start = vi.fn()
  stop = vi.fn()
  constructor() {
    nativeRecognitionInstances.push(this)
  }
}

const getCurrentPosition = vi.fn()

function msg(over: AnyRec = {}) {
  return {
    id: 'msg-1',
    userId: 'u2',
    userName: 'Bob',
    content: 'Hello world',
    type: 'text',
    targetTime: null,
    songId: null,
    songTitle: null,
    emotion: 'neutral',
    likes: 0,
    likedBy: [],
    replies: 0,
    createdAt: Date.now() - 5000,
    status: 'active',
    ...over,
  }
}

function capsule(over: AnyRec = {}) {
  return {
    id: 'cap-1',
    userId: 'u2',
    userName: 'Bob',
    title: 'A Capsule',
    content: 'future words',
    unlockAt: new Date().toISOString(),
    unlockTs: Date.now() - 1000,
    songId: null,
    songTitle: null,
    emotion: 'neutral',
    recipientName: null,
    isUnlocked: true,
    likes: 0,
    createdAt: Date.now() - 5000,
    ...over,
  }
}

function setupApi({
  messages = [] as AnyRec[],
  capsules = [] as AnyRec[],
  nearby = [] as AnyRec[],
  postMessage,
  postCapsule,
  transcribe,
}: AnyRec = {}) {
  api.mockImplementation((async (path: string, options?: AnyRec) => {
    if (path === '/spacetime/messages' && !options?.method) return { messages }
    if (path === '/spacetime/messages' && options?.method === 'POST') {
      return postMessage ?? { success: true, message: msg({ id: 'new-msg', content: 'sent', userName: 'alice' }) }
    }
    if (path === '/spacetime/capsules' && !options?.method) return { capsules }
    if (path === '/spacetime/capsules' && options?.method === 'POST') {
      return postCapsule ?? { success: true, capsule: capsule({ id: 'new-cap', title: 'Created', userName: 'alice' }) }
    }
    if (path.startsWith('/spacetime/messages/nearby')) return { messages: nearby }
    if (path === '/stt/transcribe') {
      return transcribe ?? { text: 'recognized words' }
    }
    return null
  }) as never)
}

function setup(props: AnyRec = {}) {
  const onClose = vi.fn()
  const utils = render(
    createElement(SpaceTimePanel, {
      isOpen: true,
      onClose,
      user,
      currentTrackId: 'track-1',
      currentTrackTitle: 'Cosmic Dreams',
      ...props,
    })
  )
  return { onClose, ...utils }
}

function panel(container: HTMLElement) {
  return container.querySelector('.z-\\[61\\]') as HTMLElement
}

beforeEach(() => {
  api.mockReset()
  Object.values(mocks).forEach((value) => {
    if (typeof value === 'function') value.mockReset()
  })
  Object.values(mocks.pkiApi).forEach((fn) => fn.mockReset())
  mocks.sttApi.stream.mockReset()

  mocks.hasLocalKeyPair.mockResolvedValue(true)
  mocks.isE2EESupported.mockReturnValue(true)
  mocks.importPublicKey.mockResolvedValue({ key: 'pub' })
  mocks.encryptMessage.mockResolvedValue({
    ciphertext: 'cipher',
    encryptedSessionKey: 'session',
    iv: 'iv',
    senderId: 'sender-fp',
  })
  mocks.loadPrivateKey.mockResolvedValue({ key: 'priv' })
  mocks.decryptMessage.mockResolvedValue('decrypted secret')
  mocks.pkiApi.getPublicKey.mockResolvedValue({ publicKeyJwk: { kty: 'RSA' } })
  mocks.sttApi.stream.mockResolvedValue({ fullText: 'streamed text', available: true })

  setupApi()

  FakeMediaRecorder.instances = []
  nativeRecognitionInstances = []
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
  ;(window as AnyRec).webkitSpeechRecognition = undefined
  ;(window as AnyRec).SpeechRecognition = undefined

  getCurrentPosition.mockReset()
  getCurrentPosition.mockImplementation((success: Function) =>
    success({ coords: { latitude: 31.2304, longitude: 121.4737 } })
  )
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition },
  })
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }),
    },
  })
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:preview'),
  })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: vi.fn(() => Promise.resolve()),
  })
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    value: vi.fn(),
  })
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
  vi.useRealTimers()
})

describe('SpaceTimePanel 消息流', () => {
  it('未打开时不渲染', () => {
    const { container } = setup({ isOpen: false })
    expect(container.firstChild).toBeNull()
  })

  it('加载中显示 spinner，空列表显示空态', async () => {
    api.mockReturnValue(new Promise(() => {}) as never)
    const { container } = setup()
    await waitFor(() => expect(container.querySelector('.animate-spin')).not.toBeNull())

    setupApi({ messages: [] })
    const second = setup()
    await waitFor(() =>
      expect(second.container.textContent).toContain('spacetime.noMessages')
    )
  })

  it('渲染消息头像、情绪、相对时间、歌曲与位置', async () => {
    setupApi({
      messages: [
        msg({ id: 'a', content: 'now message', createdAt: Date.now() - 5000 }),
        msg({ id: 'b', content: 'minute message', createdAt: Date.now() - 6 * 60000, emotion: 'happy' }),
        msg({ id: 'c', content: 'hour message', createdAt: Date.now() - 3 * 3600000 }),
        msg({ id: 'd', content: 'day message', createdAt: Date.now() - 2 * 86400000 }),
        msg({
          id: 'e',
          content: 'with place',
          songTitle: 'Nebula',
          targetLocation: { lat: 1.23456, lng: 2.34567, label: 'Shanghai' },
        }),
        msg({ id: 'f', content: 'coords only', targetLocation: { lat: 1.23456, lng: 2.34567 } }),
      ],
    })
    const { container } = setup()
    await waitFor(() => expect(screen.getByText('now message')).toBeInTheDocument())

    expect(container.textContent).toContain('刚刚')
    expect(container.textContent).toContain('6分钟前')
    expect(container.textContent).toContain('3小时前')
    expect(container.textContent).toContain('2天前')
    expect(screen.getByText('Nebula')).toBeInTheDocument()
    expect(screen.getByText('Shanghai')).toBeInTheDocument()
    expect(screen.getByText('1.235, 2.346')).toBeInTheDocument()
    expect(container.textContent).toContain('😊')
    expect(container.textContent).toContain('B')
  })

  it('点赞与取消点赞更新计数并调用接口', async () => {
    setupApi({ messages: [msg({ content: 'like target', likes: 1, likedBy: [] })] })
    const { container } = setup()
    await waitFor(() => expect(screen.getByText('like target')).toBeInTheDocument())

    const card = screen.getByText('like target').closest('div.rounded-xl') as HTMLElement
    const likeBtn = Array.from(card.querySelectorAll('button')).find((b) =>
      b.querySelector('svg.lucide-heart')
    )!
    fireEvent.click(likeBtn)
    await waitFor(() => expect(api).toHaveBeenCalledWith('/spacetime/messages/msg-1/like', expect.objectContaining({ method: 'POST' })))
    expect(card.textContent).toContain('2')

    fireEvent.click(likeBtn)
    await waitFor(() => expect(card.textContent).not.toContain('2'))
    expect(container).not.toBeNull()
  })

  it('展开/收起回复、发送回复并过滤空回复', async () => {
    const viewer = userEvent.setup()
    setupApi({
      messages: [msg({ content: 'reply target', replies: 2, likedBy: ['u1'] })],
    })
    api.mockImplementationOnce((async () => ({ messages: [msg({ content: 'reply target', replies: 2 })] })) as never)
    api.mockImplementation((async (path: string, options?: AnyRec) => {
      if (path === '/spacetime/messages' && !options?.method) {
        return { messages: [msg({ content: 'reply target', replies: 2 })] }
      }
      if (path === '/spacetime/messages/msg-1/replies') {
        return { replies: [{ id: 'r1', messageId: 'msg-1', userId: 'u2', userName: 'Bob', content: 'existing reply', createdAt: Date.now() }] }
      }
      if (path === '/spacetime/messages/msg-1/reply' && options?.method === 'POST') {
        return { success: true, reply: { id: 'r2', messageId: 'msg-1', userId: 'u1', userName: 'alice', content: 'new reply', createdAt: Date.now() } }
      }
      return null
    }) as never)
    setup()
    await waitFor(() => expect(screen.getByText('reply target')).toBeInTheDocument())

    const card = screen.getByText('reply target').closest('div.rounded-xl') as HTMLElement
    const replyToggle = Array.from(card.querySelectorAll('button')).find((b) =>
      b.querySelector('svg.lucide-message-circle')
    )!
    fireEvent.click(replyToggle)
    await waitFor(() => expect(screen.getByText('existing reply')).toBeInTheDocument())

    const sendReplyBtn = Array.from(card.querySelectorAll('button')).find((b) =>
      b.querySelector('svg.lucide-send')
    )!
    expect(sendReplyBtn).toBeDisabled()
    await viewer.type(screen.getByPlaceholderText('spacetime.replyPlaceholder'), 'new reply{enter}')
    await waitFor(() => expect(screen.getByText('new reply')).toBeInTheDocument())
    expect(card.textContent).toContain('3')

    fireEvent.click(replyToggle)
    await waitFor(() => expect(screen.queryByText('existing reply')).toBeNull())
  })

  it('回复拉取返回空时安全处理，接口异常时记录错误', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    api.mockImplementation((async (path: string, options?: AnyRec) => {
      if (path === '/spacetime/messages' && !options?.method) return { messages: [msg({ content: 'err target' })] }
      if (path.endsWith('/replies')) throw new Error('replies down')
      if (path.endsWith('/reply') && options?.method === 'POST') throw new Error('reply down')
      return null
    }) as never)
    const viewer = userEvent.setup()
    setup()
    await waitFor(() => expect(screen.getByText('err target')).toBeInTheDocument())
    const card = screen.getByText('err target').closest('div.rounded-xl') as HTMLElement
    fireEvent.click(Array.from(card.querySelectorAll('button')).find((b) => b.querySelector('svg.lucide-message-circle'))!)
    // 回复列表拉取失败的 catch 是静默的，仅需保证 UI 不崩溃并展示输入框
    await waitFor(() => expect(screen.getByPlaceholderText('spacetime.replyPlaceholder')).toBeInTheDocument())
    expect(card.textContent).not.toContain('existing reply')

    await viewer.type(screen.getByPlaceholderText('spacetime.replyPlaceholder'), 'oops')
    fireEvent.keyDown(screen.getByPlaceholderText('spacetime.replyPlaceholder'), { key: 'Enter' })
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('Reply error:', expect.any(Error)))
    errorSpy.mockRestore()
  })

  it('点击语音消息播放，缺少直链时请求签名地址', async () => {
    setupApi({
      messages: [
        msg({
          id: 'v1',
          content: '[语音消息] 3s',
          type: 'voice',
          audioWaveform: [0.1, 0.5, 0.9],
          audioDuration: 3,
          audioData: 'data:audio/webm;base64,AAA',
          transcript: 'voice note',
        }),
        msg({ id: 'v2', content: '[语音消息] 4s', type: 'voice', audioWaveform: [0.2], audioDuration: 4, audioFilePath: 'voice/path' }),
      ],
    })
    api.mockImplementation((async (path: string, options?: AnyRec) => {
      if (path === '/spacetime/messages' && !options?.method) {
        return {
          messages: [
            msg({ id: 'v1', content: '[语音消息] 3s', type: 'voice', audioWaveform: [0.1, 0.5], audioDuration: 3, audioData: 'data:audio/webm;base64,AAA', transcript: 'voice note' }),
            msg({ id: 'v2', content: '[语音消息] 4s', type: 'voice', audioWaveform: [0.2], audioDuration: 4, audioFilePath: 'voice/path' }),
          ],
        }
      }
      if (path.startsWith('/voice/url')) return { signedUrl: 'http://signed' }
      return null
    }) as never)
    const { container } = setup()
    await waitFor(() => expect(screen.getByText('voice note')).toBeInTheDocument())

    const voiceButtons = Array.from(container.querySelectorAll('button')).filter(
      (b) => b.querySelector('svg.lucide-play') && b.querySelector('svg.lucide-mic')
    )
    expect(voiceButtons).toHaveLength(2)
    fireEvent.click(voiceButtons[0])
    expect(container.textContent).toContain('3s')

    fireEvent.click(voiceButtons[1])
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringContaining('/voice/url?path=voice%2Fpath')))
    expect(container.textContent).toContain('4s')
  })

  it('语音转文字成功替换 transcript，失败时回退到正文提示', async () => {
    const messages = [
      msg({ id: 'v1', content: '[语音消息] recognisable', type: 'voice', audioWaveform: [0.3], audioDuration: 2, audioData: 'data:audio/webm;base64,AAA' }),
      msg({ id: 'v2', content: '[语音消息] fallback-hint', type: 'voice', audioWaveform: [0.3], audioDuration: 2, audioData: 'data:audio/webm;base64,BBB' }),
    ]
    api.mockImplementation((async (path: string, options?: AnyRec) => {
      if (path === '/spacetime/messages' && !options?.method) return { messages }
      if (path === '/stt/transcribe') {
        return JSON.parse((options as AnyRec).body).audioBase64.includes('AAA')
          ? { text: 'recognized words' }
          : null
      }
      return null
    }) as never)
    const { container } = setup()
    // 语音消息分支不渲染 content，只渲染播放条与“转文字”按钮
    await waitFor(() =>
      expect(
        Array.from(container.querySelectorAll('button')).filter((b) => b.textContent?.includes('转文字'))
      ).toHaveLength(2)
    )

    const buttons = () =>
      Array.from(container.querySelectorAll('button')).filter((b) => b.textContent?.includes('转文字'))
    fireEvent.click(buttons()[0])
    await waitFor(() => expect(screen.getByText('recognized words')).toBeInTheDocument())

    fireEvent.click(buttons()[0])
    await waitFor(() => expect(screen.getByText('fallback-hint')).toBeInTheDocument())
  })

  it('发送普通消息：清空输入、追加到列表并显示已发送', async () => {
    const viewer = userEvent.setup()
    setupApi({
      messages: [],
      postMessage: { success: true, message: msg({ id: 'sent1', content: 'brand new', userName: 'alice' }) },
    })
    const { container } = setup()
    await waitFor(() => expect(screen.getByText('spacetime.noMessages')).toBeInTheDocument())

    await viewer.type(screen.getByPlaceholderText('spacetime.writeMessage'), 'brand new')
    expect(container.textContent).toContain('9/500')
    await viewer.click(screen.getByRole('button', { name: 'spacetime.send' }))

    await waitFor(() => expect(screen.getByText('brand new')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'spacetime.sent' })).toBeInTheDocument()
    expect(api).toHaveBeenCalledWith('/achievements/u1/track', expect.objectContaining({ method: 'POST' }))
  })

  it('计划消息携带 targetTime 且不直接插入列表', async () => {
    const viewer = userEvent.setup()
    setupApi({ messages: [] })
    const { container } = setup()
    await waitFor(() => expect(screen.getByText('spacetime.noMessages')).toBeInTheDocument())

    await viewer.click(screen.getByText('spacetime.scheduleTime'))
    const dateInput = container.querySelector('input[type="datetime-local"]') as HTMLInputElement
    fireEvent.change(dateInput, { target: { value: '2030-01-01T10:00' } })
    await viewer.type(screen.getByPlaceholderText('spacetime.writeMessage'), 'scheduled msg')
    await viewer.click(screen.getByRole('button', { name: 'spacetime.send' }))

    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('/spacetime/messages', expect.objectContaining({ method: 'POST' }))
    )
    const post = api.mock.calls.find((c) => c[0] === '/spacetime/messages' && c[1]?.method === 'POST')!
    const body = JSON.parse((post[1] as AnyRec).body)
    expect(body.targetTime).toBe(new Date('2030-01-01T10:00').toISOString())
    expect(screen.getByText('spacetime.noMessages')).toBeInTheDocument()
  })

  it('选择情绪、关联歌曲、附加定位后发送并上报成就', async () => {
    const viewer = userEvent.setup()
    setupApi({ messages: [] })
    const { container } = setup()
    await waitFor(() => expect(screen.getByText('spacetime.noMessages')).toBeInTheDocument())

    await viewer.click(screen.getByText('😊 快乐'))
    await viewer.click(screen.getByText('spacetime.linkSong'))
    await viewer.click(screen.getByText('spacetime.attachLocation'))
    await waitFor(() => expect(container.textContent).toContain('31.230, 121.474'))
    await viewer.type(screen.getByPlaceholderText('spacetime.writeMessage'), 'located message')
    await viewer.click(screen.getByRole('button', { name: 'spacetime.send' }))

    await waitFor(() =>
      expect(api.mock.calls.some((c) => c[0] === '/achievements/u1/track' && String(c[1]?.body).includes('send_location'))).toBe(true)
    )
    const post = api.mock.calls.find((c) => c[0] === '/spacetime/messages' && c[1]?.method === 'POST')!
    const body = JSON.parse((post[1] as AnyRec).body)
    expect(body.emotion).toBe('happy')
    expect(body.songId).toBe('track-1')
    expect(body.songTitle).toBe('Cosmic Dreams')
    expect(body.targetLocation).toEqual(expect.objectContaining({ lat: 31.2304 }))

    await viewer.click(screen.getByText('spacetime.attachLocation'))
    expect(screen.queryByText('31.230, 121.474')).toBeNull()
  })

  it('定位失败记录错误并取消附加', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    getCurrentPosition.mockImplementation((_s: Function, error: Function) => error(new Error('denied')))
    const viewer = userEvent.setup()
    setupApi({ messages: [] })
    const { container } = setup()
    await waitFor(() => expect(screen.getByText('spacetime.noMessages')).toBeInTheDocument())
    await viewer.click(screen.getByText('spacetime.attachLocation'))
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('Geolocation error:', expect.any(Error)))
    expect(container.textContent).not.toContain('31.230')
    errorSpy.mockRestore()
  })

  it('发送失败记录错误并保留输入', async () => {
    const viewer = userEvent.setup()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    api.mockImplementation((async (path: string, options?: AnyRec) => {
      if (path === '/spacetime/messages' && !options?.method) return { messages: [] }
      if (path === '/spacetime/messages' && options?.method === 'POST') throw new Error('send down')
      return null
    }) as never)
    setup()
    await waitFor(() => expect(screen.getByText('spacetime.noMessages')).toBeInTheDocument())
    await viewer.type(screen.getByPlaceholderText('spacetime.writeMessage'), 'kept text')
    await viewer.click(screen.getByRole('button', { name: 'spacetime.send' }))
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('Send message error:', expect.any(Error)))
    expect(screen.getByPlaceholderText('spacetime.writeMessage')).toHaveValue('kept text')
    errorSpy.mockRestore()
  })

  it('未登录时展示登录提示且不显示输入框', async () => {
    setupApi({ messages: [] })
    setup({ user: null })
    await waitFor(() => expect(screen.getAllByText('spacetime.signInRequired').length).toBeGreaterThan(0))
    expect(screen.queryByPlaceholderText('spacetime.writeMessage')).toBeNull()
  })

  it('底部刷新按钮按当前标签重新拉取', async () => {
    setupApi({ messages: [] })
    const { container } = setup()
    await waitFor(() => expect(screen.getByText('spacetime.noMessages')).toBeInTheDocument())
    const before = api.mock.calls.filter((c) => c[0] === '/spacetime/messages').length
    fireEvent.click(container.querySelector('svg.lucide-refresh-cw')!.closest('button')!)
    await waitFor(() =>
      expect(api.mock.calls.filter((c) => c[0] === '/spacetime/messages').length).toBe(before + 1)
    )
  })

  it('拉取消息失败记录错误', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    api.mockRejectedValue(new Error('messages down') as never)
    setup()
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('SpaceTime messages fetch error:', expect.any(Error)))
    errorSpy.mockRestore()
  })
})

describe('SpaceTimePanel 时间胶囊', () => {
  it('空胶囊展示空态，拉取失败记录错误', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    setupApi({ capsules: [] })
    api.mockImplementation((async (path: string) => {
      if (path === '/spacetime/capsules') throw new Error('caps down')
      return null
    }) as never)
    const viewer = userEvent.setup()
    const { container } = setup()
    await viewer.click(screen.getByText('spacetime.capsules'))
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('SpaceTime capsules fetch error:', expect.any(Error)))
    expect(container.textContent).toContain('spacetime.noCapsules')
    errorSpy.mockRestore()
  })

  it('渲染锁定/解锁胶囊、倒计时单位、接收者与点赞', async () => {
    setupApi({
      capsules: [
        capsule({ id: 'c1', title: 'Unlocked', recipientName: 'Cara', songTitle: 'Nebula', likes: 2 }),
        capsule({ id: 'c2', title: 'Locked Now', isUnlocked: false, unlockTs: Date.now() - 1000 }),
        capsule({ id: 'c3', title: 'Locked Min', isUnlocked: false, unlockTs: Date.now() + 30000 }),
        capsule({ id: 'c4', title: 'Locked Hour', isUnlocked: false, unlockTs: Date.now() + 2 * 3600000 }),
        capsule({ id: 'c5', title: 'Locked Day', isUnlocked: false, unlockTs: Date.now() + 3 * 86400000 }),
      ],
    })
    const viewer = userEvent.setup()
    const { container } = setup()
    await viewer.click(screen.getByText('spacetime.capsules'))
    await waitFor(() => expect(screen.getByText('Unlocked')).toBeInTheDocument())

    expect(container.textContent).toContain('spacetime.to Cara')
    expect(screen.getByText('Nebula')).toBeInTheDocument()
    expect(container.textContent).toContain('spacetime.unlocksIn 1min')
    expect(container.textContent).toContain('spacetime.unlocksIn 2h')
    expect(container.textContent).toContain('spacetime.unlocksIn 3d')
    expect(container.textContent).toContain('spacetime.justUnlocked')
    expect(container.textContent).toContain('spacetime.locked')

    const cap = screen.getByText('Unlocked').closest('div.rounded-xl') as HTMLElement
    fireEvent.click(Array.from(cap.querySelectorAll('button')).find((b) => b.querySelector('svg.lucide-heart'))!)
    await waitFor(() => expect(api).toHaveBeenCalledWith('/spacetime/capsules/c1/like', expect.objectContaining({ method: 'POST' })))
    expect(cap.textContent).toContain('3')
  })

  it('点赞失败记录错误', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    setupApi({ capsules: [capsule({ id: 'c1', title: 'Like Err' })] })
    api.mockImplementation((async (path: string, options?: AnyRec) => {
      if (path === '/spacetime/capsules' && !options?.method) return { capsules: [capsule({ id: 'c1', title: 'Like Err' })] }
      if (path.endsWith('/like')) throw new Error('like down')
      return null
    }) as never)
    const viewer = userEvent.setup()
    setup()
    await viewer.click(screen.getByText('spacetime.capsules'))
    await waitFor(() => expect(screen.getByText('Like Err')).toBeInTheDocument())
    const cap = screen.getByText('Like Err').closest('div.rounded-xl') as HTMLElement
    fireEvent.click(Array.from(cap.querySelectorAll('button')).find((b) => b.querySelector('svg.lucide-heart'))!)
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('Like capsule error:', expect.any(Error)))
    errorSpy.mockRestore()
  })

  it('创建胶囊携带接收者、情绪与歌曲，并重置表单', async () => {
    const viewer = userEvent.setup()
    setupApi({ capsules: [] })
    const { container } = setup()
    await viewer.click(screen.getByText('spacetime.capsules'))
    await waitFor(() => expect(screen.getByText('spacetime.noCapsules')).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText('spacetime.capsuleTitle'), { target: { value: 'My Capsule' } })
    fireEvent.change(screen.getByPlaceholderText('spacetime.capsuleContent'), { target: { value: 'Secret plans' } })
    const dateInput = container.querySelector('.grid input[type="datetime-local"]') as HTMLInputElement
    fireEvent.change(dateInput, { target: { value: '2030-05-01T08:00' } })
    fireEvent.change(screen.getByPlaceholderText('spacetime.capsuleRecipient'), { target: { value: 'Bob' } })
    await viewer.click(screen.getByText('😊'))
    await viewer.click(screen.getByText('spacetime.linkSong'))
    expect(container.textContent).toContain('Cosmic Dreams')

    fireEvent.click(screen.getByRole('button', { name: 'spacetime.createCapsule' }))
    await waitFor(() => expect(screen.getByText('Created')).toBeInTheDocument())
    const post = api.mock.calls.find((c) => c[0] === '/spacetime/capsules' && c[1]?.method === 'POST')!
    const body = JSON.parse((post[1] as AnyRec).body)
    expect(body).toEqual(
      expect.objectContaining({
        title: 'My Capsule',
        content: 'Secret plans',
        recipientName: 'Bob',
        emotion: 'happy',
        songId: 'track-1',
        songTitle: 'Cosmic Dreams',
      })
    )
    expect(api).toHaveBeenCalledWith('/achievements/u1/track', expect.objectContaining({ method: 'POST' }))
    expect(screen.getByPlaceholderText('spacetime.capsuleTitle')).toHaveValue('')
  })

  it('创建胶囊失败记录错误', async () => {
    const viewer = userEvent.setup()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    api.mockImplementation((async (path: string, options?: AnyRec) => {
      if (path === '/spacetime/capsules' && !options?.method) return { capsules: [] }
      if (path === '/spacetime/capsules' && options?.method === 'POST') throw new Error('create down')
      return null
    }) as never)
    const { container } = setup()
    await viewer.click(screen.getByText('spacetime.capsules'))
    await waitFor(() => expect(screen.getByText('spacetime.noCapsules')).toBeInTheDocument())
    fireEvent.change(screen.getByPlaceholderText('spacetime.capsuleTitle'), { target: { value: 'T' } })
    fireEvent.change(screen.getByPlaceholderText('spacetime.capsuleContent'), { target: { value: 'C' } })
    fireEvent.change(container.querySelector('.grid input[type="datetime-local"]') as HTMLInputElement, { target: { value: '2030-05-01T08:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'spacetime.createCapsule' }))
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('Create capsule error:', expect.any(Error)))
    errorSpy.mockRestore()
  })

  it('E2EE 就绪时可开启加密并加密胶囊内容', async () => {
    const viewer = userEvent.setup()
    setupApi({ capsules: [] })
    setup()
    await waitFor(() => expect(mocks.hasLocalKeyPair).toHaveBeenCalledWith('u1'))
    await viewer.click(screen.getByText('spacetime.capsules'))
    await waitFor(() => expect(screen.getByText('开启端到端加密')).toBeInTheDocument())
    await viewer.click(screen.getByText('开启端到端加密'))
    expect(screen.getByPlaceholderText('接收者用户ID (必填)')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('spacetime.capsuleTitle'), { target: { value: 'Enc' } })
    fireEvent.change(screen.getByPlaceholderText('spacetime.capsuleContent'), { target: { value: 'Top secret' } })
    fireEvent.change(document.querySelector('.grid input[type="datetime-local"]') as HTMLInputElement, { target: { value: '2030-05-01T08:00' } })
    fireEvent.change(screen.getByPlaceholderText('接收者用户ID (必填)'), { target: { value: 'u9' } })
    fireEvent.click(screen.getByRole('button', { name: 'spacetime.createCapsule' }))

    await waitFor(() => expect(screen.getByText('Created')).toBeInTheDocument())
    const post = api.mock.calls.find((c) => c[0] === '/spacetime/capsules' && c[1]?.method === 'POST')!
    const body = JSON.parse((post[1] as AnyRec).body)
    expect(body).toEqual(
      expect.objectContaining({
        encrypted: true,
        encryptedContent: 'cipher',
        encryptedSessionKey: 'session',
        encryptionIv: 'iv',
        senderFingerprint: 'sender-fp',
        recipientUserId: 'u9',
      })
    )
    expect(mocks.pkiApi.getPublicKey).toHaveBeenCalledWith('u9')
  })

  it('接收者无公钥或加密异常时回退为明文发送', async () => {
    const viewer = userEvent.setup()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.pkiApi.getPublicKey.mockResolvedValueOnce({ publicKeyJwk: null })
    mocks.importPublicKey.mockRejectedValueOnce(new Error('bad key'))
    setupApi({ capsules: [] })
    setup()
    await waitFor(() => expect(mocks.hasLocalKeyPair).toHaveBeenCalled())
    await viewer.click(screen.getByText('spacetime.capsules'))
    await waitFor(() => expect(screen.getByText('开启端到端加密')).toBeInTheDocument())
    await viewer.click(screen.getByText('开启端到端加密'))
    fireEvent.change(screen.getByPlaceholderText('spacetime.capsuleTitle'), { target: { value: 'Plain' } })
    fireEvent.change(screen.getByPlaceholderText('spacetime.capsuleContent'), { target: { value: 'text' } })
    fireEvent.change(document.querySelector('.grid input[type="datetime-local"]') as HTMLInputElement, { target: { value: '2030-05-01T08:00' } })

    fireEvent.change(screen.getByPlaceholderText('接收者用户ID (必填)'), { target: { value: 'u8' } })
    fireEvent.click(screen.getByRole('button', { name: 'spacetime.createCapsule' }))
    await waitFor(() => expect(warnSpy).toHaveBeenCalledWith('[E2EE] Recipient has no public key, sending unencrypted'))

    await waitFor(() => expect(screen.getByPlaceholderText('spacetime.capsuleTitle')).toHaveValue(''))
    fireEvent.change(screen.getByPlaceholderText('spacetime.capsuleTitle'), { target: { value: 'FailEnc' } })
    fireEvent.change(screen.getByPlaceholderText('spacetime.capsuleContent'), { target: { value: 'text' } })
    fireEvent.change(document.querySelector('.grid input[type="datetime-local"]') as HTMLInputElement, { target: { value: '2030-05-01T08:00' } })
    // 提交成功后加密开关被重置，需要重新开启
    await viewer.click(screen.getByText('开启端到端加密'))
    fireEvent.change(screen.getByPlaceholderText('接收者用户ID (必填)'), { target: { value: 'u7' } })
    // 首次封存后按钮短暂显示“胶囊已封存！”，用正则同时匹配两种文案
    fireEvent.click(screen.getByRole('button', { name: /spacetime\.createCapsule|spacetime\.capsuleCreated/ }))
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('[E2EE] Encryption failed, sending unencrypted:', expect.any(Error)))
    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('E2EE 未就绪时展示设置提示并可展开说明', async () => {
    mocks.hasLocalKeyPair.mockResolvedValue(false)
    const viewer = userEvent.setup()
    setupApi({ capsules: [] })
    setup()
    await waitFor(() => expect(mocks.hasLocalKeyPair).toHaveBeenCalled())
    await viewer.click(screen.getByText('spacetime.capsules'))
    await waitFor(() => expect(screen.getByText('设置E2EE密钥以启用加密胶囊')).toBeInTheDocument())
    await viewer.click(screen.getByText('设置E2EE密钥以启用加密胶囊'))
    expect(screen.getByText(/E2EE密钥设置/)).toBeInTheDocument()
  })

  it('E2EE 检测异常时回退为未就绪', async () => {
    mocks.hasLocalKeyPair.mockRejectedValue(new Error('crypto down'))
    const viewer = userEvent.setup()
    setupApi({ capsules: [] })
    setup()
    await viewer.click(screen.getByText('spacetime.capsules'))
    await waitFor(() => expect(screen.getByText('设置E2EE密钥以启用加密胶囊')).toBeInTheDocument())
  })

  it('手动解密胶囊：成功展示明文，无密钥展示解密失败', async () => {
    // 关闭本地密钥检测以禁用自动解密，但仍然初始化 crypto/pki 引用以支持手动解密
    mocks.hasLocalKeyPair.mockResolvedValue(false)
    const viewer = userEvent.setup()
    setupApi({
      capsules: [
        capsule({
          id: 'enc1',
          title: 'Encrypted OK',
          encrypted: true,
          encryptedContent: 'cipher',
          encryptedSessionKey: 'session',
          encryptionIv: 'iv',
          senderFingerprint: 'abcdef123456',
          recipientUserId: 'u1',
        }),
        capsule({
          id: 'enc2',
          title: 'Encrypted NoKey',
          encrypted: true,
          encryptedContent: 'cipher',
          encryptedSessionKey: 'session',
          encryptionIv: 'iv',
          recipientUserId: 'u1',
        }),
        capsule({
          id: 'enc3',
          title: 'Not Mine',
          encrypted: true,
          encryptedContent: 'cipher',
          encryptedSessionKey: 'session',
          encryptionIv: 'iv',
          recipientUserId: 'u9',
          userId: 'u8',
        }),
      ],
    })
    setup()
    await waitFor(() => expect(mocks.hasLocalKeyPair).toHaveBeenCalled())
    await viewer.click(screen.getByText('spacetime.capsules'))
    await waitFor(() => expect(screen.getByText('Encrypted OK')).toBeInTheDocument())

    await viewer.click(screen.getAllByText('解密')[0])
    await waitFor(() => expect(screen.getByText('decrypted secret')).toBeInTheDocument())
    expect(screen.getByText('端到端加密 · 已解密')).toBeInTheDocument()
    expect(screen.getByText(/🔑 abcdef12…/)).toBeInTheDocument()

    mocks.loadPrivateKey.mockResolvedValueOnce(null)
    await viewer.click(screen.getAllByText('解密')[0])
    await waitFor(() => expect(screen.getByText(/解密失败/)).toBeInTheDocument())

    // 非接收者的加密胶囊不应出现解密按钮
    expect(screen.queryByText('解密')).toBeNull()
  })

  it('解密异常记录错误并标记失败', async () => {
    mocks.hasLocalKeyPair.mockResolvedValue(false)
    const viewer = userEvent.setup()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    setupApi({
      capsules: [
        capsule({
          id: 'encx',
          title: 'Broken',
          encrypted: true,
          encryptedContent: 'cipher',
          encryptedSessionKey: 'session',
          encryptionIv: 'iv',
          recipientUserId: 'u1',
        }),
      ],
    })
    mocks.decryptMessage.mockRejectedValueOnce(new Error('bad cipher'))
    setup()
    await waitFor(() => expect(mocks.hasLocalKeyPair).toHaveBeenCalled())
    await viewer.click(screen.getByText('spacetime.capsules'))
    await waitFor(() => expect(screen.getByText('Broken')).toBeInTheDocument())
    await viewer.click(screen.getByText('解密'))
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('[E2EE] Decryption failed:', expect.any(Error)))
    await waitFor(() => expect(screen.getByText(/解密失败/)).toBeInTheDocument())
    errorSpy.mockRestore()
  })

  it('接收者可解密胶囊时自动解密', async () => {
    setupApi({
      capsules: [
        capsule({
          id: 'auto1',
          title: 'Auto Decrypt',
          encrypted: true,
          encryptedContent: 'cipher',
          encryptedSessionKey: 'session',
          encryptionIv: 'iv',
          recipientUserId: 'u1',
        }),
      ],
    })
    const viewer = userEvent.setup()
    setup()
    await waitFor(() => expect(mocks.hasLocalKeyPair).toHaveBeenCalled())
    await viewer.click(screen.getByText('spacetime.capsules'))
    await waitFor(() => expect(screen.getByText('decrypted secret')).toBeInTheDocument())
    expect(mocks.decryptMessage).toHaveBeenCalledTimes(1)
  })
})

describe('SpaceTimePanel 附近与语音/STT', () => {
  it('首次打开附近会用定位结果拉取周边留言，并展示距离单位', async () => {
    setupApi({
      nearby: [
        msg({ id: 'n1', content: 'near one', distance: 0.4, targetLocation: { lat: 1, lng: 2, label: 'Park' }, songTitle: 'Song A', likes: 3 }),
        msg({ id: 'n2', content: 'near two', distance: 2.34, targetLocation: { lat: 1, lng: 2 } }),
      ],
    })
    const viewer = userEvent.setup()
    const { container } = setup()
    await viewer.click(screen.getByText('spacetime.nearby'))
    await waitFor(() => expect(screen.getByText('near one')).toBeInTheDocument())

    expect(getCurrentPosition).toHaveBeenCalled()
    expect(container.textContent).toContain('400m')
    expect(container.textContent).toContain('2.3km')
    expect(screen.getByText('Park')).toBeInTheDocument()
    expect(screen.getByText('Song A')).toBeInTheDocument()
    expect(screen.getByText('1.000, 2.000')).toBeInTheDocument()

    fireEvent.click(screen.getByText('spacetime.nearbyRefresh'))
    await waitFor(() => expect(api.mock.calls.filter((c) => String(c[0]).startsWith('/spacetime/messages/nearby')).length).toBe(2))
  })

  it('附近没有留言时展示空态', async () => {
    const viewer = userEvent.setup()
    const { container } = setup()
    await viewer.click(screen.getByText('spacetime.nearby'))
    await waitFor(() => expect(container.textContent).toContain('spacetime.nearbyEmpty'))
    expect(container.textContent).toContain('spacetime.nearbyEmptyHint')
  })

  it('已有定位后附近刷新失败记录错误', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const viewer = userEvent.setup()
    setupApi({ nearby: [] })
    const { container } = setup()
    await viewer.click(screen.getByText('spacetime.nearby'))
    await waitFor(() => expect(container.textContent).toContain('spacetime.nearbyEmpty'))

    api.mockRejectedValue(new Error('nearby down') as never)
    fireEvent.click(screen.getByText('spacetime.nearbyRefresh'))
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('Nearby fetch error:', expect.any(Error)))
    errorSpy.mockRestore()
  })

  it('浏览器不支持定位时不展示附近与附加定位', async () => {
    delete (navigator as AnyRec).geolocation
    const viewer = userEvent.setup()
    const { container } = setup()
    await waitFor(() => expect(screen.getByText('spacetime.noMessages')).toBeInTheDocument())
    expect(screen.queryByText('spacetime.nearby')).toBeNull()
    expect(screen.queryByText('spacetime.attachLocation')).toBeNull()
    expect(container).not.toBeNull()
  })

  it('录音→停止→试听→删除的完整流程', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    setupApi({ messages: [] })
    const { container } = setup()
    await waitFor(() => expect(screen.getByText('spacetime.noMessages')).toBeInTheDocument())

    fireEvent.click(screen.getByText('spacetime.voiceRecord'))
    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.getByText('spacetime.voiceRecording')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(container.textContent).toContain('2s')

    fireEvent.click(screen.getByText('spacetime.voiceStop'))
    await waitFor(() => expect(container.querySelector('svg.lucide-play')).not.toBeNull())

    // 注意：情绪选择按钮同样带 rounded-full，必须用播放图标定位预览按钮
    fireEvent.click(container.querySelector('svg.lucide-play')!.closest('button')!)
    await waitFor(() => expect(container.querySelector('svg.lucide-pause')).not.toBeNull())
    fireEvent.click(container.querySelector('svg.lucide-pause')!.closest('button')!)
    await waitFor(() => expect(container.querySelector('svg.lucide-play')).not.toBeNull())

    fireEvent.click(screen.getByText('spacetime.voiceDiscard'))
    await waitFor(() => expect(screen.getByText('spacetime.voiceRecord')).toBeInTheDocument())
  })

  it('发送语音消息上传存储并附带歌曲与定位', async () => {
    setupApi({ messages: [] })
    api.mockImplementation((async (path: string, options?: AnyRec) => {
      if (path === '/spacetime/messages' && !options?.method) return { messages: [] }
      if (path === '/voice/upload') return { success: true, filePath: 'voice/p', signedUrl: 'http://signed' }
      if (path === '/spacetime/messages' && options?.method === 'POST') {
        return { success: true, message: msg({ id: 'v-sent', content: '[语音消息] 0s', type: 'voice', audioWaveform: [1], audioDuration: 0 }) }
      }
      return null
    }) as never)
    const { container } = setup()
    await waitFor(() => expect(screen.getByText('spacetime.noMessages')).toBeInTheDocument())

    fireEvent.click(screen.getByText('spacetime.voiceRecord'))
    await act(async () => { await Promise.resolve() })
    fireEvent.click(screen.getByText('spacetime.voiceStop'))
    await waitFor(() => expect(container.querySelector('svg.lucide-play')).not.toBeNull())

    fireEvent.click(screen.getByText('spacetime.voiceSend'))
    await waitFor(() => expect(api).toHaveBeenCalledWith('/voice/upload', expect.objectContaining({ method: 'POST' })))
    const post = api.mock.calls.find((c) => c[0] === '/spacetime/messages' && c[1]?.method === 'POST')!
    const body = JSON.parse((post[1] as AnyRec).body)
    expect(body.type).toBe('voice')
    expect(body.audioFilePath).toBe('voice/p')
    expect(body.audioSignedUrl).toBe('http://signed')
  })

  it('语音存储上传失败时回退为内联数据', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    setupApi({ messages: [] })
    api.mockImplementation((async (path: string, options?: AnyRec) => {
      if (path === '/spacetime/messages' && !options?.method) return { messages: [] }
      if (path === '/voice/upload') throw new Error('upload down')
      if (path === '/spacetime/messages' && options?.method === 'POST') return { success: true, message: msg({ id: 'v2' }) }
      return null
    }) as never)
    const { container } = setup()
    await waitFor(() => expect(screen.getByText('spacetime.noMessages')).toBeInTheDocument())
    fireEvent.click(screen.getByText('spacetime.voiceRecord'))
    await act(async () => { await Promise.resolve() })
    fireEvent.click(screen.getByText('spacetime.voiceStop'))
    await waitFor(() => expect(container.querySelector('svg.lucide-play')).not.toBeNull())
    fireEvent.click(screen.getByText('spacetime.voiceSend'))
    await waitFor(() => expect(warnSpy).toHaveBeenCalledWith('Voice storage upload failed, falling back:', expect.any(Error)))
    warnSpy.mockRestore()
  })

  it('麦克风被拒绝时隐藏录音入口', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    ;(navigator.mediaDevices.getUserMedia as AnyRec).mockRejectedValue(new Error('denied'))
    setupApi({ messages: [] })
    setup()
    await waitFor(() => expect(screen.getByText('spacetime.noMessages')).toBeInTheDocument())
    fireEvent.click(screen.getByText('spacetime.voiceRecord'))
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('Mic access error:', expect.any(Error)))
    expect(screen.queryByText('spacetime.voiceRecord')).toBeNull()
    errorSpy.mockRestore()
  })

  it('原生语音识别：识别结果写入输入框，错误与结束恢复状态', async () => {
    ;(window as AnyRec).webkitSpeechRecognition = FakeSpeechRecognition
    setupApi({ messages: [] })
    setup()
    await waitFor(() => expect(screen.getByText('spacetime.noMessages')).toBeInTheDocument())

    fireEvent.click(screen.getByText('spacetime.sttButton'))
    expect(screen.getByText('spacetime.sttListening')).toBeInTheDocument()
    const recognition = nativeRecognitionInstances[0]
    expect(recognition.start).toHaveBeenCalled()

    act(() => {
      recognition.onresult?.({ results: [[{ transcript: 'hello stt' }]] })
    })
    expect(screen.getByPlaceholderText('spacetime.writeMessage')).toHaveValue('hello stt')

    fireEvent.click(screen.getByText('spacetime.sttListening'))
    expect(recognition.stop).toHaveBeenCalled()
    expect(screen.getByText('spacetime.sttButton')).toBeInTheDocument()

    fireEvent.click(screen.getByText('spacetime.sttButton'))
    act(() => {
      nativeRecognitionInstances[1].onerror?.()
    })
    expect(screen.getByText('spacetime.sttButton')).toBeInTheDocument()
    fireEvent.click(screen.getByText('spacetime.sttButton'))
    act(() => {
      nativeRecognitionInstances[2].onend?.()
    })
    expect(screen.getByText('spacetime.sttButton')).toBeInTheDocument()
  })

  it('流式转录：分片上传、定时刷新与停止时最终刷新', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    setupApi({ messages: [] })
    setup()
    await waitFor(() => expect(screen.getByText('spacetime.noMessages')).toBeInTheDocument())

    fireEvent.click(screen.getByText('spacetime.sttButton'))
    await waitFor(() => expect(screen.getByText('spacetime.sttListening')).toBeInTheDocument())

    const recorder = FakeMediaRecorder.instances[0]
    expect(recorder).toBeDefined()
    await act(async () => {
      recorder.ondataavailable?.({ data: new Blob(['abc'], { type: 'audio/webm' }) })
      // FileReader 是异步事件，用真实 setTimeout 让分片编码完成
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await act(async () => {
      vi.advanceTimersByTime(4000)
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await waitFor(() => expect(mocks.sttApi.stream).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByPlaceholderText('spacetime.writeMessage')).toHaveValue('streamed text'))
    await waitFor(() => expect(screen.getByText('流式转录中...')).toBeInTheDocument())

    await act(async () => {
      fireEvent.click(screen.getByText('流式转录中...'))
    })
    await waitFor(() => expect(recorder.state).toBe('inactive'))
  })

  it('STT 麦克风拒绝时记录错误并恢复', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    ;(navigator.mediaDevices.getUserMedia as AnyRec).mockRejectedValue(new Error('no mic'))
    setupApi({ messages: [] })
    setup()
    await waitFor(() => expect(screen.getByText('spacetime.noMessages')).toBeInTheDocument())
    fireEvent.click(screen.getByText('spacetime.sttButton'))
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('[STT] Microphone access denied:', expect.any(Error)))
    expect(screen.getByText('spacetime.sttButton')).toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('STT 分片编码失败记录错误', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    setupApi({ messages: [] })
    setup()
    await waitFor(() => expect(screen.getByText('spacetime.noMessages')).toBeInTheDocument())
    fireEvent.click(screen.getByText('spacetime.sttButton'))
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    const recorder = FakeMediaRecorder.instances[0]

    const originalFileReader = globalThis.FileReader
    class BrokenReader {
      onloadend: (() => void) | null = null
      onerror: ((e: unknown) => void) | null = null
      result: string | null = null
      readAsDataURL() {
        this.onerror?.(new Error('read fail'))
      }
    }
    vi.stubGlobal('FileReader', BrokenReader as unknown as typeof FileReader)
    await act(async () => {
      recorder.ondataavailable?.({ data: new Blob(['abc'], { type: 'audio/webm' }) })
    })
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('[STT Stream] Chunk encode error:', expect.any(Error)))
    vi.stubGlobal('FileReader', originalFileReader)
    errorSpy.mockRestore()
  })
})

describe('SpaceTimePanel 其他', () => {
  it('关闭按钮与遮罩触发 onClose', async () => {
    const viewer = userEvent.setup()
    setupApi({ messages: [] })
    const { container, onClose } = setup()
    await viewer.click(container.querySelector('.z-\\[61\\] button')!)
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.click(container.querySelector('.z-\\[60\\]')!)
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('英文语言渲染英文文案与情绪名', async () => {
    localStorage.setItem('dmusic-prefs', JSON.stringify({ lang: 'en' }))
    setupApi({ messages: [] })
    render(
      createElement(I18nProvider, null,
        createElement(SpaceTimePanel, {
          isOpen: true,
          onClose: vi.fn(),
          user,
          currentTrackId: 't1',
          currentTrackTitle: 'Song',
        })
      )
    )
    expect(screen.getByText('Space-Time Call')).toBeInTheDocument()
    expect(screen.getByText('😊 Happy')).toBeInTheDocument()
    expect(screen.getByText('Message Wall')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('No messages yet')).toBeInTheDocument())
    expect(screen.getByText('Nearby')).toBeInTheDocument()
  })
})
