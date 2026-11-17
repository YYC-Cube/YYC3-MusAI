<template>
  <div class="dashboard">
    <header class="page-head">
      <div>
        <p class="eyebrow">M98 · OVERVIEW</p>
        <h1>董小姐 (M98) 管理面板</h1>
        <p class="sub">
          数据来自 <code>/api/admin/dashboard</code>
          <span class="dot">·</span>
          更新于 {{ updatedLabel }}
        </p>
      </div>
      <button class="refresh" type="button" :disabled="loading" @click="load">
        {{ loading ? '加载中…' : '刷新数据' }}
      </button>
    </header>

    <p v-if="error" class="alert">{{ error }}</p>

    <div class="stats-row">
      <StatCard v-for="kpi in kpis" :key="kpi.id" v-bind="kpi" />
    </div>

    <div class="content-grid">
      <section class="panel chart-panel">
        <div class="panel-head">
          <div>
            <h2>作品播放分布</h2>
            <p>按播放量取近 7 部作品</p>
          </div>
          <span class="chip">TOP 7</span>
        </div>
        <LineChart :data="playTrend" />
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>最近活动</h2>
            <p>粉丝墙与最新发布</p>
          </div>
          <span class="chip">{{ activities.length }} 条</span>
        </div>
        <ActivityFeed :items="activities" />
      </section>
    </div>

    <section class="panel quick-actions">
      <div class="panel-head">
        <div>
          <h2>快速操作</h2>
          <p>进入对应工作流</p>
        </div>
      </div>
      <div class="action-buttons">
        <button type="button" @click="go('release-new')">发布新作品</button>
        <button type="button" @click="go('social-schedule')">安排社交媒体</button>
        <button type="button" @click="go('analytics')">查看详细分析</button>
      </div>
    </section>

    <footer class="footnote">
      过渡数据源：SQLite · 目标数据源：PostgreSQL 15（<code>yyc3_music</code>）
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import StatCard from '@/components/StatCard.vue';
import LineChart from '@/components/LineChart.vue';
import ActivityFeed from '@/components/ActivityFeed.vue';
import { fetchDashboard } from '@/services/api';
import type { ActivityItem, ChartPoint, DashboardKpi } from '@/types';

const router = useRouter();

const loading = ref(false);
const error = ref('');
const updatedAt = ref('');
const kpis = ref<DashboardKpi[]>(defaultKpis());
const playTrend = ref<ChartPoint[]>([]);
const activities = ref<ActivityItem[]>([]);

const updatedLabel = computed(() =>
  updatedAt.value ? new Date(updatedAt.value).toLocaleString('zh-CN') : '—',
);

async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    const data = await fetchDashboard();
    kpis.value = data.kpis;
    playTrend.value = data.playTrend;
    activities.value = data.activities;
    updatedAt.value = data.updatedAt;
  } catch (err) {
    error.value = err instanceof Error ? err.message : '数据加载失败';
    kpis.value = defaultKpis();
    playTrend.value = [];
    activities.value = [];
  } finally {
    loading.value = false;
  }
}

function defaultKpis(): DashboardKpi[] {
  return [
    { id: 'plays', title: '总播放量', value: '—', icon: 'play', hint: '等待接口' },
    { id: 'fans', title: '粉丝总量', value: '—', icon: 'users', hint: '等待接口' },
    { id: 'releases', title: '作品数量', value: '—', icon: 'interaction', hint: '等待接口' },
    { id: 'messages', title: '粉丝留言', value: '—', icon: 'revenue', hint: '等待接口' },
  ];
}

function go(name: string): void {
  router.push({ name });
}

onMounted(load);
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 10px;
  letter-spacing: 0.28em;
  color: var(--text-muted);
}

h1 {
  margin: 0 0 8px;
  font-size: clamp(24px, 3vw, 32px);
  line-height: 1.2;
}

.sub {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}

.sub code {
  color: #d9c2ff;
}

.dot {
  margin: 0 8px;
  opacity: 0.5;
}

.refresh {
  padding: 10px 16px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--brand-soft);
  color: #e9dcff;
  font-size: 12px;
  transition: all 0.2s ease;
}

.refresh:hover:not(:disabled) {
  border-color: var(--brand);
  transform: translateY(-1px);
}

.refresh:disabled {
  opacity: 0.6;
  cursor: progress;
}

.alert {
  margin: 0;
  padding: 11px 14px;
  border-radius: 11px;
  font-size: 12px;
  color: #ffb4b4;
  background: rgba(248, 81, 73, 0.1);
  border: 1px solid rgba(248, 81, 73, 0.26);
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr);
  gap: 16px;
}

.panel {
  padding: 20px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-soft);
  background: linear-gradient(165deg, rgba(22, 27, 34, 0.9), rgba(13, 17, 23, 0.72));
  box-shadow: var(--shadow);
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.panel-head h2 {
  margin: 0 0 4px;
  font-size: 15px;
}

.panel-head p {
  margin: 0;
  font-size: 11px;
  color: var(--text-muted);
}

.chip {
  flex: 0 0 auto;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 10px;
  letter-spacing: 0.06em;
  color: #d9c2ff;
  background: rgba(138, 43, 226, 0.14);
  border: 1px solid rgba(138, 43, 226, 0.26);
}

.quick-actions {
  padding-bottom: 22px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.action-buttons button {
  padding: 12px 18px;
  border-radius: 11px;
  border: 1px solid var(--border-soft);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text);
  font-size: 13px;
  transition: all 0.2s ease;
}

.action-buttons button:hover {
  border-color: var(--brand);
  background: var(--brand-soft);
  transform: translateY(-2px);
}

.footnote {
  font-size: 11px;
  color: var(--text-muted);
  text-align: right;
}

.footnote code {
  color: #d9c2ff;
}

@media (max-width: 1180px) {
  .stats-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .stats-row {
    grid-template-columns: 1fr;
  }
}
</style>
