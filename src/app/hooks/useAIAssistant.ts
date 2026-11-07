import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { Emotion } from './useAudioEngine';

// ==========================================
// Types
// ==========================================
export type AITipPriority = 'low' | 'medium' | 'high';
export type AITipCategory = 'emotion' | 'achievement' | 'streak' | 'discovery' | 'interaction' | 'voice' | 'system';

export interface AITip {
  id: string;
  message: string;
  category: AITipCategory;
  priority: AITipPriority;
  icon: string;
  actionLabel?: string;
  actionKey?: string; // key to dispatch action
  expiresAt: number;
  dismissed?: boolean;
}

export interface VoiceCommand {
  command: string;
  transcript: string;
  confidence: number;
  timestamp: number;
}

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

export interface AIAssistantConfig {
  isPlaying: boolean;
  currentEmotion: Emotion;
  currentTrackId: string;
  currentTrackTitle: string;
  starPower: number;
  isLoggedIn: boolean;
  lang: 'zh' | 'en';
  // Callbacks for voice commands
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onShuffleToggle: () => void;
  onVolumeUp: () => void;
  onVolumeDown: () => void;
  onMute: () => void;
  onOpenPlaylist: () => void;
  onOpenAILyrics: () => void;
  onOpenLeaderboard: () => void;
  onOpenComments: () => void;
  onOpenCommunity: () => void;
  onOpenAnalytics: () => void;
  onOpenProfile: () => void;
  onLike: () => void;
}

export interface AIAssistantReturn {
  // Tips
  activeTips: AITip[];
  dismissTip: (id: string) => void;
  executeTipAction: (actionKey: string) => void;
  // Voice
  isListening: boolean;
  continuousMode: boolean;
  startListening: (continuous?: boolean) => void;
  stopListening: () => void;
  toggleListening: () => void;
  toggleContinuousMode: () => void;
  voiceSupported: boolean;
  lastTranscript: string;
  voiceHistory: VoiceCommand[];
  voiceFeedback: string;
  // Behavior
  behavior: BehaviorSnapshot;
  // Insight
  sessionInsight: string;
}

// ==========================================
// Voice command definitions (CN + EN)
// ==========================================
interface CommandDef {
  patterns: RegExp[];
  action: string;
  feedbackZh: string;
  feedbackEn: string;
}

const COMMAND_DEFS: CommandDef[] = [
  { patterns: [/^(播放|play|开始|start)/i], action: 'play', feedbackZh: '正在播放', feedbackEn: 'Playing' },
  { patterns: [/^(暂停|pause|停止|stop)/i], action: 'pause', feedbackZh: '已暂停', feedbackEn: 'Paused' },
  { patterns: [/^(下一首|next|下一曲|skip)/i], action: 'next', feedbackZh: '下一首', feedbackEn: 'Next track' },
  { patterns: [/^(上一首|prev|previous|上一曲)/i], action: 'prev', feedbackZh: '上一首', feedbackEn: 'Previous track' },
  { patterns: [/^(随机|shuffle|随机播放)/i], action: 'shuffle', feedbackZh: '切换随机播放', feedbackEn: 'Toggle shuffle' },
  { patterns: [/^(大声|louder|音量[大加上]|volume up)/i], action: 'volumeUp', feedbackZh: '音量增大', feedbackEn: 'Volume up' },
  { patterns: [/^(小声|quieter|音量[小减下]|volume down)/i], action: 'volumeDown', feedbackZh: '音量减小', feedbackEn: 'Volume down' },
  { patterns: [/^(静音|mute|muted)/i], action: 'mute', feedbackZh: '已静音', feedbackEn: 'Muted' },
  { patterns: [/^(播放列表|playlist|歌单|列表)/i], action: 'openPlaylist', feedbackZh: '打开播放列表', feedbackEn: 'Opening playlist' },
  { patterns: [/^(创作|create|写歌|ai|歌词|lyrics)/i], action: 'openAILyrics', feedbackZh: '打开AI创作', feedbackEn: 'Opening AI lyrics' },
  { patterns: [/^(排行|leaderboard|榜单|排名)/i], action: 'openLeaderboard', feedbackZh: '打开排行榜', feedbackEn: 'Opening leaderboard' },
  { patterns: [/^(评论|comment|留言)/i], action: 'openComments', feedbackZh: '打开评论', feedbackEn: 'Opening comments' },
  { patterns: [/^(社区|community|动态)/i], action: 'openCommunity', feedbackZh: '打开社区', feedbackEn: 'Opening community' },
  { patterns: [/^(分析|analytics|数据|统计)/i], action: 'openAnalytics', feedbackZh: '打开数据分析', feedbackEn: 'Opening analytics' },
  { patterns: [/^(个人|profile|主页|我的)/i], action: 'openProfile', feedbackZh: '打开个人主页', feedbackEn: 'Opening profile' },
  { patterns: [/^(喜欢|like|点赞|love|❤)/i], action: 'like', feedbackZh: '已点赞 ❤️', feedbackEn: 'Liked ❤️' },
];

// ==========================================
// Proactive Tip Templates
// ==========================================
interface TipTemplate {
  id: string;
  conditionFn: (b: BehaviorSnapshot, cfg: AIAssistantConfig) => boolean;
  messageZh: string | ((b: BehaviorSnapshot, cfg: AIAssistantConfig) => string);
  messageEn: string | ((b: BehaviorSnapshot, cfg: AIAssistantConfig) => string);
  category: AITipCategory;
  priority: AITipPriority;
  icon: string;
  actionLabel?: { zh: string; en: string };
  actionKey?: string;
  cooldownMs: number; // Don't repeat within this time
}

const TIP_TEMPLATES: TipTemplate[] = [
  // Emotion-based
  {
    id: 'sad-streak',
    conditionFn: (b) => b.consecutiveSameEmotion >= 3 && b.dominantSessionEmotion === 'sad',
    messageZh: '你已连续收听忧伤曲目，需要来一首活力歌曲振作一下吗？',
    messageEn: "You've been listening to sad tracks — want an energetic pick-me-up?",
    category: 'emotion',
    priority: 'medium',
    icon: '🌈',
    actionLabel: { zh: '随机播放活力曲目', en: 'Play energetic track' },
    actionKey: 'shuffleEnergetic',
    cooldownMs: 5 * 60 * 1000,
  },
  {
    id: 'energetic-long',
    conditionFn: (b) => b.consecutiveSameEmotion >= 4 && b.dominantSessionEmotion === 'energetic',
    messageZh: '连续高能量输出！试试切换到宁静模式放松一下？',
    messageEn: 'High energy streak! Try switching to calm mode for a moment of zen?',
    category: 'emotion',
    priority: 'low',
    icon: '🧘',
    actionKey: 'shuffleCalm',
    actionLabel: { zh: '切换宁静模式', en: 'Switch to calm' },
    cooldownMs: 8 * 60 * 1000,
  },
  // Interaction-based
  {
    id: 'no-annotation',
    conditionFn: (b, cfg) => b.sessionListeningSec > 120 && b.annotationCount === 0 && cfg.isPlaying,
    messageZh: '试试标注歌词情感，可获得 +5 星力值！',
    messageEn: 'Try annotating lyrics emotions — earn +5 Star Power!',
    category: 'interaction',
    priority: 'low',
    icon: '💫',
    cooldownMs: 3 * 60 * 1000,
  },
  {
    id: 'no-like',
    conditionFn: (b, cfg) => b.tracksPlayed.length >= 2 && b.likeCount === 0 && cfg.isPlaying,
    messageZh: '喜欢这首歌吗？点赞即可获得 +2 星力值！',
    messageEn: 'Enjoying this song? Like it to earn +2 Star Power!',
    category: 'interaction',
    priority: 'low',
    icon: '❤️',
    actionLabel: { zh: '点赞', en: 'Like' },
    actionKey: 'like',
    cooldownMs: 4 * 60 * 1000,
  },
  // Achievement proximity
  {
    id: 'star-milestone',
    conditionFn: (_b, cfg) => {
      const milestones = [100, 250, 500, 1000, 2000];
      return milestones.some(m => cfg.starPower >= m * 0.85 && cfg.starPower < m);
    },
    messageZh: (_, cfg) => {
      const milestones = [100, 250, 500, 1000, 2000];
      const next = milestones.find(m => cfg.starPower < m) || 2000;
      return `你的星力值即将达到 ${next}！还差 ${next - cfg.starPower} 点。`;
    },
    messageEn: (_, cfg) => {
      const milestones = [100, 250, 500, 1000, 2000];
      const next = milestones.find(m => cfg.starPower < m) || 2000;
      return `Your Star Power is approaching ${next}! Only ${next - cfg.starPower} points to go.`;
    },
    category: 'achievement',
    priority: 'high',
    icon: '⭐',
    cooldownMs: 10 * 60 * 1000,
  },
  // Session-based
  {
    id: 'listening-milestone',
    conditionFn: (b) => {
      const mins = Math.floor(b.sessionListeningSec / 60);
      return [10, 30, 60].includes(mins) && b.sessionListeningSec % 60 < 5;
    },
    messageZh: (b) => `本次已收听 ${Math.floor(b.sessionListeningSec / 60)} 分钟，音乐之旅精彩继续！`,
    messageEn: (b) => `${Math.floor(b.sessionListeningSec / 60)} minutes of listening this session — great journey!`,
    category: 'system',
    priority: 'low',
    icon: '🎵',
    cooldownMs: 15 * 60 * 1000,
  },
  // Login nudge
  {
    id: 'login-nudge',
    conditionFn: (b, cfg) => !cfg.isLoggedIn && b.sessionListeningSec > 60,
    messageZh: '登录以保存你的星力值和成就进度！',
    messageEn: 'Sign in to save your Star Power and achievement progress!',
    category: 'system',
    priority: 'medium',
    icon: '🔐',
    cooldownMs: 10 * 60 * 1000,
  },
  // Discovery
  {
    id: 'explore-tracks',
    conditionFn: (b) => b.tracksPlayed.length <= 2 && b.sessionListeningSec > 180,
    messageZh: '还有更多精彩曲目等你发现！打开播放列表探索更多。',
    messageEn: 'More amazing tracks await! Open the playlist to explore.',
    category: 'discovery',
    priority: 'medium',
    icon: '🚀',
    actionLabel: { zh: '探索更多', en: 'Explore' },
    actionKey: 'openPlaylist',
    cooldownMs: 8 * 60 * 1000,
  },
  // AI creation
  {
    id: 'ai-creation-prompt',
    conditionFn: (b) => b.annotationCount >= 3 && b.tracksPlayed.length >= 3,
    messageZh: '你的音乐品味很独特！试试用AI创作属于你的歌词？',
    messageEn: 'Your taste is unique! Try creating your own lyrics with AI?',
    category: 'discovery',
    priority: 'medium',
    icon: '✨',
    actionLabel: { zh: 'AI创作', en: 'AI Create' },
    actionKey: 'openAILyrics',
    cooldownMs: 15 * 60 * 1000,
  },
  // Idle reminder
  {
    id: 'idle-prompt',
    conditionFn: (b, cfg) => cfg.isPlaying && (Date.now() - b.lastInteractionAt) > 5 * 60 * 1000,
    messageZh: (_, cfg) => `「${cfg.currentTrackTitle}」正在播放中～试试标注你此刻的感受？`,
    messageEn: (_, cfg) => `"${cfg.currentTrackTitle}" is playing — share how you feel right now?`,
    category: 'interaction',
    priority: 'low',
    icon: '💭',
    cooldownMs: 8 * 60 * 1000,
  },
];

// ==========================================
// Hook
// ==========================================
export function useAIAssistant(config: AIAssistantConfig): AIAssistantReturn {
  const {
    isPlaying, currentEmotion, currentTrackId, currentTrackTitle,
    starPower, isLoggedIn, lang,
    onPlay, onPause, onNext, onPrev, onShuffleToggle,
    onVolumeUp, onVolumeDown, onMute,
    onOpenPlaylist, onOpenAILyrics, onOpenLeaderboard,
    onOpenComments, onOpenCommunity, onOpenAnalytics, onOpenProfile,
    onLike,
  } = config;

  // ---- Behavior tracking ----
  const [behavior, setBehavior] = useState<BehaviorSnapshot>({
    emotionHistory: [],
    totalListeningSec: 0,
    sessionListeningSec: 0,
    tracksPlayed: [],
    annotationCount: 0,
    likeCount: 0,
    lastInteractionAt: Date.now(),
    consecutiveSameEmotion: 0,
    dominantSessionEmotion: null,
  });

  // ---- Tips ----
  const [tips, setTips] = useState<AITip[]>([]);
  const tipCooldownsRef = useRef<Record<string, number>>({});

  // ---- Voice ----
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [voiceHistory, setVoiceHistory] = useState<VoiceCommand[]>([]);
  const [voiceFeedback, setVoiceFeedback] = useState('');
  // recognitionRef stores { recognition, continuous, restartTimer } to avoid adding new hook calls
  const recognitionRef = useRef<any>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const voiceSupported = useMemo(() => {
    return typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  }, []);

  // ---- Action dispatch ----
  const actionMap = useRef<Record<string, () => void>>({});
  actionMap.current = {
    play: onPlay,
    pause: onPause,
    next: onNext,
    prev: onPrev,
    shuffle: onShuffleToggle,
    volumeUp: onVolumeUp,
    volumeDown: onVolumeDown,
    mute: onMute,
    openPlaylist: onOpenPlaylist,
    openAILyrics: onOpenAILyrics,
    openLeaderboard: onOpenLeaderboard,
    openComments: onOpenComments,
    openCommunity: onOpenCommunity,
    openAnalytics: onOpenAnalytics,
    openProfile: onOpenProfile,
    like: onLike,
    shuffleEnergetic: () => { onShuffleToggle(); onNext(); },
    shuffleCalm: () => { onShuffleToggle(); onNext(); },
  };

  // ---- Track behavior updates ----
  // Track emotion changes
  useEffect(() => {
    if (!currentEmotion) return;
    setBehavior(prev => {
      const newHistory = [...prev.emotionHistory, currentEmotion].slice(-50);
      // Count consecutive same emotion
      let consecutive = 1;
      for (let i = newHistory.length - 2; i >= 0; i--) {
        if (newHistory[i] === currentEmotion) consecutive++;
        else break;
      }
      // Dominant session emotion
      const counts: Record<string, number> = {};
      newHistory.forEach(e => { counts[e] = (counts[e] || 0) + 1; });
      const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as Emotion || null;

      return {
        ...prev,
        emotionHistory: newHistory,
        consecutiveSameEmotion: consecutive,
        dominantSessionEmotion: dominant,
      };
    });
  }, [currentEmotion]);

  // Track which tracks played
  useEffect(() => {
    setBehavior(prev => {
      if (prev.tracksPlayed.includes(currentTrackId)) return prev;
      return { ...prev, tracksPlayed: [...prev.tracksPlayed, currentTrackId] };
    });
  }, [currentTrackId]);

  // Session listening time ticker
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setBehavior(prev => ({
        ...prev,
        sessionListeningSec: prev.sessionListeningSec + 1,
        totalListeningSec: prev.totalListeningSec + 1,
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // ---- Proactive tip engine ----
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const newTips: AITip[] = [];

      for (const template of TIP_TEMPLATES) {
        // Check cooldown
        const lastShown = tipCooldownsRef.current[template.id] || 0;
        if (now - lastShown < template.cooldownMs) continue;

        // Check condition
        if (!template.conditionFn(behavior, config)) continue;

        // Already showing this tip?
        if (tips.some(t => t.id === template.id && !t.dismissed)) continue;

        const message = typeof (lang === 'zh' ? template.messageZh : template.messageEn) === 'function'
          ? (lang === 'zh' ? template.messageZh : template.messageEn) as (b: BehaviorSnapshot, c: AIAssistantConfig) => string
          : null;

        const messageStr = message
          ? message(behavior, config)
          : (lang === 'zh' ? template.messageZh : template.messageEn) as string;

        const tip: AITip = {
          id: template.id,
          message: messageStr,
          category: template.category,
          priority: template.priority,
          icon: template.icon,
          actionLabel: template.actionLabel ? (lang === 'zh' ? template.actionLabel.zh : template.actionLabel.en) : undefined,
          actionKey: template.actionKey,
          expiresAt: now + 30000,
        };

        newTips.push(tip);
        tipCooldownsRef.current[template.id] = now;
      }

      if (newTips.length > 0) {
        setTips(prev => {
          // Limit to 3 active tips
          const active = prev.filter(t => !t.dismissed && t.expiresAt > now);
          return [...active, ...newTips].slice(-3);
        });
      }

      // Auto-expire old tips
      setTips(prev => prev.filter(t => t.expiresAt > now || t.dismissed));
    }, 5000);

    return () => clearInterval(interval);
  }, [behavior, config, lang, tips]);

  const dismissTip = useCallback((id: string) => {
    setTips(prev => prev.map(t => t.id === id ? { ...t, dismissed: true } : t));
  }, []);

  const executeTipAction = useCallback((actionKey: string) => {
    const action = actionMap.current[actionKey];
    if (action) action();
  }, []);

  // ---- Voice recognition ----
  const parseCommand = useCallback((transcript: string): { action: string; feedbackZh: string; feedbackEn: string } | null => {
    const cleaned = transcript.trim().toLowerCase();
    for (const def of COMMAND_DEFS) {
      for (const pattern of def.patterns) {
        if (pattern.test(cleaned)) {
          return { action: def.action, feedbackZh: def.feedbackZh, feedbackEn: def.feedbackEn };
        }
      }
    }
    return null;
  }, []);

  const showFeedback = useCallback((msg: string) => {
    setVoiceFeedback(msg);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setVoiceFeedback(''), 3000);
  }, []);

  const startListening = useCallback((continuous = false) => {
    if (!voiceSupported || isListening) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = continuous; // Show interim in continuous mode
    recognition.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      // In continuous mode, process only final results
      const resultIndex = continuous ? event.results.length - 1 : 0;
      const result = event.results[resultIndex];
      if (continuous && !result.isFinal) {
        // Show interim transcript as feedback
        setLastTranscript(result[0].transcript);
        return;
      }

      const transcript = result[0].transcript;
      const confidence = result[0].confidence;

      setLastTranscript(transcript);

      const parsed = parseCommand(transcript);
      if (parsed) {
        const action = actionMap.current[parsed.action];
        if (action) action();

        const feedback = lang === 'zh' ? parsed.feedbackZh : parsed.feedbackEn;
        showFeedback(`\u2705 ${feedback}`);

        // Haptic feedback for successful voice command
        try { navigator.vibrate?.([5, 15, 5]); } catch {}

        setVoiceHistory(prev => [...prev.slice(-20), {
          command: parsed.action,
          transcript,
          confidence,
          timestamp: Date.now(),
        }]);

        // Update interaction timestamp
        setBehavior(prev => ({ ...prev, lastInteractionAt: Date.now() }));
      } else {
        showFeedback(lang === 'zh' ? `\u2753 \u672A\u8BC6\u522B: "${transcript}"` : `\u2753 Unknown: "${transcript}"`);
        // Light haptic for unrecognized
        try { navigator.vibrate?.(15); } catch {}
      }
    };

    recognition.onerror = (event: any) => {
      console.log('Speech recognition error:', event.error);
      if (event.error === 'no-speech' && continuous) {
        // In continuous mode, silently restart on no-speech
        return;
      }
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        showFeedback(lang === 'zh' ? '\uD83C\uDFA4 \u8BED\u97F3\u8BC6\u522B\u51FA\u9519' : '\uD83C\uDFA4 Voice recognition error');
        try { navigator.vibrate?.([30, 50, 30]); } catch {} // warning haptic
      }
      if (!continuous) {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // In continuous mode, auto-restart unless explicitly stopped (recognitionRef cleared by stopListening)
      const ref = recognitionRef.current;
      if (ref && ref.continuous) {
        if (ref.restartTimer) clearTimeout(ref.restartTimer);
        ref.restartTimer = setTimeout(() => {
          const innerRef = recognitionRef.current;
          if (innerRef && innerRef.continuous && innerRef.recognition) {
            try {
              innerRef.recognition.start();
            } catch {
              // If restart fails, exit continuous mode gracefully
              recognitionRef.current = null;
              setIsListening(false);
            }
          }
        }, 300);
      } else {
        setIsListening(false);
      }
    };

    try {
      recognition.start();
      recognitionRef.current = { recognition, continuous, restartTimer: null };
      setIsListening(true);
      if (continuous) {
        showFeedback(lang === 'zh' ? '\uD83C\uDFA4 \u514D\u63D0\u6A21\u5F0F\u5DF2\u5F00\u542F' : '\uD83C\uDFA4 Hands-free mode ON');
      } else {
        showFeedback(lang === 'zh' ? '\uD83C\uDFA4 \u8BF7\u8BF4\u6307\u4EE4...' : '\uD83C\uDFA4 Listening...');
      }
      try { navigator.vibrate?.(8); } catch {} // selection haptic
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
    }
  }, [voiceSupported, isListening, lang, parseCommand, showFeedback]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      if (recognitionRef.current.restartTimer) clearTimeout(recognitionRef.current.restartTimer);
      try { recognitionRef.current.recognition?.stop?.(); } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) stopListening();
    else startListening(false);
  }, [isListening, startListening, stopListening]);

  const toggleContinuousMode = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening(true);
    }
  };

  // Derive continuousMode from ref (reactive via isListening state changes)
  const continuousMode = !!(isListening && recognitionRef.current?.continuous);

  // ---- Session insight ----
  const sessionInsight = useMemo(() => {
    const mins = Math.floor(behavior.sessionListeningSec / 60);
    const trackCount = behavior.tracksPlayed.length;
    const dominant = behavior.dominantSessionEmotion;

    if (mins < 1) {
      return lang === 'zh' ? '开始探索你的音乐旅程吧！' : 'Start your musical journey!';
    }

    const emotionLabels: Record<string, { zh: string; en: string }> = {
      happy: { zh: '快乐', en: 'happy' },
      sad: { zh: '忧伤', en: 'melancholic' },
      energetic: { zh: '充满活力', en: 'energetic' },
      calm: { zh: '宁静', en: 'calm' },
      neutral: { zh: '平和', en: 'balanced' },
    };

    const emoLabel = dominant ? emotionLabels[dominant] : null;

    if (lang === 'zh') {
      return `已收听 ${mins} 分钟 · ${trackCount} 首曲目${emoLabel ? ` · 情感倾向: ${emoLabel.zh}` : ''}`;
    }
    return `${mins}min · ${trackCount} tracks${emoLabel ? ` · Mood: ${emoLabel.en}` : ''}`;
  }, [behavior.sessionListeningSec, behavior.tracksPlayed.length, behavior.dominantSessionEmotion, lang]);

  // Track interactions (expose for external components to call)
  // The parent App will call these to update behavior counters
  useEffect(() => {
    // Reset interaction timer on any config change that implies user action
    setBehavior(prev => ({ ...prev, lastInteractionAt: Date.now() }));
  }, [currentTrackId]);

  const activeTips = tips.filter(t => !t.dismissed && t.expiresAt > Date.now());

  return {
    activeTips,
    dismissTip,
    executeTipAction,
    isListening,
    continuousMode,
    startListening,
    stopListening,
    toggleListening,
    toggleContinuousMode,
    voiceSupported,
    lastTranscript,
    voiceHistory,
    voiceFeedback,
    behavior,
    sessionInsight,
  };
}