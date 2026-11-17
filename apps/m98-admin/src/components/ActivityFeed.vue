<template>
  <div class="feed">
    <div v-if="!items.length" class="empty">暂无活动</div>
    <article v-for="item in items" :key="item.id" class="feed-item">
      <span class="feed-badge">{{ item.platform }}</span>
      <div class="feed-main">
        <p class="feed-content">{{ item.content }}</p>
        <div class="feed-meta">
          <span>{{ relativeTime(item.timestamp) }}</span>
          <span v-if="item.likes !== undefined">赞 {{ item.likes }}</span>
          <span v-if="item.comments">评 {{ item.comments }}</span>
        </div>
      </div>
      <span class="feed-type">{{ item.type || '动态' }}</span>
    </article>
  </div>
</template>

<script setup lang="ts">
import type { ActivityItem } from '@/types';

defineProps<{ items: ActivityItem[] }>();

function relativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '—';

  const diff = Date.now() - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;
  return date.toLocaleDateString('zh-CN');
}
</script>

<style scoped>
.feed {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.feed-item {
  display: flex;
  gap: 12px;
  padding: 14px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid transparent;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.feed-item:hover {
  border-color: var(--border);
  background: rgba(138, 43, 226, 0.05);
}

.feed-badge {
  flex: 0 0 auto;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 11px;
  line-height: 24px;
  color: #d9c2ff;
  background: rgba(138, 43, 226, 0.18);
  border: 1px solid rgba(138, 43, 226, 0.3);
}

.feed-main {
  flex: 1;
  min-width: 0;
}

.feed-content {
  margin: 0 0 6px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.feed-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--text-muted);
}

.feed-type {
  flex: 0 0 auto;
  font-size: 11px;
  color: var(--text-muted);
  align-self: flex-start;
}

.empty {
  padding: 28px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
  border: 1px dashed var(--border-soft);
  border-radius: var(--radius-md);
}
</style>
