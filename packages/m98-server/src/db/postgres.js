/**
 * file: postgres.js
 * description: PostgreSQL 连接池 · 连接配置、search_path 与健康检查
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-07
 * updated: 2026-11-07
 * status: active
 * tags: [service],[postgres],[database]
 *
 * dependencies: pg, dotenv
 * exports: pool, query, health, close, SCHEMA
 * notes: 默认连接 yanyu@localhost:5433/yyc3_music，schema=m98
 */

const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const SCHEMA = process.env.PGSCHEMA || 'm98';

if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(SCHEMA)) {
  throw new Error(`PGSCHEMA 非法: ${SCHEMA}`);
}

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5433),
  database: process.env.PGDATABASE || 'yyc3_music',
  user: process.env.PGUSER || 'yanyu',
  password: process.env.PGPASSWORD || undefined,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
  max: Number(process.env.PGPOOL_MAX || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  application_name: 'm98-api',
  options: `-c search_path=${SCHEMA},public`,
});

pool.on('error', (error) => {
  console.error('[pg] 连接池空闲错误:', error.message);
});

async function query(text, params) {
  return pool.query(text, params);
}

async function health() {
  const startedAt = Date.now();
  const result = await pool.query('SELECT 1 AS ok');
  return {
    ok: result.rows[0] && result.rows[0].ok === 1,
    schema: SCHEMA,
    latencyMs: Date.now() - startedAt,
  };
}

async function close() {
  await pool.end();
}

module.exports = { pool, query, health, close, SCHEMA };
