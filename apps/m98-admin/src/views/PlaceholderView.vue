<template>
  <div class="placeholder">
    <div class="hero">
      <p class="eyebrow">M98 · WORK IN PROGRESS</p>
      <h1>{{ title }}</h1>
      <p class="desc">{{ description }}</p>
    </div>

    <section class="panel">
      <h2>当前版本范围</h2>
      <ul>
        <li>总览看板与鉴权闭环已可用</li>
        <li>该模块已纳入后续迭代，接口与交互正在设计</li>
        <li>数据源迁移 PostgreSQL 15 后统一开放</li>
      </ul>
      <router-link class="back" :to="{ name: 'dashboard' }">返回总览</router-link>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const title = computed(() =>
  typeof route.meta.title === 'string' ? route.meta.title : '模块建设中',
);

const description = computed(() => {
  switch (route.name) {
    case 'release-new':
      return '作品创建、曲目上传与封面绑定。';
    case 'social-schedule':
      return '微博、抖音、B 站的内容排期与发布状态。';
    case 'analytics':
      return '听众、播放与互动的深度分析。';
    default:
      return '该模块正在建设中。';
  }
});
</script>

<style scoped>
.placeholder {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 10px;
  letter-spacing: 0.28em;
  color: var(--text-muted);
}

h1 {
  margin: 0 0 8px;
  font-size: clamp(24px, 3vw, 30px);
}

.desc {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
}

.panel {
  max-width: 720px;
  padding: 24px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-soft);
  background: linear-gradient(165deg, rgba(22, 27, 34, 0.9), rgba(13, 17, 23, 0.72));
  box-shadow: var(--shadow);
}

.panel h2 {
  margin: 0 0 14px;
  font-size: 15px;
}

.panel ul {
  margin: 0 0 22px;
  padding-left: 18px;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 2;
}

.back {
  display: inline-block;
  padding: 10px 16px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--brand-soft);
  color: #e9dcff;
  font-size: 12px;
  transition: all 0.2s ease;
}

.back:hover {
  border-color: var(--brand);
  transform: translateY(-1px);
}
</style>
