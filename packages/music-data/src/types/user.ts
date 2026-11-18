// 用户域 — 身份认证、用户资料、偏好设置与账号组件

import type { Lang, MediaMode, RepeatMode, ThemeId } from './common';

/** User roles */
export type UserRole = 'user' | 'creator' | 'admin';

/** Supabase Auth user object (minimal, from auth.getUser()) */
export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: {
    display_name?: string;
    [key: string]: any;
  };
}

/** User profile as displayed in the app */
export interface UserProfileData {
  userId: string;
  email: string;
  displayName: string;
  starPower: number;
  totalListeningTime: number;
  totalAnnotations: number;
  totalLikes: number;
  achievements: string[];
  joinedAt: string;
  streak: number;
}

/** Extended user profile from backend API */
export interface UserProfileAPI {
  id?: string;
  nickname?: string;
  avatar?: string;
  bio?: string;
  favoriteGenres?: string[];
  totalPlays?: number;
  totalLikes?: number;
  joinedAt?: string;
}

/** User preferences (persisted in localStorage + KV) */
export interface UserPreferences {
  lang: Lang;
  volume: number;
  shuffleEnabled: boolean;
  repeatMode: RepeatMode;
  mode: MediaMode;
  theme: ThemeId;
}

/** Profile update request */
export interface ProfileUpdateRequest {
  displayName?: string;
  bio?: string;
  email?: string;
  avatar?: string;
  [key: string]: any; // passthrough for additional fields
}

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserChange: (user: AuthUser | null) => void;
}

export interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  profile: UserProfileData | null;
  starPower: number;
}
