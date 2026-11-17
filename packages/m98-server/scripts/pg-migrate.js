/**
 * file: pg-migrate.js
 * description: PostgreSQL 迁移执行器 · 按文件名顺序执行 SQL 并记录版本
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-07
 * updated: 2026-11-07
 * status: active
 * tags: [script],[postgres],[migration]
 *
 * dependencies: pg, dotenv
 * exports: 无
 * notes: 幂等执行；失败自动回滚；版本记录在 m98.schema_migrations
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'database', 'migrations', 'postgres');
const SCHEMA = process.env.PGSCHEMA || 'm98';

function createClient() {
  return new Client({
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5433),
    database: process.env.PGDATABASE || 'yyc3_music',
    user: process.env.PGUSER || 'yanyu',
    password: process.env.PGPASSWORD || undefined,
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });
}

async function main() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(`迁移目录不存在: ${MIGRATIONS_DIR}`);
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('[pg:migrate] 没有可执行的 SQL 文件');
    return;
  }

  const client = createClient();
  await client.connect();
  console.log(
    `[pg:migrate] 连接 ${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || 5433}/${process.env.PGDATABASE || 'yyc3_music'} as ${process.env.PGUSER || 'yanyu'}`,
  );

  await client.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${SCHEMA}.schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const { rows } = await client.query(
    `SELECT version FROM ${SCHEMA}.schema_migrations ORDER BY version`,
  );
  const applied = new Set(rows.map((row) => row.version));

  let count = 0;

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`[pg:migrate] 跳过（已应用）: ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`[pg:migrate] 应用: ${file}`);

    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        `INSERT INTO ${SCHEMA}.schema_migrations (version) VALUES ($1)`,
        [file],
      );
      await client.query('COMMIT');
      count += 1;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`[pg:migrate] 失败并回滚: ${file}`);
      await client.end();
      throw error;
    }
  }

  console.log(`[pg:migrate] 完成：应用 ${count} 个迁移，跳过 ${files.length - count} 个`);
  await client.end();
}

main()
  .catch((error) => {
    console.error('[pg:migrate] 错误:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    // Client 在 main 内创建，失败时由 Node 进程退出释放连接
  });
