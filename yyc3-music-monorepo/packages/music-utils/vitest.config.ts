import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*'],
      exclude: ['src/index.ts', 'src/monitoring.js'],
      thresholds: { lines: 40, functions: 40, branches: 50, statements: 40 },
    },
  },
})
