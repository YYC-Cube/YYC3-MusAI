// YYC³ music-hooks — 交互逻辑层（13 个通用 hooks，按 i18n/media/interaction/env/ai 分域）
// 公开导出面与平铺时期完全一致，统一从此 barrel 出口。
export * from './i18n/i18n-translations';
export * from './ai/useAIAssistant';
export * from './media/useAudioComposer';
export * from './media/useAudioEngine';
export * from './interaction/useHaptics';
export * from './i18n/useI18n';
export * from './interaction/usePWA';
export * from './env/useResponsive';
export * from './interaction/useSwipeGesture';
export * from './media/useVirtualList';
export * from './media/useWaveform';
export * from './media/useScrollProgress';
export * from './env/useMediaQuery';
