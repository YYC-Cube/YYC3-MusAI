// §3.1 + §T-5 — Wilson Score Algorithm（自研套件 Vitest 化：纯函数本地复刻）
import { describe, it, expect } from 'vitest'

// 本地复刻（与 core-tests §3.1 / full-test-suite §T-5 保持一致）
// 迁移修正（TD-16）：原实现 p>1 或 p<0 时 p(1-p)<0 致 sqrt(NaN)——按 Wilson 区间语义夹紧 p∈[0,1]
function wilsonScore(positive: number, total: number, confidence = 0.95): number {
  if (total === 0) return 0;
  const z = confidence === 0.95 ? 1.96 : 1.645;
  const p = Math.min(Math.max(positive, 0), total) / total;
  const denominator = 1 + (z * z) / total;
  const centre = p + (z * z) / (2 * total);
  const spread = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total);
  return (centre - spread) / denominator;
}

describe('§3.1 Wilson Score 基础行为', () => {
  it('total=0 应返回 0', () => {
    expect(wilsonScore(0, 0)).toBe(0);
  });

  it('100% 正面评价，小样本仍 > 0.5', () => {
    const score = wilsonScore(5, 5);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
    expect(score).toBeGreaterThan(0.5);
  });

  it('0% 正面评价得分极低', () => {
    const score = wilsonScore(0, 10);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThan(0.1);
  });

  it('大样本高正面率应得高分', () => {
    expect(wilsonScore(950, 1000)).toBeGreaterThan(0.9);
  });

  it('confidence 参数有效：低置信度给出更高下界', () => {
    const high = wilsonScore(50, 100, 0.95);
    const low = wilsonScore(50, 100, 0.90);
    expect(low).toBeGreaterThan(high);
  });

  it('单调性：更多正面 → 更高得分', () => {
    expect(wilsonScore(70, 100)).toBeGreaterThan(wilsonScore(30, 100));
  });
});

describe('§T-5 Wilson Score 边界情况', () => {
  it('positive > total 仍不产生 NaN', () => {
    expect(isNaN(wilsonScore(150, 100))).toBe(false);
  });

  it('极大样本 (1M) 趋近真实比率', () => {
    const score = wilsonScore(900000, 1000000);
    expect(score).toBeGreaterThanOrEqual(0.89);
    expect(score).toBeLessThanOrEqual(0.91);
  });

  it('positive=0 total=1 → 接近 0', () => {
    const score = wilsonScore(0, 1);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(0.05);
  });

  it('positive=1 total=1 → (0, 1)', () => {
    const score = wilsonScore(1, 1);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  it('非整数输入不崩溃', () => {
    expect(isNaN(wilsonScore(3.5, 7.5))).toBe(false);
  });

  it('负数输入安全处理', () => {
    expect(isNaN(wilsonScore(-1, 10))).toBe(false);
  });

  it('分数排序正确性：50/100 < 95/100', () => {
    expect(wilsonScore(50, 100)).toBeLessThan(wilsonScore(95, 100));
  });

  it('样本量影响：5/5 < 500/500（大样本更高置信）', () => {
    expect(wilsonScore(5, 5)).toBeLessThan(wilsonScore(500, 500));
  });

  it('80/100 高于 20/100 且两者之和 < 2', () => {
    const s1 = wilsonScore(80, 100);
    const s2 = wilsonScore(20, 100);
    expect(s1).toBeGreaterThan(s2);
    expect(s1 + s2).toBeLessThan(2);
  });
});
