/**
 * KV 驱动分发（pg / supabase / memory）
 *
 * 独立成模块，避免 auth.ts 与 server-utils.ts 之间的循环依赖。
 * 惰性读取 KV_DRIVER，便于测试在 import 后设置环境变量。
 */

import * as kvSupabase from "./kv_store.ts";
import * as kvPg from "./kv_store_pg.ts";
import * as kvMemory from "./kv_store_memory.ts";

export function currentKvDriver(): string {
  return process.env.KV_DRIVER ?? "pg";
}

function kvImpl() {
  const driver = currentKvDriver();
  if (driver === "memory") return kvMemory;
  if (driver === "supabase") return kvSupabase;
  return kvPg;
}

export const kv = {
  set: (key: string, value: any): Promise<void> => kvImpl().set(key, value),
  get: (key: string): Promise<any> => kvImpl().get(key),
  del: (key: string): Promise<void> => kvImpl().del(key),
  mset: (keys: string[], values: any[]): Promise<void> => kvImpl().mset(keys, values),
  mget: (keys: string[]): Promise<any[]> => kvImpl().mget(keys),
  mdel: (keys: string[]): Promise<void> => kvImpl().mdel(keys),
  getByPrefix: (prefix: string): Promise<any[]> => kvImpl().getByPrefix(prefix),
};
