import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, Music, Heart, TrendingUp, BarChart2 } from 'lucide-react';
import { clsx } from 'clsx';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import { apiFetch } from '../lib/supabase';

/**
 * §18.x — Listening Stats Dashboard
 *
 * Shows personal listening analytics:
 *   • Total listening time
 *   • Emotion distribution (pie chart)
 *   • Top tracks (bar chart)
 *   • Emotion timeline (area chart)
 *
 * Fetches from /listening-history backend endpoint.
 */

interface ListeningStatsProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  lang: 'zh' | 'en';
}

interface HistoryEntry {
  songId: string;
  songTitle: string;
  emotion: string;
  listenDuration: number;
  totalDuration: number;
  completionRate: number;
  skipped: boolean;
  timestamp?: number;
}

const EMOTION_COLORS: Record<string, string> = {
  happy: '#FFD700',
  sad: '#6495ED',
  energetic: '#FF4500',
  calm: '#00CED1',
  neutral: '#9370DB',
};

const EMOTION_LABELS: Record<string, { zh: string; en: string }> = {
  happy: { zh: '快乐', en: 'Happy' },
  sad: { zh: '伤感', en: 'Sad' },
  energetic: { zh: '活力', en: 'Energetic' },
  calm: { zh: '平静', en: 'Calm' },
  neutral: { zh: '中性', en: 'Neutral' },
};

export const ListeningStats: React.FC<ListeningStatsProps> = ({
  isOpen,
  onClose,
  userId,
  lang,
}) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const uid = userId || 'anon';
    apiFetch<{ history?: HistoryEntry[] }>(`/listening-stats/${uid}`)
      .then((data) => {
        if (data?.history) setHistory(data.history);
      })
      .catch((err) => console.warn('[ListeningStats] fetch error:', err))
      .finally(() => setLoading(false));
  }, [isOpen, userId]);

  // ---- Computed metrics ----
  const stats = useMemo(() => {
    if (history.length === 0)
      return {
        totalTime: 0,
        totalTracks: 0,
        avgCompletion: 0,
        emotionDist: [] as { name: string; value: number; color: string }[],
        topTracks: [] as { name: string; count: number; time: number }[],
        emotionTimeline: [] as { idx: number; happy: number; sad: number; energetic: number; calm: number; neutral: number }[],
      };

    const totalTime = history.reduce((s, h) => s + h.listenDuration, 0);
    const uniqueTracks = new Set(history.map((h) => h.songId)).size;
    const avgCompletion =
      history.reduce((s, h) => s + h.completionRate, 0) / history.length;

    // Emotion distribution
    const emoCounts: Record<string, number> = {};
    history.forEach((h) => {
      const e = h.emotion || 'neutral';
      emoCounts[e] = (emoCounts[e] || 0) + 1;
    });
    const emotionDist = Object.entries(emoCounts).map(([name, value]) => ({
      name: EMOTION_LABELS[name]?.[lang] || name,
      value,
      color: EMOTION_COLORS[name] || '#9370DB',
    }));

    // Top tracks by listen count
    const trackMap: Record<string, { count: number; time: number; title: string }> = {};
    history.forEach((h) => {
      if (!trackMap[h.songId]) trackMap[h.songId] = { count: 0, time: 0, title: h.songTitle };
      trackMap[h.songId].count++;
      trackMap[h.songId].time += h.listenDuration;
    });
    const topTracks = Object.values(trackMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
      .map((t) => ({ name: t.title.length > 12 ? t.title.slice(0, 12) + '…' : t.title, count: t.count, time: t.time }));

    // Emotion timeline (last 20 sessions grouped)
    const windowSize = Math.max(1, Math.floor(history.length / 10));
    const emotionTimeline: any[] = [];
    for (let i = 0; i < Math.min(history.length, 10 * windowSize); i += windowSize) {
      const window = history.slice(i, i + windowSize);
      const entry: any = { idx: Math.floor(i / windowSize) + 1 };
      ['happy', 'sad', 'energetic', 'calm', 'neutral'].forEach((e) => {
        entry[e] = window.filter((h) => h.emotion === e).length;
      });
      emotionTimeline.push(entry);
    }

    return { totalTime, totalTracks: uniqueTracks, avgCompletion, emotionDist, topTracks, emotionTimeline };
  }, [history, lang]);

  const formatTime = (secs: number) => {
    if (secs < 60) return `${secs}s`;
    if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
    return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
  };

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
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-[61] w-full md:w-[420px] bg-[var(--dm-bg,#0A0E2F)]/95 backdrop-blur-2xl border-l border-white/[0.08] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <BarChart2 className="w-4.5 h-4.5 text-indigo-400" />
                <h2 className="text-sm font-semibold text-white/80">
                  {lang === 'zh' ? '收听统计' : 'Listening Stats'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5" style={{ scrollbarWidth: 'none' }}>
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <motion.div
                    className="w-8 h-8 border-2 border-white/10 border-t-indigo-400 rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-60 text-center">
                  <Music className="w-10 h-10 text-white/10 mb-3" />
                  <p className="text-sm text-white/30">
                    {lang === 'zh' ? '暂无收听记录' : 'No listening data yet'}
                  </p>
                  <p className="text-xs text-white/15 mt-1">
                    {lang === 'zh' ? '播放音乐后将自动记录' : 'Start playing to collect data'}
                  </p>
                </div>
              ) : (
                <>
                  {/* ---- Summary Cards ---- */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
                      <Clock className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
                      <p className="text-base font-bold text-white/80 font-mono tabular-nums">
                        {formatTime(stats.totalTime)}
                      </p>
                      <p className="text-[9px] text-white/30 mt-0.5">
                        {lang === 'zh' ? '总时长' : 'Total'}
                      </p>
                    </div>
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
                      <Music className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                      <p className="text-base font-bold text-white/80 font-mono tabular-nums">
                        {stats.totalTracks}
                      </p>
                      <p className="text-[9px] text-white/30 mt-0.5">
                        {lang === 'zh' ? '曲目数' : 'Tracks'}
                      </p>
                    </div>
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
                      <Heart className="w-4 h-4 text-pink-400 mx-auto mb-1" />
                      <p className="text-base font-bold text-white/80 font-mono tabular-nums">
                        {Math.round(stats.avgCompletion * 100)}%
                      </p>
                      <p className="text-[9px] text-white/30 mt-0.5">
                        {lang === 'zh' ? '完听率' : 'Completion'}
                      </p>
                    </div>
                  </div>

                  {/* ---- Emotion Distribution ---- */}
                  {stats.emotionDist.length > 0 && (
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
                      <h3 className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-3">
                        {lang === 'zh' ? '情感分布' : 'Emotion Distribution'}
                      </h3>
                      <div className="h-[140px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={stats.emotionDist}
                              cx="50%"
                              cy="50%"
                              innerRadius={35}
                              outerRadius={55}
                              dataKey="value"
                              paddingAngle={3}
                              stroke="none"
                            >
                              {stats.emotionDist.map((d, i) => (
                                <Cell key={i} fill={d.color} fillOpacity={0.7} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                background: 'rgba(0,0,0,0.8)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                fontSize: '11px',
                                color: '#fff',
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      {/* Legend */}
                      <div className="flex flex-wrap justify-center gap-3 mt-2">
                        {stats.emotionDist.map((d, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ background: d.color }}
                            />
                            <span className="text-[10px] text-white/40">{d.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ---- Top Tracks ---- */}
                  {stats.topTracks.length > 0 && (
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
                      <h3 className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-3">
                        <TrendingUp className="w-3 h-3 inline mr-1" />
                        {lang === 'zh' ? '热门曲目' : 'Top Tracks'}
                      </h3>
                      <div className="h-[160px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={stats.topTracks} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                            <XAxis type="number" hide />
                            <YAxis
                              type="category"
                              dataKey="name"
                              width={90}
                              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              contentStyle={{
                                background: 'rgba(0,0,0,0.8)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                fontSize: '11px',
                                color: '#fff',
                              }}
                              formatter={(value: number) => [`${value}x`, lang === 'zh' ? '播放次数' : 'Plays']}
                            />
                            <Bar
                              dataKey="count"
                              fill="url(#barGradient)"
                              radius={[0, 4, 4, 0]}
                              barSize={14}
                            />
                            <defs>
                              <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="var(--dm-accent-from, #8B5CF6)" stopOpacity={0.7} />
                                <stop offset="100%" stopColor="var(--dm-accent-to, #EC4899)" stopOpacity={0.7} />
                              </linearGradient>
                            </defs>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* ---- Emotion Timeline ---- */}
                  {stats.emotionTimeline.length > 1 && (
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
                      <h3 className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-3">
                        {lang === 'zh' ? '情感曲线' : 'Emotion Timeline'}
                      </h3>
                      <div className="h-[120px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={stats.emotionTimeline} margin={{ left: 0, right: 0, top: 5, bottom: 0 }}>
                            <XAxis dataKey="idx" hide />
                            <YAxis hide />
                            <Tooltip
                              contentStyle={{
                                background: 'rgba(0,0,0,0.8)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                fontSize: '11px',
                                color: '#fff',
                              }}
                            />
                            {Object.entries(EMOTION_COLORS).map(([key, color]) => (
                              <Area
                                key={key}
                                type="monotone"
                                dataKey={key}
                                stackId="1"
                                stroke={color}
                                fill={color}
                                fillOpacity={0.3}
                                strokeWidth={1.5}
                              />
                            ))}
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-2.5 border-t border-white/[0.04] flex-shrink-0">
              <p className="text-[9px] text-white/15 text-center">
                §18.x · {lang === 'zh' ? '数据基于收听历史自动生成' : 'Auto-generated from listening history'}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
