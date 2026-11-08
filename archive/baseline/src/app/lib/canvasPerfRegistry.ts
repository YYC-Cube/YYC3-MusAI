/**
 * §25-26.x — Canvas Performance Registry (全局性能监控注册表)
 *
 * Shared performance data bus between EmotionRipple / particle systems
 * and PerfMonitor. Uses a singleton on window to avoid hook coupling.
 *
 * EmotionRipple writes metrics each frame; PerfMonitor reads them on its
 * own 1-second sampling interval — zero cross-component hooks needed.
 */

export interface CanvasPerfData {
  rippleCount: number;
  particleCount: number;
  /** Last canvas draw duration in ms */
  drawTimeMs: number;
  /** Canvas-specific FPS (may differ from main rAF FPS if throttled) */
  canvasFps: number;
  /** Whether climax mode is active */
  isClimax: boolean;
  /** Timestamp of last update */
  lastUpdate: number;
}

const DEFAULT_DATA: CanvasPerfData = {
  rippleCount: 0,
  particleCount: 0,
  drawTimeMs: 0,
  canvasFps: 0,
  isClimax: false,
  lastUpdate: 0,
};

const REGISTRY_KEY = '__dmusic_canvas_perf__';

/** Get current canvas perf data (read by PerfMonitor) */
export function getCanvasPerf(): CanvasPerfData {
  return (window as any)[REGISTRY_KEY] || DEFAULT_DATA;
}

/** Update canvas perf data (written by EmotionRipple) */
export function setCanvasPerf(data: Partial<CanvasPerfData>): void {
  const current = (window as any)[REGISTRY_KEY] || { ...DEFAULT_DATA };
  (window as any)[REGISTRY_KEY] = { ...current, ...data, lastUpdate: Date.now() };
}
