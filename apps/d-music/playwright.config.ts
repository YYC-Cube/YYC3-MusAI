import { defineConfig } from '@playwright/test'

// YYC³ D-Music — E2E 冒烟配置（阶段五：150+ 自研浏览器用例的 Playwright 化第一站）
export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://localhost:3199',
    trace: 'off',
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
