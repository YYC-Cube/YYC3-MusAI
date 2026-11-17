<template>
  <div class="admin-shell">
    <aside class="sidebar">
      <div class="brand">
        <img src="/D-Music-icons/logo.svg" alt="M98 品牌标识" />
        <div class="brand-text">
          <strong>M98 Admin</strong>
          <span>YanYuCloudCube™</span>
        </div>
      </div>

      <nav class="nav">
        <router-link
          v-for="item in nav"
          :key="item.name"
          :to="{ name: item.name }"
          class="nav-item"
          :class="{ active: route.name === item.name }"
        >
          <span class="nav-dot" aria-hidden="true"></span>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>

      <div class="side-foot">
        <span class="env-pill">PG15 迁移中</span>
        <p>v1.0.0 · Admin MVP</p>
      </div>
    </aside>

    <div class="main">
      <header class="topbar">
        <p class="crumb">M98 / <strong>{{ currentTitle }}</strong></p>
        <div class="user">
          <span class="avatar">{{ initials }}</span>
          <div class="user-meta">
            <strong>{{ auth.user?.name || '管理员' }}</strong>
            <span>{{ auth.user?.role || 'admin' }}</span>
          </div>
          <button class="logout" type="button" @click="handleLogout">退出</button>
        </div>
      </header>

      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

interface NavItem {
  name: string;
  label: string;
}

const nav: NavItem[] = [
  { name: 'dashboard', label: '总览' },
  { name: 'release-new', label: '发布新作品' },
  { name: 'social-schedule', label: '社交排期' },
  { name: 'analytics', label: '数据分析' },
];

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const currentTitle = computed(() =>
  typeof route.meta.title === 'string' ? route.meta.title : '总览',
);

const initials = computed(() => (auth.user?.name || 'M').slice(0, 1).toUpperCase());

function handleLogout(): void {
  auth.logout();
  router.replace({ name: 'login' });
}
</script>

<style scoped>
.admin-shell {
  display: grid;
  grid-template-columns: 236px minmax(0, 1fr);
  min-height: 100vh;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: 24px 18px;
  border-right: 1px solid var(--border-soft);
  background: linear-gradient(180deg, rgba(18, 24, 36, 0.96), rgba(11, 15, 22, 0.88));
  position: sticky;
  top: 0;
  height: 100vh;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand img {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(138, 43, 226, 0.28);
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.brand-text strong {
  font-size: 15px;
  letter-spacing: 0.04em;
}

.brand-text span {
  font-size: 10px;
  color: var(--text-muted);
  letter-spacing: 0.08em;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  border-radius: 10px;
  color: var(--text-muted);
  font-size: 13px;
  transition: background 0.2s ease, color 0.2s ease;
}

.nav-item:hover {
  background: rgba(138, 43, 226, 0.08);
  color: var(--text);
}

.nav-item.active {
  background: var(--brand-soft);
  color: #e9dcff;
}

.nav-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.55;
}

.nav-item.active .nav-dot {
  background: var(--accent);
  opacity: 1;
  box-shadow: 0 0 10px var(--accent);
}

.side-foot {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.env-pill {
  align-self: flex-start;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 10px;
  letter-spacing: 0.06em;
  color: #ffd9a8;
  background: rgba(210, 153, 34, 0.14);
  border: 1px solid rgba(210, 153, 34, 0.28);
}

.side-foot p {
  margin: 0;
  font-size: 10px;
  color: var(--text-muted);
}

.main {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 28px;
  border-bottom: 1px solid var(--border-soft);
  background: rgba(11, 15, 22, 0.72);
  backdrop-filter: blur(14px);
  position: sticky;
  top: 0;
  z-index: 20;
}

.crumb {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
  letter-spacing: 0.06em;
}

.crumb strong {
  color: var(--text);
}

.user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, var(--brand), var(--accent));
}

.user-meta {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.user-meta strong {
  font-size: 12px;
}

.user-meta span {
  font-size: 10px;
  color: var(--text-muted);
}

.logout {
  margin-left: 6px;
  padding: 7px 12px;
  border-radius: 9px;
  border: 1px solid var(--border-soft);
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  transition: all 0.2s ease;
}

.logout:hover {
  color: var(--accent);
  border-color: rgba(255, 107, 107, 0.4);
  background: rgba(255, 107, 107, 0.08);
}

.content {
  padding: 28px;
  flex: 1;
}

@media (max-width: 900px) {
  .admin-shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: static;
    height: auto;
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    gap: 14px;
    border-right: none;
    border-bottom: 1px solid var(--border-soft);
  }

  .nav {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .side-foot {
    display: none;
  }

  .content {
    padding: 18px;
  }

  .topbar {
    padding: 14px 18px;
  }
}
</style>
