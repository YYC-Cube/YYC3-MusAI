/**
 * D-Music §1.3 — Data Visualization Components
 *
 * Unified visualization library:
 *   1. StarPowerChart — Star Power growth curve (Recharts)
 *   2. EmotionPieChart — Emotion distribution pie chart
 *   3. PlayStatsChart — Play count bar chart with trend line
 *   4. AchievementGrid — Achievement progress ring grid
 *   5. SparklineChart — Inline mini sparkline for compact display
 *   6. DataExportButton — Export data as CSV/JSON
 *
 * Design Requirements:
 *   - Real-time update capable
 *   - 60fps (Recharts + SVG, no forced reflows)
 *   - Clear data labels
 *   - WCAG 2.1 AA accessible (aria-labels, screen-reader text)
 *   - Unified color palette from design-tokens.ts
 *
 * Technology:
 *   - Canvas API for AudioVisualizer (existing)
 *   - Recharts for data charts
 *   - SVG for progress rings (AchievementRing from DMusicUI)
 *   - CSS animations for transitions
 */

import React, { useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Area, AreaChart, Legend,
} from 'recharts';
import { clsx } from 'clsx';
import { Download } from 'lucide-react';
import { DButton, AchievementRing } from './DMusicUI';

// ============================================================
// Unified Data Visualization Color Palette — §1.3
// ============================================================

export const DATA_VIZ_PALETTE = {
  primary: [
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#F59E0B', // Amber
    '#22C55E', // Green
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#A855F7', // Purple
  ],
  emotion: {
    happy: '#FFD700',
    sad: '#6495ED',
    energetic: '#FF4500',
    calm: '#00CED1',
    neutral: '#667EEA',
    love: '#FF6B9D',
    nostalgic: '#DEB887',
    hopeful: '#98FB98',
    angry: '#DC143C',
    romantic: '#FFB6C1',
  } as Record<string, string>,
  semantic: {
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
} as const;

// ============================================================
// Custom Tooltip — Unified dark-glass style
// ============================================================

const GlassTooltip: React.FC<any> = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl border px-3 py-2 text-xs backdrop-blur-xl"
      style={{
        background: 'var(--dm-bg-overlay)',
        borderColor: 'var(--dm-border)',
      }}
    >
      {label && (
        <p className="font-medium mb-1" style={{ color: 'var(--dm-text-secondary)' }}>
          {label}
        </p>
      )}
      {payload.map((entry: any, i: number) => (
        <p key={i} className="flex items-center gap-2" style={{ color: entry.color }}>
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: entry.color }}
          />
          <span style={{ color: 'var(--dm-text-primary)' }}>
            {entry.name}: {formatter ? formatter(entry.value) : entry.value}
          </span>
        </p>
      ))}
    </div>
  );
};

// ============================================================
// 1. StarPowerChart — Growth Curve (§1.3.7)
// ============================================================

interface StarPowerChartProps {
  data: { date: string; value: number; earned?: number; spent?: number }[];
  height?: number;
  className?: string;
  lang?: 'zh' | 'en';
}

export const StarPowerChart: React.FC<StarPowerChartProps> = ({
  data,
  height = 200,
  className,
  lang = 'zh',
}) => {
  return (
    <div className={clsx('w-full', className)} role="img" aria-label={lang === 'zh' ? '星力值增长曲线' : 'Star Power Growth Curve'}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="spGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--dm-border-subtle)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--dm-text-disabled)', fontSize: 10 }}
            axisLine={{ stroke: 'var(--dm-border-subtle)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--dm-text-disabled)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<GlassTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#8B5CF6"
            strokeWidth={2}
            fill="url(#spGradient)"
            name={lang === 'zh' ? '星力值' : 'Star Power'}
            dot={false}
            activeDot={{ r: 4, fill: '#8B5CF6', stroke: '#fff', strokeWidth: 2 }}
          />
          {data[0]?.earned !== undefined && (
            <Line
              type="monotone"
              dataKey="earned"
              stroke="#22C55E"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              name={lang === 'zh' ? '获得' : 'Earned'}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// ============================================================
// 2. EmotionPieChart — Emotion Distribution (§1.3.4)
// ============================================================

interface EmotionPieChartProps {
  data: { emotion: string; count: number; pct?: number }[];
  size?: number;
  className?: string;
  lang?: 'zh' | 'en';
}

const EMOTION_LABELS_ZH: Record<string, string> = {
  happy: '开心', sad: '忧伤', energetic: '活力', calm: '平静',
  neutral: '中性', love: '爱意', nostalgic: '怀旧', hopeful: '希望',
  angry: '愤怒', romantic: '浪漫',
};

export const EmotionPieChart: React.FC<EmotionPieChartProps> = ({
  data,
  size = 180,
  className,
  lang = 'zh',
}) => {
  const chartData = useMemo(() =>
    data.map(d => ({
      ...d,
      label: lang === 'zh' ? (EMOTION_LABELS_ZH[d.emotion] || d.emotion) : d.emotion,
      fill: DATA_VIZ_PALETTE.emotion[d.emotion] || '#667EEA',
    })),
    [data, lang]
  );

  return (
    <div className={clsx('flex items-center gap-4', className)} role="img" aria-label={lang === 'zh' ? '情绪分布' : 'Emotion Distribution'}>
      <ResponsiveContainer width={size} height={size}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={size * 0.3}
            outerRadius={size * 0.44}
            paddingAngle={2}
            strokeWidth={0}
          >
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<GlassTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-1 min-w-0">
        {chartData.slice(0, 5).map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.fill }} />
            <span className="truncate" style={{ color: 'var(--dm-text-secondary)' }}>{d.label}</span>
            <span className="ml-auto tabular-nums" style={{ color: 'var(--dm-text-disabled)' }}>
              {d.pct ?? d.count}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// 3. PlayStatsChart — Bar Chart with Trend (§1.3.4)
// ============================================================

interface PlayStatsChartProps {
  data: { name: string; plays: number; likes?: number }[];
  height?: number;
  className?: string;
  lang?: 'zh' | 'en';
}

export const PlayStatsChart: React.FC<PlayStatsChartProps> = ({
  data,
  height = 200,
  className,
  lang = 'zh',
}) => {
  return (
    <div className={clsx('w-full', className)} role="img" aria-label={lang === 'zh' ? '播放统计' : 'Play Statistics'}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--dm-border-subtle)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: 'var(--dm-text-disabled)', fontSize: 10 }}
            axisLine={{ stroke: 'var(--dm-border-subtle)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--dm-text-disabled)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<GlassTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: 'var(--dm-text-tertiary)' }}
          />
          <Bar
            dataKey="plays"
            name={lang === 'zh' ? '播放量' : 'Plays'}
            fill="#8B5CF6"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
          {data[0]?.likes !== undefined && (
            <Bar
              dataKey="likes"
              name={lang === 'zh' ? '点赞' : 'Likes'}
              fill="#EC4899"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ============================================================
// 4. AchievementGrid — Progress Ring Grid (§1.3.6)
// ============================================================

interface AchievementGridItem {
  id: string;
  title: string;
  icon: string;
  progress: number;
  color?: string;
}

interface AchievementGridProps {
  items: AchievementGridItem[];
  columns?: number;
  className?: string;
}

export const AchievementGrid: React.FC<AchievementGridProps> = ({
  items,
  columns = 4,
  className,
}) => {
  return (
    <div
      className={clsx('grid gap-4', className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      role="list"
      aria-label="Achievements"
    >
      {items.map((item) => (
        <div key={item.id} className="flex flex-col items-center gap-1.5" role="listitem">
          <AchievementRing
            progress={item.progress}
            size={56}
            strokeWidth={3}
            color={item.color || 'var(--dm-accent-from)'}
          >
            <span className="text-lg" role="img" aria-label={item.title}>{item.icon}</span>
          </AchievementRing>
          <span className="text-[10px] text-center truncate w-full" style={{ color: 'var(--dm-text-tertiary)' }}>
            {item.title}
          </span>
          <span className="text-[9px] tabular-nums" style={{ color: 'var(--dm-text-disabled)' }}>
            {item.progress}%
          </span>
        </div>
      ))}
    </div>
  );
};

// ============================================================
// 5. SparklineChart — Mini Inline Sparkline
// ============================================================

interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showDot?: boolean;
  className?: string;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  width = 80,
  height = 24,
  color = '#8B5CF6',
  showDot = true,
  className,
}) => {
  const chartData = useMemo(() => data.map((v, i) => ({ i, v })), [data]);

  return (
    <div className={clsx('inline-flex', className)} role="img" aria-label="Trend">
      <ResponsiveContainer width={width} height={height}>
        <LineChart data={chartData} margin={{ top: 2, right: 4, bottom: 2, left: 4 }}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            activeDot={showDot ? { r: 2, fill: color } : false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// ============================================================
// 6. DataExportButton — Export data as CSV/JSON (§1.3 requirement)
// ============================================================

interface DataExportButtonProps {
  data: any[];
  filename?: string;
  format?: 'csv' | 'json';
  label?: string;
  className?: string;
}

export const DataExportButton: React.FC<DataExportButtonProps> = ({
  data,
  filename = 'dmusic-data',
  format = 'csv',
  label,
  className,
}) => {
  const handleExport = () => {
    let content: string;
    let mimeType: string;

    if (format === 'csv') {
      if (data.length === 0) return;
      const keys = Object.keys(data[0]);
      const rows = [keys.join(','), ...data.map(row => keys.map(k => JSON.stringify(row[k] ?? '')).join(','))];
      content = rows.join('\n');
      mimeType = 'text/csv';
    } else {
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <DButton
      variant="ghost"
      size="sm"
      icon={<Download className="w-3.5 h-3.5" />}
      onClick={handleExport}
      className={className}
      aria-label={label || `Export as ${format.toUpperCase()}`}
    >
      {label || format.toUpperCase()}
    </DButton>
  );
};

// ============================================================
// 7. StatCard — Key metric display with sparkline
// ============================================================

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number; // percentage change
  trend?: number[];
  icon?: React.ReactNode;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label, value, change, trend, icon, className,
}) => {
  const isPositive = (change ?? 0) >= 0;
  return (
    <div
      className={clsx('rounded-xl border p-4 flex flex-col gap-2', className)}
      style={{
        background: 'var(--dm-bg-elevated)',
        borderColor: 'var(--dm-border-subtle)',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--dm-text-tertiary)' }}>{label}</span>
        {icon && <span style={{ color: 'var(--dm-text-disabled)' }}>{icon}</span>}
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--dm-text-primary)' }}>{value}</span>
        <div className="flex flex-col items-end gap-1">
          {change !== undefined && (
            <span
              className="text-xs font-medium tabular-nums"
              style={{ color: isPositive ? 'var(--dm-success)' : 'var(--dm-error)' }}
            >
              {isPositive ? '+' : ''}{change}%
            </span>
          )}
          {trend && trend.length > 2 && (
            <SparklineChart
              data={trend}
              width={60}
              height={20}
              color={isPositive ? '#22C55E' : '#EF4444'}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// 8. RankingList — Leaderboard/Ranking visualization (§1.3.5)
// ============================================================

interface RankingItem {
  rank: number;
  name: string;
  score: number;
  avatar?: string;
  change?: 'up' | 'down' | 'same' | 'new';
  highlight?: boolean;
}

interface RankingListProps {
  items: RankingItem[];
  maxItems?: number;
  valueLabel?: string;
  className?: string;
  lang?: 'zh' | 'en';
  onItemClick?: (item: RankingItem) => void;
}

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
const RANK_COLORS: Record<number, string> = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };

export const RankingList: React.FC<RankingListProps> = ({
  items,
  maxItems = 10,
  valueLabel,
  className,
  lang = 'zh',
  onItemClick,
}) => {
  const displayed = items.slice(0, maxItems);
  const maxScore = Math.max(...displayed.map(d => d.score), 1);

  return (
    <div className={clsx('w-full', className)} role="list" aria-label={lang === 'zh' ? '排行榜' : 'Rankings'}>
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 mb-1">
        <span className="text-[10px] font-medium" style={{ color: 'var(--dm-text-disabled)' }}>
          {lang === 'zh' ? '排名' : 'Rank'}
        </span>
        <span className="text-[10px] font-medium" style={{ color: 'var(--dm-text-disabled)' }}>
          {valueLabel || (lang === 'zh' ? '得分' : 'Score')}
        </span>
      </div>
      {displayed.map((item) => {
        const barWidth = (item.score / maxScore) * 100;
        const isTop3 = item.rank <= 3;
        return (
          <div
            key={item.rank}
            role="listitem"
            onClick={() => onItemClick?.(item)}
            className={clsx(
              'flex items-center gap-2 px-2 py-2 rounded-lg transition-colors relative overflow-hidden',
              onItemClick && 'cursor-pointer hover:bg-[var(--dm-hover-bg)]',
              item.highlight && 'ring-1 ring-[var(--dm-accent-from)]/30 bg-[var(--dm-accent-from)]/5'
            )}
          >
            {/* Rank indicator */}
            <div className="w-7 flex-shrink-0 text-center">
              {isTop3 ? (
                <span className="text-sm" role="img" aria-label={`Rank ${item.rank}`}>
                  {RANK_MEDAL[item.rank]}
                </span>
              ) : (
                <span className="text-xs tabular-nums font-medium" style={{ color: 'var(--dm-text-tertiary)' }}>
                  {item.rank}
                </span>
              )}
            </div>

            {/* Avatar */}
            <div
              className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold overflow-hidden"
              style={{
                background: isTop3
                  ? `linear-gradient(135deg, ${RANK_COLORS[item.rank]}40, ${RANK_COLORS[item.rank]}20)`
                  : 'var(--dm-hover-bg)',
                color: isTop3 ? RANK_COLORS[item.rank] : 'var(--dm-text-tertiary)',
              }}
            >
              {item.avatar ? (
                <img src={item.avatar} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                item.name.charAt(0).toUpperCase()
              )}
            </div>

            {/* Name + bar */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={clsx('text-xs truncate', isTop3 ? 'font-semibold' : 'font-medium')}
                  style={{ color: isTop3 ? RANK_COLORS[item.rank] : 'var(--dm-text-primary)' }}
                >
                  {item.name}
                </span>
                {item.change === 'up' && <span className="text-[9px] text-green-400">▲</span>}
                {item.change === 'down' && <span className="text-[9px] text-red-400">▼</span>}
                {item.change === 'new' && (
                  <span className="text-[8px] px-1 py-0 rounded bg-[var(--dm-accent-from)]/20 text-[var(--dm-accent-from)]">NEW</span>
                )}
              </div>
              {/* Score bar */}
              <div className="h-1 rounded-full mt-1 overflow-hidden" style={{ background: 'var(--dm-hover-bg)' }}>
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{
                    width: `${barWidth}%`,
                    background: isTop3
                      ? `linear-gradient(to right, ${RANK_COLORS[item.rank]}, ${RANK_COLORS[item.rank]}80)`
                      : 'linear-gradient(to right, var(--dm-accent-from), var(--dm-accent-to))',
                    opacity: isTop3 ? 1 : 0.6,
                  }}
                />
              </div>
            </div>

            {/* Score */}
            <span
              className="text-xs tabular-nums font-medium flex-shrink-0"
              style={{ color: isTop3 ? RANK_COLORS[item.rank] : 'var(--dm-text-secondary)' }}
            >
              {item.score.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
};