// 直播域 — 在线听众、弹幕消息与直播会话面板

/** Live listener presence */
export interface LiveListener {
  userId: string;
  userName: string;
  trackTitle: string;
  emotion: string;
  isPlaying: boolean;
  lastSeen: number;
}

/** Danmaku (live chat message) */
export interface DanmakuMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  color: string;
  timestamp: number;
}

/** Live session heartbeat request */
export interface LiveHeartbeatRequest {
  userId: string;
  userName?: string;
  trackId?: string;
  trackTitle?: string;
  emotion?: string;
  isPlaying?: boolean;
}

/** Danmaku send request */
export interface DanmakuRequest {
  userId: string;
  userName?: string;
  text: string;
  trackId?: string;
  color?: string;
}

export interface LiveSessionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  userName?: string;
  currentTrackId: string;
  currentTrackTitle: string;
  isPlaying: boolean;
  currentEmotion: string;
}
