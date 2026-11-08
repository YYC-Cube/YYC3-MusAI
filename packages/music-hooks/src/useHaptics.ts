import { useCallback, useRef } from 'react';

// ==========================================
// Haptic Feedback Utility Hook
// ==========================================
// Uses navigator.vibrate() API for tactile feedback on mobile devices.
// Falls back gracefully (no-op) when vibration is unsupported.

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection' | 'swipe' | 'voice';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 30, 10, 30, 40],   // ta-ta-TAP
  warning: [30, 50, 30],            // tap-pause-tap
  error: [50, 100, 50, 100, 100],   // bzz-pause-bzz-pause-BZZZ
  selection: 8,
  swipe: [15, 20, 30],              // ramp-up feel for swipe confirm
  voice: [5, 15, 5],                // gentle double-tap for voice events
};

export interface HapticsReturn {
  /** Whether the device supports vibration */
  supported: boolean;
  /** Trigger a haptic pattern */
  trigger: (pattern: HapticPattern) => void;
  /** Trigger a custom vibration pattern */
  vibrate: (pattern: number | number[]) => void;
  /** Cancel any active vibration */
  cancel: () => void;
}

export function useHaptics(): HapticsReturn {
  const supported = typeof navigator !== 'undefined' && 'vibrate' in navigator;
  const lastTriggerRef = useRef(0);

  const vibrate = useCallback(
    (pattern: number | number[]) => {
      if (!supported) return;
      // Throttle: minimum 30ms between haptic events
      const now = performance.now();
      if (now - lastTriggerRef.current < 30) return;
      lastTriggerRef.current = now;

      try {
        navigator.vibrate(pattern);
      } catch {
        // Silently fail — some browsers throw on vibrate
      }
    },
    [supported]
  );

  const trigger = useCallback(
    (pattern: HapticPattern) => {
      vibrate(PATTERNS[pattern] || 10);
    },
    [vibrate]
  );

  const cancel = useCallback(() => {
    if (!supported) return;
    try {
      navigator.vibrate(0);
    } catch {}
  }, [supported]);

  return { supported, trigger, vibrate, cancel };
}
