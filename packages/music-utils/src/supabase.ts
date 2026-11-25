// YYC³ music-utils — Supabase GoTrue 客户端（惰性，env 守卫）
//
// W8-P0 传输栈统一后，API 传输（apiFetch/apiFetchStrict/API_BASE/ApiError）
// 全部由 './apiClient' 提供（VITE_API_BASE + session JWT）。
// 本文件仅保留 Supabase GoTrue 客户端，供仍走 GoTrue 鉴权的旧应用（apps/yyc3-music）
// 使用；主应用（yyc3-musai）不消费它。
//
// 未配置 VITE_SUPABASE_URL/ANON_KEY 时不抛错不建连——只有在实际访问 supabase.* 时
// 才会触发「未配置」错误，保证本地模式与自建后端部署零 Supabase 依赖。

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';

/** 是否已提供 Supabase 配置（URL 与 Key 均非空且非占位符） */
export const SUPABASE_CONFIGURED =
  !!SUPABASE_URL && !!SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'YOUR_ANON_KEY_HERE';

// ---------------------------------------------------------------------------
// Singleton Supabase client
// Uses both window and Vite HMR to guarantee exactly ONE GoTrueClient exists
// across cold loads AND hot-module-replacement re-evaluations.
// ---------------------------------------------------------------------------
const GLOBAL_KEY = '__dmusic_supabase__';
const _w = typeof window !== 'undefined' ? (window as any) : ({} as any);

let cachedClient: SupabaseClient | null = null;

function buildClient(): SupabaseClient {
  if (_w[GLOBAL_KEY]) return _w[GLOBAL_KEY] as SupabaseClient;
  if (!SUPABASE_CONFIGURED) {
    throw new Error(
      '[music-utils] Supabase 未配置：当前部署使用自建 music-server（VITE_API_BASE），' +
        '如需 GoTrue 鉴权请提供 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY'
    );
  }
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  _w[GLOBAL_KEY] = client;
  return client;
}

/**
 * 惰性 Supabase 客户端：首次属性访问时才构建（未配置则抛出带指引的错误）。
 * 兼容既有 `supabase.auth.*` 用法。
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    if (!cachedClient) cachedClient = buildClient();
    const value = Reflect.get(cachedClient as object, prop);
    return typeof value === 'function' ? value.bind(cachedClient) : value;
  },
});

// Vite HMR: preserve the client across hot updates so the module
// never calls createClient a second time.
if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => {
    _w[GLOBAL_KEY] = cachedClient as SupabaseClient;
  });
}
