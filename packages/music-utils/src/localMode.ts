/**
 * 本地模式数据契约
 *
 * 无后端 / 无网络时接管 apiFetch 的数据读写：GET 读缓存、写请求落缓存、
 * DELETE 清缓存。所有键统一挂在 STORAGE_PREFIX 下；非浏览器环境用内存 Map 兜底。
 */
/** 本地存储键统一前缀，任何地方都不得散写魔法字符串 */
const STORAGE_PREFIX = 'yyc3:music:local:';
/** 模式开关独立成键，读取数据时需排除 */
const MODE_KEY = `${STORAGE_PREFIX}mode`;
const MODE_ON = '1';

/** SSR / 测试等无 localStorage 环境的内存兜底 */
const memoryStore = new Map<string, string>();

/** 与 supabase.ts 保持相同的 AbortError 形状；本地定义以避免与 supabase 双向 import */
function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  const error = new Error('The operation was aborted');
  error.name = 'AbortError';
  throw error;
}

function getStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function readRaw(key: string): string | null {
  const storage = getStorage();
  if (!storage) return memoryStore.get(key) ?? null;
  try {
    return storage.getItem(key);
  } catch {
    // 存储被禁用（隐私模式等）时退回内存
    return memoryStore.get(key) ?? null;
  }
}

function writeRaw(key: string, value: string): void {
  const storage = getStorage();
  if (!storage) {
    memoryStore.set(key, value);
    return;
  }
  try {
    storage.setItem(key, value);
  } catch {
    memoryStore.set(key, value);
  }
}

function removeRaw(key: string): void {
  memoryStore.delete(key);
  try {
    getStorage()?.removeItem(key);
  } catch {
    // 存储不可用时内存副本已清除，忽略即可
  }
}

/** 每个 path 对应一个缓存条目 */
function dataKey(path: string): string {
  return `${STORAGE_PREFIX}${encodeURIComponent(path)}`;
}

function listDataKeys(): string[] {
  const keys = new Set<string>();
  const storage = getStorage();
  if (storage) {
    try {
      for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (key) keys.add(key);
      }
    } catch {
      // 忽略存储枚举异常
    }
  }
  for (const key of memoryStore.keys()) keys.add(key);
  return [...keys].filter((key) => key.startsWith(STORAGE_PREFIX) && key !== MODE_KEY);
}

/** 由 path 派生稳定 id，保证同一路径重复写入不会产生新实体 */
function deriveId(path: string): string {
  let hash = 5381;
  for (let i = 0; i < path.length; i += 1) {
    hash = (hash * 33) ^ path.charCodeAt(i);
  }
  return `local-${(hash >>> 0).toString(36)}`;
}

function parseBody(body: BodyInit | null | undefined): Record<string, unknown> {
  if (typeof body !== 'string') return {};
  try {
    const parsed: unknown = JSON.parse(body);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** 是否处于本地模式（默认关闭，由 setLocalMode 显式开启并持久化） */
export function isLocalMode(): boolean {
  return readRaw(MODE_KEY) === MODE_ON;
}

/** 持久化模式开关 */
export function setLocalMode(enabled: boolean): void {
  if (enabled) writeRaw(MODE_KEY, MODE_ON);
  else removeRaw(MODE_KEY);
}

/**
 * 本地数据请求：
 * - GET 读缓存，未命中或 JSON 损坏返回 null；
 * - POST/PUT/PATCH 把请求体写入缓存并返回 { ...body, id }；
 * - DELETE 删除缓存并返回 { success: true }（不存在同样返回成功）。
 * 中止时抛 AbortError，不静默降级。
 */
export async function localApiFetch<T>(
  path: string,
  init?: RequestInit & { signal?: AbortSignal }
): Promise<T | null> {
  const signal = init?.signal;
  throwIfAborted(signal);

  const method = (init?.method ?? 'GET').toUpperCase();
  const key = dataKey(path);

  if (method === 'GET') {
    const raw = readRaw(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      // 损坏数据视为未命中，不抛异常
      return null;
    }
  }

  if (method === 'DELETE') {
    removeRaw(key);
    return { success: true } as unknown as T;
  }

  const body = parseBody(init?.body);
  const id = body.id ?? deriveId(path);
  const record = { ...body, id };
  throwIfAborted(signal);
  writeRaw(key, JSON.stringify(record));
  return record as unknown as T;
}

/** 本地缓存概览（不含模式开关本身） */
export function getLocalStats(): { entries: number; bytes: number; keys: string[]; mode: boolean } {
  const keys = listDataKeys();
  let bytes = 0;
  for (const key of keys) {
    bytes += byteLength(key) + byteLength(readRaw(key) ?? '');
  }
  return { entries: keys.length, bytes, keys, mode: isLocalMode() };
}

/** 清空本地缓存数据；模式开关属于配置项，保留 */
export function clearLocalData(): void {
  for (const key of listDataKeys()) removeRaw(key);
}
