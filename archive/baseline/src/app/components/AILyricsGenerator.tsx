import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Wand2,
  Copy,
  Check,
  Loader2,
  Sparkles,
  Smile,
  Frown,
  Zap,
  Cloud,
  Heart,
  RefreshCw,
  Plus,
  Minus,
  Music,
  Volume2,
} from 'lucide-react';
import { clsx } from 'clsx';
import { apiFetch } from '../lib/supabase';
import { useI18n } from '../hooks/useI18n';
import { useAudioComposer, type CompositionParams } from '../hooks/useAudioComposer';

interface AILyricsGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTrack?: (lyrics: string[], theme: AILyricsTheme, audioBlobUrl?: string, compositionParams?: CompositionParams) => void;
}

export type AILyricsTheme = 'happy' | 'sad' | 'energetic' | 'calm' | 'love';

const THEMES: Array<{
  id: AILyricsTheme;
  label: string;
  labelZh: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}> = [
  { id: 'happy', label: 'Happy', labelZh: '快乐', icon: Smile, color: 'text-yellow-400', bg: 'from-yellow-500/20 to-orange-500/20' },
  { id: 'sad', label: 'Sad', labelZh: '忧伤', icon: Frown, color: 'text-blue-400', bg: 'from-blue-500/20 to-indigo-500/20' },
  { id: 'energetic', label: 'Energetic', labelZh: '活力', icon: Zap, color: 'text-red-400', bg: 'from-red-500/20 to-orange-500/20' },
  { id: 'calm', label: 'Calm', labelZh: '宁静', icon: Cloud, color: 'text-cyan-400', bg: 'from-cyan-500/20 to-teal-500/20' },
  { id: 'love', label: 'Love', labelZh: '爱情', icon: Heart, color: 'text-pink-400', bg: 'from-pink-500/20 to-red-500/20' },
];

export const AILyricsGenerator: React.FC<AILyricsGeneratorProps> = ({
  isOpen,
  onClose,
  onCreateTrack,
}) => {
  const [selectedTheme, setSelectedTheme] = useState<AILyricsTheme>('happy');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [lineCount, setLineCount] = useState(8);
  const [generating, setGenerating] = useState(false);
  const [generatedLyrics, setGeneratedLyrics] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [generationCount, setGenerationCount] = useState(0);
  const [trackCreated, setTrackCreated] = useState(false);
  const [compositionStage, setCompositionStage] = useState<'idle' | 'composing-params' | 'synthesizing' | 'done'>('idle');
  const composer = useAudioComposer();
  const { t, lang } = useI18n();

  const addKeyword = useCallback(() => {
    const trimmed = keywordInput.trim();
    if (trimmed && keywords.length < 5 && !keywords.includes(trimmed)) {
      setKeywords((prev) => [...prev, trimmed]);
      setKeywordInput('');
    }
  }, [keywordInput, keywords]);

  const removeKeyword = useCallback((kw: string) => {
    setKeywords((prev) => prev.filter((k) => k !== kw));
  }, []);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const result = await apiFetch<{
        success: boolean;
        lyrics: string[];
        theme: string;
        themeLabel: string;
      }>('/ai/lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: selectedTheme,
          keywords,
          lines: lineCount,
        }),
      });

      if (result?.lyrics) {
        setGeneratedLyrics(result.lyrics);
        setGenerationCount((prev) => prev + 1);
      }
    } catch (err) {
      console.error('AI lyrics generation failed:', err);
    } finally {
      setGenerating(false);
    }
  }, [selectedTheme, keywords, lineCount]);

  const handleCopy = useCallback(() => {
    if (generatedLyrics) {
      navigator.clipboard.writeText(generatedLyrics.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generatedLyrics]);

  const handleCreateTrack = useCallback(async () => {
    if (!generatedLyrics || !onCreateTrack) return;

    setCompositionStage('composing-params');
    // Haptic feedback
    try { navigator.vibrate?.(25); } catch {}

    try {
      // Step 1: Get composition parameters from backend
      const compResult = await apiFetch<{
        success: boolean;
        composition: CompositionParams;
      }>('/ai/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: selectedTheme,
          lyrics: generatedLyrics,
          lineCount,
        }),
      });

      if (!compResult?.composition) {
        // Fallback: create track without synthesized audio
        onCreateTrack(generatedLyrics, selectedTheme);
        setTrackCreated(true);
        setCompositionStage('done');
        setTimeout(() => { setTrackCreated(false); setCompositionStage('idle'); }, 2500);
        return;
      }

      setCompositionStage('synthesizing');

      // Step 2: Synthesize audio using Web Audio API
      const audioBlobUrl = await composer.compose(compResult.composition);

      // Step 3: Create the track with real audio
      onCreateTrack(generatedLyrics, selectedTheme, audioBlobUrl, compResult.composition);
      setTrackCreated(true);
      setCompositionStage('done');
      try { navigator.vibrate?.([10, 30, 10, 30, 40]); } catch {} // success haptic
      setTimeout(() => { setTrackCreated(false); setCompositionStage('idle'); }, 2500);
    } catch (err) {
      console.error('Composition pipeline failed:', err);
      // Fallback: create track with demo oscillators
      onCreateTrack(generatedLyrics, selectedTheme);
      setTrackCreated(true);
      setCompositionStage('done');
      setTimeout(() => { setTrackCreated(false); setCompositionStage('idle'); }, 2500);
    }
  }, [generatedLyrics, onCreateTrack, selectedTheme, lineCount, composer]);

  const currentTheme = THEMES.find((t) => t.id === selectedTheme)!;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-[61] max-h-[90vh] bg-[#0D1235]/95 backdrop-blur-2xl border-t border-white/10 rounded-t-3xl flex flex-col shadow-2xl md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-2xl md:border md:max-h-[85vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 pb-3 border-b border-white/[0.06] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center">
                  <Wand2 className="w-4.5 h-4.5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm leading-tight">{t('aiLyrics.title')}</h3>
                  <p className="text-white/30 text-xs">
                    {t('aiLyrics.subtitle')}
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
            <div className="flex-1 overflow-y-auto p-5 space-y-5" style={{ scrollbarWidth: 'none' }}>
              {/* Theme Selection */}
              <div>
                <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-3">
                  {t('aiLyrics.theme')}
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {THEMES.map((theme) => {
                    const Icon = theme.icon;
                    const isActive = selectedTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => setSelectedTheme(theme.id)}
                        className={clsx(
                          'p-3 rounded-xl border transition-all text-center',
                          isActive
                            ? `bg-gradient-to-br ${theme.bg} border-white/15 shadow-lg`
                            : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
                        )}
                      >
                        <Icon
                          className={clsx(
                            'w-5 h-5 mx-auto mb-1',
                            isActive ? theme.color : 'text-white/30'
                          )}
                        />
                        <p className={clsx('text-[10px]', isActive ? 'text-white/80' : 'text-white/30')}>
                          {lang === 'zh' ? theme.labelZh : theme.label}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Keywords */}
              <div>
                <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-3">
                  {t('aiLyrics.keywords')} <span className="text-white/20">({keywords.length}/5)</span>
                </p>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                    placeholder={t('aiLyrics.enterKeyword')}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50"
                  />
                  <button
                    onClick={addKeyword}
                    disabled={!keywordInput.trim() || keywords.length >= 5}
                    className="p-2 rounded-lg bg-white/5 border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {keywords.map((kw) => (
                      <motion.span
                        key={kw}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-xs text-purple-300"
                      >
                        {kw}
                        <button onClick={() => removeKeyword(kw)} className="text-purple-400/60 hover:text-purple-300">
                          <X className="w-3 h-3" />
                        </button>
                      </motion.span>
                    ))}
                  </div>
                )}
              </div>

              {/* Line Count */}
              <div>
                <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-3">
                  {t('aiLyrics.lines')}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setLineCount(Math.max(4, lineCount - 2))}
                    className="p-2 rounded-lg bg-white/5 border border-white/[0.08] text-white/60 hover:text-white transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-2xl font-bold text-white font-mono">{lineCount}</span>
                    <span className="text-xs text-white/30 ml-1">{t('aiLyrics.linesUnit')}</span>
                  </div>
                  <button
                    onClick={() => setLineCount(Math.min(16, lineCount + 2))}
                    className="p-2 rounded-lg bg-white/5 border border-white/[0.08] text-white/60 hover:text-white transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Generate Button */}
              <motion.button
                onClick={handleGenerate}
                disabled={generating}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white font-medium flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 disabled:opacity-50 transition-opacity"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('aiLyrics.generating')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {generationCount > 0 ? t('aiLyrics.regenerate') : t('aiLyrics.generate')}
                  </>
                )}
              </motion.button>

              {/* Generated Lyrics */}
              <AnimatePresence>
                {generatedLyrics && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <currentTheme.icon className={clsx('w-4 h-4', currentTheme.color)} />
                        <p className="text-xs text-white/50">
                          {t('aiLyrics.generated')} · {lang === 'zh' ? currentTheme.labelZh : currentTheme.label} {t('aiLyrics.themeSuffix')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={handleGenerate}
                          disabled={generating}
                          className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
                          title="Regenerate"
                        >
                          <RefreshCw className={clsx('w-3.5 h-3.5', generating && 'animate-spin')} />
                        </button>
                        <button
                          onClick={handleCopy}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/[0.08] text-xs text-white/50 hover:text-white/80 transition-colors"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3 h-3 text-green-400" />
                              <span className="text-green-400">{t('aiLyrics.copied')}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              {t('aiLyrics.copy')}
                            </>
                          )}
                        </button>
                        {onCreateTrack && (
                          <button
                            onClick={handleCreateTrack}
                            disabled={compositionStage !== 'idle' && compositionStage !== 'done'}
                            className={clsx(
                              'flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs transition-colors',
                              compositionStage === 'idle' || compositionStage === 'done'
                                ? 'bg-white/5 border-white/[0.08] text-white/50 hover:text-white/80'
                                : 'bg-purple-500/10 border-purple-500/20 text-purple-300'
                            )}
                          >
                            {trackCreated ? (
                              <>
                                <Check className="w-3 h-3 text-green-400" />
                                <span className="text-green-400">{t('aiLyrics.trackCreated')}</span>
                              </>
                            ) : compositionStage === 'composing-params' ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
                                <span>{lang === 'zh' ? '编曲中...' : 'Composing...'}</span>
                              </>
                            ) : compositionStage === 'synthesizing' ? (
                              <>
                                <Volume2 className="w-3 h-3 animate-pulse text-purple-400" />
                                <span>{lang === 'zh' ? `合成 ${Math.round(composer.progress * 100)}%` : `Synth ${Math.round(composer.progress * 100)}%`}</span>
                              </>
                            ) : (
                              <>
                                <Music className="w-3 h-3" />
                                {lang === 'zh' ? '创建歌曲' : 'Create Track'}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className={clsx('rounded-xl border p-4 bg-gradient-to-br', currentTheme.bg, 'border-white/[0.08]')}>
                      <div className="space-y-2">
                        {generatedLyrics.map((line, i) => (
                          <motion.p
                            key={`${generationCount}-${i}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="text-sm text-white/80 leading-relaxed"
                          >
                            {line}
                          </motion.p>
                        ))}
                      </div>
                    </div>
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