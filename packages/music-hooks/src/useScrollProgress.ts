/**
 * §9.x — Lenis 平滑滚动进度 Hook
 *
 * 接入 Lenis（MIT）实现页面/容器平滑滚动，并返回当前滚动进度（0-1）。
 * 适用于需要滚动触发动效、进度条、滚动监听的场景。
 *
 * @example
 *   import { useScrollProgress } from '@yyc3/music-hooks';
 *   const { progress, isScrolling } = useScrollProgress({ containerRef });
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import Lenis from 'lenis';

interface UseScrollProgressOptions {
  /** 滚动容器 ref（不传则监听 window） */
  containerRef?: React.RefObject<HTMLElement | null>;
  /** 滚动平滑度，越大越平滑 */
  lerp?: number;
  /** 滚动进度变化回调 */
  onProgress?: (progress: number) => void;
}

/**
 * 返回滚动进度与滚动状态
 * - progress: 当前滚动进度 0-1
 * - isScrolling: 当前是否正在滚动
 * - scrollY: 当前滚动位置（px）
 * - maxScroll: 最大可滚动距离（px）
 */
export function useScrollProgress({
  containerRef,
  lerp = 0.1,
  onProgress,
}: UseScrollProgressOptions = {}) {
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
    return {
      y: window.scrollY,
      max: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
    };
  }, [containerRef]);

  useEffect(() => {
    const metrics = getScrollMetrics();
    setScrollY(metrics.y);
    setMaxScroll(metrics.max);
    setProgress(metrics.max > 0 ? metrics.y / metrics.max : 0);
  }, [getScrollMetrics]);

  useEffect(() => {
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

    const raf = (time: number) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [containerRef, lerp, getScrollMetrics, onProgress]);

  return { progress, isScrolling, scrollY, maxScroll };
}
