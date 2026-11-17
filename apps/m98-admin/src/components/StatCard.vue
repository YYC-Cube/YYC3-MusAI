<template>
  <article class="stat-card" :class="`tone-${icon}`">
    <div class="stat-icon" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path :d="iconPath" />
      </svg>
    </div>
    <div class="stat-body">
      <p class="stat-title">{{ title }}</p>
      <p class="stat-value">{{ value }}</p>
      <p class="stat-hint">
        <span v-if="trend" class="trend" :class="trend">{{ trendLabel }}</span>
        <span>{{ hint || '实时数据' }}</span>
      </p>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { KpiIcon } from '@/types';

const props = withDefaults(
  defineProps<{
    title: string;
    value: string;
    icon: KpiIcon;
    trend?: 'up' | 'down' | 'flat';
    hint?: string;
  }>(),
  {
    trend: undefined,
    hint: '',
  },
);

const ICONS: Record<KpiIcon, string> = {
  play: 'M8 5l11 7-11 7V5z',
  users:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  interaction: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z',
  revenue: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  music: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0M21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
};

const iconPath = computed(() => ICONS[props.icon]);
const trendLabel = computed(() =>
  props.trend === 'up' ? '↑' : props.trend === 'down' ? '↓' : '→',
);
</script>

<style scoped>
.stat-card {
  display: flex;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
  background: linear-gradient(160deg, rgba(22, 27, 34, 0.92), rgba(13, 17, 23, 0.7));
  box-shadow: var(--shadow);
  transition: border-color 0.25s ease, transform 0.25s ease;
}

.stat-card:hover {
  border-color: var(--border);
  transform: translateY(-3px);
}

.stat-icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  border-radius: 14px;
  background: var(--brand-soft);
  color: var(--brand);
}

.tone-play .stat-icon {
  background: rgba(138, 43, 226, 0.18);
  color: #b388ff;
}

.tone-users .stat-icon {
  background: rgba(63, 185, 80, 0.14);
  color: var(--success);
}

.tone-interaction .stat-icon {
  background: rgba(255, 107, 107, 0.14);
  color: var(--accent);
}

.tone-revenue .stat-icon {
  background: rgba(210, 153, 34, 0.14);
  color: var(--warning);
}

.tone-music .stat-icon {
  background: rgba(255, 107, 107, 0.14);
  color: var(--accent);
}

.stat-icon svg {
  width: 22px;
  height: 22px;
}

.stat-body {
  min-width: 0;
}

.stat-title {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.stat-value {
  margin: 8px 0 6px;
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
}

.stat-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}

.trend {
  font-weight: 700;
}

.trend.up {
  color: var(--success);
}

.trend.down {
  color: var(--danger);
}

.trend.flat {
  color: var(--text-muted);
}
</style>
