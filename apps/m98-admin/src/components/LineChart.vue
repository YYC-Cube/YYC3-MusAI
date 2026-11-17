<template>
  <div class="chart-wrap">
    <div v-if="!data.length" class="empty">暂无播放数据</div>
    <svg v-else viewBox="0 0 680 260" role="img" aria-label="作品播放分布">
      <defs>
        <linearGradient id="m98-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#8a2be2" stop-opacity="0.42" />
          <stop offset="100%" stop-color="#8a2be2" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="m98-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#8a2be2" />
          <stop offset="100%" stop-color="#ff6b6b" />
        </linearGradient>
      </defs>

      <g class="grid">
        <line
          v-for="line in grid"
          :key="line.y"
          :x1="PAD_X"
          :x2="W - PAD_X"
          :y1="line.y"
          :y2="line.y"
        />
        <text
          v-for="line in grid"
          :key="`label-${line.y}`"
          :x="PAD_X - 10"
          :y="line.y + 4"
          text-anchor="end"
        >
          {{ formatNumber(line.value) }}
        </text>
      </g>

      <path :d="areaPath" fill="url(#m98-area)" />
      <path
        :d="linePath"
        fill="none"
        stroke="url(#m98-line)"
        stroke-width="2.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <g v-for="point in points" :key="point.label">
        <circle :cx="point.x" :cy="point.y" r="4.5" fill="#0b0f16" stroke="#ff6b6b" stroke-width="2" />
        <text :x="point.x" :y="H - 8" text-anchor="middle" class="x-label">
          {{ point.label }}
        </text>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ChartPoint } from '@/types';

const props = defineProps<{ data: ChartPoint[] }>();

const W = 680;
const H = 260;
const PAD_X = 46;
const PAD_Y = 28;

const maxValue = computed(() => Math.max(1, ...props.data.map((d) => d.value)));

const points = computed(() => {
  const total = props.data.length;
  if (!total) return [];

  return props.data.map((item, index) => {
    const x = total === 1 ? W / 2 : PAD_X + (index / (total - 1)) * (W - PAD_X * 2);
    const y = H - PAD_Y - (item.value / maxValue.value) * (H - PAD_Y * 2);
    return { ...item, x, y };
  });
});

const linePath = computed(() =>
  points.value.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' '),
);

const areaPath = computed(() => {
  if (!points.value.length) return '';
  const first = points.value[0];
  const last = points.value[points.value.length - 1];
  return `M${first.x},${H - PAD_Y} ${linePath.value} L${last.x},${H - PAD_Y} Z`;
});

const grid = computed(() => {
  const rows = 4;
  return Array.from({ length: rows + 1 }, (_, i) => {
    const value = (maxValue.value / rows) * i;
    const y = H - PAD_Y - (value / maxValue.value) * (H - PAD_Y * 2);
    return { value, y };
  });
});

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(Math.round(value));
}
</script>

<style scoped>
.chart-wrap {
  width: 100%;
  min-height: 240px;
}

svg {
  width: 100%;
  height: auto;
  display: block;
}

.grid line {
  stroke: rgba(255, 255, 255, 0.08);
  stroke-dasharray: 4 6;
}

.grid text {
  font-size: 10px;
  fill: var(--text-muted);
}

.x-label {
  font-size: 10px;
  fill: var(--text-muted);
}

.empty {
  display: grid;
  place-items: center;
  min-height: 220px;
  color: var(--text-muted);
  font-size: 14px;
  border: 1px dashed var(--border-soft);
  border-radius: var(--radius-md);
}
</style>
