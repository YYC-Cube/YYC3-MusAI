// 社区面板共享层 · 时空墙类型 / 常量 / 工具函数

export interface STMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  type: string;
  targetTime: string | null;
  targetLocation?: { lat: number; lng: number; label?: string } | null;
  songId: string | null;
  songTitle: string | null;
  emotion: string;
  likes: number;
  likedBy: string[];
  replies: number;
  createdAt: number;
  status: string;
  distance?: number;
  // Voice message fields
  audioDuration?: number;
  audioWaveform?: number[];
  audioFilePath?: string;
  audioSignedUrl?: string;
  audioData?: string;
  transcript?: string;
}

export interface STReply {
  id: string;
  messageId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: number;
}

export interface STCapsule {
  id: string;
  userId: string;
  userName: string;
  title: string;
  content: string;
  unlockAt: string;
  unlockTs: number;
  songId: string | null;
  songTitle: string | null;
  emotion: string;
  recipientName: string | null;
  isUnlocked: boolean;
  likes: number;
  createdAt: number;
  // E2EE fields (P3 §2 integration)
  encrypted?: boolean;
  encryptedContent?: string;
  encryptedSessionKey?: string;
  encryptionIv?: string;
  senderFingerprint?: string;
  recipientUserId?: string;
  // Client-side decrypted content cache
  _decryptedContent?: string;
  _decryptError?: boolean;
}

export type STTab = 'messages' | 'capsules' | 'nearby';

export const EMOTIONS = [
  { key: 'happy', emoji: '😊', zh: '快乐', en: 'Happy', color: 'text-yellow-400' },
  { key: 'sad', emoji: '😢', zh: '忧伤', en: 'Sad', color: 'text-blue-400' },
  { key: 'energetic', emoji: '⚡', zh: '活力', en: 'Energetic', color: 'text-orange-400' },
  { key: 'calm', emoji: '🌙', zh: '宁静', en: 'Calm', color: 'text-cyan-400' },
  { key: 'love', emoji: '❤️', zh: '爱情', en: 'Love', color: 'text-pink-400' },
  { key: 'neutral', emoji: '🌟', zh: '中性', en: 'Neutral', color: 'text-white/50' },
];

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return `${Math.floor(diff / 86400000)}天前`;
}

export function timeUntil(ts: number): { value: number; unit: string } {
  const diff = ts - Date.now();
  if (diff <= 0) return { value: 0, unit: 'now' };
  if (diff < 3600000) return { value: Math.ceil(diff / 60000), unit: 'min' };
  if (diff < 86400000) return { value: Math.ceil(diff / 3600000), unit: 'h' };
  return { value: Math.ceil(diff / 86400000), unit: 'd' };
}

export const emotionOf = (key: string) => EMOTIONS.find(e => e.key === key) || EMOTIONS[5];
