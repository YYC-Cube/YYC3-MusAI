// 社区与社交域 — 动态流、评论、通知及社区面板组件

import type { Lang } from './common';
import type { AuthUser } from './user';

/** Community activity types */
export type CommunityActivityType =
  | 'annotation'
  | 'like'
  | 'achievement'
  | 'play';

/** Notification event types */
export type NotificationType =
  | 'fork'
  | 'like'
  | 'comment'
  | 'achievement';

/** Community activity feed item */
export interface CommunityActivity {
  id: string;
  type: CommunityActivityType;
  userId: string;
  userName: string;
  songId: string;
  songTitle: string;
  detail: string;
  timestamp: number;
}

/** Comment on a song */
export interface CommentItem {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp?: number;
  likes: number;
  createdAt: number;
}

/** Internal comment model (component-level) */
export interface CommentModel {
  id: string;
  userId: string;
  userName: string;
  text: string;
  /** Playback seconds */
  timestamp: number;
  createdAt: number;
  likes: number;
  likedBy: string[];
}

/** Timeline comment (danmaku-style) */
export interface TimelineComment {
  id: string;
  text: string;
  /** Seconds in playback */
  timestamp: number;
  userName: string;
  color: string;
  createdAt: number;
  likes: number;
}

/** Notification item */
export interface NotificationItem {
  id: string;
  type: NotificationType;
  fromUser: string;
  workTitle?: string;
  originalWorkId?: string;
  createdAt: number;
  read: boolean;
}

/** Comment post request */
export interface CommentRequest {
  userId: string;
  userName: string;
  text: string;
  timestamp?: number;
}

/** Timeline comment request */
export interface TimelineCommentRequest {
  userId?: string;
  userName: string;
  text: string;
  timestamp: number;
  songId: string;
}

export interface CommunityFeedProps {
  isOpen: boolean;
  onClose: () => void;
  activities: CommunityActivity[];
  onRefresh: () => void;
  isLoading: boolean;
}

export interface CommentSystemProps {
  isOpen: boolean;
  onClose: () => void;
  songId: string;
  songTitle: string;
  currentTime: number;
  user: AuthUser | null;
}

export interface TimelineCommentsProps {
  songId: string;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  user: AuthUser | null;
  lang: Lang;
}
