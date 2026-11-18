// 挑战赛域 — 赛事、投稿、冠军记录与投票面板

import type { AuthUser } from './user';

/** Challenge contest */
export interface Challenge {
  id: string;
  titleZh: string;
  titleEn: string;
  descZh: string;
  descEn: string;
  tags: string[];
  startsAt: number;
  endsAt: number;
  totalEntries: number;
}

/** Challenge entry (submission) */
export interface ChallengeEntry {
  id: string;
  userId: string;
  userName: string;
  workId?: string;
  workTitle: string;
  workTheme?: string;
  workLyrics?: string[];
  votes: number;
  aiScore?: number;
  submittedAt: number;
}

/** Champion record */
export interface ChallengeChampion {
  challengeId: string;
  challengeTitle: string;
  winner: ChallengeEntry;
  finalizedAt: number;
}

/** Challenge submit request */
export interface ChallengeSubmitRequest {
  userId: string;
  userName?: string;
  workId?: string;
  workTitle: string;
  workTheme?: string;
  workLyrics?: string[];
}

/** Challenge vote request */
export interface ChallengeVoteRequest {
  userId: string;
  entryId: string;
}

export interface ChallengeProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  onOpenCreationStudio: () => void;
}
