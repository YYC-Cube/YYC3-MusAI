import { createRouter, createWebHashHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import AdminLayout from '@/layouts/AdminLayout.vue';
import Dashboard from '@/views/Dashboard.vue';
import Login from '@/views/Login.vue';
import PlaceholderView from '@/views/PlaceholderView.vue';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: Login,
      meta: { public: true, title: '登录' },
    },
    {
      path: '/',
      component: AdminLayout,
      children: [
        {
          path: '',
          name: 'dashboard',
          component: Dashboard,
          meta: { title: '总览' },
        },
        {
          path: 'releases/new',
          name: 'release-new',
          component: PlaceholderView,
          meta: { title: '发布新作品' },
        },
        {
          path: 'social/schedule',
          name: 'social-schedule',
          component: PlaceholderView,
          meta: { title: '安排社交媒体' },
        },
        {
          path: 'analytics',
          name: 'analytics',
          component: PlaceholderView,
          meta: { title: '详细分析' },
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  const title = typeof to.meta.title === 'string' ? to.meta.title : '';

  document.title = title ? `${title} · M98 Admin` : 'M98 Admin';

  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'dashboard' };
  }
  return true;
});

export default router;
