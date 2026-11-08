import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/utils/**/*.ts', 'src/types/**/*.ts'],
      thresholds: { lines: 60, functions: 60, branches: 60, statements: 60 },
    },
  },
})
