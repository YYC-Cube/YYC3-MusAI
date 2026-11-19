/**
 * 新增 hooks 单元测试（W1）— useWaveform / useMediaQuery / useScrollProgress
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useMediaQuery } from '../src/useMediaQuery';
import { useScrollProgress } from '../src/useScrollProgress';
import { useWaveform } from '../src/useWaveform';

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
