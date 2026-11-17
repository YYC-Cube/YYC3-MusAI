/**
 * file: pg-test-db.js
 * description: PostgreSQL 测试库初始化 · 创建 yyc3_music_test 并应用迁移
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-07
 * updated: 2026-11-07
 * status: active
 * tags: [script],[postgres],[test]
 *
 * dependencies: pg, child_process, dotenv
 * exports: 无
 * notes: 幂等；测试库与生产库隔离
 */

const path = require('path');
const { execFileSync } = require('child_process');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ADMIN_DB = process.env.PGTEST_ADMIN_DATABASE || 'yyc3_music';
const TEST_DB = process.env.PGTEST_DATABASE || 'yyc3_music_test';

function config(database) {
  return {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5433),
    database,
    user: process.env.PGUSER || 'yanyu',
    password: process.env.PGPASSWORD || undefined,
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
  };
}

async function main() {
  const admin = new Client(config(ADMIN_DB));
  await admin.connect();

  const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [
    TEST_DB,
  ]);

  if (!rowCount) {
    await admin.query(`CREATE DATABASE "${TEST_DB}"`);
    console.log(`[pg:test:setup] 已创建数据库: ${TEST_DB}`);
  } else {
    console.log(`[pg:test:setup] 数据库已存在: ${TEST_DB}`);
  }

  await admin.end();

  console.log('[pg:test:setup] 应用迁移...');
  execFileSync(process.execPath, [path.join(__dirname, 'pg-migrate.js')], {
    env: { ...process.env, PGDATABASE: TEST_DB },
    stdio: 'inherit',
  });

  console.log('[pg:test:setup] 完成');
}

main().catch((error) => {
  console.error('[pg:test:setup] 错误:', error.message);
  process.exitCode = 1;
});
