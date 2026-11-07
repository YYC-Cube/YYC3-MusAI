import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, Zap, Sparkles, TrendingUp, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell,
} from 'recharts';
import { apiFetch } from '../lib/supabase';

/**
 * §21.x — M❤️值 Dynamic Growth System
 *
 * Three-dimensional M❤️ score visualization:
 *   1. Emotion Intensity (情感强度) — weighted emotion history
 *   2. Resonance Value (共鸣值) — social engagement depth
 *   3. Rarity (稀缺度) — achievement uniqueness
 *
 * Features:
 *   - Animated score counter with glow
 *   - Radar chart for 3D breakdown
 *   - Emotion distribution pie chart
 *   - Score trend area chart
 *   - Tier badges (铜/银/金/钻)
 */

interface MHeartData {
  score: number;
  emotionIntensity: number;
  resonance: number;
  rarity: number;
  emotionBreakdown: Record<string, number>;
  updatedAt: number;
  // §23.x — Listening stats linkage
  listeningMinutes?: number;
  totalSessions?: number;
}

interface TrendPoint {
  score: number;
  timestamp: number;
}

interface MHeartSystemProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  lang: 'zh' | 'en';
}

// Tier definitions
const TIERS = [
  { min: 0, max: 199, name: { zh: '新星', en: 'Nova' }, icon: '✨', color: '#94A3B8', glow: 'rgba(148,163,184,0.3)' },
  { min: 200, max: 499, name: { zh: '铜心', en: 'Bronze' }, icon: '🥉', color: '#CD7F32', glow: 'rgba(205,127,50,0.3)' },
  { min: 500, max: 799, name: { zh: '银心', en: 'Silver' }, icon: '🥈', color: '#C0C0C0', glow: 'rgba(192,192,192,0.3)' },
  { min: 800, max: 999, name: { zh: '金心', en: 'Gold' }, icon: '🥇', color: '#FFD700', glow: 'rgba(255,215,0,0.3)' },
  { min: 1000, max: Infinity, name: { zh: '钻心', en: 'Diamond' }, icon: '💎', color: '#B9F2FF', glow: 'rgba(185,242,255,0.4)' },
];

const EMOTION_COLORS: Record<string, string> = {
  happy: '#FFD700',
  energetic: '#FF4500',
  calm: '#00CED1',
  sad: '#6495ED',
  neutral: '#94A3B8',
};

const EMOTION_LABELS: Record<string, { zh: string; en: string }> = {
  happy: { zh: '欢快', en: 'Happy' },
  energetic: { zh: '激昂', en: 'Energetic' },
  calm: { zh: '宁静', en: 'Calm' },
  sad: { zh: '忧郁', en: 'Sad' },
  neutral: { zh: '中性', en: 'Neutral' },
};

export const MHeartSystem: React.FC<MHeartSystemProps> = ({
  isOpen,
  onClose,
  userId,
  lang,
}) => {
  const [mheart, setMheart] = useState<MHeartData | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);

  const t = lang === 'zh'
    ? {
        title: 'M❤️值 成长体系',
        subtitle: '情感强度 · 共鸣值 · 稀缺度',
        score: 'M❤️值',
        tier: '段位',
        emotionIntensity: '情感强度',
        resonance: '共鸣值',
        rarity: '稀缺度',
        emotionDist: '情感分布',
        trendTitle: '成长趋势',
        noData: '开始聆听音乐，积累你的 M❤️值',
        loginHint: '登录后查看 M❤️值',
        dimensions: '三维指标',
        formula: '计算公式: 情感×45% + 共鸣×30% + 稀缺×25%',
      }
    : {
        title: 'M❤️ Growth System',
        subtitle: 'Emotion · Resonance · Rarity',
        score: 'M❤️ Score',
        tier: 'Tier',
        emotionIntensity: 'Emotion',
        resonance: 'Resonance',
        rarity: 'Rarity',
        emotionDist: 'Emotion Distribution',
        trendTitle: 'Growth Trend',
        noData: 'Start listening to build your M❤️ value',
        loginHint: 'Login to view M❤️ value',
        dimensions: 'Dimensions',
        formula: 'Formula: Emotion×45% + Resonance×30% + Rarity×25%',
      };

  const fetchMHeart = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await apiFetch<{ mheart: MHeartData; trend: TrendPoint[] }>(
        `/mheart/${userId}`
      );
      if (data?.mheart) {
        setMheart(data.mheart);
        setTrend(data.trend || []);
      }
    } catch (err) {
      console.error('[MHeart] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen && userId) fetchMHeart();
  }, [isOpen, userId, fetchMHeart]);

  // Animated score counter
  useEffect(() => {
    if (!mheart) return;
    const target = mheart.score;
    const start = animatedScore;
    const duration = 1500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setAnimatedScore(Math.round(start + (target - start) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [mheart?.score]);

  const currentTier = TIERS.find(
    (tier) => animatedScore >= tier.min && animatedScore <= tier.max
  ) || TIERS[0];

  const nextTier = TIERS.find((tier) => tier.min > animatedScore);
  const progressToNext = nextTier
    ? ((animatedScore - currentTier.min) / (nextTier.min - currentTier.min)) * 100
    : 100;

  // Radar chart data
  const radarData = mheart
    ? [
        { dim: t.emotionIntensity, value: mheart.emotionIntensity, fullMark: 10 },
        { dim: t.resonance, value: mheart.resonance, fullMark: 10 },
        { dim: t.rarity, value: mheart.rarity, fullMark: 10 },
      ]
    : [];

  // Emotion pie data
  const emotionPieData = mheart
    ? Object.entries(mheart.emotionBreakdown).map(([emotion, count]) => ({
        name: EMOTION_LABELS[emotion]?.[lang] || emotion,
        value: count,
        color: EMOTION_COLORS[emotion] || '#94A3B8',
      }))
    : [];

  // Trend chart data
  const trendChartData = trend.map((p, i) => ({
    index: i + 1,
    score: p.score,
    time: new Date(p.timestamp).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }));

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="relative w-full max-w-xl max-h-[90vh] bg-[var(--dm-bg-panel,#0D1235)] border border-white/10 rounded-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <motion.div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, #EC4899, #8B5CF6)`,
                  boxShadow: `0 0 20px ${currentTier.glow}`,
                }}
                animate={{ boxShadow: [`0 0 15px ${currentTier.glow}`, `0 0 25px ${currentTier.glow}`, `0 0 15px ${currentTier.glow}`] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Heart className="w-5 h-5 text-white" fill="white" />
              </motion.div>
              <div>
                <h2 className="text-sm font-bold text-white/90">{t.title}</h2>
                <p className="text-[10px] text-white/40">{t.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchMHeart}
                className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors"
              >
                <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-64px)] p-4 space-y-5">
            {!userId ? (
              <div className="text-center py-12 text-white/30 text-sm">
                <Heart className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>{t.loginHint}</p>
              </div>
            ) : !mheart && !loading ? (
              <div className="text-center py-12 text-white/30 text-sm">
                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>{t.noData}</p>
              </div>
            ) : (
              <>
                {/* Score Hero Section */}
                <div className="text-center space-y-3">
                  {/* Big Score */}
                  <motion.div
                    className="relative inline-block"
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <div
                      className="text-5xl font-black tabular-nums"
                      style={{
                        color: currentTier.color,
                        textShadow: `0 0 30px ${currentTier.glow}`,
                      }}
                    >
                      {animatedScore}
                    </div>
                    <div className="text-[10px] text-white/40 mt-1">{t.score}</div>
                  </motion.div>

                  {/* Tier Badge */}
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg">{currentTier.icon}</span>
                    <span
                      className="text-sm font-bold"
                      style={{ color: currentTier.color }}
                    >
                      {currentTier.name[lang]}
                    </span>
                  </div>

                  {/* Progress to next tier */}
                  {nextTier && (
                    <div className="max-w-xs mx-auto">
                      <div className="flex items-center justify-between text-[9px] text-white/30 mb-1">
                        <span>{currentTier.name[lang]}</span>
                        <span>{nextTier.name[lang]}</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            backgroundImage: `linear-gradient(to right, ${currentTier.color}, ${nextTier.color})`,
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${progressToNext}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                        />
                      </div>
                      <p className="text-[9px] text-white/20 mt-1">
                        {nextTier.min - animatedScore} {lang === 'zh' ? '点到下一段位' : 'points to next tier'}
                      </p>
                    </div>
                  )}

                  {/* §23.x — Listening stats linkage summary */}
                  {mheart && (mheart.listeningMinutes || mheart.totalSessions) ? (
                    <div className="flex items-center justify-center gap-4 text-[9px] text-white/25 mt-2">
                      {mheart.listeningMinutes ? (
                        <span>{mheart.listeningMinutes} {lang === 'zh' ? '分钟收听' : 'min listened'}</span>
                      ) : null}
                      {mheart.totalSessions ? (
                        <span>{mheart.totalSessions} {lang === 'zh' ? '次会话' : 'sessions'}</span>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {/* Three Dimension Cards */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      label: t.emotionIntensity,
                      value: mheart?.emotionIntensity || 0,
                      icon: <Zap className="w-3.5 h-3.5" />,
                      color: '#FF6B6B',
                      weight: '45%',
                    },
                    {
                      label: t.resonance,
                      value: mheart?.resonance || 0,
                      icon: <Heart className="w-3.5 h-3.5" />,
                      color: '#4ECDC4',
                      weight: '30%',
                    },
                    {
                      label: t.rarity,
                      value: mheart?.rarity || 0,
                      icon: <Sparkles className="w-3.5 h-3.5" />,
                      color: '#DDA0DD',
                      weight: '25%',
                    },
                  ].map((dim) => (
                    <motion.div
                      key={dim.label}
                      className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center"
                      whileHover={{ borderColor: 'rgba(255,255,255,0.15)' }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg mx-auto mb-2 flex items-center justify-center"
                        style={{ backgroundColor: `${dim.color}20`, color: dim.color }}
                      >
                        {dim.icon}
                      </div>
                      <div className="text-lg font-bold text-white/80">{dim.value.toFixed(1)}</div>
                      <div className="text-[9px] text-white/40">{dim.label}</div>
                      <div className="text-[8px] text-white/20 mt-0.5">{dim.weight}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Radar Chart */}
                {radarData.length > 0 && (
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
                    <h3 className="text-[11px] font-medium text-white/50 mb-2">{t.dimensions}</h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="rgba(255,255,255,0.08)" />
                        <PolarAngleAxis
                          dataKey="dim"
                          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                        />
                        <PolarRadiusAxis
                          domain={[0, 10]}
                          tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 8 }}
                          axisLine={false}
                        />
                        <Radar
                          dataKey="value"
                          stroke="#EC4899"
                          fill="#EC4899"
                          fillOpacity={0.2}
                          strokeWidth={2}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                    <p className="text-[8px] text-white/20 text-center mt-1">{t.formula}</p>
                  </div>
                )}

                {/* Emotion Distribution + Trend in 2-col */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Emotion Pie */}
                  {emotionPieData.length > 0 && (
                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
                      <h3 className="text-[11px] font-medium text-white/50 mb-2">
                        {t.emotionDist}
                      </h3>
                      <ResponsiveContainer width="100%" height={140}>
                        <PieChart>
                          <Pie
                            data={emotionPieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={55}
                            paddingAngle={3}
                          >
                            {emotionPieData.map((entry, idx) => (
                              <Cell key={idx} fill={entry.color} opacity={0.8} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(10,14,47,0.9)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              fontSize: 10,
                              color: 'white',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Legend */}
                      <div className="flex flex-wrap gap-2 justify-center mt-1">
                        {emotionPieData.map((e) => (
                          <span key={e.name} className="flex items-center gap-1 text-[9px] text-white/40">
                            <span
                              className="w-2 h-2 rounded-full inline-block"
                              style={{ backgroundColor: e.color }}
                            />
                            {e.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trend Chart */}
                  {trendChartData.length > 1 && (
                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
                      <h3 className="text-[11px] font-medium text-white/50 mb-2 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {t.trendTitle}
                      </h3>
                      <ResponsiveContainer width="100%" height={140}>
                        <AreaChart data={trendChartData}>
                          <defs>
                            <linearGradient id="mheartGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#EC4899" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#EC4899" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis
                            dataKey="index"
                            tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }}
                            axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                          />
                          <YAxis
                            tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }}
                            axisLine={false}
                            width={30}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(10,14,47,0.9)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              fontSize: 10,
                              color: 'white',
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="score"
                            stroke="#EC4899"
                            fill="url(#mheartGrad)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
