import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Wand2, Copy, Check, Loader2, Sparkles,
  Smile, Frown, Zap, Cloud, Heart,
  Plus, Minus, Music, ChevronRight,
  Layers, FolderOpen,
  Trash2, Clock,
  ArrowLeft, Settings2,
  Share2, Film, ExternalLink,
} from 'lucide-react';
import { clsx } from 'clsx';
import { apiFetch } from '../lib/supabase';
import { useI18n } from '../hooks/useI18n';
import { useAudioComposer, type CompositionParams } from '../hooks/useAudioComposer';
import type { Track } from '../playlistData';

// ==========================================
// AI Creation Studio
// ==========================================
// A comprehensive music creation hub with multiple modes:
// 1. Quick Song (极简写歌) — fast AI lyrics + compose
// 2. Master Mode (大师写歌) — advanced controls for theme, structure, instruments
// 3. Remix Mode (热歌改编/AI翻唱) — transform existing tracks
// 4. My Works (作品管理) — manage created tracks

type CreationMode = 'quick' | 'master' | 'remix' | 'works' | 'mv';
type AILyricsTheme = 'happy' | 'sad' | 'energetic' | 'calm' | 'love';

interface CreationStudioProps {
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

const THEMES: Array<{
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

const MODES: Array<{
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
const STRUCTURES = [
  { id: 'verse-chorus', label: 'Verse-Chorus', labelZh: '主副歌' },
  { id: 'verse-bridge', label: 'Verse-Bridge', labelZh: '主歌-桥段' },
  { id: 'aaba', label: 'AABA', labelZh: 'AABA经典' },
  { id: 'through', label: 'Through-composed', labelZh: '通谱体' },
];

const INSTRUMENTS = [
  { id: 'piano', label: 'Piano', labelZh: '钢琴', emoji: '🎹' },
  { id: 'guitar', label: 'Guitar', labelZh: '吉他', emoji: '🎸' },
  { id: 'synth', label: 'Synth', labelZh: '合成器', emoji: '🎛️' },
  { id: 'strings', label: 'Strings', labelZh: '弦乐', emoji: '🎻' },
  { id: 'drums', label: 'Drums', labelZh: '鼓', emoji: '🥁' },
  { id: 'bass', label: 'Bass', labelZh: '贝斯', emoji: '🎸' },
];

// Stored works type
interface CreatedWork {
  id: string;
  title: string;
  theme: string;
  lyrics: string[];
  createdAt: number;
  mode: string;
}

export const CreationStudio: React.FC<CreationStudioProps> = ({
  isOpen,
  onClose,
  onCreateTrack,
  playlist,
  currentTrackIndex,
  onHaptic,
  onShareWork,
  onOpenMV,
  user,
  starPower = 0,
  onStarPowerUpdate,
}) => {
  const { t, lang } = useI18n();
  const [activeMode, setActiveMode] = useState<CreationMode | null>(null);
  const [unlockedPremium, setUnlockedPremium] = useState<Set<string>>(new Set());

  // Load unlocked themes from KV (with localStorage migration fallback)
  useEffect(() => {
    if (!user) {
      try {
        const saved = localStorage.getItem('dmusic-unlocked-themes');
        if (saved) setUnlockedPremium(new Set(JSON.parse(saved)));
      } catch {}
      return;
    }
    (async () => {
      try {
        const data = await apiFetch<{ themes: string[] }>(`/user/${user.id}/unlocked-themes`);
        if (data?.themes && data.themes.length > 0) {
          setUnlockedPremium(new Set(data.themes));
        } else {
          // Migrate from localStorage if exists
          try {
            const saved = localStorage.getItem('dmusic-unlocked-themes');
            if (saved) {
              const parsed = JSON.parse(saved) as string[];
              if (parsed.length > 0) {
                setUnlockedPremium(new Set(parsed));
                for (const tid of parsed) {
                  await apiFetch(`/user/${user.id}/unlocked-themes`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ themeId: tid }),
                  });
                }
                localStorage.removeItem('dmusic-unlocked-themes');
              }
            }
          } catch {}
        }
      } catch {
        try { const s = localStorage.getItem('dmusic-unlocked-themes'); if (s) setUnlockedPremium(new Set(JSON.parse(s))); } catch {}
      }
    })();
  }, [user]);

  const handleUnlockTheme = async (themeId: string, cost: number) => {
    if (!user || starPower < cost) return;
    try {
      const result = await apiFetch<any>(`/starpower/${user.id}/consume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: cost, purpose: 'template_unlock', targetId: themeId }),
      });
      if (result?.success) {
        onStarPowerUpdate?.(result.starPower);
        const updated = new Set(unlockedPremium);
        updated.add(themeId);
        setUnlockedPremium(updated);
        // Persist to KV
        await apiFetch(`/user/${user.id}/unlocked-themes`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ themeId }),
        });
      }
    } catch (err) { console.error('Theme unlock error:', err); }
  };

  // Quick Song state
  const [quickTheme, setQuickTheme] = useState<AILyricsTheme>('happy');
  const [quickPrompt, setQuickPrompt] = useState('');
  const [quickGenerating, setQuickGenerating] = useState(false);
  const [quickLyrics, setQuickLyrics] = useState<string[] | null>(null);
  const [quickComposing, setQuickComposing] = useState<'idle' | 'lyrics' | 'composing' | 'synth' | 'done'>('idle');
  const composer = useAudioComposer();

  // Master Mode state
  const [masterTheme, setMasterTheme] = useState<AILyricsTheme>('calm');
  const [masterKeywords, setMasterKeywords] = useState<string[]>([]);
  const [masterKwInput, setMasterKwInput] = useState('');
  const [masterLineCount, setMasterLineCount] = useState(10);
  const [masterStructure, setMasterStructure] = useState('verse-chorus');
  const [masterInstruments, setMasterInstruments] = useState<string[]>(['piano', 'strings']);
  const [masterTempo, setMasterTempo] = useState(100);
  const [masterGenerating, setMasterGenerating] = useState(false);
  const [masterLyrics, setMasterLyrics] = useState<string[] | null>(null);
  const [masterComposing, setMasterComposing] = useState<'idle' | 'lyrics' | 'composing' | 'synth' | 'done'>('idle');

  // Remix state
  const [remixSourceTrack, setRemixSourceTrack] = useState<number | null>(null);
  const [remixTargetTheme, setRemixTargetTheme] = useState<AILyricsTheme>('energetic');
  const [remixGenerating, setRemixGenerating] = useState(false);
  const [remixResult, setRemixResult] = useState<string[] | null>(null);
  const [remixComposing, setRemixComposing] = useState<'idle' | 'lyrics' | 'composing' | 'synth' | 'done'>('idle');

  // My Works state
  const [works, setWorks] = useState<CreatedWork[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  // Load works from localStorage
  useEffect(() => {
    if (isOpen) {
      try {
        const stored = localStorage.getItem('d-music-works');
        if (stored) setWorks(JSON.parse(stored));
      } catch {}
    }
  }, [isOpen]);

  const saveWork = useCallback((work: CreatedWork) => {
    setWorks(prev => {
      const updated = [work, ...prev].slice(0, 50);
      try { localStorage.setItem('d-music-works', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  const deleteWork = useCallback((id: string) => {
    setWorks(prev => {
      const updated = prev.filter(w => w.id !== id);
      try { localStorage.setItem('d-music-works', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  // ========== Quick Song Pipeline ==========
  const handleQuickCreate = useCallback(async () => {
    setQuickGenerating(true);
    setQuickComposing('lyrics');
    onHaptic?.('medium');

    try {
      // Step 1: Generate lyrics
      const lyricsResult = await apiFetch<{ success: boolean; lyrics: string[] }>('/ai/lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: quickTheme,
          keywords: quickPrompt ? quickPrompt.split(/[,，\s]+/).filter(Boolean) : [],
          lines: 8,
        }),
      });

      if (!lyricsResult?.lyrics) throw new Error('Lyrics generation failed');
      setQuickLyrics(lyricsResult.lyrics);
      setQuickComposing('composing');

      // Step 2: Get composition parameters
      const compResult = await apiFetch<{ success: boolean; composition: CompositionParams }>('/ai/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: quickTheme,
          lyrics: lyricsResult.lyrics,
          lineCount: 8,
        }),
      });

      if (!compResult?.composition) {
        // Fallback without audio
        onCreateTrack?.(lyricsResult.lyrics, quickTheme);
        saveWork({
          id: `work-${Date.now()}`,
          title: `${quickTheme} · Quick Song`,
          theme: quickTheme,
          lyrics: lyricsResult.lyrics,
          createdAt: Date.now(),
          mode: 'quick',
        });
        setQuickComposing('done');
        onHaptic?.('success');
        setTimeout(() => setQuickComposing('idle'), 2000);
        return;
      }

      setQuickComposing('synth');

      // Step 3: Synthesize audio
      const audioBlobUrl = await composer.compose(compResult.composition);

      // Step 4: Create track
      onCreateTrack?.(lyricsResult.lyrics, quickTheme, audioBlobUrl, compResult.composition);
      saveWork({
        id: `work-${Date.now()}`,
        title: `${quickTheme} · Quick Song`,
        theme: quickTheme,
        lyrics: lyricsResult.lyrics,
        createdAt: Date.now(),
        mode: 'quick',
      });
      setQuickComposing('done');
      onHaptic?.('success');
      setTimeout(() => setQuickComposing('idle'), 2500);
    } catch (err) {
      console.error('Quick create failed:', err);
      if (quickLyrics) {
        onCreateTrack?.(quickLyrics, quickTheme);
      }
      setQuickComposing('idle');
    } finally {
      setQuickGenerating(false);
    }
  }, [quickTheme, quickPrompt, onCreateTrack, composer, onHaptic, quickLyrics, saveWork]);

  // ========== Master Mode Pipeline ==========
  const handleMasterCreate = useCallback(async () => {
    setMasterGenerating(true);
    setMasterComposing('lyrics');
    onHaptic?.('medium');

    try {
      const lyricsResult = await apiFetch<{ success: boolean; lyrics: string[] }>('/ai/lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: masterTheme,
          keywords: masterKeywords,
          lines: masterLineCount,
        }),
      });

      if (!lyricsResult?.lyrics) throw new Error('Lyrics generation failed');
      setMasterLyrics(lyricsResult.lyrics);
      setMasterComposing('composing');

      const compResult = await apiFetch<{ success: boolean; composition: CompositionParams }>('/ai/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: masterTheme,
          lyrics: lyricsResult.lyrics,
          lineCount: masterLineCount,
        }),
      });

      if (!compResult?.composition) {
        onCreateTrack?.(lyricsResult.lyrics, masterTheme);
        saveWork({
          id: `work-${Date.now()}`,
          title: `${masterTheme} · Master Work`,
          theme: masterTheme,
          lyrics: lyricsResult.lyrics,
          createdAt: Date.now(),
          mode: 'master',
        });
        setMasterComposing('done');
        onHaptic?.('success');
        setTimeout(() => setMasterComposing('idle'), 2000);
        return;
      }

      setMasterComposing('synth');
      const audioBlobUrl = await composer.compose(compResult.composition);
      onCreateTrack?.(lyricsResult.lyrics, masterTheme, audioBlobUrl, compResult.composition);
      saveWork({
        id: `work-${Date.now()}`,
        title: `${masterTheme} · Master Work`,
        theme: masterTheme,
        lyrics: lyricsResult.lyrics,
        createdAt: Date.now(),
        mode: 'master',
      });
      setMasterComposing('done');
      onHaptic?.('success');
      setTimeout(() => setMasterComposing('idle'), 2500);
    } catch (err) {
      console.error('Master create failed:', err);
      setMasterComposing('idle');
    } finally {
      setMasterGenerating(false);
    }
  }, [masterTheme, masterKeywords, masterLineCount, onCreateTrack, composer, onHaptic, saveWork]);

  // ========== Remix Pipeline (with AI audio re-synthesis) ==========
  const handleRemix = useCallback(async () => {
    if (remixSourceTrack === null) return;
    setRemixGenerating(true);
    setRemixComposing('lyrics');
    onHaptic?.('medium');

    try {
      const sourceTrack = playlist[remixSourceTrack];
      const sourceWords = sourceTrack.lyrics
        .slice(1, 5)
        .map(l => l.text)
        .join(' ')
        .split(' ')
        .filter(w => w.length > 3)
        .slice(0, 5);

      // Step 1: Generate remixed lyrics in target style
      const lyricsResult = await apiFetch<{ success: boolean; lyrics: string[] }>('/ai/lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: remixTargetTheme,
          keywords: sourceWords,
          lines: 8,
        }),
      });

      if (!lyricsResult?.lyrics) throw new Error('Remix lyrics failed');
      setRemixResult(lyricsResult.lyrics);
      setRemixComposing('composing');

      // Step 2: AI composition in the new style
      const compResult = await apiFetch<{ success: boolean; composition: CompositionParams }>('/ai/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: remixTargetTheme,
          lyrics: lyricsResult.lyrics,
          lineCount: 8,
        }),
      });

      const workTitle = `Remix · ${sourceTrack.title}`;

      if (!compResult?.composition) {
        // Fallback without audio
        onCreateTrack?.(lyricsResult.lyrics, remixTargetTheme);
        saveWork({ id: `work-${Date.now()}`, title: workTitle, theme: remixTargetTheme, lyrics: lyricsResult.lyrics, createdAt: Date.now(), mode: 'remix' });
        setRemixComposing('done');
        onHaptic?.('success');
        setTimeout(() => setRemixComposing('idle'), 2000);
        return;
      }

      setRemixComposing('synth');

      // Step 3: Synthesize audio via OfflineAudioContext
      const audioBlobUrl = await composer.compose(compResult.composition);

      // Step 4: Create playable track with synthesized audio
      onCreateTrack?.(lyricsResult.lyrics, remixTargetTheme, audioBlobUrl, compResult.composition);
      saveWork({ id: `work-${Date.now()}`, title: workTitle, theme: remixTargetTheme, lyrics: lyricsResult.lyrics, createdAt: Date.now(), mode: 'remix' });
      setRemixComposing('done');
      onHaptic?.('success');
      setTimeout(() => setRemixComposing('idle'), 2500);
    } catch (err) {
      console.error('Remix failed:', err);
      setRemixComposing('idle');
    } finally {
      setRemixGenerating(false);
    }
  }, [remixSourceTrack, remixTargetTheme, playlist, onCreateTrack, onHaptic, saveWork, composer]);

  const handleCopyLyrics = useCallback((lyrics: string[], id: string) => {
    navigator.clipboard.writeText(lyrics.join('\n'));
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const addMasterKeyword = useCallback(() => {
    const trimmed = masterKwInput.trim();
    if (trimmed && masterKeywords.length < 8 && !masterKeywords.includes(trimmed)) {
      setMasterKeywords(prev => [...prev, trimmed]);
      setMasterKwInput('');
    }
  }, [masterKwInput, masterKeywords]);

  const toggleInstrument = useCallback((id: string) => {
    setMasterInstruments(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, []);

  const formatDate = useCallback((ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
  }, []);

  // ========== Composition Progress Label ==========
  const getProgressLabel = (stage: string) => {
    if (stage === 'lyrics') return lang === 'zh' ? 'AI 写词中...' : 'Generating lyrics...';
    if (stage === 'composing') return lang === 'zh' ? '编曲设计中...' : 'Composing...';
    if (stage === 'synth') return lang === 'zh' ? `音频合成 ${Math.round(composer.progress * 100)}%` : `Synthesizing ${Math.round(composer.progress * 100)}%`;
    if (stage === 'done') return lang === 'zh' ? '创作完成!' : 'Complete!';
    return '';
  };

  // ========== Render ==========
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Studio Panel */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-[61] max-h-[92vh] bg-[#0B1030]/98 backdrop-blur-2xl border-t border-white/10 rounded-t-3xl flex flex-col shadow-2xl md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-xl md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-2xl md:border md:max-h-[88vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 pb-3 border-b border-white/[0.06] flex-shrink-0">
              <div className="flex items-center gap-3">
                {activeMode && (
                  <button
                    onClick={() => { setActiveMode(null); onHaptic?.('light'); }}
                    className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors mr-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center">
                  <Wand2 className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm leading-tight">
                    {activeMode
                      ? MODES.find(m => m.id === activeMode)?.[lang === 'zh' ? 'labelZh' : 'label']
                      : (lang === 'zh' ? 'AI 创作工坊' : 'AI Creation Studio')}
                  </h3>
                  <p className="text-white/30 text-xs">
                    {activeMode
                      ? MODES.find(m => m.id === activeMode)?.[lang === 'zh' ? 'descZh' : 'desc']
                      : (lang === 'zh' ? '选择创作模式开始' : 'Choose a creation mode')}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              <AnimatePresence mode="wait">
                {/* ========== Mode Selection Hub ========== */}
                {!activeMode && (
                  <motion.div
                    key="hub"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-5 space-y-3"
                  >
                    {MODES.map((mode, idx) => {
                      const Icon = mode.icon;
                      return (
                        <motion.button
                          key={mode.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.08 }}
                          onClick={() => {
                            if (mode.id === 'mv') {
                              onOpenMV?.();
                              onHaptic?.('selection');
                              return;
                            }
                            setActiveMode(mode.id);
                            onHaptic?.('selection');
                          }}
                          className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all group text-left"
                        >
                          <div className={clsx(
                            'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0',
                            mode.gradient
                          )}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">
                              {lang === 'zh' ? mode.labelZh : mode.label}
                            </p>
                            <p className="text-xs text-white/30 mt-0.5">
                              {lang === 'zh' ? mode.descZh : mode.desc}
                            </p>
                          </div>
                          {mode.id === 'mv' ? (
                            <ExternalLink className="w-4 h-4 text-cyan-400/40 group-hover:text-cyan-400/70 transition-colors flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors flex-shrink-0" />
                          )}
                        </motion.button>
                      );
                    })}

                    {/* Stats row */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.04]">
                      <div className="flex items-center gap-1.5 text-white/20 text-xs">
                        <Music className="w-3.5 h-3.5" />
                        <span>{lang === 'zh' ? `${works.length} 首作品` : `${works.length} works`}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-white/20 text-xs">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{lang === 'zh' ? 'AI驱动创作' : 'AI-powered creation'}</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ========== Quick Song Mode ========== */}
                {activeMode === 'quick' && (
                  <motion.div
                    key="quick"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-5 space-y-5"
                  >
                    {/* Theme picker */}
                    <div>
                      <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-3">
                        {lang === 'zh' ? '选择情绪主题' : 'Choose Mood'}
                      </p>
                      <div className="grid grid-cols-5 gap-2">
                        {THEMES.map(theme => {
                          const Icon = theme.icon;
                          const isActive = quickTheme === theme.id;
                          const isLocked = theme.premium && !unlockedPremium.has(theme.id);
                          return (
                            <button
                              key={theme.id}
                              onClick={() => {
                                if (isLocked) {
                                  if (user && starPower >= (theme.spCost || 200)) {
                                    handleUnlockTheme(theme.id, theme.spCost || 200);
                                  }
                                  return;
                                }
                                setQuickTheme(theme.id); onHaptic?.('selection');
                              }}
                              className={clsx(
                                'p-3 rounded-xl border transition-all text-center relative',
                                isLocked
                                  ? 'bg-white/[0.01] border-white/[0.04] opacity-60'
                                  : isActive
                                    ? `bg-gradient-to-br ${theme.bg} border-white/15 shadow-lg`
                                    : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
                              )}
                            >
                              {isLocked && (
                                <span className="absolute -top-1 -right-1 text-[8px] px-1 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/20 font-medium">
                                  {theme.spCost}SP
                                </span>
                              )}
                              <Icon className={clsx('w-5 h-5 mx-auto mb-1', isActive ? theme.color : isLocked ? 'text-white/15' : 'text-white/30')} />
                              <p className={clsx('text-[10px]', isActive ? 'text-white/80' : 'text-white/30')}>
                                {lang === 'zh' ? theme.labelZh : theme.label}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Quick prompt */}
                    <div>
                      <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-2">
                        {lang === 'zh' ? '灵感关键词（可选）' : 'Inspiration Keywords (optional)'}
                      </p>
                      <input
                        type="text"
                        value={quickPrompt}
                        onChange={e => setQuickPrompt(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleQuickCreate()}
                        placeholder={lang === 'zh' ? '输入关键词，用逗号分隔...' : 'Enter keywords, comma separated...'}
                        className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50"
                      />
                    </div>

                    {/* One-click create */}
                    <motion.button
                      onClick={handleQuickCreate}
                      disabled={quickGenerating}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white font-semibold flex items-center justify-center gap-3 shadow-lg shadow-purple-500/20 disabled:opacity-50 transition-opacity text-base"
                    >
                      {quickComposing !== 'idle' && quickComposing !== 'done' ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          {getProgressLabel(quickComposing)}
                        </>
                      ) : quickComposing === 'done' ? (
                        <>
                          <Check className="w-5 h-5 text-green-300" />
                          {lang === 'zh' ? '创作完成!' : 'Complete!'}
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          {lang === 'zh' ? '一键创作' : 'Create Now'}
                        </>
                      )}
                    </motion.button>

                    {/* Generated lyrics preview */}
                    <AnimatePresence>
                      {quickLyrics && (
                        <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-4"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs text-white/40 font-medium">{lang === 'zh' ? '生成的歌词' : 'Generated Lyrics'}</p>
                            <button
                              onClick={() => handleCopyLyrics(quickLyrics, 'quick')}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 text-xs text-white/40 hover:text-white/70 transition-colors"
                            >
                              {copied === 'quick' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                              {copied === 'quick' ? (lang === 'zh' ? '已复制' : 'Copied') : (lang === 'zh' ? '复制' : 'Copy')}
                            </button>
                          </div>
                          <div className="space-y-1.5">
                            {quickLyrics.map((line, i) => (
                              <motion.p
                                key={i}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.06 }}
                                className="text-sm text-white/70 leading-relaxed"
                              >
                                {line}
                              </motion.p>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* ========== Master Mode ========== */}
                {activeMode === 'master' && (
                  <motion.div
                    key="master"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-5 space-y-5"
                  >
                    {/* Theme */}
                    <div>
                      <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-3">
                        {lang === 'zh' ? '情绪基调' : 'Emotional Base'}
                      </p>
                      <div className="grid grid-cols-5 gap-2">
                        {THEMES.map(theme => {
                          const Icon = theme.icon;
                          const isActive = masterTheme === theme.id;
                          const isLocked = theme.premium && !unlockedPremium.has(theme.id);
                          return (
                            <button
                              key={theme.id}
                              onClick={() => {
                                if (isLocked) {
                                  if (user && starPower >= (theme.spCost || 200)) handleUnlockTheme(theme.id, theme.spCost || 200);
                                  return;
                                }
                                setMasterTheme(theme.id); onHaptic?.('selection');
                              }}
                              className={clsx(
                                'p-2.5 rounded-xl border transition-all text-center relative',
                                isLocked ? 'bg-white/[0.01] border-white/[0.04] opacity-60'
                                  : isActive ? `bg-gradient-to-br ${theme.bg} border-white/15`
                                  : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
                              )}
                            >
                              {isLocked && <span className="absolute -top-1 -right-1 text-[8px] px-1 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/20 font-medium">{theme.spCost}SP</span>}
                              <Icon className={clsx('w-4 h-4 mx-auto mb-0.5', isActive ? theme.color : isLocked ? 'text-white/15' : 'text-white/30')} />
                              <p className={clsx('text-[9px]', isActive ? 'text-white/80' : 'text-white/30')}>
                                {lang === 'zh' ? theme.labelZh : theme.label}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Keywords */}
                    <div>
                      <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-2">
                        {lang === 'zh' ? '创作关键词' : 'Keywords'} <span className="text-white/20">({masterKeywords.length}/8)</span>
                      </p>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={masterKwInput}
                          onChange={e => setMasterKwInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addMasterKeyword()}
                          placeholder={lang === 'zh' ? '添加关键词...' : 'Add keyword...'}
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50"
                        />
                        <button
                          onClick={addMasterKeyword}
                          disabled={!masterKwInput.trim() || masterKeywords.length >= 8}
                          className="p-2 rounded-lg bg-white/5 border border-white/[0.08] text-white/60 hover:text-white transition-colors disabled:opacity-30"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      {masterKeywords.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {masterKeywords.map(kw => (
                            <span key={kw} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs text-indigo-300">
                              {kw}
                              <button onClick={() => setMasterKeywords(p => p.filter(k => k !== kw))} className="text-indigo-400/60 hover:text-indigo-300">
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Structure */}
                    <div>
                      <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-2">
                        {lang === 'zh' ? '歌曲结构' : 'Song Structure'}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {STRUCTURES.map(s => (
                          <button
                            key={s.id}
                            onClick={() => setMasterStructure(s.id)}
                            className={clsx(
                              'py-2 px-3 rounded-lg border text-xs transition-all',
                              masterStructure === s.id
                                ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                                : 'bg-white/[0.02] border-white/[0.06] text-white/40 hover:bg-white/[0.05]'
                            )}
                          >
                            {lang === 'zh' ? s.labelZh : s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Instruments */}
                    <div>
                      <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-2">
                        {lang === 'zh' ? '乐器编排' : 'Instruments'}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {INSTRUMENTS.map(inst => (
                          <button
                            key={inst.id}
                            onClick={() => toggleInstrument(inst.id)}
                            className={clsx(
                              'py-2 px-3 rounded-lg border text-xs transition-all flex items-center gap-1.5',
                              masterInstruments.includes(inst.id)
                                ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                                : 'bg-white/[0.02] border-white/[0.06] text-white/40 hover:bg-white/[0.05]'
                            )}
                          >
                            <span>{inst.emoji}</span>
                            <span>{lang === 'zh' ? inst.labelZh : inst.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Line Count + Tempo */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-2">
                          {lang === 'zh' ? '歌词行数' : 'Lines'}
                        </p>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setMasterLineCount(Math.max(4, masterLineCount - 2))}
                            className="p-1.5 rounded-lg bg-white/5 border border-white/[0.08] text-white/60 hover:text-white transition-colors">
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-lg font-bold text-white font-mono flex-1 text-center">{masterLineCount}</span>
                          <button onClick={() => setMasterLineCount(Math.min(20, masterLineCount + 2))}
                            className="p-1.5 rounded-lg bg-white/5 border border-white/[0.08] text-white/60 hover:text-white transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-2">
                          {lang === 'zh' ? '速度 BPM' : 'Tempo BPM'}
                        </p>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setMasterTempo(Math.max(60, masterTempo - 10))}
                            className="p-1.5 rounded-lg bg-white/5 border border-white/[0.08] text-white/60 hover:text-white transition-colors">
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-lg font-bold text-white font-mono flex-1 text-center">{masterTempo}</span>
                          <button onClick={() => setMasterTempo(Math.min(200, masterTempo + 10))}
                            className="p-1.5 rounded-lg bg-white/5 border border-white/[0.08] text-white/60 hover:text-white transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Create Button */}
                    <motion.button
                      onClick={handleMasterCreate}
                      disabled={masterGenerating}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                    >
                      {masterComposing !== 'idle' && masterComposing !== 'done' ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          {getProgressLabel(masterComposing)}
                        </>
                      ) : masterComposing === 'done' ? (
                        <>
                          <Check className="w-5 h-5 text-green-300" />
                          {lang === 'zh' ? '大师之作完成!' : 'Masterpiece Complete!'}
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-5 h-5" />
                          {lang === 'zh' ? '开始创作' : 'Start Creating'}
                        </>
                      )}
                    </motion.button>

                    {/* Master lyrics preview */}
                    <AnimatePresence>
                      {masterLyrics && (
                        <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-indigo-500/10 to-blue-500/10 p-4"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs text-white/40">{lang === 'zh' ? '大师之作' : 'Master Work'}</p>
                            <button
                              onClick={() => handleCopyLyrics(masterLyrics, 'master')}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 text-xs text-white/40 hover:text-white/70 transition-colors"
                            >
                              {copied === 'master' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                              {copied === 'master' ? (lang === 'zh' ? '已复制' : 'Copied') : (lang === 'zh' ? '复制' : 'Copy')}
                            </button>
                          </div>
                          <div className="space-y-1.5">
                            {masterLyrics.map((line, i) => (
                              <motion.p
                                key={i}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="text-sm text-white/70 leading-relaxed"
                              >
                                {line}
                              </motion.p>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* ========== Remix Mode ========== */}
                {activeMode === 'remix' && (
                  <motion.div
                    key="remix"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-5 space-y-5"
                  >
                    {/* Source track selector */}
                    <div>
                      <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-3">
                        {lang === 'zh' ? '选择原曲' : 'Select Source Track'}
                      </p>
                      <div className="space-y-2 max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                        {playlist.map((track, idx) => (
                          <button
                            key={track.id}
                            onClick={() => { setRemixSourceTrack(idx); onHaptic?.('selection'); }}
                            className={clsx(
                              'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                              remixSourceTrack === idx
                                ? 'bg-orange-500/10 border-orange-500/20'
                                : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
                            )}
                          >
                            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                              <img src={track.albumArt} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={clsx('text-sm font-medium truncate', remixSourceTrack === idx ? 'text-orange-300' : 'text-white/70')}>
                                {track.title}
                              </p>
                              <p className="text-xs text-white/30">{track.artist}</p>
                            </div>
                            {remixSourceTrack === idx && (
                              <div className="w-5 h-5 rounded-full bg-orange-500/30 border border-orange-500/50 flex items-center justify-center flex-shrink-0">
                                <Check className="w-3 h-3 text-orange-300" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Target theme */}
                    <div>
                      <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-3">
                        {lang === 'zh' ? '改编风格' : 'Target Style'}
                      </p>
                      <div className="grid grid-cols-5 gap-2">
                        {THEMES.map(theme => {
                          const Icon = theme.icon;
                          const isActive = remixTargetTheme === theme.id;
                          const isLocked = theme.premium && !unlockedPremium.has(theme.id);
                          return (
                            <button
                              key={theme.id}
                              onClick={() => {
                                if (isLocked) {
                                  if (user && starPower >= (theme.spCost || 200)) handleUnlockTheme(theme.id, theme.spCost || 200);
                                  return;
                                }
                                setRemixTargetTheme(theme.id); onHaptic?.('selection');
                              }}
                              className={clsx(
                                'p-2.5 rounded-xl border transition-all text-center relative',
                                isLocked ? 'bg-white/[0.01] border-white/[0.04] opacity-60'
                                  : isActive ? `bg-gradient-to-br ${theme.bg} border-white/15`
                                  : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
                              )}
                            >
                              {isLocked && <span className="absolute -top-1 -right-1 text-[8px] px-1 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/20 font-medium">{theme.spCost}SP</span>}
                              <Icon className={clsx('w-4 h-4 mx-auto mb-0.5', isActive ? theme.color : isLocked ? 'text-white/15' : 'text-white/30')} />
                              <p className={clsx('text-[9px]', isActive ? 'text-white/80' : 'text-white/30')}>
                                {lang === 'zh' ? theme.labelZh : theme.label}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Remix Button */}
                    <motion.button
                      onClick={handleRemix}
                      disabled={remixSourceTrack === null || remixGenerating}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-40"
                    >
                      {remixComposing !== 'idle' && remixComposing !== 'done' ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          {getProgressLabel(remixComposing)}
                        </>
                      ) : remixComposing === 'done' ? (
                        <>
                          <Check className="w-5 h-5 text-green-300" />
                          {lang === 'zh' ? '改编完成!' : 'Remix Complete!'}
                        </>
                      ) : (
                        <>
                          <Layers className="w-5 h-5" />
                          {lang === 'zh' ? '开始改编 (含音频重合成)' : 'Remix (with audio synthesis)'}
                        </>
                      )}
                    </motion.button>

                    {/* Remix result */}
                    <AnimatePresence>
                      {remixResult && (
                        <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-orange-500/10 to-red-500/10 p-4"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs text-white/40">{lang === 'zh' ? '改编歌词' : 'Remixed Lyrics'}</p>
                            <button
                              onClick={() => handleCopyLyrics(remixResult, 'remix')}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 text-xs text-white/40 hover:text-white/70 transition-colors"
                            >
                              {copied === 'remix' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                              {copied === 'remix' ? (lang === 'zh' ? '已复制' : 'Copied') : (lang === 'zh' ? '复制' : 'Copy')}
                            </button>
                          </div>
                          <div className="space-y-1.5">
                            {remixResult.map((line, i) => (
                              <motion.p
                                key={i}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.06 }}
                                className="text-sm text-white/70 leading-relaxed"
                              >
                                {line}
                              </motion.p>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* ========== My Works ========== */}
                {activeMode === 'works' && (
                  <motion.div
                    key="works"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-5"
                  >
                    {works.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-4">
                        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                          <Music className="w-7 h-7 text-white/20" />
                        </div>
                        <p className="text-white/30 text-sm text-center">
                          {lang === 'zh' ? '还没有创作作品\n去创作你的第一首歌吧!' : 'No works yet\nCreate your first song!'}
                        </p>
                        <button
                          onClick={() => setActiveMode('quick')}
                          className="px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm hover:bg-purple-500/20 transition-colors"
                        >
                          {lang === 'zh' ? '开始创作' : 'Start Creating'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-3">
                          {lang === 'zh' ? `${works.length} 首作品` : `${works.length} Works`}
                        </p>
                        {works.map((work, idx) => {
                          const theme = THEMES.find(t => t.id === work.theme);
                          const ThemeIcon = theme?.icon || Music;
                          const modeInfo = MODES.find(m => m.id === work.mode);
                          return (
                            <motion.div
                              key={work.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 group"
                            >
                              <div className="flex items-start gap-3">
                                <div className={clsx(
                                  'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br',
                                  theme?.bg || 'from-white/5 to-white/5'
                                )}>
                                  <ThemeIcon className={clsx('w-5 h-5', theme?.color || 'text-white/30')} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-medium text-white/80 truncate">{work.title}</p>
                                    <span className="text-[9px] text-white/20 bg-white/5 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                      {modeInfo ? (lang === 'zh' ? modeInfo.labelZh : modeInfo.label) : work.mode}
                                    </span>
                                  </div>
                                  <p className="text-xs text-white/25 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatDate(work.createdAt)}
                                  </p>
                                  {/* Lyrics preview */}
                                  <p className="text-xs text-white/30 mt-2 line-clamp-2 italic">
                                    "{work.lyrics.slice(0, 2).join(' / ')}"
                                  </p>
                                </div>
                                <div className="flex flex-col gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0">
                                  <button
                                    onClick={() => handleCopyLyrics(work.lyrics, work.id)}
                                    className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
                                    title={lang === 'zh' ? '复制歌词' : 'Copy lyrics'}
                                  >
                                    {copied === work.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    onClick={() => deleteWork(work.id)}
                                    className="p-1.5 rounded-lg text-white/30 hover:text-red-400/60 hover:bg-red-500/5 transition-colors"
                                    title={lang === 'zh' ? '删除' : 'Delete'}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                  {onShareWork && (
                                    <button
                                      onClick={() => onShareWork(work)}
                                      className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
                                      title={lang === 'zh' ? '分享作品' : 'Share work'}
                                    >
                                      <Share2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {onOpenMV && (
                                    <button
                                      onClick={() => onOpenMV(work.lyrics)}
                                      className="p-1.5 rounded-lg text-white/30 hover:text-cyan-400/60 hover:bg-cyan-500/5 transition-colors"
                                      title={lang === 'zh' ? '从此作品创建MV' : 'Create MV from this work'}
                                    >
                                      <Film className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};