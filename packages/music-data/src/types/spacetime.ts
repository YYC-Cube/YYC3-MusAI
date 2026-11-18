// 时空域 — 时空消息、时间胶囊、语音上传与时空面板

import type { AuthUser } from './user';

/** SpaceTime message types */
export type SpaceTimeMessageType = 'text' | 'voice';

/** Geographic location */
export interface GeoLocation {
  lat: number;
  lng: number;
  label?: string;
}

/** Space-Time message */
export interface STMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  type?: SpaceTimeMessageType;
  emotion: string;
  likes: number;
  likedBy: string[];
  replies: number;
  createdAt: number;
  targetLocation?: GeoLocation | null;
  targetTime?: string | null;
  songId?: string | null;
  songTitle?: string | null;
  audioDuration?: number;
  audioWaveform?: number[];
  audioFilePath?: string;
  audioSignedUrl?: string;
  distance?: number;
}

/** Time capsule */
export interface TimeCapsule {
  id: string;
  userId: string;
  userName: string;
  title: string;
  content: string;
  unlockTs: number;
  emotion: string;
  isUnlocked: boolean;
  likes: number;
  createdAt: number;
}

/** SpaceTime message request payload */
export interface SpaceTimeMessageRequest {
  userId?: string;
  userName?: string;
  content: string;
  type?: SpaceTimeMessageType;
  targetTime?: string | null;
  targetLocation?: GeoLocation | null;
  songId?: string | null;
  songTitle?: string | null;
  emotion?: string;
  isPublic?: boolean;
}

/** SpaceTime reply request payload */
export interface SpaceTimeReplyRequest {
  userId?: string;
  userName?: string;
  content: string;
}

/** Time capsule create request payload */
export interface TimeCapsuleRequest {
  userId?: string;
  userName?: string;
  title: string;
  content: string;
  unlockAt: string;
  emotion?: string;
  recipientName?: string;
  songId?: string | null;
  songTitle?: string | null;
  /** E2EE fields (P3 §2) */
  encrypted?: boolean;
  encryptedContent?: string;
  encryptedSessionKey?: string;
  encryptionIv?: string;
  senderFingerprint?: string;
  recipientUserId?: string;
}

/** Voice upload request */
export interface VoiceUploadRequest {
  userId: string;
  audioBase64: string;
  mimeType: string;
}

/** Voice upload response */
export interface VoiceUploadResponse {
  success: boolean;
  filePath: string;
  signedUrl: string;
}

export interface SpaceTimePanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  currentTrackId?: string;
  currentTrackTitle?: string;
}
