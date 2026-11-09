import { defineConfig } from 'vitest/config'

// YYC³ music-player — 包内测试入口（jsdom + 共享 DOM 断言与清理）
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.ts?(x)'],
    setupFiles: ['../../test/setup-dom.ts'],
  },
})
