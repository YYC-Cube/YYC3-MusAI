// printResults 汇总输出测试（test-runner.ts 的报告分支）
import { afterEach, describe, expect, it, vi } from 'vitest'
import { assertTruthy, createSuite, printResults } from '../src/test-runner'
import type { TestSuiteResult } from '../src/test-runner'

const makeSuite = (overrides: Partial<TestSuiteResult> = {}): TestSuiteResult => ({
  suiteName: 'suite',
  results: [],
  passed: 0,
  failed: 0,
  totalMs: 0,
  ...overrides,
})

describe('printResults 汇总输出', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('打印通过/失败用例并返回累计统计', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})

    const suites: TestSuiteResult[] = [
      makeSuite({
        suiteName: '核心套件',
        results: [
          { name: '用例 A', passed: true, durationMs: 1.234 },
          { name: '用例 B', passed: false, error: 'boom', durationMs: 0.5 },
        ],
        passed: 1,
        failed: 1,
        totalMs: 2.5,
      }),
      makeSuite({
        suiteName: '空套件',
        results: [],
        passed: 0,
        failed: 0,
        totalMs: 0,
      }),
    ]

    const totals = printResults(suites)

    expect(totals).toEqual({ totalPassed: 1, totalFailed: 1, total: 2 })

    const output = log.mock.calls.map((call) => call.join(' ')).join('\n')
    expect(output).toContain('❌ 核心套件')
    expect(output).toContain('✓ 用例 A (1.2ms)')
    expect(output).toContain('✗ 用例 B — boom')
    expect(output).toContain('✅ 空套件')
    expect(output).toContain('总计: 1/2 通过 | 1 失败')
    expect(output).toContain('='.repeat(50))
  })

  it('全部通过时不输出失败标记', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})

    const totals = printResults([
      makeSuite({
        suiteName: '全绿',
        results: [{ name: 'ok', passed: true, durationMs: 0 }],
        passed: 1,
        failed: 0,
        totalMs: 1,
      }),
    ])

    expect(totals.total).toBe(1)
    const output = log.mock.calls.map((call) => call.join(' ')).join('\n')
    expect(output).toContain('✅ 全绿 (1/1 passed')
    expect(output).not.toContain('✗')
  })

  it('空列表时总计为零', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    expect(printResults([])).toEqual({ totalPassed: 0, totalFailed: 0, total: 0 })
  })
})

describe('失败聚合与默认断言消息', () => {
  it('抛出非 Error 值时回退为字符串错误信息', async () => {
    const suite = createSuite('non-error')
    suite.test('抛字符串', () => {
      throw 'plain failure'
    })
    const result = await suite.run()
    expect(result.failed).toBe(1)
    expect(result.results[0].error).toBe('plain failure')
  })

  it('assertTruthy 未提供消息时使用默认文案', () => {
    expect(() => assertTruthy(0)).toThrow(/Expected truthy, got 0/)
  })
})
