// YYC³ music-utils — monitoring.js 类型声明
declare module '@yyc3/music-utils/monitoring' {
  export declare function captureError(error: unknown, context?: Record<string, unknown>): void;
  export declare function setupGlobalErrorHandlers(): void;
  export declare function trackPerformance(name: string, duration: number, metadata?: Record<string, unknown>): void;
  export declare function trackPageLoad(): void;
  export declare function trackApiCall(url: string, duration: number, status: number): void;
  export declare function trackEvent(name: string, properties?: Record<string, unknown>): void;
  export declare function trackUserAction(action: string, target?: string): void;
  export declare function performHealthCheck(): Promise<unknown>;
  export declare function startPeriodicHealthChecks(interval?: number): unknown;
  export declare function getMonitoringSummary(): Record<string, unknown>;
}
