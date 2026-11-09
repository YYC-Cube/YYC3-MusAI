import { defineConfig } from 'vitest/config'

// YYC³ music-monorepo — Vitest 根配置
// 覆盖率门禁：全量可执行源码（all:true），语句/分支/函数/行四项均 ≥80%。
// 排除项仅限不可执行或非运行时逻辑：类型声明、纯 re-export 桶文件、测试套件定义数据。
// music-server 为 Deno 运行时，由 `pnpm test:deno:coverage` 独立统计并单独卡 80%。
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      all: true,
      include: ['packages/*/src/**/*.{ts,tsx,js,jsx}'],
      exclude: [
        '**/*.d.ts',
        '**/types.ts',
        '**/types/**',
        // 纯 re-export 桶文件，无可执行逻辑
        '**/index.ts',
        // 测试套件定义（数据即用例），不作为产品运行时代码计量
        'packages/music-testing/src/core-tests.ts',
        'packages/music-testing/src/e2e-specs.ts',
        'packages/music-testing/src/full-test-suite.ts',
        // Deno 运行时后端，由 deno coverage 独立门禁
        'packages/music-server/src/**',
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
          include: ['packages/music-ui/test/**/*.test.ts?(x)'],
          setupFiles: ['test/setup-dom.ts'],
        },
      },
      {
        test: {
          name: 'music-emotion',
          environment: 'jsdom',
          include: ['packages/music-emotion/test/**/*.test.ts?(x)'],
          setupFiles: ['test/setup-dom.ts'],
        },
      },
      {
        test: {
          name: 'music-hooks',
          environment: 'jsdom',
          include: ['packages/music-hooks/test/**/*.test.ts?(x)'],
          setupFiles: ['test/setup-dom.ts'],
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
      {
        test: {
          name: 'music-ai',
          environment: 'jsdom',
          include: ['packages/music-ai/test/**/*.test.ts?(x)'],
          setupFiles: ['test/setup-dom.ts'],
        },
      },
      {
        test: {
          name: 'music-audio',
          environment: 'jsdom',
          include: ['packages/music-audio/test/**/*.test.ts?(x)'],
          setupFiles: ['test/setup-dom.ts'],
        },
      },
      {
        test: {
          name: 'music-commerce',
          environment: 'jsdom',
          include: ['packages/music-commerce/test/**/*.test.ts?(x)'],
          setupFiles: ['test/setup-dom.ts'],
        },
      },
      {
        test: {
          name: 'music-community',
          environment: 'jsdom',
          include: ['packages/music-community/test/**/*.test.ts?(x)'],
          setupFiles: ['test/setup-dom.ts'],
        },
      },
      {
        test: {
          name: 'music-growth',
          environment: 'jsdom',
          include: ['packages/music-growth/test/**/*.test.ts?(x)'],
          setupFiles: ['test/setup-dom.ts'],
        },
      },
      {
        test: {
          name: 'music-lyrics',
          environment: 'jsdom',
          include: ['packages/music-lyrics/test/**/*.test.ts?(x)'],
          setupFiles: ['test/setup-dom.ts'],
        },
      },
      {
        test: {
          name: 'music-player',
          environment: 'jsdom',
          include: ['packages/music-player/test/**/*.test.ts?(x)'],
          setupFiles: ['test/setup-dom.ts'],
        },
      },
      {
        test: {
          name: 'music-server',
          environment: 'node',
          include: ['packages/music-server/test/**/*.test.ts?(x)'],
          // music-server 使用 Deno 风格依赖说明符，在 Node 测试环境重定向到本地安装的 zod
          alias: {
            'npm:zod@3.23.8': 'zod',
          },
        },
      },
      {
        test: {
          name: 'music-voice',
          environment: 'jsdom',
          include: ['packages/music-voice/test/**/*.test.ts?(x)'],
          setupFiles: ['test/setup-dom.ts'],
        },
      },
    ],
  },
})
