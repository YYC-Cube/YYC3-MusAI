import React from 'react';
import { API_BASE } from '../lib/supabase';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  reported: boolean;
}

/**
 * §7.x — Enhanced ErrorBoundary with backend error reporting.
 * On crash: logs to console, reports to /error-report endpoint,
 * and displays a bilingual (zh/en) recovery UI.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, reported: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[D-Music ErrorBoundary] Uncaught rendering error:', error);
    console.error('[D-Music ErrorBoundary] Component stack:', errorInfo.componentStack);

    // §7.x — Report to backend (fire-and-forget, never throw)
    this.reportError(error, errorInfo.componentStack || '');
  }

  private async reportError(error: Error, componentStack: string) {
    try {
      const payload = {
        message: error.message,
        stack: error.stack || '',
        componentStack,
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        timestamp: Date.now(),
      };

      await fetch(`${API_BASE}/error-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      this.setState({ reported: true });
    } catch (reportErr) {
      // Reporting itself must never crash the error boundary
      console.warn('[D-Music ErrorBoundary] Failed to report error to backend:', reportErr);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-[#0A0E2F] flex items-center justify-center z-[9999]">
          <div className="max-w-md w-full mx-4 text-center">
            {/* Animated glow */}
            <div className="relative mb-8">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-red-500/20 to-pink-500/20 border border-red-500/30 flex items-center justify-center">
                <span className="text-3xl">!</span>
              </div>
              <div className="absolute inset-0 w-20 h-20 mx-auto rounded-full bg-red-500/10 animate-ping" />
            </div>

            <h1 className="text-xl font-bold text-white mb-2 tracking-wide">
              D-Music
            </h1>

            {/* Bilingual error message */}
            <p className="text-white/50 text-sm mb-1 leading-relaxed">
              出了点问题，请刷新页面继续你的星际旅程。
            </p>
            <p className="text-white/35 text-xs mb-6 leading-relaxed">
              Something went wrong. Please refresh to continue your cosmic journey.
            </p>

            {/* Report status indicator */}
            {this.state.reported && (
              <div className="mb-4 flex items-center justify-center gap-1.5 text-emerald-400/60 text-[10px]">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>错误已上报 / Error reported</span>
              </div>
            )}

            {/* Error detail (collapsed) */}
            {this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-xs text-white/25 cursor-pointer hover:text-white/40 transition-colors">
                  错误详情 / Error details
                </summary>
                <pre className="mt-2 p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-[10px] text-red-400/70 overflow-x-auto max-h-32 overflow-y-auto font-mono whitespace-pre-wrap">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white text-sm font-semibold rounded-full transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
            >
              刷新页面 / Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
