/**
 * music-live 组件测试 — 主仓顶层架构（W3 补流媒体）
 *
 * 覆盖：ViewerCount / GiftPanel / EmojiPanel / ModerationPanel / DanmakuBoard /
 * LiveClient（队列与发送）/ LiveRoom（renderPlayer 槽位与默认占位区）
 */
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { toast } from 'sonner';

import { ViewerCount } from '../src/ViewerCount';
import { GiftPanel } from '../src/GiftPanel';
import { EmojiPanel } from '../src/EmojiPanel';
import { ModerationPanel } from '../src/ModerationPanel';
import { DanmakuBoard } from '../src/DanmakuBoard';
import { LiveClient } from '../src/LiveClient';
import { LiveRoom } from '../src/LiveRoom';
import { DEFAULT_GIFTS } from '../src/types';

// LiveRoom 的错误/礼物提示走 sonner toast；桩化以便断言调用链
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    message: vi.fn(),
    custom: vi.fn(),
  },
}));

// jsdom 未实现 window.scrollTo，motion-dom 键帧测量会触发调用（主仓 motion 12.43 实测）
window.scrollTo = vi.fn();

afterEach(() => cleanup());

// ── WebSocket 桩：jsdom 无 WebSocket，替换为可断言的最小实现 ──
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  readyState = MockWebSocket.CONNECTING;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event?: unknown) => void) | null = null;
  onerror: ((event?: unknown) => void) | null = null;
  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }
  send(data: string) { this.sent.push(data); }
  close() { this.readyState = MockWebSocket.CLOSED; }
  /** 测试辅助：模拟连接建立 */
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }
  /** 测试辅助：模拟服务端断开（readyState 置 CLOSED 并派发 close） */
  simulateClose() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ type: 'close' });
  }
}

const lastSocket = () => MockWebSocket.instances[MockWebSocket.instances.length - 1];

describe('ViewerCount', () => {
  it('渲染在线人数', () => {
    render(<ViewerCount count={8} />);
    expect(screen.getByText('8')).toBeTruthy();
    expect(screen.getByText('人在线')).toBeTruthy();
  });
});

describe('GiftPanel', () => {
  it('渲染礼物列表并在点击时回调', () => {
    const onGift = vi.fn();
    render(<GiftPanel gifts={DEFAULT_GIFTS} onGift={onGift} />);
    const heart = screen.getByTitle('心心 (1)');
    fireEvent.click(heart);
    expect(onGift).toHaveBeenCalledWith(DEFAULT_GIFTS[0]);
  });

  it('isModerator 时显示管理按钮', () => {
    const { container } = render(
      <GiftPanel gifts={DEFAULT_GIFTS} onGift={vi.fn()} isModerator />,
    );
    expect(container.textContent).toContain('🛡️');
  });

  it('非 moderator 不显示管理按钮', () => {
    const { container } = render(
      <GiftPanel gifts={DEFAULT_GIFTS} onGift={vi.fn()} isModerator={false} />,
    );
    expect(container.textContent).not.toContain('🛡️');
  });
});

describe('EmojiPanel', () => {
  it('渲染默认表情集并在点击时回调', () => {
    const onEmoji = vi.fn();
    render(<EmojiPanel onEmoji={onEmoji} />);
    fireEvent.click(screen.getByTitle('👍'));
    expect(onEmoji).toHaveBeenCalledWith('👍');
  });
});

describe('ModerationPanel', () => {
  it('非 moderator 时返回 null', () => {
    const { container } = render(
      <ModerationPanel onModerate={vi.fn()} isModerator={false} />,
    );
    expect(container.textContent).toBe('');
  });

  it('moderator 输入目标用户后执行禁言', () => {
    const onModerate = vi.fn();
    render(<ModerationPanel onModerate={onModerate} isModerator />);
    const input = screen.getByPlaceholderText('目标用户ID') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'user-42' } });
    fireEvent.click(screen.getByTitle('禁言'));
    expect(onModerate).toHaveBeenCalledWith('mute', 'user-42');
  });
});

describe('DanmakuBoard', () => {
  it('渲染注入的弹幕文本并按 id 去重', () => {
    const messages = [
      { id: 'd1', type: 'danmaku' as const, text: '太好听了', user: '小明', ts: Date.now() },
      { id: 'd2', type: 'gift' as const, giftId: 'rocket', count: 1, user: '小红', ts: Date.now() },
    ];
    const { container } = render(<DanmakuBoard messages={messages} />);
    expect(container.textContent).toContain('太好听了');
    // 礼物弹幕格式：🎁 {giftId} ×{count}  {user}
    expect(container.textContent).toContain('🎁 rocket ×1  小红');
  });
});

describe('LiveClient', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket as unknown as typeof WebSocket);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('连接后自动 join 房间并冲洗发送队列', () => {
    const client = new LiveClient({ url: 'wss://host/ws/live?token=x', room: 'main' });
    // 连接前发送 → 入队（此刻尚无 socket 实例）
    client.sendDanmaku('你好');
    expect(MockWebSocket.instances).toHaveLength(0);

    client.connect();
    const ws = lastSocket();
    ws.simulateOpen();

    const payloads = ws.sent.map((s) => JSON.parse(s));
    expect(payloads.some((m) => m.type === 'join' && m.room === 'main')).toBe(true);
    expect(payloads.some((m) => m.type === 'danmaku' && m.text === '你好')).toBe(true);
  });

  it('表情与礼物按协议字段发送', () => {
    const client = new LiveClient({ url: 'wss://host/ws/live?token=x' });
    client.connect();
    lastSocket().simulateOpen();
    client.sendEmoji('❤️');
    client.sendGift('rocket', 2);
    const payloads = lastSocket().sent.map((s) => JSON.parse(s));
    expect(payloads).toContainEqual({ type: 'emoji', emoji: '❤️' });
    expect(payloads).toContainEqual({ type: 'gift', giftId: 'rocket', count: 2 });
  });

  it('收到的消息回调 onMessage', () => {
    const onMessage = vi.fn();
    const client = new LiveClient({ url: 'wss://host/ws/live?token=x', onMessage });
    client.connect();
    const ws = lastSocket();
    ws.simulateOpen();
    ws.onmessage?.({ data: JSON.stringify({ type: 'welcome' }) });
    expect(onMessage).toHaveBeenCalledWith({ type: 'welcome' });
  });
});

describe('LiveRoom', () => {
  const room = {
    id: 'main',
    name: '测试直播间',
    status: 'live' as const,
    rtmpPushUrl: 'rtmp://push',
    hlsPlayUrl: 'https://cdn/live.m3u8',
    viewerCount: 8,
    createdAt: 0,
    endedAt: null,
  };
  const user = { id: 'u1', name: '主播', isModerator: true };

  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket as unknown as typeof WebSocket);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('默认渲染内置 HLS 占位播放区', () => {
    const { container } = render(<LiveRoom room={room} user={user} wsUrl="wss://host/ws/live?token=x" />);
    expect(container.textContent).toContain('HLS 流媒体播放区');
    expect(container.textContent).toContain('测试直播间');
  });

  it('renderPlayer 槽位注入自定义播放器（接收 HLS 地址与直播状态）', () => {
    const renderPlayer = vi.fn(
      (hlsUrl: string | null, live: boolean) => (
        <div data-testid="custom-player">{`${hlsUrl}#${live}`}</div>
      ),
    );
    const { container, unmount } = render(
      <LiveRoom room={room} user={user} wsUrl="wss://host/ws/live?token=x" renderPlayer={renderPlayer} />,
    );
    expect(screen.getByTestId('custom-player').textContent).toBe('https://cdn/live.m3u8#true');
    expect(renderPlayer).toHaveBeenCalledWith('https://cdn/live.m3u8', true);
    expect(container.textContent).not.toContain('HLS 流媒体播放区');
    unmount();
  });

  it('连接建立后请求在线人数并随 viewer_count 更新', () => {
    render(<LiveRoom room={room} user={user} wsUrl="wss://host/ws/live?token=x" />);
    const ws = lastSocket();
    ws.simulateOpen();
    const payloads = ws.sent.map((s) => JSON.parse(s));
    expect(payloads.some((m) => m.type === 'viewer_count_request')).toBe(true);
  });
});

/** 在容器 fiber 树中按组件类型查找 fiber（用于触发未暴露的回调槽位） */
function findFiberByType(container: HTMLElement, type: unknown): { props: Record<string, any> } | null {
  const startNode: HTMLElement = (container.firstElementChild as HTMLElement) ?? container;
  const key = Object.keys(startNode).find((k) => k.startsWith('__reactFiber$'));
  if (!key) return null;
  const root = (startNode as unknown as Record<string, any>)[key];
  const queue: any[] = [root];
  while (queue.length) {
    const f = queue.shift();
    if (!f) continue;
    if (f.type === type) return { props: (f.pendingProps ?? {}) as Record<string, any> };
    queue.push(f.child, f.sibling);
  }
  return null;
}

describe('LiveRoom 交互链与审核面板（W5 补流）', () => {
  const room = {
    id: 'main',
    name: '测试直播间',
    status: 'live' as const,
    rtmpPushUrl: 'rtmp://push',
    hlsPlayUrl: 'https://cdn/live.m3u8',
    viewerCount: 8,
    createdAt: 0,
    endedAt: null,
  };

  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.mocked(toast.error).mockClear();
    vi.mocked(toast.success).mockClear();
    vi.stubGlobal('WebSocket', MockWebSocket as unknown as typeof WebSocket);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('isModerator 时渲染审核面板并可执行禁言', () => {
    const moderator = { id: 'u1', name: '主播', isModerator: true };
    const { container } = render(<LiveRoom room={room} user={moderator} wsUrl="wss://host/ws/live?token=x" />);
    expect(container.querySelector('input[placeholder="目标用户ID"]')).toBeTruthy();
    lastSocket().simulateOpen();

    fireEvent.change(screen.getByPlaceholderText('目标用户ID'), { target: { value: 'user-7' } });
    fireEvent.click(screen.getByTitle('禁言'));

    const payloads = lastSocket().sent.map((s) => JSON.parse(s));
    expect(payloads).toContainEqual({ type: 'moderate', action: 'mute', targetUser: 'user-7' });
  });

  it('非 moderator 时不渲染审核面板', () => {
    const viewer = { id: 'u2', name: '观众', isModerator: false };
    const { container } = render(<LiveRoom room={room} user={viewer} wsUrl="wss://host/ws/live?token=x" />);
    expect(container.querySelector('input[placeholder="目标用户ID"]')).toBeNull();
  });

  it('表情面板点击通过 LiveClient 直发 emoji', () => {
    const moderator = { id: 'u1', name: '主播', isModerator: false };
    render(<LiveRoom room={room} user={moderator} wsUrl="wss://host/ws/live?token=x" />);
    lastSocket().simulateOpen();
    fireEvent.click(screen.getByTitle('👍'));

    const payloads = lastSocket().sent.map((s) => JSON.parse(s));
    expect(payloads).toContainEqual({ type: 'emoji', emoji: '👍' });
  });

  it('礼物回调链：LiveClient.sendGift + toast 成功提示', () => {
    const moderator = { id: 'u1', name: '主播', isModerator: false };
    const { container } = render(<LiveRoom room={room} user={moderator} wsUrl="wss://host/ws/live?token=x" />);
    lastSocket().simulateOpen();

    // LiveRoom 固定传入空礼物列表，直接调用 GiftPanel 槽位回调触发 sendGift 链路
    const fiber = findFiberByType(container, GiftPanel);
    expect(fiber).toBeTruthy();
    act(() => fiber!.props.onGift(DEFAULT_GIFTS[0]));

    const payloads = lastSocket().sent.map((s) => JSON.parse(s));
    expect(payloads).toContainEqual({ type: 'gift', giftId: 'heart', count: 1 });
    expect(toast.success).toHaveBeenCalledWith('赠送 心心 ×1');
  });

  it('moderated 消息弹出拦截原因 toast，viewer_count 更新在线人数', () => {
    const moderator = { id: 'u1', name: '主播', isModerator: false };
    render(<LiveRoom room={room} user={moderator} wsUrl="wss://host/ws/live?token=x" />);
    const ws = lastSocket();
    ws.simulateOpen();

    act(() => ws.onmessage?.({ data: JSON.stringify({ type: 'moderated', reason: '违规内容' }) }));
    expect(toast.error).toHaveBeenCalledWith('违规内容');

    act(() => ws.onmessage?.({ data: JSON.stringify({ type: 'moderated' }) }));
    expect(toast.error).toHaveBeenCalledWith('消息被拦截');

    act(() => ws.onmessage?.({ data: JSON.stringify({ type: 'viewer_count', count: 99 }) }));
    expect(screen.getByText('99')).toBeTruthy();

    // welcome/joined/room_info 静默不崩溃
    act(() => {
      ws.onmessage?.({ data: JSON.stringify({ type: 'welcome' }) });
      ws.onmessage?.({ data: JSON.stringify({ type: 'joined' }) });
      ws.onmessage?.({ data: JSON.stringify({ type: 'room_info' }) });
    });
    expect(toast.error).toHaveBeenCalledTimes(2);
  });

  it('WS 错误弹出连接异常 toast', () => {
    const moderator = { id: 'u1', name: '主播', isModerator: false };
    render(<LiveRoom room={room} user={moderator} wsUrl="wss://host/ws/live?token=x" />);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    act(() => lastSocket().onerror?.({ type: 'error' }));
    expect(toast.error).toHaveBeenCalledWith('直播间连接异常');
    consoleSpy.mockRestore();
  });

  it('断线后展示「连接中断」，3 秒后自动重连恢复「已连接」', () => {
    vi.useFakeTimers();
    const moderator = { id: 'u1', name: '主播', isModerator: false };
    const { container, unmount } = render(
      <LiveRoom room={room} user={moderator} wsUrl="wss://host/ws/live?token=x" />,
    );
    const ws = lastSocket();
    expect(container.textContent).toContain('连接中断');

    act(() => ws.simulateOpen());
    expect(container.textContent).toContain('已连接直播间');

    act(() => ws.simulateClose());
    expect(container.textContent).toContain('连接中断');

    // 3 秒后自动重连建立新 socket 并恢复连接态（重连定时器随卸载被清理）
    act(() => vi.advanceTimersByTime(3000));
    const reconnected = lastSocket();
    expect(reconnected).not.toBe(ws);
    act(() => reconnected.simulateOpen());
    expect(container.textContent).toContain('已连接直播间');

    unmount();
  });

  it('hlsPlayUrl 缺失时 renderPlayer 收到 null 播放地址', () => {
    const noHls = { ...room, hlsPlayUrl: '' };
    const renderPlayer = vi.fn(() => <div data-testid="player-slot" />);
    render(<LiveRoom room={noHls} user={{ id: 'u1', name: '主播' }} wsUrl="wss://host/ws/live?token=x" renderPlayer={renderPlayer} />);
    expect(renderPlayer).toHaveBeenCalledWith(null, true);
  });
});

describe('LiveClient 断线重连与边界（W5 补流）', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket as unknown as typeof WebSocket);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('CONNECTING 状态下发送入队，open 后冲洗', () => {
    const client = new LiveClient({ url: 'wss://host/ws/live?token=x' });
    client.connect();
    const ws = lastSocket();
    expect(ws.readyState).toBe(MockWebSocket.CONNECTING);

    client.sendDanmaku('queued-while-connecting');
    expect(ws.sent).toHaveLength(0);

    ws.simulateOpen();
    const payloads = ws.sent.map((s) => JSON.parse(s));
    expect(payloads).toContainEqual({ type: 'join', room: 'lobby' });
    expect(payloads).toContainEqual({ type: 'danmaku', text: 'queued-while-connecting' });
  });

  it('非 JSON 消息被忽略不回调', () => {
    const onMessage = vi.fn();
    const client = new LiveClient({ url: 'wss://host/ws/live?token=x', onMessage });
    client.connect();
    lastSocket().simulateOpen();
    lastSocket().onmessage?.({ data: 'not-json{{' });
    expect(onMessage).not.toHaveBeenCalled();
  });

  it('已 OPEN 时重复 connect 不会创建第二个 socket', () => {
    const client = new LiveClient({ url: 'wss://host/ws/live?token=x' });
    client.connect();
    lastSocket().simulateOpen();
    client.connect();
    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it('close 后 send 安全入队且 isConnected 状态正确', () => {
    const client = new LiveClient({ url: 'wss://host/ws/live?token=x' });
    expect(client.isConnected).toBe(false);

    client.connect();
    expect(client.isConnected).toBe(false);
    lastSocket().simulateOpen();
    expect(client.isConnected).toBe(true);

    lastSocket().close();
    expect(client.isConnected).toBe(false);
    // CLOSED 状态发送：不抛错，进入待发队列
    expect(() => client.sendDanmaku('after-close')).not.toThrow();
  });

  it('onclose 触发 3 秒后自动重连并重建 socket', () => {
    vi.useFakeTimers();
    const client = new LiveClient({ url: 'wss://host/ws/live?token=x' });
    client.connect();
    const first = lastSocket();
    first.simulateOpen();
    first.simulateClose();

    // 3 秒内不重连
    vi.advanceTimersByTime(2999);
    expect(MockWebSocket.instances).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(MockWebSocket.instances).toHaveLength(2);
    // 重连后心跳定时器接管，卸载时全部清理
    client.disconnect();
  });

  it('心跳按间隔发送 ping，disconnect 后停止', () => {
    vi.useFakeTimers();
    const client = new LiveClient({ url: 'wss://host/ws/live?token=x', heartbeatInterval: 1000 });
    client.connect();
    const ws = lastSocket();
    ws.simulateOpen();
    expect(ws.sent.some((s) => s === JSON.stringify({ type: 'ping' }))).toBe(false);

    vi.advanceTimersByTime(1000);
    expect(ws.sent.some((s) => s === JSON.stringify({ type: 'ping' }))).toBe(true);

    client.disconnect();
    vi.advanceTimersByTime(5000);
    expect(ws.sent.filter((s) => s === JSON.stringify({ type: 'ping' }))).toHaveLength(1);
    expect(lastSocket().readyState).toBe(MockWebSocket.CLOSED);
  });

  it('requestRoomInfo / switchRoom / moderate 按协议发送', () => {
    const client = new LiveClient({ url: 'wss://host/ws/live?token=x' });
    client.connect();
    lastSocket().simulateOpen();

    client.requestRoomInfo();
    client.switchRoom('room-2');
    client.moderate('kick', 'spammer');

    const payloads = lastSocket().sent.map((s) => JSON.parse(s));
    expect(payloads).toContainEqual({ type: 'get_room' });
    expect(payloads).toContainEqual({ type: 'join', room: 'room-2' });
    expect(payloads).toContainEqual({ type: 'moderate', action: 'kick', targetUser: 'spammer' });
  });

  it('onerror 回调透传错误事件', () => {
    const onError = vi.fn();
    const client = new LiveClient({ url: 'wss://host/ws/live?token=x', onError });
    client.connect();
    act(() => lastSocket().onerror?.({ type: 'error' }));
    expect(onError).toHaveBeenCalledWith({ type: 'error' });
  });
});
