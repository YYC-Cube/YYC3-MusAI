"use client";

/**
 * YYC³ music-community — VisxChartsDashboard 运营数据看板面板（SCE-005）
 *
 * 整合 VisxCharts 四种图表（Bar/Line/Pie/Area）作为运营数据看板面板，
 * 与 AnalyticsDashboard（recharts 实现）互补，提供 Visx 原语版本供场景选配。
 * 通过 /api/analytics/* 接口获取真实数据，失败时回退到 DEMO 模拟数据。
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, BarChart3, LineChart, PieChart, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@yyc3/music-ui';
import {
  VisxBarChart,
  VisxLineChart,
  VisxPieChart,
  VisxAreaChart,
} from './VisxCharts';

interface AnalyticsMetric {
  totalPlays: number;
  totalLikes: number;
  totalComments: number;
  activeUsers: number;
}

interface TrendPoint { date: string; value: number; }
interface SongPoint { name: string; value: number; }
interface EmotionPoint { name: string; value: number; }

interface VisxChartsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEMO_SONG_DATA: SongPoint[] = [
  { name: 'Cosmic Dreams', value: 1240 },
  { name: 'Aurora Rising', value: 980 },
  { name: 'Neon Horizon', value: 860 },
  { name: 'Ocean Lullaby', value: 720 },
  { name: 'Stellar Drift', value: 610 },
  { name: 'Forest Whispers', value: 480 },
  { name: 'Midnight Echo', value: 390 },
  { name: 'Golden Hour', value: 310 },
];

const DEMO_TREND_DATA: TrendPoint[] = [
  { date: '2026-11-01', value: 450 },
  { date: '2026-11-02', value: 520 },
  { date: '2026-11-03', value: 610 },
  { date: '2026-11-04', value: 580 },
  { date: '2026-11-05', value: 740 },
  { date: '2026-11-06', value: 890 },
  { date: '2026-11-07', value: 1020 },
];

const DEMO_EMOTION_DATA: EmotionPoint[] = [
  { name: 'happy', value: 35 },
  { name: 'energetic', value: 25 },
  { name: 'calm', value: 20 },
  { name: 'sad', value: 15 },
  { name: 'neutral', value: 5 },
];

const DEMO_GROWTH_DATA: TrendPoint[] = [
  { date: '2026-10-01', value: 120 },
  { date: '2026-10-08', value: 180 },
  { date: '2026-10-15', value: 240 },
  { date: '2026-10-22', value: 310 },
  { date: '2026-10-29', value: 390 },
  { date: '2026-11-05', value: 470 },
  { date: '2026-11-12', value: 560 },
];

const DEMO_METRICS: AnalyticsMetric = {
  totalPlays: 12400,
  totalLikes: 3840,
  totalComments: 1260,
  activeUsers: 890,
};

export const VisxChartsDashboard: React.FC<VisxChartsDashboardProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'songs' | 'trend' | 'emotion' | 'growth'>('songs');
  const [metrics, setMetrics] = useState<AnalyticsMetric>(DEMO_METRICS);
  const [songData, setSongData] = useState<SongPoint[]>(DEMO_SONG_DATA);
  const [trendData, setTrendData] = useState<TrendPoint[]>(DEMO_TREND_DATA);
  const [emotionData, setEmotionData] = useState<EmotionPoint[]>(DEMO_EMOTION_DATA);
  const [growthData, setGrowthData] = useState<TrendPoint[]>(DEMO_GROWTH_DATA);

  const tabs: Array<{
    id: 'songs' | 'trend' | 'emotion' | 'growth';
    label: string;
    icon: React.ComponentType;
    data: SongPoint[] | TrendPoint[] | EmotionPoint[];
  }> = [
    { id: 'songs', label: '热门歌曲', icon: BarChart3, data: songData },
    { id: 'trend', label: '播放趋势', icon: LineChart, data: trendData },
    { id: 'emotion', label: '情绪分布', icon: PieChart, data: emotionData },
    { id: 'growth', label: '用户增长', icon: Activity, data: growthData },
  ];

  const fetchAnalytics = async () => {
    try {
      const [metricsRes, trendRes, emotionRes, songsRes, growthRes] = await Promise.allSettled([
        fetch('/api/analytics/metrics').then(r => r.json()),
        fetch('/api/analytics/trend').then(r => r.json()),
        fetch('/api/analytics/emotion').then(r => r.json()),
        fetch('/api/analytics/top-songs').then(r => r.json()),
        fetch('/api/analytics/growth').then(r => r.json()),
      ]);

      if (metricsRes.status === 'fulfilled') setMetrics(metricsRes.value);
      if (trendRes.status === 'fulfilled') setTrendData(trendRes.value);
      if (emotionRes.status === 'fulfilled') setEmotionData(emotionRes.value);
      if (songsRes.status === 'fulfilled') setSongData(songsRes.value);
      if (growthRes.status === 'fulfilled') setGrowthData(growthRes.value);
    } catch (err) {
      console.error('[VisxChartsDashboard] Analytics fetch error:', err);
    }
  };

  useEffect(() => {
    if (isOpen) void fetchAnalytics();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-[100] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0A0E2F]/95 backdrop-blur-xl border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">VisxCharts 运营数据看板</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center text-white/50 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 py-2 border-b border-white/[0.04] overflow-x-auto">
          {tabs.map((tab) => {
            const TabIcon = tab.icon as React.ComponentType<{ className?: string }>;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-500/10 border border-blue-500/30 text-blue-300'
                    : 'bg-white/[0.02] text-white/40 hover:bg-white/[0.06]'
                }`}
              >
                <TabIcon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0A0E2F]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            <Card className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
              <CardHeader>
                <CardTitle className="text-xs text-white/40 font-normal">
                  {activeTab === 'songs' ? '热门歌曲排行' : activeTab === 'trend' ? '播放趋势' : activeTab === 'emotion' ? '情绪分布' : '用户增长'}
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[400px] flex items-center justify-center">
                {activeTab === 'songs' && <VisxBarChart data={songData} width={450} height={320} title="热门歌曲" />}
                {activeTab === 'trend' && <VisxLineChart data={trendData} width={450} height={320} title="播放趋势" />}
                {activeTab === 'emotion' && <VisxPieChart data={emotionData} width={280} height={280} title="情绪分布" />}
                {activeTab === 'growth' && <VisxAreaChart data={growthData} width={450} height={320} title="用户增长" />}
              </CardContent>
            </Card>

            {/* Metric cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                <div className="text-xs text-white/40">总播放</div>
                <div className="text-2xl font-bold text-white">{metrics.totalPlays.toLocaleString()}</div>
                <div className="text-[10px] text-green-400 mt-1">+12.4%</div>
              </Card>
              <Card className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                <div className="text-xs text-white/40">总点赞</div>
                <div className="text-2xl font-bold text-white">{metrics.totalLikes.toLocaleString()}</div>
                <div className="text-[10px] text-green-400 mt-1">+8.2%</div>
              </Card>
              <Card className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                <div className="text-xs text-white/40">总评论</div>
                <div className="text-2xl font-bold text-white">{metrics.totalComments.toLocaleString()}</div>
                <div className="text-[10px] text-green-400 mt-1">+5.1%</div>
              </Card>
              <Card className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                <div className="text-xs text-white/40">活跃用户</div>
                <div className="text-2xl font-bold text-white">{metrics.activeUsers.toLocaleString()}</div>
                <div className="text-[10px] text-green-400 mt-1">+10.3%</div>
              </Card>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VisxChartsDashboard;
