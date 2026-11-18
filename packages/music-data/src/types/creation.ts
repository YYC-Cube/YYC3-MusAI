// 创作与作品域 — 作品分享、Fork 树、创作工作室与 MV 制作

import type { Lang } from './common';
import type { AuthUser } from './user';
import type { Track } from './track';

/** MV Creator visual themes */
export type MVTheme =
  | 'starfield'
  | 'neonPulse'
  | 'aurora'
  | 'inkWash'
  | 'cyberCity';

/** Creation studio modes */
export type CreationMode = 'quick' | 'master' | 'remix' | 'works' | 'mv';

/** Shared work in community */
export interface SharedWork {
  workId: string;
  title: string;
  theme: string;
  lyrics: string[];
  mode: string;
  createdAt: number;
  sharedAt: number;
  userName: string;
  userId?: string;
  likes: number;
  plays: number;
  forkedFrom?: ForkOrigin | null;
}

/** Fork origin reference */
export interface ForkOrigin {
  workId: string;
  author: string;
  forkedAt: number;
}

/** Fork tree node */
export interface ForkNode {
  workId: string;
  author: string;
  forkedAt: number;
}

/** Fork work in tree view */
export interface ForkWork {
  id: string;
  title: string;
  theme?: string;
  authorName: string;
  authorId: string;
  parentWorkId?: string;
  lyrics?: string[];
  likes?: number;
  createdAt: number;
}

/** Fork tree node with children */
export interface ForkTreeNode {
  work: ForkWork;
  children: ForkTreeNode[];
  depth: number;
}

/** Created work in Creation Studio */
export interface CreatedWork {
  id: string;
  title: string;
  theme: string;
  lyrics: string[];
  mode: string;
  createdAt: number;
}

/** Creator info from discovery endpoint */
export interface CreatorInfo {
  userName: string;
  userId?: string;
  works: number;
  totalLikes: number;
  latestWork: number;
}

/** Share work request payload */
export interface ShareWorkRequest {
  workId: string;
  title: string;
  theme?: string;
  lyrics?: string[];
  mode?: string;
  createdAt?: number;
  userId?: string;
  userName?: string;
}

/** Fork work request payload */
export interface ForkWorkRequest {
  userId: string;
  userName: string;
  originalWorkId: string;
  originalAuthor: string;
  title: string;
  theme: string;
  lyrics: string[];
}

export interface ForkTreeProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Lang;
}

export interface CreationStudioProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTrack?: (
    lyrics: string[],
    theme: string,
    audioBlobUrl?: string,
    compositionParams?: any
  ) => void;
  playlist: Track[];
  currentTrackIndex: number;
  onHaptic?: (pattern: string) => void;
  onShareWork?: (work: CreatedWork) => void;
  onOpenMV?: (workLyrics?: string[]) => void;
  user?: AuthUser | null;
  starPower?: number;
  onStarPowerUpdate?: (sp: number) => void;
}

export interface MVCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track;
  isPlaying: boolean;
  audioEnergy: number;
  frequencyData: Uint8Array;
  currentTime: number;
  emotion: string;
  customLyrics?: string[] | null;
  onHaptic?: (pattern: string) => void;
}

export interface ShareWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  work: CreatedWork | null;
  userName?: string;
  userId?: string;
  onShared?: () => void;
}
