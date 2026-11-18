/**
 * YYC³ music-live · WebSocket 客户端封装（W3 补流媒体）
 *
 * 与 music-server /ws/live 协议对齐。支持 JWT 鉴权、房间加入、心跳、
 * 弹幕/表情/礼物发送、在线人数广播、管理员操作。
 */

export interface LiveClientOptions {
  /** WebSocket 地址，例如 wss://host:port/ws/live?token=xxx */
  url: string;
  /** 房间 ID */
  room?: string;
  /** 收到消息回调 */
  onMessage?: (msg: any) => void;
  /** 连接打开回调 */
  onOpen?: () => void;
  /** 连接关闭回调 */
  onClose?: (event: CloseEvent) => void;
  /** 连接错误回调 */
  onError?: (event: Event) => void;
  /** 心跳间隔（ms），默认 30000 */
  heartbeatInterval?: number;
}

export class LiveClient {
  private ws: WebSocket | null = null;
  private url: string;
  private room: string;
  private onMessage?: (msg: any) => void;
  private onOpen?: () => void;
  private onClose?: (event: CloseEvent) => void;
  private onError?: (event: Event) => void;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatIntervalMs: number;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnecting = false;
  private pendingQueue: Array<{ type: string; [key: string]: any }> = [];

  constructor({
    url,
    room = 'lobby',
    onMessage,
    onOpen,
    onClose,
    onError,
    heartbeatInterval = 30_000,
  }: LiveClientOptions) {
    this.url = url;
    this.room = room;
    this.onMessage = onMessage;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.onError = onError;
    this.heartbeatIntervalMs = heartbeatInterval;
  }

  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnecting = false;
      this.startHeartbeat();
      this.join(this.room);
      this.flushPending();
      this.onOpen?.();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.onMessage?.(msg);
      } catch {
        // 忽略非 JSON 消息
      }
    };

    this.ws.onclose = (event) => {
      this.stopHeartbeat();
      this.onClose?.(event);
      // 自动重连（匿名模式下可选，此处始终重连，由上层控制）
      if (!this.reconnecting) {
        this.reconnecting = true;
        this.reconnectTimer = setTimeout(() => {
          this.reconnecting = false;
          this.connect();
        }, 3000);
      }
    };

    this.ws.onerror = (event) => {
      this.onError?.(event);
    };
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'ping' });
    }, this.heartbeatIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private join(room: string): void {
    this.room = room;
    this.send({ type: 'join', room });
  }

  private flushPending(): void {
    while (this.pendingQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const msg = this.pendingQueue.shift()!;
      this.ws.send(JSON.stringify(msg));
    }
  }

  /** 发送消息（未连接时入队，连接后自动发送） */
  send(msg: { type: string; [key: string]: any }): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      this.pendingQueue.push(msg);
    }
  }

  /** 发送弹幕 */
  sendDanmaku(text: string): void {
    this.send({ type: 'danmaku', text });
  }

  /** 发送表情 */
  sendEmoji(emoji: string): void {
    this.send({ type: 'emoji', emoji });
  }

  /** 发送礼物 */
  sendGift(giftId: string, count = 1): void {
    this.send({ type: 'gift', giftId, count });
  }

  /** 请求房间信息 */
  requestRoomInfo(): void {
    this.send({ type: 'get_room' });
  }

  /** 请求在线人数 */
  requestViewerCount(): void {
    this.send({ type: 'viewer_count_request' });
  }

  /** 管理员操作 */
  moderate(action: 'mute' | 'unmute' | 'kick' | 'delete', targetUser: string): void {
    this.send({ type: 'moderate', action, targetUser });
  }

  /** 切换房间 */
  switchRoom(room: string): void {
    this.send({ type: 'join', room });
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  get isConnected(): boolean {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}
