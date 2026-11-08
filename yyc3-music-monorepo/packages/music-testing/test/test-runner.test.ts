// 自研 TestSuite 运行器基础设施测试（test-runner.ts 自身的单元测试）
import { describe, it, expect } from 'vitest'
import {
  createSuite,
  assert,
  assertEqual,
  assertDeepEqual,
  assertThrows,
  assertTruthy,
  assertContains,
  assertInRange,
} from '../src/test-runner'

describe('TestSuite 运行器', () => {
  it('注册并执行通过的测试，产出统计', async () => {
    const suite = createSuite('demo-pass');
    suite.test('a 通过', () => {});
    suite.test('b 异步通过', async () => {});
    const result = await suite.run();
    expect(result.suiteName).toBe('demo-pass');
    expect(result.passed).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.results).toHaveLength(2);
    expect(result.results.every(r => r.passed)).toBe(true);
    expect(result.totalMs).toBeGreaterThanOrEqual(0);
  });

  it('失败的测试被捕获并记录错误信息', async () => {
    const suite = createSuite('demo-fail');
    suite.test('会失败', () => { throw new Error('boom'); });
    const result = await suite.run();
    expect(result.failed).toBe(1);
    expect(result.passed).toBe(0);
    expect(result.results[0].error).toContain('boom');
  });

  it('空套件产出零统计', async () => {
    const result = await createSuite('empty').run();
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.results).toHaveLength(0);
  });
});

describe('断言助手', () => {
  it('assert 条件为假时抛出', () => {
    expect(() => assert(true)).not.toThrow();
    expect(() => assert(false)).toThrow(/Assertion failed/);
    expect(() => assert(false, '自定义消息')).toThrow('自定义消息');
  });

  it('assertEqual 严格相等', () => {
    expect(() => assertEqual(1, 1)).not.toThrow();
    expect(() => assertEqual('a', 'b')).toThrow();
  });

  it('assertDeepEqual 深比较', () => {
    expect(() => assertDeepEqual({ a: [1, 2] }, { a: [1, 2] })).not.toThrow();
    expect(() => assertDeepEqual({ a: 1 }, { a: 2 })).toThrow();
  });

  it('assertThrows 捕获抛出的函数', () => {
    expect(() => assertThrows(() => { throw new Error('x'); })).not.toThrow();
    expect(() => assertThrows(() => {})).toThrow();
  });

  it('assertTruthy 对假值抛出', () => {
    expect(() => assertTruthy(1, 'n')).not.toThrow();
    expect(() => assertTruthy(0, 'zero')).toThrow(/zero/);
    expect(() => assertTruthy('', 'empty')).toThrow();
  });

  it('assertContains 支持子串与候选数组两种用法', () => {
    expect(() => assertContains('hello world', 'world')).not.toThrow();
    expect(() => assertContains(['openai', 'template'], 'openai')).not.toThrow();
    expect(() => assertContains(['a', 'b'], 'c')).toThrow();
  });

  it('assertInRange 含边界', () => {
    expect(() => assertInRange(5, 1, 10)).not.toThrow();
    expect(() => assertInRange(1, 1, 10)).not.toThrow();
    expect(() => assertInRange(10, 1, 10)).not.toThrow();
    expect(() => assertInRange(11, 1, 10)).toThrow();
  });
});
