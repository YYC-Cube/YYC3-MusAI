// 播放列表域 — 播放列表面板、移动端导航/播放器、智能歌单与情绪分析

import type { AudioMode, Emotion, RepeatMode } from './common';
import type { LyricLine, Track } from './track';

/** Smart playlist mood analysis */
export interface MoodAnalysis {
  dominant: string;
  distribution: Array<{ emotion: string; pct: number }>;
  listenCount: number;
  avgCompletionRate: number;
}

export interface PlaylistPanelProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: Track[];
  currentTrackIndex: number;
  isPlaying: boolean;
  onSelectTrack: (index: number) => void;
  onAddTrackFromFile: (file: File) => void;
  onAddTrackFromUrl: (url: string, title?: string) => void;
  audioMode: AudioMode;
}

export interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isPlaying: boolean;
  audioEnergy: number;
  hasUser: boolean;
  onMicTap?: () => void;
  isListening?: boolean;
  unreadNotifications?: number;
  onOpenForkTree?: () => void;
  onOpenMHeart?: () => void;
  onOpenSmartPlaylist?: () => void;
  onOpenLiveSession?: () => void;
}

export interface MobilePlayerProps {
  isOpen: boolean;
  onClose: () => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  progress: number;
  duration: number;
  onSeek: (t: number) => void;
  volume: number;
  onVolumeChange: (v: number) => void;
  songTitle: string;
  artist: string;
  albumArt: string;
  audioEnergy: number;
  emotion: Emotion;
  mValue: number;
  onLike: () => void;
  onPrev: () => void;
  onNext: () => void;
  shuffleEnabled: boolean;
  onShuffleToggle: () => void;
  repeatMode: RepeatMode;
  onRepeatCycle: () => void;
  audioMode: AudioMode;
  onPlaylistToggle: () => void;
  onCommentsToggle: () => void;
  onAILyricsToggle: () => void;
  onLeaderboardToggle: () => void;
  onAnalyticsToggle: () => void;
  onMicToggle?: () => void;
  isListening?: boolean;
  lyrics?: LyricLine[];
  currentLyricText?: string;
  currentLyricTranslation?: string;
  frequencyData?: Uint8Array;
}

export interface SmartPlaylistPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  currentEmotion: string;
  playlist: Array<{
    id: string;
    title: string;
    artist: string;
    albumArt: string;
    color: string;
    lyrics: Array<{ emotion?: string }>;
  }>;
  onApplyQueue: (indices: number[]) => void;
}
