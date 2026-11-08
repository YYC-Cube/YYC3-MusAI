import { useState, useEffect, useCallback, useRef, type RefObject } from 'react';

/**
 * §9.3 — Incremental rendering hook for large lists.
 *
 * Instead of full virtualisation (which conflicts with motion/AnimatePresence),
 * this hook implements a "render-window" strategy:
 *   • Initially renders `initialCount` items
 *   • Uses IntersectionObserver on a sentinel element to load more
 *   • Caps at `totalCount` to avoid unbounded DOM growth
 *
 * Returns:
 *   - visibleCount: number of items to render (use `.slice(0, visibleCount)`)
 *   - sentinelRef: attach to a <div> at the bottom of the list
 *   - hasMore: whether there are more items to show
 *   - reset: call when the data source changes (e.g. new playlist)
 */
export function useVirtualList(
  totalCount: number,
  options?: {
    initialCount?: number;
    increment?: number;
    rootRef?: RefObject<HTMLElement | null>;
  }
) {
  const initialCount = options?.initialCount ?? 20;
  const increment = options?.increment ?? 15;

  const [visibleCount, setVisibleCount] = useState(Math.min(initialCount, totalCount));
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Reset when total changes (e.g. switching playlist / new data)
  const reset = useCallback(() => {
    setVisibleCount(Math.min(initialCount, totalCount));
  }, [initialCount, totalCount]);

  // Keep visibleCount in bounds when totalCount changes
  useEffect(() => {
    setVisibleCount((prev) => Math.min(prev, totalCount) || Math.min(initialCount, totalCount));
  }, [totalCount, initialCount]);

  // IntersectionObserver to auto-load more when sentinel is visible
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => {
            const next = prev + increment;
            return next >= totalCount ? totalCount : next;
          });
        }
      },
      {
        root: options?.rootRef?.current || null,
        rootMargin: '200px', // Pre-load 200px before sentinel is visible
        threshold: 0,
      }
    );

    observerRef.current.observe(sentinel);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [totalCount, increment, options?.rootRef]);

  return {
    visibleCount,
    sentinelRef,
    hasMore: visibleCount < totalCount,
    reset,
  };
}
