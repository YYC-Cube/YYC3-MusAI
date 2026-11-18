// 排行榜与数据分析域 — 排行、推荐、听歌历史、统计与数据面板

import type { Lang } from './common';
import type { AuthUser } from './user';
import type { Track } from './track';

/** Leaderboard entry (Wilson Score) */
export interface LeaderboardEntry {
  songId: string;
  title: string;
  artist: string;
  positiveVotes: number;
  totalVotes: number;
  playCount: number;
  wilsonScore: number;
  finalScore: number;
  rank: number;
}

/** Internal ranking entry (component-level) */
export interface RankingEntry {
  songId: string;
  likes: number;
  plays: number;
  comments: number;
  wilsonScore: number;
  engagement: number;
}

/** Recommendation item */
export interface RecommendationItem {
  songId: string;
  title: string;
  artist: string;
  score: number;
  reason: string;
}

/** Internal recommendation with extended fields */
export interface Recommendation {
  songId: string;
  score: number;
  reason: string;
  reasonZh: string;
}

/** Listening history entry */
export interface ListeningHistoryEntry {
  songId: string;
  songTitle: string;
  emotion: string;
  listenDuration: number;
  totalDuration: number;
  completionRate: number;
  skipped: boolean;
  timestamp?: number;
}

/** Analytics overview data */
export interface AnalyticsData {
  totalPlays: number;
  totalLikes: number;
  totalComments: number;
  totalEngagement: number;
  songBreakdown: Array<{
    songId: string;
    plays: number;
    likes: number;
    comments: number;
  }>;
}

/** Leaderboard boost request */
export interface LeaderboardBoostRequest {
  songId: string;
  userId: string;
  amount?: number;
  starPowerCost?: number;
}

/** Listening history record request */
export interface ListeningHistoryRequest {
  userId: string;
  songId: string;
  songTitle: string;
  emotion: string;
  listenDuration: number;
  totalDuration: number;
  completionRate: number;
  skipped: boolean;
}

export interface AnalyticsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface LeaderboardPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTrack?: (songId: string) => void;
  user?: AuthUser | null;
  starPower?: number;
  onStarPowerUpdate?: (sp: number) => void;
}

export interface RecommendationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  playlist: Track[];
  currentTrackIndex: number;
  isPlaying: boolean;
  onSelectTrack: (index: number) => void;
  onHaptic?: () => void;
}

export interface ListeningStatsProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  lang: Lang;
}
