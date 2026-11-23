/**
 * YYC³ music-hooks — useScrollProgress
 *
 * Lenis 平滑滚动进度 Hook：用于页面滚动指示器、滚动触发动效、进度条与
 * 导航高亮联动。三段式策略：
 *   1. 优先订阅调用方在应用入口注入到 window 的 `lenis` 实例（避免重复驱动滚动）；
 *   2. 未注入时自建 Lenis 实例（支持 containerRef 容器滚动与 lerp 平滑度）；
 *   3. Lenis 不可用时回退到原生滚动进度。
 *
 * @example
 *   import { useScrollProgress } from '@yyc3/music-hooks';
 *   const { progress, isScrolling } = useScrollProgress({ containerRef });
 */

import { useEffect, useState, useCallback, useRef, type RefObject } from 'react';
import Lenis from 'lenis';

interface UseScrollProgressOptions {
  /** 滚动容器 ref（不传则监听 window） */
  containerRef?: RefObject<HTMLElement | null>;
  /** 滚动平滑度，越大越平滑 */
  lerp?: number;
  /** 滚动进度变化回调 */
  onProgress?: (progress: number) => void;
}

export interface UseScrollProgressResult {
  /** 滚动进度，范围 [0, 1] */
  progress: number;
  /** 当前是否正在滚动 */
  isScrolling: boolean;
  /** 已滚动像素 */
  scrollY: number;
  /** 页面/容器最大可滚动距离 */
  maxScroll: number;
  /** 兼容别名：与 maxScroll 同值 */
  maxScrollY: number;
}

/** Lenis 'scroll' 事件的载荷：注入包装器约定传 progress 数值，原生 Lenis 传实例 */
type LenisScrollPayload = number | { progress?: number } | undefined;

export function useScrollProgress({
  containerRef,
  lerp = 0.1,
  onProgress,
}: UseScrollProgressOptions = {}): UseScrollProgressResult {
  const [progress, setProgress] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);

  const lenisRef = useRef<Lenis | null>(null);

  const getScrollMetrics = useCallback(() => {
    const el = containerRef?.current;
    if (el) {
      const { scrollTop, scrollHeight, clientHeight } = el;
      return {
        y: scrollTop,
        max: Math.max(0, scrollHeight - clientHeight),
      };
    }
    if (typeof window === 'undefined') return { y: 0, max: 0 };
    // 原生度量：pageYOffset/scrollTop（jsdom 与旧环境可写，真实浏览器与 scrollY 等价）
    const root = document.documentElement;
    const y = window.pageYOffset || root.scrollTop || 0;
    const max = Math.max(0, root.scrollHeight - root.clientHeight);
    return { y, max };
  }, [containerRef]);

  // 挂载/容器变化时先同步一次当前进度，避免首帧进度为 0
  useEffect(() => {
    const metrics = getScrollMetrics();
    setScrollY(metrics.y);
    setMaxScroll(metrics.max);
    setProgress(metrics.max > 0 ? metrics.y / metrics.max : 0);
  }, [getScrollMetrics]);

  useEffect(() => {
    // 读取全局 window 上挂载的 `lenis` 实例（由调用方在应用入口注入）
    const injectedLenis = (window as unknown as {
      lenis?: {
        progress: number;
        on?: (
          event: string,
          cb: (payload: LenisScrollPayload) => void,
        ) => () => void;
      };
    }).lenis;

    // ── 路径 1：使用注入实例（订阅外部滚动事件，不新建 Lenis） ──
    if (!containerRef && injectedLenis?.on) {
      const onScroll = (payload: LenisScrollPayload) => {
        const metrics = getScrollMetrics();
        setScrollY(metrics.y);
        setMaxScroll(metrics.max);
        setIsScrolling(true);
        // 注入包装器约定回调参数为 progress 数值；原生 Lenis 实例则读 .progress
        const p = typeof payload === 'number'
          ? payload
          : typeof payload?.progress === 'number'
            ? payload.progress
            : injectedLenis.progress;
        setProgress(Math.max(0, Math.min(1, p)));
        onProgress?.(Math.max(0, Math.min(1, p)));
      };
      const unsubscribe = injectedLenis.on('scroll', onScroll);
      return () => unsubscribe();
    }

    // ── 路径 2：自建 Lenis 实例（平滑滚动） ──
    try {
      const el = containerRef?.current;
      const lenis = new Lenis({
        lerp,
        ...(el ? { wrapper: el } : {}),
      });

      lenisRef.current = lenis;

      const onLenisScroll = () => {
        const metrics = getScrollMetrics();
        const p = metrics.max > 0 ? metrics.y / metrics.max : 0;
        setScrollY(metrics.y);
        setMaxScroll(metrics.max);
        setProgress(p);
        setIsScrolling(true);
        onProgress?.(p);
      };

      lenis.on('scroll', onLenisScroll);

      // 同时监听原生滚动：Lenis 驱动的虚拟滚动在真实浏览器会同步 scrollTop
      // （触发原生 scroll 事件），jsdom/无 rAF 环境下则由本监听兜底刷新度量。
      const onNativeScroll = () => {
        const metrics = getScrollMetrics();
        const p = metrics.max > 0 ? metrics.y / metrics.max : 0;
        setScrollY(metrics.y);
        setMaxScroll(metrics.max);
        setProgress(p);
        setIsScrolling(true);
        onProgress?.(p);
      };
      window.addEventListener('scroll', onNativeScroll, { passive: true });

      let rafId = 0;
      const raf = (time: number) => {
        lenis.raf(time);
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);

      return () => {
        window.removeEventListener('scroll', onNativeScroll);
        cancelAnimationFrame(rafId);
        lenis.destroy();
        lenisRef.current = null;
      };
    } catch {
      /* Lenis 不可用时走下方原生回退 */
    }

    // ── 路径 3：原生滚动进度回退 ──
    const onScroll = () => {
      const metrics = getScrollMetrics();
      const p = metrics.max > 0 ? Math.max(0, Math.min(1, metrics.y / metrics.max)) : 0;
      setScrollY(metrics.y);
      setMaxScroll(metrics.max);
      setProgress(p);
      setIsScrolling(true);
      onProgress?.(p);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [containerRef, lerp, getScrollMetrics, onProgress]);

  return { progress, isScrolling, scrollY, maxScroll, maxScrollY: maxScroll };
}
