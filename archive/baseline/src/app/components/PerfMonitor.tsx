import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, X, Cpu, MemoryStick, Layers, Clock, FlaskConical } from 'lucide-react';
import { clsx } from 'clsx';
import { getCanvasPerf, type CanvasPerfData } from '../lib/canvasPerfRegistry';
import type { TestSuiteResult } from '../lib/test-runner';

/**
 * §15.x — Performance Monitor Panel (Development Tool)
 *
 * Displays real-time metrics:
 *   • FPS (frames per second via rAF loop)
 *   • Memory usage (if performance.memory is available — Chrome only)
 *   • DOM node count
 *   • Component render time estimate
 *   • §7.1 — Run Tests button (loads core-tests.ts on demand)
 *
 * Toggle with keyboard shortcut: Ctrl+Shift+P
 * Fully self-contained — no hooks added to App.tsx.
 */

interface PerfData {
  fps: number;
  memory: { used: number; total: number } | null;
  domNodes: number;
  jsHeapPct: number;
}

export const PerfMonitor: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<PerfData>({
    fps: 0,
    memory: null,
    domNodes: 0,
    jsHeapPct: 0,
  });
  const [fpsHistory, setFpsHistory] = useState<number[]>([]);
  // §25.x — Canvas performance metrics
  const [canvasPerfState, setCanvasPerfState] = useState<CanvasPerfData | null>(null);
  // §7.1 — Test runner state
  const [testResults, setTestResults] = useState<TestSuiteResult[] | null>(null);
  const [testRunning, setTestRunning] = useState(false);

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const rafRef = useRef<number>(0);

  // §7.1 — Run tests handler (ref-based to maintain hook count)
  const handleRunTests = useRef(async () => {});
  handleRunTests.current = async () => {
    if (testRunning) return;
    setTestRunning(true);
    setTestResults(null);
    try {
      const { runAllTests } = await import('../lib/core-tests');
      const result = await runAllTests();
      setTestResults(result.suites);
    } catch (err) {
      console.error('[TestRunner] Error:', err);
    } finally {
      setTestRunning(false);
    }
  };

  // §T-x — Full test suite handler (ref-based)
  const handleRunFullTests = useRef(async () => {});
  handleRunFullTests.current = async () => {
    if (testRunning) return;
    setTestRunning(true);
    setTestResults(null);
    try {
      const { runFullTests } = await import('../lib/full-test-suite');
      const result = await runFullTests();
      setTestResults(result.suites);
    } catch (err) {
      console.error('[FullTestRunner] Error:', err);
    } finally {
      setTestRunning(false);
    }
  };

  // Toggle keyboard shortcut: Ctrl+Shift+P
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyP') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // rAF FPS counter + metric collection
  useEffect(() => {
    if (!isOpen) return;

    const measure = (now: number) => {
      frameCountRef.current++;
      const elapsed = now - lastTimeRef.current;

      if (elapsed >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / elapsed);
        frameCountRef.current = 0;
        lastTimeRef.current = now;

        // Memory (Chrome only)
        let memory: PerfData['memory'] = null;
        let jsHeapPct = 0;
        const perf = performance as any;
        if (perf.memory) {
          memory = {
            used: Math.round(perf.memory.usedJSHeapSize / 1048576),
            total: Math.round(perf.memory.jsHeapSizeLimit / 1048576),
          };
          jsHeapPct = Math.round((perf.memory.usedJSHeapSize / perf.memory.jsHeapSizeLimit) * 100);
        }

        // DOM node count
        const domNodes = document.querySelectorAll('*').length;

        setData({ fps, memory, domNodes, jsHeapPct });
        setFpsHistory((prev) => {
          const next = [...prev, fps];
          return next.length > 60 ? next.slice(-60) : next;
        });

        // §25.x — Read canvas perf from global registry
        const cp = getCanvasPerf();
        if (cp.lastUpdate > 0 && Date.now() - cp.lastUpdate < 3000) {
          setCanvasPerfState(cp);
        } else {
          setCanvasPerfState(null);
        }
      }

      rafRef.current = requestAnimationFrame(measure);
    };

    rafRef.current = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isOpen]);

  // FPS color
  const fpsColor = data.fps >= 55 ? 'text-emerald-400' : data.fps >= 30 ? 'text-yellow-400' : 'text-red-400';
  const fpsBg = data.fps >= 55 ? 'bg-emerald-400' : data.fps >= 30 ? 'bg-yellow-400' : 'bg-red-400';

  // Mini FPS sparkline
  const maxFps = Math.max(...fpsHistory, 60);
  const sparklinePoints = fpsHistory
    .map((fps, i) => {
      const x = (i / Math.max(fpsHistory.length - 1, 1)) * 120;
      const y = 24 - (fps / maxFps) * 22;
      return `${x},${y}`;
    })
    .join(' ');

  // §7.1 — Test results summary
  const testSummary = testResults
    ? {
        total: testResults.reduce((s, r) => s + r.results.length, 0),
        passed: testResults.reduce((s, r) => s + r.passed, 0),
        failed: testResults.reduce((s, r) => s + r.failed, 0),
      }
    : null;

  return (
    <>
      {/* Floating trigger button (always visible, bottom-right) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 z-[100] w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-black/80 transition-all opacity-30 hover:opacity-100"
          title="性能监控 / Perf Monitor (Ctrl+Shift+P)"
          aria-label="打开性能监控面板"
        >
          <Activity className="w-3.5 h-3.5" />
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="fixed bottom-20 right-4 z-[100] w-64 bg-black/85 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden max-h-[80vh] overflow-y-auto"
            role="dialog"
            aria-label="性能监控面板 / Performance Monitor"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
                <span className="text-xs font-semibold text-white/70">性能监控</span>
                <span className="text-[9px] text-white/20 font-mono">PERF</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded text-white/30 hover:text-white/60 transition-colors"
                aria-label="关闭"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Metrics */}
            <div className="p-3 space-y-3">
              {/* FPS */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-white/30" aria-hidden="true" />
                    <span className="text-[10px] text-white/40 uppercase tracking-wider">FPS</span>
                  </div>
                  <span className={clsx('text-lg font-bold font-mono tabular-nums', fpsColor)}>
                    {data.fps}
                  </span>
                </div>
                {/* Sparkline */}
                {fpsHistory.length > 2 && (
                  <svg width="120" height="24" className="w-full" viewBox="0 0 120 24" preserveAspectRatio="none">
                    <polyline
                      points={sparklinePoints}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className={fpsColor}
                      strokeLinejoin="round"
                    />
                    {/* 60fps reference line */}
                    <line x1="0" y1={24 - (60 / maxFps) * 22} x2="120" y2={24 - (60 / maxFps) * 22} stroke="white" strokeOpacity="0.1" strokeDasharray="2,2" />
                  </svg>
                )}
                {/* FPS bar */}
                <div className="h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                  <div
                    className={clsx('h-full rounded-full transition-all duration-300', fpsBg)}
                    style={{ width: `${Math.min((data.fps / 60) * 100, 100)}%`, opacity: 0.6 }}
                  />
                </div>
              </div>

              {/* Memory */}
              {data.memory && (
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <MemoryStick className="w-3 h-3 text-white/30" aria-hidden="true" />
                      <span className="text-[10px] text-white/40 uppercase tracking-wider">内存</span>
                    </div>
                    <span className="text-xs text-white/60 font-mono tabular-nums">
                      {data.memory.used}MB
                      <span className="text-white/20"> / {data.memory.total}MB</span>
                    </span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                    <div
                      className={clsx(
                        'h-full rounded-full transition-all duration-300',
                        data.jsHeapPct < 60 ? 'bg-emerald-400' : data.jsHeapPct < 80 ? 'bg-yellow-400' : 'bg-red-400'
                      )}
                      style={{ width: `${data.jsHeapPct}%`, opacity: 0.6 }}
                    />
                  </div>
                </div>
              )}

              {/* DOM Nodes */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-white/30" aria-hidden="true" />
                  <span className="text-[10px] text-white/40 uppercase tracking-wider">DOM节点</span>
                </div>
                <span className={clsx(
                  'text-xs font-mono tabular-nums',
                  data.domNodes < 1500 ? 'text-emerald-400/70' : data.domNodes < 3000 ? 'text-yellow-400/70' : 'text-red-400/70'
                )}>
                  {data.domNodes.toLocaleString()}
                </span>
              </div>

              {/* CPU Indicator */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-3 h-3 text-white/30" aria-hidden="true" />
                  <span className="text-[10px] text-white/40 uppercase tracking-wider">渲染</span>
                </div>
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={clsx(
                        'w-1.5 h-3 rounded-sm transition-all duration-500',
                        i < Math.ceil((data.fps / 60) * 5)
                          ? data.fps >= 55 ? 'bg-emerald-400/50' : data.fps >= 30 ? 'bg-yellow-400/50' : 'bg-red-400/50'
                          : 'bg-white/5'
                      )}
                    />
                  ))}
                  <span className="text-[10px] text-white/30 ml-1">
                    {data.fps >= 55 ? '流畅' : data.fps >= 30 ? '正常' : '卡顿'}
                  </span>
                </div>
              </div>

              {/* §25.x — Canvas / EmotionRipple Metrics */}
              {canvasPerfState && (
                <div className="pt-2 mt-2 border-t border-white/[0.06]">
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500/60" />
                    <span className="text-[10px] text-purple-400/60 uppercase tracking-wider font-medium">Canvas</span>
                    {canvasPerfState.isClimax && (
                      <span className="text-[8px] text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded-full animate-pulse">CLIMAX</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[9px] text-white/25">Canvas FPS</p>
                      <p className={clsx('text-sm font-mono font-bold tabular-nums',
                        canvasPerfState.canvasFps >= 55 ? 'text-emerald-400/80' :
                        canvasPerfState.canvasFps >= 30 ? 'text-yellow-400/80' : 'text-red-400/80'
                      )}>
                        {canvasPerfState.canvasFps}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-white/25">Draw</p>
                      <p className={clsx('text-sm font-mono font-bold tabular-nums',
                        canvasPerfState.drawTimeMs < 4 ? 'text-emerald-400/80' :
                        canvasPerfState.drawTimeMs < 12 ? 'text-yellow-400/80' : 'text-red-400/80'
                      )}>
                        {canvasPerfState.drawTimeMs}ms
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-white/25">Ripples</p>
                      <p className="text-xs text-white/50 font-mono tabular-nums">{canvasPerfState.rippleCount}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-white/25">Particles</p>
                      <p className="text-xs text-white/50 font-mono tabular-nums">{canvasPerfState.particleCount}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* §7.1 — Test Runner */}
              <div className="pt-2 mt-2 border-t border-white/[0.06]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <FlaskConical className="w-3 h-3 text-cyan-400/60" aria-hidden="true" />
                    <span className="text-[10px] text-cyan-400/60 uppercase tracking-wider font-medium">Tests</span>
                  </div>
                  <button
                    onClick={() => handleRunTests.current()}
                    disabled={testRunning}
                    className={clsx(
                      'text-[10px] px-2 py-0.5 rounded-full font-medium transition-all',
                      testRunning
                        ? 'bg-cyan-400/10 text-cyan-400/40 cursor-wait'
                        : 'bg-cyan-400/20 text-cyan-400 hover:bg-cyan-400/30 cursor-pointer'
                    )}
                  >
                    {testRunning ? '运行中...' : '运行测试'}
                  </button>
                </div>

                {/* Full Test Suite Button */}
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => handleRunFullTests.current()}
                    disabled={testRunning}
                    className={clsx(
                      'text-[10px] px-2 py-0.5 rounded-full font-medium transition-all',
                      testRunning
                        ? 'bg-purple-400/10 text-purple-400/40 cursor-wait'
                        : 'bg-purple-400/20 text-purple-400 hover:bg-purple-400/30 cursor-pointer'
                    )}
                  >
                    {testRunning ? '运行中...' : '全量测试 v11.2'}
                  </button>
                </div>

                {/* Test Results */}
                {testSummary && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/40">
                        {testSummary.passed}/{testSummary.total} 通过
                      </span>
                      <span className={clsx(
                        'text-[10px] font-bold',
                        testSummary.failed === 0 ? 'text-emerald-400' : 'text-red-400'
                      )}>
                        {testSummary.failed === 0 ? '✅ ALL PASS' : `❌ ${testSummary.failed} FAIL`}
                      </span>
                    </div>
                    {/* Per-suite breakdown */}
                    <div className="max-h-40 overflow-y-auto space-y-0.5">
                      {testResults!.map((s, i) => (
                        <div key={i} className="flex items-center justify-between text-[9px]">
                          <span className="text-white/30 truncate mr-2" title={s.suiteName}>
                            {s.failed === 0 ? '✓' : '✗'} {s.suiteName}
                          </span>
                          <span className={clsx(
                            'font-mono tabular-nums flex-shrink-0',
                            s.failed === 0 ? 'text-emerald-400/60' : 'text-red-400/60'
                          )}>
                            {s.passed}/{s.results.length}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-3 pb-2">
              <p className="text-[9px] text-white/15 text-center">
                Ctrl+Shift+P 切换 · §15.x Dev Tool
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};