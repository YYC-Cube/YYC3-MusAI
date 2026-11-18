"use client";

/**
 * YYC³ music-community — Visx 数据可视化组件（基于 @visx/visx，MIT）
 *
 * 对应 INTEGRATION-STATUS.md：airbnb/visx → music-community Visualization primitive reference（Planned → Done）。
 * 借鉴 Tremor 运营看板设计语言，采用 Visx 原语设计思路（比例尺、SVG 路径、分组渲染），
 * 使用原生 SVG 元素渲染，避免 Visx v4 命名空间导出的类型兼容问题：
 *   - BarChart：歌曲播放排行
 *   - LineChart：播放趋势
 *   - PieChart：情绪分布
 *   - AreaChart：用户增长
 *
 * 与 AnalyticsDashboard（recharts 实现）互补，提供 Visx 原语版本供场景选配。
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@yyc3/music-ui';

/** 简易比例尺：线性 */
const linearScale = ({
  domain,
  range,
}: {
  domain: [number, number];
  range: [number, number];
}) => {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const scale = (v: number) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
  scale.invert = (v: number) => d0 + ((v - r0) / (r1 - r0)) * (d1 - d0);
  return scale;
};

/** 简易比例尺：带状（分类） */
const bandScale = ({
  domain,
  range,
  padding = 0.2,
}: {
  domain: string[];
  range: [number, number];
  padding?: number;
}) => {
  const n = domain.length;
  const step = (range[1] - range[0]) / n;
  const pad = step * padding;
  const width = step - pad;
  const map = new Map(domain.map((k, i) => [k, range[0] + i * step + pad / 2]));
  return {
    bandwidth: () => width,
    scale: (k: string) => map.get(k) ?? range[0],
  };
};

/** 日期比例尺（简易） */
const timeScale = ({
  domain,
  range,
}: {
  domain: [Date, Date];
  range: [number, number];
}) => {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const t0 = d0.getTime();
  const t1 = d1.getTime();
  return (date: Date) => r0 + ((date.getTime() - t0) / (t1 - t0)) * (r1 - r0);
};

interface VisxBarChartProps {
  data: Array<{ name: string; value: number }>;
  width?: number;
  height?: number;
  title?: string;
}

export const VisxBarChart: React.FC<VisxBarChartProps> = ({
  data,
  width = 400,
  height = 240,
  title,
}) => {
  const margin = { top: 40, right: 30, bottom: 50, left: 60 };
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;
  const maxVal = Math.max(...data.map(d => d.value), 0);
  const y = linearScale({ domain: [0, maxVal], range: [yMax, 0] });
  const x = bandScale({ domain: data.map(d => d.name), range: [0, xMax] });

  return (
    <Card className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
      <CardHeader>
        <CardTitle className="text-xs text-white/40 font-normal">{title ?? '播放排行'}</CardTitle>
      </CardHeader>
      <CardContent className="h-[240px]">
        <svg width={width} height={height}>
          <g transform={`translate(${margin.left},${margin.top})`}>
            {data.map(d => {
              const xv = x.scale(d.name);
              const yv = y(d.value);
              return (
                <rect
                  key={d.name}
                  x={xv}
                  y={yv}
                  width={x.bandwidth()}
                  height={yMax - yv}
                  fill="#60a5fa"
                  rx={4}
                  ry={4}
                />
              );
            })}
          </g>
        </svg>
      </CardContent>
    </Card>
  );
};

interface VisxLineChartProps {
  data: Array<{ date: string; value: number }>;
  width?: number;
  height?: number;
  title?: string;
}

export const VisxLineChart: React.FC<VisxLineChartProps> = ({
  data,
  width = 400,
  height = 240,
  title,
}) => {
  const margin = { top: 40, right: 30, bottom: 50, left: 60 };
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;
  const dates = data.map(d => new Date(d.date));
  const t0 = Math.min(...dates.map(d => d.getTime()));
  const t1 = Math.max(...dates.map(d => d.getTime()));
  const maxVal = Math.max(...data.map(d => d.value), 0);
  const xs = timeScale({ domain: [new Date(t0), new Date(t1)], range: [0, xMax] });
  const ys = linearScale({ domain: [0, maxVal], range: [yMax, 0] });

  const path = data
    .map((d, i) => {
      const x = xs(new Date(d.date));
      const y = ys(d.value);
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');

  return (
    <Card className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
      <CardHeader>
        <CardTitle className="text-xs text-white/40 font-normal">{title ?? '播放趋势'}</CardTitle>
      </CardHeader>
      <CardContent className="h-[240px]">
        <svg width={width} height={height}>
          <g transform={`translate(${margin.left},${margin.top})`}>
            <path d={path} fill="none" stroke="#34d399" strokeWidth={2} />
          </g>
        </svg>
      </CardContent>
    </Card>
  );
};

interface VisxPieChartProps {
  data: Array<{ name: string; value: number }>;
  width?: number;
  height?: number;
  title?: string;
}

const PIE_COLORS = ['#60a5fa', '#fbbf24', '#34d399', '#f87171', '#a78bfa'];

export const VisxPieChart: React.FC<VisxPieChartProps> = ({
  data,
  width = 240,
  height = 240,
  title,
}) => {
  const radius = Math.min(width, height) / 2 - 20;
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let startAngle = 0;

  return (
    <Card className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
      <CardHeader>
        <CardTitle className="text-xs text-white/40 font-normal">{title ?? '情绪分布'}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        <svg width={width} height={height}>
          <g transform={`translate(${width / 2},${height / 2})`}>
            {data.map((d, i) => {
              const sliceValue = d.value / total;
              const endAngle = startAngle + sliceValue * 2 * Math.PI;
              const largeArc = sliceValue > 0.5 ? 1 : 0;
              const x1 = radius * Math.cos(startAngle);
              const y1 = radius * Math.sin(startAngle);
              const x2 = radius * Math.cos(endAngle);
              const y2 = radius * Math.sin(endAngle);
              startAngle = endAngle;
              return (
                <path
                  key={d.name}
                  d={`M0 0 L${x1} ${y1} A${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                  fill={PIE_COLORS[i % PIE_COLORS.length]}
                />
              );
            })}
          </g>
        </svg>
      </CardContent>
    </Card>
  );
};

interface VisxAreaChartProps {
  data: Array<{ date: string; value: number }>;
  width?: number;
  height?: number;
  title?: string;
}

export const VisxAreaChart: React.FC<VisxAreaChartProps> = ({
  data,
  width = 400,
  height = 240,
  title,
}) => {
  const margin = { top: 40, right: 30, bottom: 50, left: 60 };
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;
  const dates = data.map(d => new Date(d.date));
  const t0 = Math.min(...dates.map(d => d.getTime()));
  const t1 = Math.max(...dates.map(d => d.getTime()));
  const maxVal = Math.max(...data.map(d => d.value), 0);
  const xs = timeScale({ domain: [new Date(t0), new Date(t1)], range: [0, xMax] });
  const ys = linearScale({ domain: [0, maxVal], range: [yMax, 0] });

  const path = data
    .map((d, i) => {
      const x = xs(new Date(d.date));
      const y = ys(d.value);
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');

  return (
    <Card className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
      <CardHeader>
        <CardTitle className="text-xs text-white/40 font-normal">{title ?? '用户增长'}</CardTitle>
      </CardHeader>
      <CardContent className="h-[240px]">
        <svg width={width} height={height}>
          <g transform={`translate(${margin.left},${margin.top})`}>
            <path d={path} fill="none" stroke="#a78bfa" strokeWidth={2} />
          </g>
        </svg>
      </CardContent>
    </Card>
  );
};
