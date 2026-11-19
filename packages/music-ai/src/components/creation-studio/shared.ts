// 创作工作室 · 共享 — 类型 / 常量 / 工具
import React from 'react';
import {
  Smile, Frown, Zap, Cloud, Heart,
  Sparkles, Settings2, Layers, FolderOpen, Film,
} from 'lucide-react';
import type { CompositionParams } from '@yyc3/music-hooks';
import type { Track } from '@yyc3/music-data';

export type CreationMode = 'quick' | 'master' | 'remix' | 'works' | 'mv';
export type AILyricsTheme = 'happy' | 'sad' | 'energetic' | 'calm' | 'love';

// 创作合成阶段状态机
export type ComposingStage = 'idle' | 'lyrics' | 'composing' | 'synth' | 'done';

export interface CreationStudioProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTrack?: (
    lyrics: string[],
    theme: string,
    audioBlobUrl?: string,
    compositionParams?: CompositionParams
  ) => void;
  playlist: Track[];
  currentTrackIndex: number;
  onHaptic?: (pattern: string) => void;
  onShareWork?: (work: CreatedWork) => void;
  onOpenMV?: (workLyrics?: string[]) => void;
  user?: any;
  starPower?: number;
  onStarPowerUpdate?: (sp: number) => void;
}

export const THEMES: Array<{
  id: AILyricsTheme;
  label: string;
  labelZh: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  premium?: boolean;
  spCost?: number;
}> = [
  { id: 'happy', label: 'Happy', labelZh: '快乐', icon: Smile, color: 'text-yellow-400', bg: 'from-yellow-500/20 to-orange-500/20' },
  { id: 'sad', label: 'Sad', labelZh: '忧伤', icon: Frown, color: 'text-blue-400', bg: 'from-blue-500/20 to-indigo-500/20' },
  { id: 'energetic', label: 'Energetic', labelZh: '活力', icon: Zap, color: 'text-red-400', bg: 'from-red-500/20 to-orange-500/20', premium: true, spCost: 200 },
  { id: 'calm', label: 'Calm', labelZh: '宁静', icon: Cloud, color: 'text-cyan-400', bg: 'from-cyan-500/20 to-teal-500/20' },
  { id: 'love', label: 'Love', labelZh: '爱情', icon: Heart, color: 'text-pink-400', bg: 'from-pink-500/20 to-red-500/20', premium: true, spCost: 200 },
];

export const MODES: Array<{
  id: CreationMode;
  label: string;
  labelZh: string;
  icon: React.ElementType;
  desc: string;
  descZh: string;
  gradient: string;
}> = [
  {
    id: 'quick',
    label: 'Quick Song',
    labelZh: '极简写歌',
    icon: Sparkles,
    desc: 'AI lyrics + auto compose in seconds',
    descZh: '一键AI写词作曲，秒出成品',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    id: 'master',
    label: 'Master Mode',
    labelZh: '大师写歌',
    icon: Settings2,
    desc: 'Full control over theme, structure & style',
    descZh: '精细控制主题、结构与风格',
    gradient: 'from-indigo-500 to-blue-500',
  },
  {
    id: 'remix',
    label: 'Remix & Cover',
    labelZh: '热歌改编',
    icon: Layers,
    desc: 'Transform existing tracks with AI',
    descZh: 'AI改编翻唱热门曲目',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    id: 'works',
    label: 'My Works',
    labelZh: '作品管理',
    icon: FolderOpen,
    desc: 'View & manage your creations',
    descZh: '查看管理你的创作',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'mv',
    label: 'MV Creator',
    labelZh: 'MV 创作',
    icon: Film,
    desc: 'Visualize music with AI effects',
    descZh: 'AI驱动音乐可视化MV',
    gradient: 'from-cyan-500 to-blue-500',
  },
];

// Song structures for Master Mode
export const STRUCTURES = [
  { id: 'verse-chorus', label: 'Verse-Chorus', labelZh: '主副歌' },
  { id: 'verse-bridge', label: 'Verse-Bridge', labelZh: '主歌-桥段' },
  { id: 'aaba', label: 'AABA', labelZh: 'AABA经典' },
  { id: 'through', label: 'Through-composed', labelZh: '通谱体' },
];

export const INSTRUMENTS = [
  { id: 'piano', label: 'Piano', labelZh: '钢琴', emoji: '🎹' },
  { id: 'guitar', label: 'Guitar', labelZh: '吉他', emoji: '🎸' },
  { id: 'synth', label: 'Synth', labelZh: '合成器', emoji: '🎛️' },
  { id: 'strings', label: 'Strings', labelZh: '弦乐', emoji: '🎻' },
  { id: 'drums', label: 'Drums', labelZh: '鼓', emoji: '🥁' },
  { id: 'bass', label: 'Bass', labelZh: '贝斯', emoji: '🎸' },
];

// Stored works type
export interface CreatedWork {
  id: string;
  title: string;
  theme: string;
  lyrics: string[];
  createdAt: number;
  mode: string;
}

// 作品创建时间格式化工具
export const formatDate = (ts: number) => {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
};
