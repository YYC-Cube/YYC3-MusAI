import { defineConfig } from 'vitest/config'

// YYC³ music-monorepo — Vitest 根配置
// 覆盖率门禁：全量可执行源码（all:true），阈值 95/92/88/95（2026-11-21 覆盖率提升收口，
// 实测 99.11L/92.82B/97.38F，与源仓 vitest.config.ts 一致；80 时代阈值已退役）。
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
        // M98 独立产品线（Express + Jest），由包内 `pnpm --filter @yyc3/m98-server test` 独立门禁
        'packages/m98-server/src/**',
      ],
      thresholds: {
        lines: 95,
        functions: 92,
        branches: 88,
        statements: 95,
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
          // LiveSessionPanel 自动推导直播间通道在模块加载期读取 API_BASE，
          // 测试需合法基址（生产由 .env.production / 宿主注入）
          env: { VITE_API_BASE: 'https://api.example.com/functions/v1/make-server-f626b673' },
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
        // W3 补流媒体：music-live 顶层架构测试（LiveRoom 槽位/LiveClient 队列/弹幕看板等）
        test: {
          name: 'music-live',
          environment: 'jsdom',
          include: ['packages/music-live/test/**/*.test.ts?(x)'],
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
