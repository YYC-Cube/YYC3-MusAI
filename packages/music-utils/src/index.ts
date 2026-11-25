// YYC³ music-utils — 基础工具层（cn / API 传输 / 会话 / Supabase GoTrue(惰性) / 本地模式 / 音频上下文 / 加密 / 偏好 / 性能注册表 / AI 端点）
//
// W8-P0 传输栈统一：API 传输四件套（API_BASE / ApiError / apiFetch / apiFetchStrict）
// 唯一来源为 './apiClient'（VITE_API_BASE + session JWT + 本地模式语义）；
// './supabase' 仅保留惰性 GoTrue 客户端（supabase 代理 / SUPABASE_CONFIGURED），
// 供仍走 GoTrue 的旧应用使用——主应用生产部署零 Supabase 依赖。
export * from './cn';
export {
  API_BASE,
  ApiError,
  apiFetch,
  apiFetchStrict,
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
