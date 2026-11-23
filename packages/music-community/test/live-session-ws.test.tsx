/**
 * @file LiveSessionPanel WebSocket 双通道测试
 * @description 三方合并引入的外部 WS 通道（wsUrl/roomId props）与自动推导通道（/live/ws）：
 *              welcome/joined/room_info/viewer_count/danmaku/emoji/gift/moderation/
 *              moderated/pong 消息处理、recentSentRef 回显去重（consumeOwnEcho）、
 *              乐观上屏、断线 UI 态、WS 构造失败回退轮询。
 *              既有 live-session.test.tsx 保留不动，本文件聚焦 WS 分支。
 */
import { createElement } from 'react'
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '@yyc3/music-utils'
import { LiveSessionPanel } from '../src'

vi.mock('@yyc3/music-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@yyc3/music-utils')>()
  return { ...actual, apiFetch: vi.fn() }
})

const api = vi.mocked(apiFetch) as unknown as ReturnType<typeof vi.fn>

// jsdom 未实现 scrollIntoView（弹幕列表自动滚底用）；守卫式，不覆盖宿主已有实现
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn()
}

// ── WebSocket 桩：jsdom 无 WebSocket，替换为可断言的最小实现 ──
class MockWebSocket {
  static instances: MockWebSocket[] = []
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  /** 下一次构造直接抛错（模拟环境不支持 WS） */
  static failNext = false
  readyState = MockWebSocket.CONNECTING
  sent: string[] = []
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: ((event?: unknown) => void) | null = null
  onerror: ((event?: unknown) => void) | null = null
  constructor(public url: string) {
    if (MockWebSocket.failNext) {
      MockWebSocket.failNext = false
      throw new Error('ws unavailable')
    }
    MockWebSocket.instances.push(this)
  }
  send(data: string) { this.sent.push(data) }
  close() { this.readyState = MockWebSocket.CLOSED }
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN
    this.onopen?.()
  }
  emit(msg: Record<string, unknown>) {
    this.onmessage?.({ data: JSON.stringify(msg) })
  }
  emitRaw(raw: string) {
    this.onmessage?.({ data: raw })
  }
  simulateClose() {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.({})
  }
  simulateError() {
    this.onerror?.({})
  }
}

const lastSocket = () => MockWebSocket.instances[MockWebSocket.instances.length - 1]
const payloads = (ws: MockWebSocket) => ws.sent.map((s) => JSON.parse(s))
/** 弹幕节点计数（排除列表末尾的 scrollIntoView 哨兵 div） */
const msgCount = (c: HTMLElement) =>
  [...c.querySelectorAll('.space-y-2 > div')].filter((d) => d.className).length

const now = Date.now()

function setup(over: Record<string, unknown> = {}) {
  const onClose = vi.fn()
  const utils = render(
    createElement(LiveSessionPanel, {
      isOpen: true,
      onClose,
      userId: 'me',
      userName: 'Me',
      currentTrackId: 'track-1',
      currentTrackTitle: 'Cosmic Dreams',
      isPlaying: true,
      currentEmotion: 'happy',
      ...over,
    })
  )
  return { onClose, ...utils }
}

beforeEach(() => {
  api.mockReset()
  api.mockImplementation((async (path: string, options?: RequestInit) => {
    if (path === '/live-session/heartbeat') return null
    if (path === '/live-session/presence') return { listeners: [] }
    if (path === '/live-session/danmaku' && !options?.method) return { messages: [] }
    return null
  }) as never)
  MockWebSocket.instances = []
  MockWebSocket.failNext = false
  vi.stubGlobal('WebSocket', MockWebSocket as unknown as typeof WebSocket)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('外部 WebSocket 通道（显式 wsUrl）', () => {
  it('连接后发送 join 与 viewer_count_request', async () => {
    setup({ wsUrl: 'wss://live.example/ws/live?token=t', roomId: 'room-9' })
    lastSocket().simulateOpen()

    const sent = payloads(lastSocket())
    expect(sent).toContainEqual({ type: 'join', room: 'room-9' })
    expect(sent).toContainEqual({ type: 'viewer_count_request' })
  })

  it('room_info 添加听众且同一用户不重复', () => {
    const { container } = setup({ wsUrl: 'wss://live.example/ws/live?token=t' })
    act(() => {
      lastSocket().simulateOpen()
      lastSocket().emit({ type: 'room_info', user: 'u42' })
      lastSocket().emit({ type: 'room_info', user: 'u42' })
    })

    expect(container.textContent).toContain('在线听众')
    // 听众 chip 显示 userName prop（Me），同一 user 去重后仅一枚
    expect(screen.getAllByText('Me')).toHaveLength(1)
    // isPlaying 已定义时渲染 Music 图标
    expect(container.querySelectorAll('svg.lucide-music')).toHaveLength(1)
  })

  it('viewer_count 更新在线人数，缺 count 时保持不变', () => {
    setup({ wsUrl: 'wss://live.example/ws/live?token=t' })
    act(() => {
      lastSocket().simulateOpen()
      lastSocket().emit({ type: 'viewer_count', count: 42 })
    })
    expect(screen.getByText('42 人在线 · 实时')).toBeInTheDocument()

    act(() => {
      lastSocket().emit({ type: 'viewer_count' })
    })
    expect(screen.getByText('42 人在线 · 实时')).toBeInTheDocument()
  })

  it('danmaku/emoji/gift/moderation 消息上屏，moderated/pong 静默', () => {
    const { container } = setup({ wsUrl: 'wss://live.example/ws/live?token=t' })
    act(() => {
      lastSocket().simulateOpen()
      lastSocket().emit({ type: 'danmaku', user: 'alice', text: '大家好', ts: now })
      lastSocket().emit({ type: 'emoji', user: 'bob', emoji: '🔥' })
      lastSocket().emit({ type: 'gift', user: 'bob', giftId: 'rocket', count: 3 })
      lastSocket().emit({ type: 'moderation', action: 'mute', targetUser: 'bob' })
    })

    expect(container.textContent).toContain('大家好')
    expect(container.textContent).toContain('用户lice')
    expect(container.textContent).toContain('🔥')
    expect(container.textContent).toContain('🎁 rocket ×3')
    expect(container.textContent).toContain('⚡ [管理] mute → bob')

    // moderated 与 pong 消息：无 UI、不新增弹幕
    act(() => {
      lastSocket().emit({ type: 'moderated', reason: '违规' })
      lastSocket().emit({ type: 'pong' })
    })
    expect(container.textContent).not.toContain('违规')
    expect(msgCount(container)).toBe(4)
  })

  it('非法 JSON 消息被忽略', () => {
    const { container } = setup({ wsUrl: 'wss://live.example/ws/live?token=t' })
    act(() => {
      lastSocket().simulateOpen()
      lastSocket().emitRaw('{bad json')
    })
    expect(container.textContent).toContain('发送第一条弹幕吧!')
  })

  it('自己发送的弹幕服务器回显时被去重，他人消息正常上屏', () => {
    const { container } = setup({ wsUrl: 'wss://live.example/ws/live?token=t', roomId: 'room-9' })
    act(() => lastSocket().simulateOpen())

    const input = screen.getByPlaceholderText('发送弹幕...')
    fireEvent.change(input, { target: { value: 'hello-optimistic' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    // 乐观上屏 + WS 直发
    expect(container.textContent).toContain('hello-optimistic')
    expect(payloads(lastSocket())).toContainEqual({ type: 'danmaku', room: 'room-9', text: 'hello-optimistic' })
    expect(msgCount(container)).toBe(1)

    // 服务器回显自己的弹幕 → 不重复
    act(() => lastSocket().emit({ type: 'danmaku', user: 'me', text: 'hello-optimistic', ts: now }))
    expect(container.textContent).toContain('hello-optimistic')
    expect(msgCount(container)).toBe(1)

    // 同文本他人弹幕 → 正常显示（consumeOwnEcho 按 userId 拦截）
    act(() => lastSocket().emit({ type: 'danmaku', user: 'other', text: 'hello-optimistic', ts: now + 1 }))
    expect(msgCount(container)).toBe(2)

    // 自己的另一条回显（未乐观上屏过）→ 正常显示
    act(() => lastSocket().emit({ type: 'danmaku', user: 'me', text: 'fresh-from-server', ts: now + 2 }))
    expect(container.textContent).toContain('fresh-from-server')
    expect(msgCount(container)).toBe(3)
  })

  it('断开与错误后展示非实时在线态', () => {
    setup({ wsUrl: 'wss://live.example/ws/live?token=t' })
    act(() => {
      lastSocket().simulateOpen()
      lastSocket().emit({ type: 'viewer_count', count: 5 })
    })
    expect(screen.getByText('5 人在线 · 实时')).toBeInTheDocument()

    act(() => lastSocket().simulateClose())
    // wsOnlineCount 不因断线清零，仅去掉「· 实时」标记
    expect(screen.getByText('5 人在线')).toBeInTheDocument()
    expect(screen.queryByText(/· 实时/)).toBeNull()
  })

  it('WebSocket 构造失败时回退轮询模式', async () => {
    MockWebSocket.failNext = true
    setup({ wsUrl: 'wss://live.example/ws/live?token=t' })
    expect(MockWebSocket.instances).toHaveLength(0)
    // 轮询兜底仍在工作（presence 拉取）
    await waitFor(() =>
      expect(api.mock.calls.some(([path]) => path === '/live-session/presence')).toBe(true)
    )
    expect(screen.getByText('发送第一条弹幕吧!')).toBeInTheDocument()
  })
})

describe('自动推导直播间通道（无 wsUrl）', () => {
  it('连接 URL 携带默认房间与用户参数，房间消息按类型处理', () => {
    const { container } = setup({ roomId: undefined })
    const ws = lastSocket()
    expect(ws.url).toContain('/live/ws?')
    expect(ws.url).toContain('roomId=main')
    expect(ws.url).toContain('userId=me')
    expect(ws.url).toContain('userName=Me')

    act(() => {
      ws.simulateOpen()
      ws.emit({
        type: 'room:joined',
        onlineCount: 7,
        recent: [
          { id: 'r1', userId: 'u9', userName: 'Zoe', text: 'recent msg', timestamp: now },
          { id: 'r2', userId: 'u8', userName: 'Amy', text: 'second msg', timestamp: now },
        ],
      })
    })
    expect(screen.getByText('7 人在线 · 实时')).toBeInTheDocument()
    expect(container.textContent).toContain('recent msg')

    // 跨批次相同 id 的 recent 不重复上屏（按已存在 id 去重）
    act(() => ws.emit({ type: 'room:joined', onlineCount: 7, recent: [
      { id: 'r1', userId: 'u9', userName: 'Zoe', text: 'recent msg', timestamp: now },
    ] }))
    expect(msgCount(container)).toBe(2)

    act(() => ws.emit({ type: 'chat', id: 'c1', userId: 'u9', userName: 'Zoe', text: 'chat text', timestamp: now }))
    expect(container.textContent).toContain('chat text')

    // reaction 仅计入状态，不上屏
    act(() => ws.emit({ type: 'reaction' }))
    expect(msgCount(container)).toBe(3)

    act(() => ws.emit({ type: 'presence:leave', onlineCount: 5 }))
    expect(screen.getByText('5 人在线 · 实时')).toBeInTheDocument()
    act(() => ws.emit({ type: 'presence:join', onlineCount: 6 }))
    expect(screen.getByText('6 人在线 · 实时')).toBeInTheDocument()

    // 非法 JSON 忽略
    act(() => ws.emitRaw('not-json'))
    expect(screen.getByText('6 人在线 · 实时')).toBeInTheDocument()
  })

  it('显式 roomId 参与自动推导 URL', () => {
    setup({ roomId: 'room-42' })
    expect(lastSocket().url).toContain('roomId=room-42')
  })

  it('自动通道 chat 回显去重与直发协议', () => {
    const { container } = setup({ currentEmotion: 'happy' })
    act(() => lastSocket().simulateOpen())

    const input = screen.getByPlaceholderText('发送弹幕...')
    fireEvent.change(input, { target: { value: 'own-chat' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(payloads(lastSocket())).toContainEqual({ type: 'chat', text: 'own-chat', emotion: 'happy' })
    expect(container.textContent).toContain('own-chat')
    expect(msgCount(container)).toBe(1)

    // 自己的 chat 回显被消费，不重复上屏
    act(() => lastSocket().emit({ type: 'chat', id: 'c2', userId: 'me', userName: 'Me', text: 'own-chat', timestamp: now }))
    expect(msgCount(container)).toBe(1)

    // 自己未乐观上屏过的 chat 正常上屏
    act(() => lastSocket().emit({ type: 'chat', id: 'c3', userId: 'me', userName: 'Me', text: 'server-only', timestamp: now }))
    expect(container.textContent).toContain('server-only')
    expect(msgCount(container)).toBe(2)
  })

  it('WS 未就绪（CONNECTING）时发送回退 HTTP danmaku 接口', async () => {
    setup()
    // 自动通道 socket 已创建但未 simulateOpen → readyState CONNECTING
    expect(lastSocket().readyState).toBe(MockWebSocket.CONNECTING)

    const input = screen.getByPlaceholderText('发送弹幕...')
    fireEvent.change(input, { target: { value: 'via-http' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() =>
      expect(api.mock.calls.some(([path, init]) => path === '/live-session/danmaku' && init?.method === 'POST')).toBe(true)
    )
    const call = api.mock.calls.find(([path, init]) => path === '/live-session/danmaku' && init?.method === 'POST')!
    expect(JSON.parse(call[1].body as string)).toEqual(
      expect.objectContaining({ userId: 'me', text: 'via-http', trackId: 'track-1' })
    )
    expect(lastSocket().sent).toHaveLength(0)
  })

  it('presence 接口返回 null 时保持空态不崩溃', async () => {
    api.mockImplementation((async () => null) as never)
    setup()
    await waitFor(() =>
      expect(api.mock.calls.some(([path]) => path === '/live-session/presence')).toBe(true)
    )
    expect(screen.getByText('发送第一条弹幕吧!')).toBeInTheDocument()
  })

  it('空输入回车不触发发送', () => {
    setup()
    const input = screen.getByPlaceholderText('发送弹幕...')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(
      api.mock.calls.some(([path, init]) => path === '/live-session/danmaku' && init?.method === 'POST')
    ).toBe(false)
  })
})
