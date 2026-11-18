// 曲目与媒体播放域 — 曲目/歌词/标注、音频引擎与播放器视觉控制组件

import type { AudioMode, Emotion, MediaMode, RepeatMode } from './common';

/** A single line of synchronized lyrics */
export interface LyricLine {
  /** Timestamp in seconds */
  time: number;
  /** Lyric text (original language) */
  text: string;
  /** Optional translation text */
  translation?: string;
  /** Emotional tag for the line */
  emotion?: Emotion;
}

/** A playable track in the playlist */
export interface Track {
  /** Unique track identifier */
  id: string;
  /** Song title */
  title: string;
  /** Artist name */
  artist: string;
  /** Album name */
  album: string;
  /** Duration in seconds (fallback for demo mode) */
  duration: number;
  /** Album art image URL */
  albumArt: string;
  /** If provided, plays real audio; otherwise demo oscillator */
  audioUrl?: string;
  /** If provided, plays video in video mode（自 playlistData 历史层吸收字段，TD-11） */
  videoUrl?: string;
  /** Synchronized lyrics array */
  lyrics: LyricLine[];
  /** Which chord progression set for demo mode (0-3) */
  chordSet: number;
  /** Theme color hex for the track */
  color: string;
}

/** Song statistics from backend */
export interface SongStats {
  likes?: number;
  plays?: number;
  comments?: number;
  shares?: number;
}

/** Emotion annotations per lyric line */
export interface EmotionAnnotation {
  [lineIndex: number]: {
    [emotion: string]: number;
  };
}

/** Annotation data from API */
export interface AnnotationData {
  annotations?: Record<string, Record<string, number>>;
}

/** Annotation post request */
export interface AnnotationRequest {
  lineIndex: number;
  emotion: Emotion;
}

export interface StarfieldProps {
  emotion?: Emotion;
  isPlaying?: boolean;
  audioEnergy?: number;
  bassEnergy?: number;
}

export interface MediaDisplayProps {
  mode: MediaMode;
  isPlaying: boolean;
  albumArtUrl: string;
  frequencyData: Uint8Array;
  emotion: Emotion;
  audioEnergy: number;
  songTitle: string;
  artist: string;
}

export interface AudioVisualizerProps {
  frequencyData: Uint8Array;
  emotion: Emotion;
  isPlaying: boolean;
  size: number;
  mode?: 'circular' | 'bars';
}

export interface LyricsDisplayProps {
  currentTime: number;
  lyrics: LyricLine[];
  onLineClick?: (time: number) => void;
  annotations?: EmotionAnnotation;
  onAnnotate?: (lineIndex: number, emotion: Emotion) => void;
  isPlaying?: boolean;
}

export interface PlayerControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  progress: number;
  onSeek: (value: number) => void;
  duration: number;
  mode: MediaMode;
  onToggleMode: () => void;
  mValue: number;
  onLike: () => void;
  volume: number;
  onVolumeChange: (value: number) => void;
  songTitle: string;
  artist: string;
  audioEnergy?: number;
  onPrev: () => void;
  onNext: () => void;
  onPlaylistToggle: () => void;
  onCommunityToggle?: () => void;
  onCommentsToggle?: () => void;
  onAILyricsToggle?: () => void;
  onLeaderboardToggle?: () => void;
  onAnalyticsToggle?: () => void;
  shuffleEnabled: boolean;
  onShuffleToggle: () => void;
  repeatMode: RepeatMode;
  onRepeatCycle: () => void;
  audioMode: AudioMode;
  albumArt?: string;
  emotion?: Emotion;
  onEmotionFilter?: (emotion: Emotion | null) => void;
  activeEmotionFilter?: Emotion | null;
  lyrics?: LyricLine[];
}

export interface EmotionRippleProps {
  emotion: Emotion;
  /** 0-1 normalized */
  audioEnergy: number;
  isPlaying: boolean;
  frequencyData?: Uint8Array;
  className?: string;
}

/** Audio engine configuration */
export interface AudioEngineConfig {
  trackKey?: string;
  duration?: number;
  chordSet?: number;
  audioUrl?: string;
  onTrackEnd?: () => void;
  initialVolume?: number;
}

/** Audio engine return type */
export interface AudioEngineReturn {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  frequencyData: Uint8Array;
  waveformData: Uint8Array;
  audioEnergy: number;
  bassEnergy: number;
  trebleEnergy: number;
  audioMode: AudioMode;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  seek: (time: number) => void;
  setVolume: (v: number) => void;
  loadAudioFile: (file: File) => void;
}
