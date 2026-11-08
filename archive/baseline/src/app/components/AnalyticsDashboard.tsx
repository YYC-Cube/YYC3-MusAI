import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  BarChart3,
  TrendingUp,
  Heart,
  Play,
  MessageCircle,
  RefreshCw,
  Smile,
  Frown,
  Zap,
  Cloud,
  Sparkles,
  Activity,
} from 'lucide-react';
import { clsx } from 'clsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { apiFetch } from '../lib/supabase';
import { DEMO_PLAYLIST } from '../playlistData';
import { useI18n } from '../hooks/useI18n';

interface AnalyticsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AnalyticsData {
  totalPlays: number;
  totalLikes: number;
  totalComments: number;
  totalEngagement: number;
  songBreakdown: Array<{
    songId: string;
    plays: number;
    likes: number;
    comments: number;
  }>;
  hourlyPlays: Array<{ hour: string; count: number }>;
  emotionDistribution: Array<{ name: string; value: number }>;
}

const EMOTION_COLORS: Record<string, string> = {
  happy: '#FFD700',
  sad: '#6495ED',
  energetic: '#FF4500',
  calm: '#00CED1',
  neutral: '#9370DB',
};

const EMOTION_ICONS: Record<string, React.ElementType> = {
  happy: Smile,
  sad: Frown,
  energetic: Zap,
  calm: Cloud,
  neutral: Sparkles,
};

const CHART_COLORS = ['#667eea', '#764ba2', '#f093fb', '#00CED1', '#FFD700', '#FF4500'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0D1235]/95 backdrop-blur-xl border border-white/10 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-white/60 text-xs mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-medium" style={{ color: entry.color || '#fff' }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
};

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  isOpen,
  onClose,
}) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'songs' | 'emotions'>('overview');
  const { t } = useI18n();

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiFetch<AnalyticsData>('/analytics/overview');
      if (result) setData(result);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchAnalytics();
  }, [isOpen, fetchAnalytics]);

  const getSongName = (songId: string) => {
    const track = DEMO_PLAYLIST.find((t) => t.id === songId);
    return track?.title || songId;
  };

  const songChartData = data?.songBreakdown.map((s) => ({
    name: getSongName(s.songId).slice(0, 12),
    plays: s.plays,
    likes: s.likes,
    comments: s.comments,
  })) || [];

  const totalEmotions = data?.emotionDistribution.reduce((s, e) => s + e.value, 0) || 0;

  const tabs = [
    { id: 'overview' as const, label: t('analytics.overview'), icon: Activity },
    { id: 'songs' as const, label: t('analytics.songs'), icon: BarChart3 },
    { id: 'emotions' as const, label: t('analytics.emotions'), icon: Sparkles },
  ];

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
            className="fixed inset-x-0 bottom-0 z-[61] max-h-[88vh] bg-[#0D1235]/95 backdrop-blur-2xl border-t border-white/10 rounded-t-3xl flex flex-col shadow-2xl md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-2xl md:border md:max-h-[85vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 pb-3 border-b border-white/[0.06] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
                  <BarChart3 className="w-4.5 h-4.5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm leading-tight">{t('analytics.title')}</h3>
                  <p className="text-white/30 text-xs">{t('analytics.subtitle')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchAnalytics}
                  disabled={loading}
                  className={clsx(
                    'p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/[0.08] text-white/60 hover:text-white transition-all',
                    loading && 'animate-spin'
                  )}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Stat Cards */}
            {data && (
              <div className="grid grid-cols-4 gap-2 px-5 py-3 border-b border-white/[0.04] flex-shrink-0">
                <StatMiniCard icon={<Play className="w-3.5 h-3.5 text-blue-400" />} value={data.totalPlays} label={t('analytics.plays')} />
                <StatMiniCard icon={<Heart className="w-3.5 h-3.5 text-pink-400" />} value={data.totalLikes} label={t('analytics.likes')} />
                <StatMiniCard icon={<MessageCircle className="w-3.5 h-3.5 text-purple-400" />} value={data.totalComments} label={t('analytics.comments')} />
                <StatMiniCard icon={<TrendingUp className="w-3.5 h-3.5 text-green-400" />} value={data.totalEngagement} label={t('analytics.total')} />
              </div>
            )}

            {/* Tabs */}
            <div className="flex px-5 pt-3 gap-1 flex-shrink-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={clsx(
                      'flex-1 py-2 text-xs font-medium rounded-lg transition-colors relative flex items-center justify-center gap-1.5',
                      activeTab === tab.id
                        ? 'text-white'
                        : 'text-white/30 hover:text-white/50'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="analytics-tab"
                        className="absolute inset-0 bg-white/5 rounded-lg -z-10"
                        transition={{ duration: 0.2 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 pt-3" style={{ scrollbarWidth: 'none' }}>
              {loading && !data ? (
                <div className="flex justify-center py-16">
                  <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                </div>
              ) : !data ? (
                <div className="text-center py-16">
                  <BarChart3 className="w-10 h-10 text-white/10 mx-auto mb-3" />
                  <p className="text-white/30 text-sm">{t('analytics.noData')}</p>
                  <p className="text-white/15 text-xs mt-1">{t('analytics.startInteracting')}</p>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  {activeTab === 'overview' && (
                    <motion.div
                      key="overview"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-5"
                    >
                      {/* Hourly Plays Chart */}
                      <div>
                        <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
                          {t('analytics.playsLast24h')}
                        </h4>
                        <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] p-3">
                          <ResponsiveContainer width="100%" height={160}>
                            <AreaChart data={data.hourlyPlays}>
                              <defs>
                                <linearGradient id="playGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#667eea" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <XAxis
                                dataKey="hour"
                                tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }}
                                axisLine={false}
                                tickLine={false}
                                interval="preserveStartEnd"
                              />
                              <YAxis hide />
                              <Tooltip content={<CustomTooltip />} />
                              <Area
                                type="monotone"
                                dataKey="count"
                                name="Plays"
                                stroke="#667eea"
                                strokeWidth={2}
                                fill="url(#playGradient)"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Engagement Summary */}
                      <div>
                        <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
                          {t('analytics.engagement')}
                        </h4>
                        <div className="grid grid-cols-3 gap-3">
                          <EngagementCard
                            label={t('analytics.playRate')}
                            value={data.totalEngagement > 0 ? Math.round((data.totalPlays / data.totalEngagement) * 100) : 0}
                            color="blue"
                          />
                          <EngagementCard
                            label={t('analytics.likeRate')}
                            value={data.totalEngagement > 0 ? Math.round((data.totalLikes / data.totalEngagement) * 100) : 0}
                            color="pink"
                          />
                          <EngagementCard
                            label={t('analytics.commentRate')}
                            value={data.totalEngagement > 0 ? Math.round((data.totalComments / data.totalEngagement) * 100) : 0}
                            color="purple"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'songs' && (
                    <motion.div
                      key="songs"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-5"
                    >
                      <div>
                        <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
                          {t('analytics.songPerformance')}
                        </h4>
                        <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] p-3">
                          <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={songChartData} barGap={2}>
                              <XAxis
                                dataKey="name"
                                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis hide />
                              <Tooltip content={<CustomTooltip />} />
                              <Bar dataKey="plays" name="Plays" fill="#667eea" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="likes" name="Likes" fill="#F472B6" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="comments" name="Comments" fill="#9370DB" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Song Ranking List */}
                      <div>
                        <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
                          {t('analytics.ranking')}
                        </h4>
                        <div className="space-y-2">
                          {data.songBreakdown
                            .sort((a, b) => (b.plays + b.likes + b.comments) - (a.plays + a.likes + a.comments))
                            .map((song, index) => {
                              const total = song.plays + song.likes + song.comments;
                              const maxTotal = Math.max(...data.songBreakdown.map((s) => s.plays + s.likes + s.comments), 1);
                              return (
                                <div
                                  key={song.songId}
                                  className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors"
                                >
                                  <span className="w-6 text-center text-xs font-mono text-white/30">
                                    {index + 1}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white/80 font-medium truncate">
                                      {getSongName(song.songId)}
                                    </p>
                                    <div className="h-1 bg-white/[0.04] rounded-full mt-1.5 overflow-hidden">
                                      <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                                        style={{ width: `${(total / maxTotal) * 100}%` }}
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-white/30 flex-shrink-0">
                                    <span className="flex items-center gap-1">
                                      <Play className="w-3 h-3" />
                                      {song.plays}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Heart className="w-3 h-3" />
                                      {song.likes}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'emotions' && (
                    <motion.div
                      key="emotions"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-5"
                    >
                      <div>
                        <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
                          {t('analytics.emotionDistribution')}
                        </h4>
                        {totalEmotions > 0 ? (
                          <div className="flex flex-col md:flex-row items-center gap-4">
                            <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] p-4 flex-shrink-0">
                              <ResponsiveContainer width={180} height={180}>
                                <PieChart>
                                  <Pie
                                    data={data.emotionDistribution.filter((e) => e.value > 0)}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={45}
                                    outerRadius={75}
                                    paddingAngle={4}
                                    dataKey="value"
                                    stroke="none"
                                  >
                                    {data.emotionDistribution.filter((e) => e.value > 0).map((entry) => (
                                      <Cell
                                        key={entry.name}
                                        fill={EMOTION_COLORS[entry.name] || '#9370DB'}
                                      />
                                    ))}
                                  </Pie>
                                  <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>

                            <div className="flex-1 space-y-2 w-full">
                              {data.emotionDistribution.map((emo) => {
                                const Icon = EMOTION_ICONS[emo.name] || Sparkles;
                                const pct = totalEmotions > 0 ? Math.round((emo.value / totalEmotions) * 100) : 0;
                                return (
                                  <div key={emo.name} className="flex items-center gap-3">
                                    <Icon
                                      className="w-4 h-4 flex-shrink-0"
                                      style={{ color: EMOTION_COLORS[emo.name] }}
                                    />
                                    <div className="flex-1">
                                      <div className="flex justify-between mb-1">
                                        <span className="text-xs text-white/60 capitalize">{emo.name}</span>
                                        <span className="text-xs text-white/30 font-mono">{pct}%</span>
                                      </div>
                                      <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                                        <motion.div
                                          className="h-full rounded-full"
                                          style={{ backgroundColor: EMOTION_COLORS[emo.name] }}
                                          initial={{ width: 0 }}
                                          animate={{ width: `${pct}%` }}
                                          transition={{ duration: 0.8, ease: 'easeOut' }}
                                        />
                                      </div>
                                    </div>
                                    <span className="text-xs text-white/20 font-mono w-8 text-right">{emo.value}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-10 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                            <Sparkles className="w-8 h-8 text-white/10 mx-auto mb-2" />
                            <p className="text-sm text-white/20">{t('analytics.noEmotions')}</p>
                            <p className="text-xs text-white/10 mt-1">{t('analytics.annotateToSee')}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Sub-components
const StatMiniCard: React.FC<{ icon: React.ReactNode; value: number; label: string }> = ({
  icon,
  value,
  label,
}) => (
  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
    <div className="flex justify-center mb-1">{icon}</div>
    <p className="text-base font-bold text-white font-mono tabular-nums leading-tight">{value}</p>
    <p className="text-[10px] text-white/25 mt-0.5 leading-tight">{label}</p>
  </div>
);

const EngagementCard: React.FC<{ label: string; value: number; color: string }> = ({
  label,
  value,
  color,
}) => {
  const gradients: Record<string, string> = {
    blue: 'from-blue-500/10 to-cyan-500/10',
    pink: 'from-pink-500/10 to-red-500/10',
    purple: 'from-purple-500/10 to-indigo-500/10',
  };
  const textColors: Record<string, string> = {
    blue: 'text-blue-400',
    pink: 'text-pink-400',
    purple: 'text-purple-400',
  };

  return (
    <div className={clsx('p-3 rounded-xl border border-white/[0.06] bg-gradient-to-br', gradients[color])}>
      <p className={clsx('text-2xl font-bold font-mono tabular-nums', textColors[color])}>{value}%</p>
      <p className="text-[10px] text-white/30 mt-0.5">{label}</p>
    </div>
  );
};