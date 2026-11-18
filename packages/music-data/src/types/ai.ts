// AI 域 — AI 助手提示、歌词生成/作曲、STT 语音与行为分析

import type { Emotion, Lang } from './common';

/** AI lyrics theme selector */
export type AILyricsTheme = 'happy' | 'sad' | 'energetic' | 'calm' | 'love';

/** AI model providers */
export type AIProvider = 'openai' | 'template';

/** AI tip priority levels */
export type AITipPriority = 'low' | 'medium' | 'high';

/** AI tip categories */
export type AITipCategory =
  | 'emotion'
  | 'achievement'
  | 'streak'
  | 'discovery'
  | 'interaction'
  | 'voice'
  | 'system';

/** User engagement levels (from AI analysis) */
export type EngagementLevel =
  | 'casual'
  | 'regular'
  | 'enthusiast'
  | 'power';

/** AI tip message */
export interface AITip {
  id: string;
  message: string;
  category: AITipCategory;
  priority: AITipPriority;
  icon: string;
  actionLabel?: string;
  actionKey?: string;
  expiresAt: number;
  dismissed?: boolean;
}

/** Voice command recognition result */
export interface VoiceCommand {
  command: string;
  transcript: string;
  confidence: number;
  timestamp: number;
}

/** AI behavior analysis snapshot */
export interface BehaviorSnapshot {
  emotionHistory: Emotion[];
  totalListeningSec: number;
  sessionListeningSec: number;
  tracksPlayed: string[];
  annotationCount: number;
  likeCount: number;
  lastInteractionAt: number;
  consecutiveSameEmotion: number;
  dominantSessionEmotion: Emotion | null;
}

/** AI lyrics generation request */
export interface AILyricsRequest {
  theme: string;
  mood: string;
  keywords: string[];
  lang: Lang;
}

/** AI composition request */
export interface AIComposeRequest {
  theme: string;
  mood: string;
  lang: Lang;
}

/** STT transcribe request */
export interface STTTranscribeRequest {
  audio: string;
  language: string;
  mimeType?: string;
}

/** AI lyrics response */
export interface AILyricsResponse {
  lyrics: string[];
  theme: string;
  themeLabel: string;
  provider: AIProvider;
  cached: boolean;
  generatedAt: string;
}

/** AI preference analysis response */
export interface AIPreferenceAnalysis {
  userId: string;
  analysis: {
    insights: string;
    suggestedMoods: string[];
    personalityTag: string;
    personalityTagEn: string;
    engagementLevel: EngagementLevel;
    recommendations: Array<{
      mood: string;
      reason: string;
      reasonZh: string;
      weight: number;
    }>;
    provider: AIProvider;
    cached: boolean;
  };
}

/** STT transcribe response */
export interface STTTranscribeResponse {
  text?: string;
  fallback?: string;
  provider?: string;
  available?: boolean;
  duration?: number;
}

/** STT stream response */
export interface STTStreamResponse {
  chunks: Array<{
    index: number;
    text: string;
    isFinal: boolean;
    language?: string;
    provider: string;
  }>;
  fullText: string;
  provider: string;
  available: boolean;
  sessionId?: string;
  fallback?: string;
}

export interface AILyricsGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTrack?: (
    lyrics: string[],
    theme: AILyricsTheme,
    audioBlobUrl?: string,
    compositionParams?: any
  ) => void;
}

export interface AIAssistantProps {
  activeTips: AITip[];
  onDismissTip: (id: string) => void;
  onExecuteAction: (actionKey: string) => void;
  isListening: boolean;
  onToggleListening: () => void;
  voiceSupported: boolean;
  voiceFeedback: string;
  voiceHistory: VoiceCommand[];
  sessionInsight: string;
  isPlaying: boolean;
  audioEnergy: number;
  externalExpanded?: boolean;
  onExternalExpandedChange?: (expanded: boolean) => void;
}

/** AI Assistant configuration */
export interface AIAssistantConfig {
  isPlaying: boolean;
  currentEmotion: Emotion;
  currentTrackId: string;
  currentTrackTitle: string;
  starPower: number;
  isLoggedIn: boolean;
  lang: Lang;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onLike: () => void;
  onVolumeUp: () => void;
  onVolumeDown: () => void;
}
