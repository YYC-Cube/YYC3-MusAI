import { defineConfig } from '@playwright/test'

// YYC³ D-Music — E2E 冒烟配置（阶段五：150+ 自研浏览器用例的 Playwright 化第一站）
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  // 单 worker 串行，避免多个 spec 并行争用同一个 preview 服务导致首屏超时
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://localhost:3199',
    trace: 'off',
    navigationTimeout: 30_000,
  },
  webServer: {
    command: 'pnpm vite preview --port 3199',
    url: 'http://localhost:3199',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
})
