import { useRef, useCallback, useEffect, useState } from 'react';

interface SwipeConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;  // min distance in px to trigger
  enabled?: boolean;
}

interface SwipeState {
  isSwiping: boolean;
  direction: 'left' | 'right' | null;
  distance: number;
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  threshold = 80,
  enabled = true,
}: SwipeConfig) {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchCurrentX = useRef(0);
  const isDragging = useRef(false);

  const [swipeState, setSwipeState] = useState<SwipeState>({
    isSwiping: false,
    direction: null,
    distance: 0,
  });

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;
      // Don't capture touches on interactive elements
      const target = e.target as HTMLElement;
      if (
        target.closest('input') ||
        target.closest('textarea') ||
        target.closest('button') ||
        target.closest('[data-no-swipe]') ||
        target.closest('[role="slider"]')
      ) {
        return;
      }

      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      touchCurrentX.current = e.touches[0].clientX;
      isDragging.current = false;
    },
    [enabled]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;
      if (touchStartX.current === 0) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const diffX = currentX - touchStartX.current;
      const diffY = currentY - touchStartY.current;

      // Only track horizontal swipes (angle < 30 degrees from horizontal)
      if (!isDragging.current) {
        if (Math.abs(diffX) < 10 && Math.abs(diffY) < 10) return;
        if (Math.abs(diffY) > Math.abs(diffX)) {
          // Vertical scroll, abort
          touchStartX.current = 0;
          return;
        }
        isDragging.current = true;
      }

      touchCurrentX.current = currentX;
      const distance = Math.abs(diffX);
      const direction = diffX > 0 ? 'right' : 'left';

      setSwipeState({
        isSwiping: distance > 20,
        direction: distance > 20 ? direction : null,
        distance,
      });
    },
    [enabled]
  );

  const handleTouchEnd = useCallback(() => {
    if (!enabled || !isDragging.current) {
      touchStartX.current = 0;
      setSwipeState({ isSwiping: false, direction: null, distance: 0 });
      return;
    }

    const diff = touchCurrentX.current - touchStartX.current;
    const distance = Math.abs(diff);

    if (distance >= threshold) {
      // Haptic feedback on successful swipe
      try { navigator.vibrate?.([15, 20, 30]); } catch {}
      if (diff > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (diff < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }

    touchStartX.current = 0;
    isDragging.current = false;
    setSwipeState({ isSwiping: false, direction: null, distance: 0 });
  }, [enabled, threshold, onSwipeLeft, onSwipeRight]);

  useEffect(() => {
    if (!enabled) return;

    const options = { passive: true };
    document.addEventListener('touchstart', handleTouchStart, options);
    document.addEventListener('touchmove', handleTouchMove, options);
    document.addEventListener('touchend', handleTouchEnd, options);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return swipeState;
}
