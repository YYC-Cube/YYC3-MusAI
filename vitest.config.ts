import { defineConfig } from 'vitest/config'

// YYC³ music-monorepo — Vitest 根配置（阶段五测试迁移首批 6 包 7 套件）
// 覆盖率门禁：只统计真实覆盖的源文件（all:false）；基线 50%，向管理指南 80% 目标逐批上调
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      all: false,
      include: [
        'packages/music-data/src/playlistData.ts',
        'packages/music-design-tokens/src/themes.ts',
        'packages/music-utils/src/crypto.ts',
        'packages/music-utils/src/preferences.ts',
        'packages/music-ui/src/ui/utils.ts',
        'packages/music-emotion/src/utils/emotionMap.ts',
        'packages/music-hooks/src/i18n-translations.ts',
        'packages/music-testing/src/test-runner.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    projects: [
      {
        test: {
          name: 'music-data',
          environment: 'jsdom',
          include: ['packages/music-data/test/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'music-design-tokens',
          environment: 'jsdom',
          include: ['packages/music-design-tokens/test/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'music-utils',
          environment: 'jsdom',
          include: ['packages/music-utils/test/**/*.test.ts'],
          setupFiles: ['packages/music-utils/test/setup.ts'],
        },
      },
      {
        test: {
          name: 'music-ui',
          environment: 'jsdom',
          include: ['packages/music-ui/test/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'music-emotion',
          environment: 'jsdom',
          include: ['packages/music-emotion/test/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'music-hooks',
          environment: 'jsdom',
          include: ['packages/music-hooks/test/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'music-testing',
          environment: 'jsdom',
          include: ['packages/music-testing/test/**/*.test.ts'],
          setupFiles: ['packages/music-testing/test/setup.ts'],
        },
      },
    ],
  },
})
