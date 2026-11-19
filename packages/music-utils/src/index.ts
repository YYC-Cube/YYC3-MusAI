// YYC³ music-utils — 基础工具层（cn / API 传输 / 会话 / Supabase 客户端 / 本地模式 / 音频上下文 / 加密 / 偏好 / 性能注册表 / AI 端点）
export * from './cn';
// apiClient（主仓 API 传输栈）与 supabase（源仓在用栈）存在四个同名导出
// （API_BASE / ApiError / apiFetch / apiFetchStrict），barrel 让位给 supabase 栈
// 以维持源仓消费方行为；apiClient 其余成员显式导出，撞名成员可经
// `@yyc3/music-utils` 内部模块（session/localMode/aiEndpoints 直连 './apiClient'）使用。
export {
  LOCAL_MODE,
  isAbortError,
  createAbortError,
  throwIfAborted,
} from './apiClient';
export * from './session';
export * from './supabase';
export * from './api';
export * from './localMode';
export * from './audioContext';
export * from './crypto';
export * from './preferences';
export * from './canvasPerfRegistry';
export * from './aiEndpoints';
// monitoring.js 通过子路径引入：import { ... } from '@yyc3/music-utils/monitoring'
