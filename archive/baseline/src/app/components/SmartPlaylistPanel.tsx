import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Brain, Sparkles, Music, Zap, Play, RefreshCw, ChevronRight, Shuffle } from 'lucide-react';
import { clsx } from 'clsx';
import { apiFetch } from '../lib/supabase';
import { useI18n } from '../hooks/useI18n';

/**
 * §25.x — Smart Playlist (智能歌单)
 *
 * Analyzes user listening history + current emotion to generate
 * an AI-curated track ordering. Shows mood distribution analysis
 * and recommended queue with match scores.
 */

interface SmartPlaylistPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  currentEmotion: string;
  playlist: { id: string; title: string; artist: string; albumArt: string; color: string; lyrics: { emotion?: string }[] }[];
  onApplyQueue: (indices: number[]) => void;
}

interface MoodAnalysis {
  dominant: string;
  distribution: { emotion: string; pct: number }[];
  listenCount: number;
  avgCompletionRate: number;
}

interface SmartTrack {
  index: number;
  id: string;
  title: string;
  artist: string;
  matchScore: number;
  reason: string;
  reasonZh: string;
}

const EMOTION_LABELS_ZH: Record<string, string> = {
  happy: '愉悦', sad: '忧伤', energetic: '活力', calm: '宁静', neutral: '平和',
};

const EMOTION_COLORS: Record<string, string> = {
  happy: '#FFD700', sad: '#6495ED', energetic: '#FF4500', calm: '#00CED1', neutral: '#9370DB',
};

export const SmartPlaylistPanel: React.FC<SmartPlaylistPanelProps> = ({
  isOpen, onClose, userId, currentEmotion, playlist, onApplyQueue,
}) => {
  const { lang } = useI18n();
  const [loading, setLoading] = useState(false);
  const [mood, setMood] = useState<MoodAnalysis | null>(null);
  const [queue, setQueue] = useState<SmartTrack[]>([]);
  const [applied, setApplied] = useState(false);

  const generateSmartQueue = useCallback(async () => {
    setLoading(true);
    setApplied(false);
    try {
      const data = await apiFetch<{ analysis: MoodAnalysis; queue: SmartTrack[] }>(
        `/smart-playlist/${userId || 'anon'}?emotion=${currentEmotion}`
      );
      if (data?.analysis) setMood(data.analysis);
      if (data?.queue) {
        // Map queue track IDs to local playlist indices
        const mapped = data.queue.map(q => {
          const idx = playlist.findIndex(t => t.id === q.id);
          return { ...q, index: idx >= 0 ? idx : q.index };
        }).filter(q => q.index >= 0);
        setQueue(mapped);
      }
    } catch (err) {
      console.error('Smart playlist error:', err);
      // Fallback: generate locally based on emotion
      generateLocalQueue();
    } finally {
      setLoading(false);
    }
  }, [userId, currentEmotion, playlist]);

  const generateLocalQueue = useCallback(() => {
    // Local fallback: score tracks by emotion match
    const scored = playlist.map((track, index) => {
      const trackEmotions = track.lyrics.map(l => l.emotion).filter(Boolean);
      const emotionMatch = trackEmotions.filter(e => e === currentEmotion).length;
      const totalEmotions = Math.max(trackEmotions.length, 1);
      const matchScore = Math.round((emotionMatch / totalEmotions) * 80 + Math.random() * 20);

      // Determine recommendation reason
      let reason = 'Matches current mood';
      let reasonZh = '匹配当前心情';
      if (matchScore > 70) {
        reason = 'Strong mood alignment';
        reasonZh = '心情高度契合';
      } else if (matchScore > 40) {
        reason = 'Complementary energy';
        reasonZh = '能量互补';
      } else {
        reason = 'Discover something new';
        reasonZh = '探索新体验';
      }

      return {
        index,
        id: track.id,
        title: track.title,
        artist: track.artist,
        matchScore,
        reason,
        reasonZh,
      };
    });
    scored.sort((a, b) => b.matchScore - a.matchScore);
    setQueue(scored);
  }, [playlist, currentEmotion]);

  useEffect(() => {
    if (isOpen) generateSmartQueue();
  }, [isOpen, generateSmartQueue]);

  const handleApply = () => {
    const indices = queue.map(q => q.index);
    onApplyQueue(indices);
    setApplied(true);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-[61] w-full max-w-sm bg-[#0D1235]/98 backdrop-blur-2xl border-l border-white/[0.06] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white leading-tight">
                    {lang === 'zh' ? '智能歌单' : 'Smart Playlist'}
                  </h2>
                  <p className="text-[10px] text-white/30">
                    {lang === 'zh' ? '基于情感分析 · AI编排' : 'Emotion-driven · AI curated'}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                <X className="w-3.5 h-3.5 text-white/40" />
              </button>
            </div>

            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <motion.div
                  className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <Brain className="w-6 h-6 text-indigo-400" />
                </motion.div>
                <p className="text-sm text-white/40">
                  {lang === 'zh' ? '分析收听偏好中...' : 'Analyzing listening patterns...'}
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {/* Mood Analysis */}
                {mood && (
                  <div className="px-5 py-4 border-b border-white/[0.04]">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span className="text-xs text-white/50 font-medium">
                        {lang === 'zh' ? '心情分析' : 'Mood Analysis'}
                      </span>
                      <span className="text-[10px] text-white/20 ml-auto">
                        {mood.listenCount} {lang === 'zh' ? '首记录' : 'tracks'}
                      </span>
                    </div>

                    {/* Emotion Distribution Bar */}
                    <div className="h-3 rounded-full overflow-hidden flex bg-white/[0.04] mb-3">
                      {mood.distribution.map((d, i) => (
                        <motion.div
                          key={d.emotion}
                          initial={{ width: 0 }}
                          animate={{ width: `${d.pct}%` }}
                          transition={{ delay: i * 0.1, duration: 0.5 }}
                          className="h-full"
                          style={{ backgroundColor: EMOTION_COLORS[d.emotion] || '#9370DB', opacity: 0.7 }}
                          title={`${d.emotion}: ${d.pct}%`}
                        />
                      ))}
                    </div>

                    {/* Emotion Labels */}
                    <div className="flex flex-wrap gap-2">
                      {mood.distribution.filter(d => d.pct > 5).map(d => (
                        <div key={d.emotion} className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: EMOTION_COLORS[d.emotion] }} />
                          <span className="text-[10px] text-white/40">
                            {lang === 'zh' ? (EMOTION_LABELS_ZH[d.emotion] || d.emotion) : d.emotion}
                          </span>
                          <span className="text-[10px] text-white/20 font-mono">{d.pct}%</span>
                        </div>
                      ))}
                    </div>

                    {/* Current Mood Tag */}
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-[10px] text-white/25">
                        {lang === 'zh' ? '当前情绪:' : 'Current:'}
                      </span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full border font-medium"
                        style={{
                          color: EMOTION_COLORS[currentEmotion] || '#9370DB',
                          borderColor: `${EMOTION_COLORS[currentEmotion] || '#9370DB'}40`,
                          backgroundColor: `${EMOTION_COLORS[currentEmotion] || '#9370DB'}10`,
                        }}
                      >
                        {lang === 'zh' ? (EMOTION_LABELS_ZH[currentEmotion] || currentEmotion) : currentEmotion}
                      </span>
                    </div>
                  </div>
                )}

                {/* Smart Queue */}
                <div className="px-5 py-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-white/50 font-medium">
                      {lang === 'zh' ? '推荐播放顺序' : 'Recommended Order'}
                    </span>
                    <button
                      onClick={generateSmartQueue}
                      className="flex items-center gap-1 text-[10px] text-indigo-400/60 hover:text-indigo-400 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      {lang === 'zh' ? '重新生成' : 'Refresh'}
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {queue.map((track, qi) => (
                      <motion.div
                        key={track.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: qi * 0.04 }}
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-colors group"
                      >
                        {/* Queue number */}
                        <span className={clsx(
                          'w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                          qi === 0 ? 'bg-indigo-500/15 text-indigo-400' :
                          qi < 3 ? 'bg-purple-500/10 text-purple-400/70' : 'bg-white/5 text-white/20'
                        )}>
                          {qi + 1}
                        </span>

                        {/* Track info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white/80 font-medium truncate">{track.title}</p>
                          <p className="text-[10px] text-white/25 truncate">{track.artist}</p>
                        </div>

                        {/* Match score */}
                        <div className="flex flex-col items-end flex-shrink-0">
                          <div className="flex items-center gap-1">
                            <div className="w-10 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${track.matchScore}%` }}
                                transition={{ delay: qi * 0.05 + 0.2, duration: 0.4 }}
                                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                style={{ opacity: 0.7 }}
                              />
                            </div>
                            <span className="text-[9px] text-indigo-400/60 font-mono tabular-nums w-7 text-right">
                              {track.matchScore}%
                            </span>
                          </div>
                          <span className="text-[8px] text-white/15 mt-0.5">
                            {lang === 'zh' ? track.reasonZh : track.reason}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Apply Button */}
            {!loading && queue.length > 0 && (
              <div className="px-5 py-4 border-t border-white/[0.06] flex-shrink-0">
                <button
                  onClick={handleApply}
                  disabled={applied}
                  className={clsx(
                    'w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all',
                    applied
                      ? 'bg-emerald-500/10 text-emerald-400/60 border border-emerald-500/20'
                      : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:brightness-110'
                  )}
                >
                  {applied ? (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {lang === 'zh' ? '已应用智能排序' : 'Smart Order Applied'}
                    </>
                  ) : (
                    <>
                      <Shuffle className="w-4 h-4" />
                      {lang === 'zh' ? '应用智能歌单' : 'Apply Smart Queue'}
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
