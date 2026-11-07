import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Sparkles, Play, Star, RefreshCw, Loader2,
  TrendingUp, Zap, Heart, Smile, Frown, Cloud, Minus,
  Music, Brain, User, ChevronRight, Award,
} from 'lucide-react';
import { clsx } from 'clsx';
import { apiFetch } from '../lib/supabase';
import { useI18n } from '../hooks/useI18n';
import { DEMO_PLAYLIST, type Track, dMusicLogo } from '../playlistData';

// ==========================================
// Recommendations Panel
// ==========================================
// Displays personalized song recommendations based on
// the user's listening history and emotion preferences,
// powered by the backend /recommendations/:userId endpoint.

interface RecommendationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  playlist: Track[];
  currentTrackIndex: number;
  isPlaying: boolean;
  onSelectTrack: (index: number) => void;
  onHaptic?: () => void;
}

interface Recommendation {
  songId: string;
  score: number;
  reason: string;
  reasonZh: string;
  isNew: boolean;
}

interface RecommendationData {
  userId: string;
  recommendations: Recommendation[];
  dominantMood: string;
  totalListeningEvents: number;
}

interface AIAnalysis {
  insights: string;
  suggestedMoods: string[];
  personalityTag: string;
  personalityTagEn: string;
  engagementLevel: 'casual' | 'regular' | 'enthusiast' | 'power';
  recommendations: Array<{ mood: string; reason: string; reasonZh: string; weight: number }>;
  provider: string;
  cached: boolean;
}

const MOOD_CONFIG: Record<string, {
  icon: React.ElementType;
  color: string;
  gradient: string;
  labelZh: string;
  labelEn: string;
}> = {
  happy:     { icon: Smile,  color: 'text-yellow-400', gradient: 'from-yellow-500/20 to-orange-500/20', labelZh: '欢快', labelEn: 'Happy' },
  sad:       { icon: Frown,  color: 'text-blue-400',   gradient: 'from-blue-500/20 to-indigo-500/20',   labelZh: '忧伤', labelEn: 'Melancholic' },
  energetic: { icon: Zap,    color: 'text-red-400',    gradient: 'from-red-500/20 to-orange-500/20',    labelZh: '活力', labelEn: 'Energetic' },
  calm:      { icon: Cloud,  color: 'text-cyan-400',   gradient: 'from-cyan-500/20 to-teal-500/20',     labelZh: '宁静', labelEn: 'Calm' },
  neutral:   { icon: Minus,  color: 'text-white/40',   gradient: 'from-white/5 to-white/5',             labelZh: '平衡', labelEn: 'Balanced' },
};

export const RecommendationsPanel: React.FC<RecommendationsPanelProps> = ({
  isOpen,
  onClose,
  userId,
  playlist,
  currentTrackIndex,
  isPlaying,
  onSelectTrack,
  onHaptic,
}) => {
  const { t, lang } = useI18n();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RecommendationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiInsights, setShowAiInsights] = useState(false);

  const fetchRecommendations = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<RecommendationData>(`/recommendations/${userId}`);
      if (result) {
        setData(result);
      } else {
        setError(lang === 'zh' ? '获取推荐失败' : 'Failed to fetch recommendations');
      }
    } catch (err) {
      console.error('Recommendations fetch error:', err);
      setError(lang === 'zh' ? '网络错误' : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [userId, lang]);

  const fetchAiAnalysis = useCallback(async () => {
    if (!userId) return;
    setAiLoading(true);
    try {
      const result = await apiFetch<{ userId: string; analysis: AIAnalysis }>(`/recommendations/${userId}/ai-analysis`);
      if (result?.analysis) {
        setAiAnalysis(result.analysis);
      }
    } catch (err) {
      console.error('AI analysis fetch error:', err);
    } finally {
      setAiLoading(false);
    }
  }, [userId]);

  // Fetch when panel opens
  useEffect(() => {
    if (isOpen && userId) {
      fetchRecommendations();
      fetchAiAnalysis();
    }
  }, [isOpen, userId, fetchRecommendations, fetchAiAnalysis]);

  const handleSelectSong = useCallback((songId: string) => {
    const idx = playlist.findIndex(t => t.id === songId);
    if (idx >= 0) {
      onHaptic?.();
      onSelectTrack(idx);
    }
  }, [playlist, onSelectTrack, onHaptic]);

  const findTrack = (songId: string) => playlist.find(t => t.id === songId);

  const moodConfig = MOOD_CONFIG[data?.dominantMood || 'neutral'] || MOOD_CONFIG.neutral;
  const MoodIcon = moodConfig.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-[61] w-full max-w-sm bg-[#0D1235]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 pb-3 border-b border-white/[0.06] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center">
                  <Sparkles className="w-4.5 h-4.5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm leading-tight">
                    {lang === 'zh' ? '为你推荐' : 'For You'}
                  </h3>
                  <p className="text-white/30 text-xs">
                    {lang === 'zh' ? '基于你的音乐偏好' : 'Based on your listening history'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { onHaptic?.(); fetchRecommendations(); }}
                  disabled={loading}
                  className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors disabled:opacity-30"
                  title={lang === 'zh' ? '刷新推荐' : 'Refresh'}
                >
                  <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              {/* Not logged in */}
              {!userId && (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-white/20" />
                  </div>
                  <p className="text-white/40 text-sm">
                    {lang === 'zh' ? '登录后获取个性化推荐' : 'Sign in to get personalized recommendations'}
                  </p>
                </div>
              )}

              {/* Loading state */}
              {userId && loading && !data && (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                  <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                  <p className="text-white/30 text-xs">
                    {lang === 'zh' ? '分析你的音乐偏好...' : 'Analyzing your preferences...'}
                  </p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-5 text-center">
                  <p className="text-red-400/60 text-sm">{error}</p>
                  <button
                    onClick={fetchRecommendations}
                    className="mt-3 text-xs text-white/40 hover:text-white/60 underline transition-colors"
                  >
                    {lang === 'zh' ? '重试' : 'Retry'}
                  </button>
                </div>
              )}

              {/* Results */}
              {data && (
                <div className="p-5 space-y-5">
                  {/* Mood Profile Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={clsx(
                      'rounded-xl border border-white/[0.08] p-4 bg-gradient-to-br',
                      moodConfig.gradient
                    )}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={clsx('w-10 h-10 rounded-full bg-black/20 flex items-center justify-center')}>
                        <MoodIcon className={clsx('w-5 h-5', moodConfig.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/50 text-[10px] uppercase tracking-wider font-medium">
                          {lang === 'zh' ? '你的音乐画像' : 'Your Music Profile'}
                        </p>
                        <p className={clsx('text-sm font-semibold', moodConfig.color)}>
                          {lang === 'zh' ? moodConfig.labelZh : moodConfig.labelEn}
                          <span className="text-white/30 font-normal ml-1.5 text-xs">
                            {lang === 'zh' ? '偏好' : 'mood'}
                          </span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white/30 text-[10px]">
                          {lang === 'zh' ? '收听事件' : 'Events'}
                        </p>
                        <p className="text-white/60 text-sm font-mono tabular-nums">
                          {data.totalListeningEvents}
                        </p>
                      </div>
                    </div>

                    {/* Mini sparkline placeholder */}
                    <div className="flex items-end gap-0.5 h-6">
                      {data.recommendations.map((rec, i) => (
                        <motion.div
                          key={rec.songId}
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(20, rec.score * 100)}%` }}
                          transition={{ delay: i * 0.1, duration: 0.4, ease: 'easeOut' }}
                          className={clsx(
                            'flex-1 rounded-t-sm',
                            i === 0 ? 'bg-purple-400/60' : i === 1 ? 'bg-indigo-400/50' : 'bg-white/10'
                          )}
                        />
                      ))}
                    </div>
                  </motion.div>

                  {/* §5.1 AI Insights Section */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <button
                      onClick={() => { onHaptic?.(); setShowAiInsights(prev => !prev); }}
                      className="w-full flex items-center justify-between p-3.5 rounded-xl border border-purple-500/10 bg-gradient-to-r from-purple-500/[0.06] to-indigo-500/[0.06] hover:from-purple-500/[0.1] hover:to-indigo-500/[0.1] transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center">
                          <Brain className="w-3.5 h-3.5 text-purple-400" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-semibold text-purple-300/90">
                            {lang === 'zh' ? 'AI 偏好洞察' : 'AI Taste Insights'}
                          </p>
                          <p className="text-[10px] text-white/25">
                            {aiLoading
                              ? (lang === 'zh' ? 'GPT 分析中...' : 'Analyzing with GPT...')
                              : aiAnalysis?.provider === 'openai'
                                ? 'Powered by GPT-4o-mini'
                                : lang === 'zh' ? '智能偏好分析' : 'Smart preference analysis'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={clsx(
                        'w-4 h-4 text-white/20 transition-transform duration-200',
                        showAiInsights && 'rotate-90'
                      )} />
                    </button>

                    <AnimatePresence>
                      {showAiInsights && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="pt-3 space-y-3">
                            {aiLoading && !aiAnalysis && (
                              <div className="flex items-center justify-center py-6 gap-2">
                                <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                                <span className="text-xs text-white/30">
                                  {lang === 'zh' ? 'AI 正在分析你的音乐基因...' : 'AI analyzing your music DNA...'}
                                </span>
                              </div>
                            )}

                            {aiAnalysis && (
                              <>
                                {/* Personality Badge */}
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/10">
                                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-400/20 flex items-center justify-center flex-shrink-0">
                                    <Award className="w-5 h-5 text-purple-300" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium">
                                      {lang === 'zh' ? '音乐人格标签' : 'Music Personality'}
                                    </p>
                                    <p className="text-sm font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent truncate">
                                      {lang === 'zh' ? aiAnalysis.personalityTag : aiAnalysis.personalityTagEn}
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                                    <span className={clsx(
                                      'text-[9px] px-2 py-0.5 rounded-full font-medium',
                                      aiAnalysis.engagementLevel === 'power' ? 'bg-yellow-500/15 text-yellow-400' :
                                      aiAnalysis.engagementLevel === 'enthusiast' ? 'bg-purple-500/15 text-purple-400' :
                                      aiAnalysis.engagementLevel === 'regular' ? 'bg-blue-500/15 text-blue-400' :
                                      'bg-white/5 text-white/40'
                                    )}>
                                      {aiAnalysis.engagementLevel === 'power'
                                        ? (lang === 'zh' ? '硬核' : 'Power')
                                        : aiAnalysis.engagementLevel === 'enthusiast'
                                        ? (lang === 'zh' ? '狂热' : 'Enthusiast')
                                        : aiAnalysis.engagementLevel === 'regular'
                                        ? (lang === 'zh' ? '常驻' : 'Regular')
                                        : (lang === 'zh' ? '休闲' : 'Casual')}
                                    </span>
                                    {aiAnalysis.cached && (
                                      <span className="text-[8px] text-white/15">cached</span>
                                    )}
                                  </div>
                                </div>

                                {/* AI Insights Text */}
                                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                                  <div className="flex items-start gap-2">
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-400/50 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-white/50 leading-relaxed">
                                      {aiAnalysis.insights}
                                    </p>
                                  </div>
                                </div>

                                {/* Suggested Moods */}
                                {aiAnalysis.suggestedMoods.length > 0 && (
                                  <div>
                                    <p className="text-[10px] text-white/25 uppercase tracking-wider font-medium mb-2 px-1">
                                      {lang === 'zh' ? 'AI 推荐情绪' : 'AI Suggested Moods'}
                                    </p>
                                    <div className="flex gap-2">
                                      {aiAnalysis.suggestedMoods.map((mood, i) => {
                                        const mc = MOOD_CONFIG[mood] || MOOD_CONFIG.neutral;
                                        const MIcon = mc.icon;
                                        return (
                                          <div
                                            key={mood}
                                            className={clsx(
                                              'flex-1 flex items-center gap-2 p-2.5 rounded-lg border transition-all',
                                              i === 0
                                                ? 'bg-gradient-to-br border-white/[0.08] ' + mc.gradient
                                                : 'bg-white/[0.02] border-white/[0.04]'
                                            )}
                                          >
                                            <MIcon className={clsx('w-3.5 h-3.5 flex-shrink-0', mc.color)} />
                                            <div className="min-w-0">
                                              <p className={clsx('text-[10px] font-semibold truncate', i === 0 ? mc.color : 'text-white/40')}>
                                                {lang === 'zh' ? mc.labelZh : mc.labelEn}
                                              </p>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* AI Mood Recommendations */}
                                {aiAnalysis.recommendations.length > 0 && (
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] text-white/25 uppercase tracking-wider font-medium px-1">
                                      {lang === 'zh' ? 'AI 推荐理由' : 'AI Reasoning'}
                                    </p>
                                    {aiAnalysis.recommendations.slice(0, 3).map((rec, i) => {
                                      const mc = MOOD_CONFIG[rec.mood] || MOOD_CONFIG.neutral;
                                      return (
                                        <div
                                          key={`${rec.mood}-${i}`}
                                          className="flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.015] border border-white/[0.03]"
                                        >
                                          <div className="w-1 h-6 rounded-full" style={{
                                            background: `linear-gradient(to bottom, ${
                                              rec.mood === 'happy' ? '#facc15' :
                                              rec.mood === 'sad' ? '#60a5fa' :
                                              rec.mood === 'energetic' ? '#f87171' :
                                              rec.mood === 'calm' ? '#22d3ee' :
                                              rec.mood === 'love' ? '#f472b6' : '#6366f1'
                                            }80, transparent)`
                                          }} />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-[10px] text-white/40 leading-relaxed truncate">
                                              {lang === 'zh' ? rec.reasonZh : rec.reason}
                                            </p>
                                          </div>
                                          <span className="text-[9px] text-white/15 font-mono tabular-nums flex-shrink-0">
                                            {Math.round(rec.weight * 100)}%
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Provider badge */}
                                <div className="flex items-center justify-center gap-1.5 pt-1">
                                  <div className={clsx(
                                    'w-1.5 h-1.5 rounded-full',
                                    aiAnalysis.provider === 'openai' ? 'bg-emerald-400' : 'bg-yellow-400/60'
                                  )} />
                                  <span className="text-[9px] text-white/15">
                                    {aiAnalysis.provider === 'openai' ? 'GPT-4o-mini' : 'Template Engine'}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* Recommendations List */}
                  <div>
                    <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-3">
                      {lang === 'zh' ? '推荐曲目' : 'Recommended Tracks'}
                    </p>

                    <div className="space-y-2">
                      {data.recommendations.map((rec, index) => {
                        const track = findTrack(rec.songId);
                        if (!track) return null;

                        const trackIdx = playlist.findIndex(t => t.id === rec.songId);
                        const isCurrent = trackIdx === currentTrackIndex;
                        const isCurrentPlaying = isCurrent && isPlaying;

                        return (
                          <motion.button
                            key={rec.songId}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.08 }}
                            onClick={() => handleSelectSong(rec.songId)}
                            className={clsx(
                              'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left group',
                              isCurrent
                                ? 'bg-purple-500/10 border-purple-500/20'
                                : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.1]'
                            )}
                          >
                            {/* Rank */}
                            <div className={clsx(
                              'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold',
                              index === 0 ? 'bg-gradient-to-br from-yellow-400/20 to-orange-500/20 text-yellow-400' :
                              index === 1 ? 'bg-gradient-to-br from-gray-300/20 to-gray-400/20 text-gray-300' :
                              index === 2 ? 'bg-gradient-to-br from-orange-600/20 to-orange-700/20 text-orange-400' :
                              'bg-white/5 text-white/20'
                            )}>
                              {index + 1}
                            </div>

                            {/* Album Art */}
                            <div className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0">
                              <img src={track.albumArt} alt="" className="w-full h-full object-cover" />
                              {isCurrentPlaying && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                  <div className="flex items-end gap-[2px] h-3">
                                    {[0, 1, 2].map(i => (
                                      <motion.div
                                        key={i}
                                        className="w-[2px] rounded-full bg-purple-400"
                                        animate={{ height: ['3px', '10px', '5px'] }}
                                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                              {!isCurrentPlaying && (
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Play className="w-4 h-4 text-white fill-white" />
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className={clsx(
                                'text-sm font-medium truncate leading-tight',
                                isCurrent ? 'text-purple-300' : 'text-white/80'
                              )}>
                                {track.title}
                              </p>
                              <p className="text-xs text-white/30 truncate">{track.artist}</p>
                              {/* Reason tag */}
                              <div className="flex items-center gap-1 mt-1">
                                <TrendingUp className="w-3 h-3 text-indigo-400/50 flex-shrink-0" />
                                <p className="text-[10px] text-indigo-300/50 truncate">
                                  {lang === 'zh' ? rec.reasonZh : rec.reason}
                                </p>
                              </div>
                            </div>

                            {/* Score */}
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-yellow-400/40" />
                                <span className="text-xs text-white/30 font-mono tabular-nums">
                                  {(rec.score * 100).toFixed(0)}
                                </span>
                              </div>
                              {rec.isNew && (
                                <span className="text-[9px] text-emerald-400/60 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                                  {lang === 'zh' ? '新' : 'NEW'}
                                </span>
                              )}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Algorithm Info */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4"
                  >
                    <div className="flex items-start gap-2.5">
                      <Music className="w-4 h-4 text-indigo-400/40 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-white/25 leading-relaxed">
                          {lang === 'zh'
                            ? '推荐算法综合考虑你的情感偏好（40%）、社区热度（30%）、互动率（20%）和新鲜度（10%），持续收听以获得更精准的推荐。'
                            : 'Recommendations combine your emotion preferences (40%), popularity (30%), engagement (20%), and novelty (10%). Keep listening for better results.'}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};