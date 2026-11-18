// 成就与激励域 — 成就体系、M Heart 数值与相关面板

import type { Lang } from './common';
import type { AuthUser } from './user';

/** Achievement categories */
export type AchievementCategory =
  | 'listening'
  | 'social'
  | 'collection'
  | 'streak';

/** Achievement definition (client-side, playlistData) */
export interface Achievement {
  id: string;
  name: string;
  icon: string;
  description: string;
  requirement: number;
  category: AchievementCategory;
}

/** Achievement data from backend API */
export interface AchievementData {
  id: string;
  nameZh: string;
  nameEn: string;
  descZh: string;
  descEn: string;
  icon: string;
  unlocked: boolean;
  newlyUnlocked: boolean;
}

/** Achievement statistics */
export interface AchievementStats {
  totalWorks: number;
  streakDays: number;
  totalLikesReceived: number;
  totalForks: number;
  totalPlays: number;
  totalMessages: number;
  totalCapsules: number;
  peakStarPower: number;
  locationMessages: number;
  voiceMessages: number;
}

/** M Heart value data */
export interface MHeartData {
  score: number;
  emotionIntensity: number;
  resonance: number;
  rarity: number;
  emotionBreakdown: Record<string, number>;
  updatedAt: number;
  listeningMinutes?: number;
  totalSessions?: number;
}

/** M Heart trend data point */
export interface MHeartTrendPoint {
  score: number;
  timestamp: number;
}

/** Achievement track request */
export interface AchievementTrackRequest {
  action: string;
  [key: string]: any; // extra counters
}

/** Achievement list response */
export interface AchievementListResponse {
  achievements: AchievementData[];
  stats: AchievementStats;
  totalUnlocked: number;
  totalAchievements: number;
}

export interface MHeartSystemProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  lang: Lang;
}

export interface AchievementsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  starPower?: number;
}
