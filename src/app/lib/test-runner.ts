/**
 * D-Music §7.1 — Lightweight Test Runner
 * 可在浏览器控制台运行: import('/src/app/lib/core-tests.ts').then(m => m.runAllTests())
 * 或通过 PerfMonitor 面板中的 "Run Tests" 按钮触发
 */

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

export interface TestSuiteResult {
  suiteName: string;
  results: TestResult[];
  passed: number;
  failed: number;
  totalMs: number;
}

type TestFn = () => void | Promise<void>;

class TestSuite {
  private tests: Array<{ name: string; fn: TestFn }> = [];
  constructor(public suiteName: string) {}

  test(name: string, fn: TestFn) {
    this.tests.push({ name, fn });
  }

  async run(): Promise<TestSuiteResult> {
    const results: TestResult[] = [];
    let passed = 0;
    let failed = 0;
    const suiteStart = performance.now();

    for (const t of this.tests) {
      const start = performance.now();
      try {
        await t.fn();
        results.push({ name: t.name, passed: true, durationMs: performance.now() - start });
        passed++;
      } catch (err: any) {
        results.push({ name: t.name, passed: false, error: err?.message || String(err), durationMs: performance.now() - start });
        failed++;
      }
    }

    return {
      suiteName: this.suiteName,
      results,
      passed,
      failed,
      totalMs: performance.now() - suiteStart,
    };
  }
}

export function createSuite(name: string): TestSuite {
  return new TestSuite(name);
}

// Assertion helpers
export function assert(condition: boolean, msg = 'Assertion failed') {
  if (!condition) throw new Error(msg);
}

export function assertEqual<T>(actual: T, expected: T, msg?: string) {
  if (actual !== expected) {
    throw new Error(msg || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

export function assertDeepEqual(actual: any, expected: any, msg?: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(msg || `Deep equal failed:\n  actual:   ${a}\n  expected: ${e}`);
  }
}

export function assertThrows(fn: () => void, msg?: string) {
  let threw = false;
  try { fn(); } catch { threw = true; }
  if (!threw) throw new Error(msg || 'Expected function to throw');
}

export function assertTruthy(val: any, msg?: string) {
  if (!val) throw new Error(msg || `Expected truthy, got ${val}`);
}

export function assertContains(str: string, sub: string, msg?: string) {
  if (!str.includes(sub)) {
    throw new Error(msg || `Expected "${str}" to contain "${sub}"`);
  }
}

export function assertInRange(val: number, min: number, max: number, msg?: string) {
  if (val < min || val > max) {
    throw new Error(msg || `Expected ${val} to be in range [${min}, ${max}]`);
  }
}

// Pretty print results to console
export function printResults(suites: TestSuiteResult[]) {
  let totalPassed = 0;
  let totalFailed = 0;

  for (const suite of suites) {
    const icon = suite.failed === 0 ? '✅' : '❌';
    console.log(`\n${icon} ${suite.suiteName} (${suite.passed}/${suite.results.length} passed, ${suite.totalMs.toFixed(1)}ms)`);
    for (const r of suite.results) {
      if (r.passed) {
        console.log(`  ✓ ${r.name} (${r.durationMs.toFixed(1)}ms)`);
      } else {
        console.log(`  ✗ ${r.name} — ${r.error}`);
      }
    }
    totalPassed += suite.passed;
    totalFailed += suite.failed;
  }

  const total = totalPassed + totalFailed;
  console.log(`\n${'='.repeat(50)}`);
  console.log(`总计: ${totalPassed}/${total} 通过 | ${totalFailed} 失败`);
  console.log(`${'='.repeat(50)}`);

  return { totalPassed, totalFailed, total };
}
