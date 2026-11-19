// 社区面板子组件 · 上传面板歌词编辑器（时间戳同步 / LRC 导入 / 情感标注）
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import {
  Play, Pause, Check, Plus, X, PenLine, Save, ListMusic, Loader2,
} from 'lucide-react';
import { apiFetch } from '@yyc3/music-utils';
import { T, EMOTIONS, parseLRC, formatTime } from './shared';
import type { LyricLine } from './shared';

// ==========================================
// Sub-component: Lyrics Editor
// ==========================================

export const LyricsEditor: React.FC<{
  mediaId: string;
  mediaDuration: number;
  lang: 'zh' | 'en';
  signedUrl: string | null;
}> = ({ mediaId, mediaDuration, lang, signedUrl }) => {
  const t = (key: keyof typeof T) => T[key][lang];
  const [lines, setLines] = useState<LyricLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingLyrics, setLoadingLyrics] = useState(true);
  const [lrcInput, setLrcInput] = useState('');
  const [showLrcImport, setShowLrcImport] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Load existing lyrics
  useEffect(() => {
    (async () => {
      setLoadingLyrics(true);
      try {
        const res = await apiFetch<{ lyrics: LyricLine[] }>(`/upload/media/${mediaId}/lyrics`);
        if (res?.lyrics?.length) setLines(res.lyrics);
      } catch { /* no lyrics yet */ }
      setLoadingLyrics(false);
    })();
  }, [mediaId]);

  const addLine = () => {
    setLines(prev => [...prev, { time: currentTime, text: '', translation: '', emotion: 'neutral' }]);
    setSaved(false);
  };

  const updateLine = (index: number, field: keyof LyricLine, value: any) => {
    setLines(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
    setSaved(false);
  };

  const removeLine = (index: number) => {
    setLines(prev => prev.filter((_, i) => i !== index));
    setSaved(false);
  };

  const sortLines = () => {
    setLines(prev => [...prev].sort((a, b) => a.time - b.time));
  };

  const importLrc = () => {
    const parsed = parseLRC(lrcInput);
    if (parsed.length > 0) {
      setLines(prev => [...prev, ...parsed].sort((a, b) => a.time - b.time));
      setLrcInput('');
      setShowLrcImport(false);
      setSaved(false);
    }
  };

  const saveLyrics = async () => {
    setSaving(true);
    try {
      const sorted = [...lines].sort((a, b) => a.time - b.time);
      await apiFetch(`/upload/media/${mediaId}/lyrics`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lyrics: sorted }),
      });
      setLines(sorted);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('[Lyrics] Save error:', err);
    }
    setSaving(false);
  };

  // Audio preview for time sync
  const togglePlay = () => {
    if (!audioRef.current && signedUrl) {
      audioRef.current = new Audio(signedUrl);
      audioRef.current.ontimeupdate = () => setCurrentTime(audioRef.current!.currentTime);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  };

  const stampCurrentTime = (index: number) => {
    updateLine(index, 'time', parseFloat(currentTime.toFixed(2)));
  };

  if (loadingLyrics) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Audio player bar for time sync */}
      {signedUrl && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <button
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center hover:bg-violet-500/30 transition-colors flex-shrink-0"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 text-violet-300" /> : <Play className="w-3.5 h-3.5 text-violet-300" />}
          </button>
          <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all duration-200"
              style={{ width: `${mediaDuration > 0 ? (currentTime / mediaDuration) * 100 : 0}%` }}
            />
          </div>
          <span className="text-[10px] text-white/40 font-mono w-16 text-right">{formatTime(currentTime)}</span>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={addLine}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-500/15 text-violet-300 text-xs hover:bg-violet-500/25 transition-colors"
        >
          <Plus className="w-3 h-3" /> {t('upload.addLine')}
        </button>
        <button
          onClick={sortLines}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.04] text-white/40 text-xs hover:text-white/60 transition-colors"
        >
          <ListMusic className="w-3 h-3" /> {lang === 'zh' ? '按时间排序' : 'Sort by time'}
        </button>
        <button
          onClick={() => setShowLrcImport(!showLrcImport)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.04] text-white/40 text-xs hover:text-white/60 transition-colors"
        >
          <PenLine className="w-3 h-3" /> {t('upload.parseLrc')}
        </button>
        <div className="ml-auto">
          <button
            onClick={saveLyrics}
            disabled={saving || lines.length === 0}
            className={clsx(
              'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              saved
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-gradient-to-r from-violet-600 to-pink-600 text-white hover:from-violet-500 hover:to-pink-500 disabled:opacity-30'
            )}
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : saved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
            {saved ? t('upload.lyricsSaved') : t('upload.saveLyrics')}
          </button>
        </div>
      </div>

      {/* LRC Import */}
      <AnimatePresence>
        {showLrcImport && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <textarea
                value={lrcInput}
                onChange={e => setLrcInput(e.target.value)}
                rows={4}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-violet-400/40 resize-none font-mono"
                placeholder="[00:12.34]First line of lyrics\n[00:18.56]Second line..."
              />
              <button
                onClick={importLrc}
                disabled={!lrcInput.trim()}
                className="px-3 py-1.5 rounded-lg bg-violet-500/20 text-violet-300 text-xs hover:bg-violet-500/30 transition-colors disabled:opacity-30"
              >
                {lang === 'zh' ? '导入' : 'Import'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lyrics Lines */}
      {lines.length === 0 ? (
        <div className="text-center py-8">
          <ListMusic className="w-8 h-8 text-white/10 mx-auto mb-2" />
          <p className="text-xs text-white/30">{t('upload.noLyrics')}</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
          {lines.map((line, i) => (
            <motion.div
              key={i}
              layout
              className="flex items-start gap-1.5 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] group transition-colors"
            >
              {/* Time stamp button */}
              <button
                onClick={() => stampCurrentTime(i)}
                title={lang === 'zh' ? '标记当前时间' : 'Stamp current time'}
                className="flex-shrink-0 mt-0.5 w-[60px] text-[10px] font-mono text-violet-400/60 hover:text-violet-400 bg-white/[0.04] hover:bg-violet-500/10 rounded px-1 py-1 text-center transition-colors"
              >
                {formatTime(line.time)}
              </button>

              {/* Text + Translation */}
              <div className="flex-1 min-w-0 space-y-1">
                <input
                  type="text"
                  value={line.text}
                  onChange={e => updateLine(i, 'text', e.target.value)}
                  placeholder={t('upload.lyricsText')}
                  className="w-full bg-transparent text-xs text-white/80 placeholder-white/15 focus:outline-none"
                />
                <input
                  type="text"
                  value={line.translation}
                  onChange={e => updateLine(i, 'translation', e.target.value)}
                  placeholder={t('upload.lyricsTranslation')}
                  className="w-full bg-transparent text-[10px] text-white/40 placeholder-white/10 focus:outline-none"
                />
              </div>

              {/* Emotion select */}
              <select
                value={line.emotion}
                onChange={e => updateLine(i, 'emotion', e.target.value)}
                className="flex-shrink-0 w-14 bg-white/[0.04] border-none rounded text-[9px] text-white/30 focus:outline-none appearance-none px-1 py-0.5"
              >
                {EMOTIONS.map(em => (
                  <option key={em.value} value={em.value} className="bg-[#0D1235]">
                    {em.label[lang]}
                  </option>
                ))}
              </select>

              {/* Delete */}
              <button
                onClick={() => removeLine(i)}
                className="flex-shrink-0 mt-0.5 w-5 h-5 rounded text-white/10 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-white/15 text-center">
        {lines.length} {lang === 'zh' ? '行歌词' : 'line(s)'}
        {signedUrl && (lang === 'zh' ? ' | 点击时间戳标记播放位置' : ' | Click timestamp to stamp playback position')}
      </p>
    </div>
  );
};
