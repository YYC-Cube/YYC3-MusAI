/**
 * printResults 单元测试 — 结果汇总输出
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { printResults, type TestSuiteResult } from '../src/test-runner';

afterEach(() => {
  vi.restoreAllMocks();
});

function makeSuite(over: Partial<TestSuiteResult> & { suiteName: string }): TestSuiteResult {
  return {
    passed: 2,
    failed: 0,
    totalMs: 12.5,
    results: [
      { name: 'a', passed: true, durationMs: 5 },
      { name: 'b', passed: true, durationMs: 7.5 },
    ],
    ...over,
  } as TestSuiteResult;
}

describe('printResults', () => {
  it('全部通过时统计正确并输出套件名', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const summary = printResults([makeSuite({ suiteName: '播放核心' })]);
    expect(summary).toEqual({ totalPassed: 2, totalFailed: 0, total: 2 });
    const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toContain('播放核心');
    expect(output).toContain('✅');
  });

  it('含失败项时标记 ❌ 并列出错误', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const suite = makeSuite({
      suiteName: '队列',
      passed: 1,
      failed: 1,
      results: [
        { name: 'ok', passed: true, durationMs: 1 },
        { name: 'bad', passed: false, durationMs: 2, error: 'boom' },
      ],
    });
    const summary = printResults([suite]);
    expect(summary.totalFailed).toBe(1);
    const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toContain('❌');
    expect(output).toContain('boom');
  });

  it('多套件汇总累加', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const summary = printResults([
      makeSuite({ suiteName: 's1' }),
      makeSuite({ suiteName: 's2', passed: 3, failed: 1, results: [] }),
    ]);
    expect(summary).toEqual({ totalPassed: 5, totalFailed: 1, total: 6 });
  });

  it('空套件列表返回零值', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(printResults([])).toEqual({ totalPassed: 0, totalFailed: 0, total: 0 });
  });
});
