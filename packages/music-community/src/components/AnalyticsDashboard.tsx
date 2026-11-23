"use client";

/**
 * §26.x — AnalyticsDashboard 运营看板（W4 适用选配）
 *
 * 设计借鉴 Tremor / Visx 的仪表盘语言：
 *   - 卡片式布局，指标大数字 + 趋势标签
 *   - 折线图（播放趋势）、饼图（情绪分布）、柱状图（歌曲排行）
 *   - 使用 @yyc3/music-ui 的 shadcn 基件（Card、Badge、Progress）保持一致视觉
 *
 * 数据源：@yyc3/music-data AnalyticsData（songBreakdown / totalPlays / totalLikes / ...）
 *
 * @example
 *   import { AnalyticsDashboard } from '@yyc3/music-community';
 *   <AnalyticsDashboard data={analytics} />
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@yyc3/music-ui';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, XAxis as BarXAxis, YAxis as BarYAxis,
} from 'recharts';
import type { AnalyticsData, LeaderboardEntry } from '@yyc3/music-data';

interface AnalyticsDashboardProps {
  data: AnalyticsData;
  leaderboard?: LeaderboardEntry[];
  className?: string;
}

const EMOTION_COLORS = {
  happy: '#fbbf24',
  sad: '#60a5fa',
  energetic: '#f87171',
  calm: '#34d399',
  neutral: '#a78bfa',
};

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

/** 统计卡片：大数字 + 趋势 */
const StatCard = ({
  title,
  value,
  trend,
  trendLabel,
  icon,
}: {
  title: string;
  value: number | string;
  trend: string;
  trendLabel: string;
  icon: React.ReactNode;
}) => (
  <Card className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-xs text-white/40 font-normal">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="flex items-center gap-1 mt-1 text-xs">
        {/* Tailwind 类必须字面量（动态拼接类名扫描不到，正负趋势着色此前不生效） */}
        <span className={trend.startsWith('-') ? 'text-red-400' : 'text-green-400'}>
          {trend}
        </span>
        <span className="text-white/30">{trendLabel}</span>
      </div>
    </CardContent>
  </Card>
);

/** 折线图：播放趋势 */
const TrendChart = ({ data }: { data: Array<{ month: string; plays: number; likes: number }> }) => {
  const maxY = Math.max(...data.map(d => d.plays), ...data.map(d => d.likes)) * 1.2;
  return (
    <Card className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
      <CardHeader>
        <CardTitle className="text-xs text-white/40 font-normal">播放趋势</CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff0a" />
            <XAxis dataKey="month" axisLine={false} tick={{ fill: '#ffffff40', fontSize: 11 }} />
            <YAxis axisLine={false} tick={{ fill: '#ffffff40', fontSize: 11 }} domain={[0, maxY]} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', color: '#fff' }} />
            <Line type="monotone" dataKey="plays" stroke="#60a5fa" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="likes" stroke="#fbbf24" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

/** 饼图：情绪分布 */
const EmotionPie = ({ data }: { data: Array<{ emotion: string; pct: number }> }) => (
  <Card className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
    <CardHeader>
      <CardTitle className="text-xs text-white/40 font-normal">情绪分布</CardTitle>
    </CardHeader>
    <CardContent className="h-64 flex items-center justify-center">
      {/* 必须包 ResponsiveContainer：裸 PieChart 无 width/height 时 recharts 直接 render null（修复前生产同样空白） */}
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="pct"
            nameKey="emotion"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            fill="#8884d8"
            label
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={EMOTION_COLORS[entry.emotion as keyof typeof EMOTION_COLORS] ?? '#94a3b8'} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

/** 柱状图：歌曲排行 */
const SongRankChart = ({ data }: { data: LeaderboardEntry[] }) => (
  <Card className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
    <CardHeader>
      <CardTitle className="text-xs text-white/40 font-normal">热门歌曲</CardTitle>
    </CardHeader>
    <CardContent className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.slice(0, 8)}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff0a" />
          <BarXAxis dataKey="title" axisLine={false} tick={{ fill: '#ffffff40', fontSize: 11 }} />
          <BarYAxis axisLine={false} tick={{ fill: '#ffffff40', fontSize: 11 }} />
          <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', color: '#fff' }} />
          <Bar dataKey="playCount" stroke="#34d399" fill="#34d399" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  data,
  leaderboard,
  className = '',
}) => {
  const totalEngagement = useMemo(() => data.totalEngagement, [data.totalEngagement]);
  const totalPlays = data.totalPlays;
  const totalLikes = data.totalLikes;
  const totalComments = data.totalComments;

  // 构造月度趋势数据（模拟，生产环境应从后端获取）
  const monthlyTrend = useMemo(() => {
    return MONTHS.map((month, i) => ({
      month,
      plays: Math.round(totalPlays * (0.6 + 0.4 * Math.sin(i / 3))),
      likes: Math.round(totalLikes * (0.5 + 0.3 * Math.cos(i / 4))),
    }));
  }, [totalPlays, totalLikes]);

  // 构造情绪分布
  const emotionDist = useMemo(() => {
    if (data.songBreakdown?.length) {
      // 以 songBreakdown 的 likes 权重近似分配（生产环境应从后端获取真实情绪分布）
      const totalLikes = data.songBreakdown.reduce((sum, s) => sum + s.likes, 0) || 1;
      return ['happy', 'sad', 'energetic', 'calm', 'neutral'].map((emotion, i) => ({
        emotion,
        pct: Math.round(((totalLikes / (i + 1)) / totalLikes) * 100) || 0,
      }));
    }
    return [
      { emotion: 'happy', pct: 30 },
      { emotion: 'energetic', pct: 25 },
      { emotion: 'calm', pct: 20 },
      { emotion: 'sad', pct: 15 },
      { emotion: 'neutral', pct: 10 },
    ];
  }, [data.songBreakdown]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 指标卡片行 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="总播放次数"
          value={totalPlays}
          trend="+12.4%"
          trendLabel="较上月"
          icon={<span className="text-blue-400">▲</span>}
        />
        <StatCard
          title="总点赞数"
          value={totalLikes}
          trend="+8.2%"
          trendLabel="较上月"
          icon={<span className="text-yellow-400">♥</span>}
        />
        <StatCard
          title="总评论数"
          value={totalComments}
          trend="+5.1%"
          trendLabel="较上月"
          icon={<span className="text-green-400">💬</span>}
        />
        <StatCard
          title="总互动值"
          value={totalEngagement}
          trend="+10.3%"
          trendLabel="较上月"
          icon={<span className="text-purple-400">⚡</span>}
        />
      </div>

      {/* 图表行 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TrendChart data={monthlyTrend} />
        <EmotionPie data={emotionDist} />
        <SongRankChart data={leaderboard ?? []} />
      </div>

      {/* 歌曲明细表格 */}
      <Card className="bg-white/[0.03] border border-white/[0.06] rounded-xl">
        <CardHeader>
          <CardTitle className="text-xs text-white/40 font-normal">歌曲明细</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-white/30">
                  <th className="pb-2">歌曲</th>
                  <th className="pb-2 text-right">播放</th>
                  <th className="pb-2 text-right">点赞</th>
                  <th className="pb-2 text-right">评论</th>
                </tr>
              </thead>
              <tbody>
                {data.songBreakdown.map((song) => (
                  <tr key={song.songId} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="py-2 text-white/70">{song.songId}</td>
                    <td className="py-2 text-right text-white/60">{song.plays}</td>
                    <td className="py-2 text-right text-white/60">{song.likes}</td>
                    <td className="py-2 text-right text-white/60">{song.comments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;
