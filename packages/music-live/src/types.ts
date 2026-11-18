/**
 * YYC³ music-live · 直播类型定义（W3 补流媒体）
 *
 * 与 music-server /ws/live 协议对齐：
 *   welcome / joined / room_info / viewer_count
 *   danmaku / emoji / gift / moderation / moderated / pong
 */

export type LiveMessageType =
  | 'welcome'
  | 'joined'
  | 'room_info'
  | 'viewer_count'
  | 'danmaku'
  | 'emoji'
  | 'gift'
  | 'moderation'
  | 'moderated'
  | 'pong';

export interface LiveMessage {
  type: LiveMessageType;
  room?: string;
  user?: string | null;
  ts?: number;
  text?: string;
  emoji?: string;
  giftId?: string;
  count?: number;
  action?: 'mute' | 'unmute' | 'kick' | 'delete';
  targetUser?: string;
  moderator?: string | null;
  reason?: string;
}

export interface LiveRoom {
  id: string;
  name: string;
  status: 'live' | 'ended';
  rtmpPushUrl: string;
  hlsPlayUrl: string;
  viewerCount: number;
  createdAt: number;
  endedAt: number | null;
}

export interface LiveUser {
  id: string;
  name: string;
  isModerator?: boolean;
}

export type GiftType = 'heart' | 'rocket' | 'star' | 'crown';

export interface GiftItem {
  id: GiftType | string;
  label: string;
  price: number;
  icon: string;
}

export const DEFAULT_GIFTS: GiftItem[] = [
  { id: 'heart', label: '心心', price: 1, icon: '❤️' },
  { id: 'star', label: '星星', price: 5, icon: '⭐' },
  { id: 'rocket', label: '火箭', price: 50, icon: '🚀' },
  { id: 'crown', label: '皇冠', price: 100, icon: '👑' },
];

export const DEFAULT_EMOJIS = ['👍', '❤️', '🔥', '🎉', '😍', '😂', '👏', '🎵'];
