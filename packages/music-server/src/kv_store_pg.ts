/**
 * D-Music P1a — PostgreSQL KV 存储实现（Deno 过渡版）
 *
 * 与 `kv_store.ts`（Supabase 版）签名完全一致，供 `KV_DRIVER=pg` 时使用。
 * 表：musai.kv_store(namespace TEXT, key TEXT, value JSONB, updated_at TIMESTAMPTZ, PK(namespace, key))
 *
 * 注意：pg 驱动会把 jsonb 列解析为 JS 值，`get` 直接返回该值（对象/字符串/数字）。
 * 与 Supabase 版 `data?.value` 语义一致；不做二次 JSON.parse，避免 "[object Object]"。
 * 路由层 0 改动，仅 server-utils.ts 按 KV_DRIVER 选源。
 */
import pg from "pg";

const { Pool } = pg as any;

let pool: any = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.PG_HOST ?? "localhost",
      port: Number(process.env.PG_PORT ?? "5433"),
      user: process.env.PG_USER ?? "musai_app_rw",
      password: process.env.PG_PASSWORD ?? "",
      database: process.env.PG_DATABASE ?? "yyc3_music",
      max: 10,
      idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT ?? "30000"),
      connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT ?? "10000"),
    });
  }
  return pool;
}

const DEFAULT_NAMESPACE = "";

/**
 * 写入前统一序列化：
 * 调用方常用 `JSON.stringify(payload)` 传字符串，若直接作为 jsonb 参数，驱动会再解析一次
 * （字符串变成数组/数字），读取端 `JSON.parse` 就会失败。这里统一 stringify，
 * 保证「字符串存为 JSON 字符串、对象存为 JSON 对象」，与 Supabase 版语义一致。
 */
function toJson(value: any): string {
  return JSON.stringify(value ?? null);
}

export const set = async (key: string, value: any): Promise<void> => {
  const client = await getPool().connect();
  try {
    await client.query(
      `INSERT INTO musai.kv_store (namespace, key, value)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (namespace, key)
       DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [DEFAULT_NAMESPACE, key, toJson(value)],
    );
  } finally {
    client.release();
  }
};

export const get = async (key: string): Promise<any> => {
  const client = await getPool().connect();
  try {
    const res = await client.query(
      `SELECT value FROM musai.kv_store WHERE namespace=$1 AND key=$2`,
      [DEFAULT_NAMESPACE, key],
    );
    if (res.rows.length === 0) return undefined;
    return res.rows[0].value;
  } finally {
    client.release();
  }
};

export const del = async (key: string): Promise<void> => {
  const client = await getPool().connect();
  try {
    await client.query(
      `DELETE FROM musai.kv_store WHERE namespace=$1 AND key=$2`,
      [DEFAULT_NAMESPACE, key],
    );
  } finally {
    client.release();
  }
};

export const mset = async (keys: string[], values: any[]): Promise<void> => {
  if (keys.length === 0) return;
  const client = await getPool().connect();
  try {
    for (let i = 0; i < keys.length; i++) {
      await client.query(
        `INSERT INTO musai.kv_store (namespace, key, value)
         VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (namespace, key)
         DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [DEFAULT_NAMESPACE, keys[i], toJson(values[i])],
      );
    }
  } finally {
    client.release();
  }
};

export const mget = async (keys: string[]): Promise<any[]> => {
  if (keys.length === 0) return [];
  const client = await getPool().connect();
  try {
    const res = await client.query(
      `SELECT key, value FROM musai.kv_store WHERE namespace=$1 AND key = ANY($2)`,
      [DEFAULT_NAMESPACE, keys],
    );
    const map = new Map(res.rows.map((r: { key: string; value: any }) => [r.key, r.value]));
    return keys.map((k) => map.get(k)).filter((v) => v !== undefined);
  } finally {
    client.release();
  }
};

export const mdel = async (keys: string[]): Promise<void> => {
  if (keys.length === 0) return;
  const client = await getPool().connect();
  try {
    await client.query(
      `DELETE FROM musai.kv_store WHERE namespace=$1 AND key = ANY($2)`,
      [DEFAULT_NAMESPACE, keys],
    );
  } finally {
    client.release();
  }
};

export const getByPrefix = async (prefix: string): Promise<any[]> => {
  const client = await getPool().connect();
  try {
    const res = await client.query(
      `SELECT value FROM musai.kv_store WHERE namespace=$1 AND key LIKE $2 ORDER BY key`,
      [DEFAULT_NAMESPACE, prefix + "%"],
    );
    return res.rows.map((r: { value: any }) => r.value);
  } finally {
    client.release();
  }
};
