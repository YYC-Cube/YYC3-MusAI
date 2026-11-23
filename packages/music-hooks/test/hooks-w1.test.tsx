/**
 * 新增 hooks 单元测试（W1）— useWaveform / useMediaQuery / useScrollProgress
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useMediaQuery } from '../src/env/useMediaQuery';
import { useScrollProgress } from '../src/media/useScrollProgress';
import { useWaveform } from '../src/media/useWaveform';

// ============================================================
// Lenis 模块桩：可控 FakeLenis（ok 模式）与构造抛错（throw 模式）
// ============================================================

const lenisState = vi.hoisted(() => ({
  mode: 'ok' as 'ok' | 'throw',
  instances: [] as Array<{
    options: unknown;
    on: ReturnType<typeof vi.fn>;
    raf: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
  }>,
}));

vi.mock('lenis', () => {
  class FakeLenis {
    options: unknown;
    on: ReturnType<typeof vi.fn>;
    raf: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
    constructor(opts: unknown) {
      if (lenisState.mode === 'throw') throw new Error('lenis unavailable');
      this.options = opts;
      this.on = vi.fn();
      this.raf = vi.fn();
      this.destroy = vi.fn();
      lenisState.instances.push(this);
    }
  }
  return { default: FakeLenis };
});

// ============================================================
// useWaveform
// ============================================================

/** 构造伪 AudioBuffer */
function makeBuffer(channels: number, length: number, fill: (i: number, ch: number) => number) {
  const data: Float32Array[] = [];
  for (let c = 0; c < channels; c += 1) {
    const arr = new Float32Array(length);
    for (let i = 0; i < length; i += 1) arr[i] = fill(i, c);
    data.push(arr);
  }
  return {
    numberOfChannels: channels,
    length,
    sampleRate: 44100,
    duration: length / 44100,
    getChannelData: (i: number) => data[i],
  } as unknown as AudioBuffer;
}

describe('useWaveform', () => {
  it('buffer 为 null 时返回全零且未就绪', () => {
    const { result } = renderHook(() => useWaveform(null));
    expect(result.current.ready).toBe(false);
    expect(result.current.samples).toHaveLength(512);
    expect(result.current.samples.every((v) => v === 0)).toBe(true);
  });

  it('提取峰值并归一化到 [0,1]', () => {
    // 前 1/4 段振幅 1.0，其余 0.25 → 归一化后最大 1、其余 0.25
    const buffer = makeBuffer(1, 1024, (i) => (i < 256 ? 1 : 0.25));
    const { result } = renderHook(() => useWaveform(buffer, { sampleCount: 16 }));
    expect(result.current.ready).toBe(true);
    expect(result.current.length).toBe(16);
    const samples = Array.from(result.current.samples);
    expect(Math.max(...samples)).toBeCloseTo(1, 5);
    expect(samples.every((v) => v >= 0 && v <= 1)).toBe(true);
    expect(samples.some((v) => v < 0.5)).toBe(true);
  });

  it('多声道取混合峰值', () => {
    // 左声道 0.5，右声道 0.5 → 混合 0.5；归一化后仍 ≤ 1
    const buffer = makeBuffer(2, 512, () => 0.5);
    const { result } = renderHook(() => useWaveform(buffer, { sampleCount: 8 }));
    const samples = Array.from(result.current.samples);
    expect(Math.max(...samples)).toBeCloseTo(1, 5);
  });

  it('sampleCount 可配置', () => {
    const buffer = makeBuffer(1, 100, () => 0.1);
    const { result } = renderHook(() => useWaveform(buffer, { sampleCount: 7 }));
    expect(result.current.samples).toHaveLength(7);
  });
});

// ============================================================
// useMediaQuery
// ============================================================

const listeners = new Set<(e: MediaQueryListEvent) => void>();

function stubMatchMedia(initial: boolean) {
  const mql = {
    matches: initial,
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
      listeners.add(cb);
    },
    removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
      listeners.delete(cb);
    },
  };
  vi.stubGlobal('matchMedia', vi.fn(() => mql));
  return mql;
}

describe('useMediaQuery', () => {
  afterEach(() => {
    listeners.clear();
    vi.unstubAllGlobals();
  });

  it('返回初始匹配状态', () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(true);
  });

  it('媒体变化时更新并取消订阅', () => {
    const mql = stubMatchMedia(false);
    const { result, unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(false);

    act(() => {
      mql.matches = true;
      listeners.forEach((cb) => cb({ matches: true } as MediaQueryListEvent));
    });
    expect(result.current).toBe(true);

    unmount();
    expect(listeners.size).toBe(0);
  });
});

// ============================================================
// useScrollProgress（原生回退分支）
// ============================================================

describe('useScrollProgress', () => {
  beforeEach(() => {
    // 不注入 lenis → 走原生滚动分支
    (window as any).lenis = undefined;
  });

  it('注入 lenis 时走 Lenis 分支并订阅进度', () => {
    const unsubscribe = vi.fn();
    let capturedCb: ((p: number) => void) | null = null;
    (window as any).lenis = {
      progress: 0.7,
      on: vi.fn((_evt: string, cb: (p: number) => void) => {
        capturedCb = cb;
        cb(0.7);
        return unsubscribe;
      }),
    };
    const { result, unmount } = renderHook(() => useScrollProgress());
    expect(result.current.progress).toBeCloseTo(0.7, 5);
    // Lenis 回调更新进度
    act(() => capturedCb?.(0.9));
    expect(result.current.progress).toBeCloseTo(0.9, 5);
    // 卸载时取消订阅
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
    (window as any).lenis = undefined;
  });

  it('滚动时计算 [0,1] 进度', () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 2000, configurable: true });
    Object.defineProperty(document.documentElement, 'clientHeight', { value: 500, configurable: true });
    Object.defineProperty(document.documentElement, 'scrollTop', { value: 0, configurable: true });
    Object.defineProperty(window, 'pageYOffset', { value: 0, writable: true });

    const { result } = renderHook(() => useScrollProgress());
    expect(result.current.progress).toBe(0);

    act(() => {
      (window as any).pageYOffset = 750; // max = 1500 → 0.5
      window.dispatchEvent(new Event('scroll'));
    });
    expect(result.current.progress).toBeCloseTo(0.5, 5);
    expect(result.current.scrollY).toBe(750);
    expect(result.current.maxScrollY).toBe(1500);
  });

  it('无滚动空间时进度保持 0', () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 500, configurable: true });
    Object.defineProperty(document.documentElement, 'clientHeight', { value: 500, configurable: true });
    const { result } = renderHook(() => useScrollProgress());
    expect(result.current.progress).toBe(0);
  });
});

// ============================================================
// useScrollProgress 分支补流（W5）— 注入实例载荷变体 / 自建 Lenis
// 生命周期 / 容器度量 / 原生回退
// ============================================================

describe('useScrollProgress 分支补流', () => {
  beforeEach(() => {
    lenisState.mode = 'ok';
    lenisState.instances = [];
    (window as any).lenis = undefined;
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 2000, configurable: true });
    Object.defineProperty(document.documentElement, 'clientHeight', { value: 500, configurable: true });
    Object.defineProperty(window, 'pageYOffset', { value: 0, writable: true });
  });

  afterEach(() => {
    lenisState.mode = 'ok';
    lenisState.instances = [];
    (window as any).lenis = undefined;
    vi.restoreAllMocks();
  });

  it('注入实例回调载荷为对象时读取 payload.progress，缺失时回退实例 .progress', () => {
    const unsubscribe = vi.fn();
    let captured: ((payload: unknown) => void) | null = null;
    (window as any).lenis = {
      progress: 0.7,
      on: vi.fn((_evt: string, cb: (p: unknown) => void) => {
        captured = cb;
        return unsubscribe;
      }),
    };
    const onProgress = vi.fn();
    const { result, unmount } = renderHook(() => useScrollProgress({ onProgress }));

    // 对象载荷且带 progress 字段
    act(() => captured?.({ progress: 0.42 }));
    expect(result.current.progress).toBeCloseTo(0.42, 5);
    expect(result.current.isScrolling).toBe(true);
    expect(onProgress).toHaveBeenLastCalledWith(0.42);

    // 对象载荷缺 progress → 回退注入实例的 .progress
    act(() => captured?.({}));
    expect(result.current.progress).toBeCloseTo(0.7, 5);

    // 载荷为 undefined → 同样回退实例值
    act(() => captured?.(undefined));
    expect(result.current.progress).toBeCloseTo(0.7, 5);

    // 越界值被夹取到 [0,1]
    act(() => captured?.({ progress: 1.8 }));
    expect(result.current.progress).toBe(1);

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('容器滚动时以容器度量计算进度（自建 Lenis 带 wrapper）', () => {
    const el = document.createElement('div');
    Object.defineProperty(el, 'scrollTop', { value: 100, configurable: true });
    Object.defineProperty(el, 'scrollHeight', { value: 1100, configurable: true });
    Object.defineProperty(el, 'clientHeight', { value: 600, configurable: true });

    // 稳定的 ref 标识，避免 effect 因依赖变化重建 Lenis
    const containerRef = { current: el };
    const { result } = renderHook(() => useScrollProgress({ containerRef }));

    // 挂载即同步容器度量：max = 500, y = 100 → 0.2
    expect(result.current.progress).toBeCloseTo(0.2, 5);
    expect(result.current.maxScrollY).toBe(500);
    expect(result.current.scrollY).toBe(100);

    // 自建 Lenis 收到容器 wrapper 与 lerp 配置
    expect(lenisState.instances).toHaveLength(1);
    expect(lenisState.instances[0].options).toMatchObject({ lerp: 0.1, wrapper: el });

    // 原生滚动兜底监听同样读容器度量
    act(() => {
      Object.defineProperty(el, 'scrollTop', { value: 350, configurable: true });
      window.dispatchEvent(new Event('scroll'));
    });
    expect(result.current.progress).toBeCloseTo(0.7, 5);
    expect(result.current.scrollY).toBe(350);
  });

  it('自建 Lenis 分支：订阅滚动回调、原生滚动兜底、raf 驱动与卸载清理', async () => {
    const { result, unmount } = renderHook(() => useScrollProgress());
    const instance = lenisState.instances[0];
    expect(instance).toBeDefined();
    expect(instance.on).toHaveBeenCalledWith('scroll', expect.any(Function));

    // Lenis 滚动回调按度量计算进度
    const onLenisScroll = instance.on.mock.calls[0][1] as () => void;
    act(() => onLenisScroll());
    expect(result.current.progress).toBeCloseTo(0, 5);
    expect(result.current.isScrolling).toBe(true);
    expect(result.current.maxScrollY).toBe(1500);

    // 原生滚动兜底监听（window scroll）
    act(() => {
      (window as any).pageYOffset = 750;
      window.dispatchEvent(new Event('scroll'));
    });
    expect(result.current.progress).toBeCloseTo(0.5, 5);
    expect(result.current.scrollY).toBe(750);

    // rAF 循环持续驱动 lenis.raf
    await act(async () => {
      await new Promise((r) => setTimeout(r, 40));
    });
    expect(instance.raf).toHaveBeenCalled();

    // 卸载清理：destroy + 移除监听（之后滚动不再更新进度）
    unmount();
    expect(instance.destroy).toHaveBeenCalled();
    act(() => {
      (window as any).pageYOffset = 1200;
      window.dispatchEvent(new Event('scroll'));
    });
    expect(result.current.progress).toBeCloseTo(0.5, 5);
  });

  it('Lenis 不可用时回退原生滚动分支', () => {
    lenisState.mode = 'throw';
    const onProgress = vi.fn();
    const { result, unmount } = renderHook(() => useScrollProgress({ onProgress }));

    // 未创建 Lenis；挂载即同步一次原生度量
    expect(lenisState.instances).toHaveLength(0);
    expect(result.current.progress).toBe(0);
    expect(result.current.maxScrollY).toBe(1500);

    act(() => {
      (window as any).pageYOffset = 750;
      window.dispatchEvent(new Event('scroll'));
    });
    expect(result.current.progress).toBeCloseTo(0.5, 5);
    expect(result.current.isScrolling).toBe(true);
    expect(onProgress).toHaveBeenLastCalledWith(0.5);

    // 卸载后滚动不再更新进度
    unmount();
    act(() => {
      (window as any).pageYOffset = 1200;
      window.dispatchEvent(new Event('scroll'));
    });
    expect(result.current.progress).toBeCloseTo(0.5, 5);

    // 无滚动空间时进度保持 0
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 500, configurable: true });
    const { result: r2, unmount: u2 } = renderHook(() => useScrollProgress());
    expect(r2.current.progress).toBe(0);
    u2();
  });
});
