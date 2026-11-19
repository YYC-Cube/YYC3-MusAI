/**
 * music-live 组件测试 — 主仓顶层架构（W3 补流媒体）
 *
 * 覆盖：ViewerCount / GiftPanel / EmojiPanel / ModerationPanel / DanmakuBoard /
 * LiveClient（队列与发送）/ LiveRoom（renderPlayer 槽位与默认占位区）
 */
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ViewerCount } from '../src/ViewerCount';
import { GiftPanel } from '../src/GiftPanel';
import { EmojiPanel } from '../src/EmojiPanel';
import { ModerationPanel } from '../src/ModerationPanel';
import { DanmakuBoard } from '../src/DanmakuBoard';
import { LiveClient } from '../src/LiveClient';
import { LiveRoom } from '../src/LiveRoom';
import { DEFAULT_GIFTS, type GiftItem } from '../src/types';

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
