/**
 * 内存 KV 驱动（KV_DRIVER=memory）
 *
 * 仅用于本地开发 / 测试：本地 PostgreSQL 为只读从库时，写入会失败。
 * 语义与 kv_store_pg / kv_store（Supabase）保持一致：按原值存取，不做 JSON 往返。
 * 进程重启后数据丢失，禁止用于生产。
 */

const store = new Map<string, any>();

export const set = async (key: string, value: any): Promise<void> => {
  store.set(key, value);
};

export const get = async (key: string): Promise<any> => store.get(key);

export const del = async (key: string): Promise<void> => {
  store.delete(key);
};

export const mset = async (keys: string[], values: any[]): Promise<void> => {
  for (let i = 0; i < keys.length; i++) store.set(keys[i], values[i]);
};

export const mget = async (keys: string[]): Promise<any[]> =>
  keys.map((k) => store.get(k)).filter((v) => v !== undefined);

export const mdel = async (keys: string[]): Promise<void> => {
  for (const k of keys) store.delete(k);
};

export const getByPrefix = async (prefix: string): Promise<any[]> => {
  const out: any[] = [];
  for (const [k, v] of store) {
    if (k.startsWith(prefix)) out.push(v);
  }
  return out;
};

/** 按前缀取键列表（诊断统计用；getByPrefix 返回值，这里返回键） */
export const getKeysByPrefix = async (prefix: string): Promise<string[]> => {
  const out: string[] = [];
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) out.push(k);
  }
  return out;
};

/** 测试辅助：清空内存 KV */
export const clearAll = async (): Promise<void> => {
  store.clear();
};
