/**
 * file: vite.config.ts
 * description: 管理后台 Vite 配置 · Vue 插件、@ 别名与 API 代理
 * author: YYC³ Team
 * version: v1.1.0
 * created: 2026-11-07
 * updated: 2026-11-07
 * status: active
 * tags: [config],[vite],[admin]
 *
 * dependencies: Vite 7, @vitejs/plugin-vue
 * exports: 默认配置
 * notes: 开发端口 3032，符合 YYC³ 端口自 3030 起的约定
 */

import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:4000';

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 3032,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});
