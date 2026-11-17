/**
 * file: pg-verify.js
 * description: SQLite ↔ PostgreSQL 迁移校验 · 对比行数与播放量
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-07
 * updated: 2026-11-07
 * status: active
 * tags: [script],[postgres],[migration],[verify]
 *
 * dependencies: pg, sqlite3, dotenv
 * exports: 无
 * notes: 校验失败时以非零退出码结束，可用于 CI
 */

const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SCHEMA = process.env.PGSCHEMA || 'm98';
const DB_PATH =
  process.env.DB_PATH ||
  path.resolve(__dirname, '..', '..', 'database', 'm98_database.sqlite');

function openSqlite(filePath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(filePath, (error) => {
      if (error) reject(error);
      else resolve(db);
    });
  });
}

function get(db, sql) {
  return new Promise((resolve, reject) => {
    db.get(sql, (error, row) => (error ? reject(error) : resolve(row)));
  });
}

function closeSqlite(db) {
  return new Promise((resolve) => db.close(() => resolve()));
}

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

function sumPlays(rows) {
  return rows.reduce((total, row) => {
    try {
      const stats = JSON.parse(row.stats || '{}');
      return total + (Number(stats.plays) || 0);
    } catch {
      return total;
    }
  }, 0);
}

async function main() {
  const sqlite = await openSqlite(DB_PATH);

  const source = {
    artists: (await get(sqlite, 'SELECT COUNT(*) AS total FROM artists')).total,
    releases: (await get(sqlite, 'SELECT COUNT(*) AS total FROM releases')).total,
    fanMessages: (await get(sqlite, 'SELECT COUNT(*) AS total FROM fan_messages')).total,
    releasesRows: await new Promise((resolve, reject) => {
      sqlite.all('SELECT stats FROM releases', (error, rows) =>
        error ? reject(error) : resolve(rows),
      );
    }),
  };

  await closeSqlite(sqlite);

  const client = createClient();
  await client.connect();

  try {
    const targetArtists = await client.query(
      `SELECT COUNT(*)::int AS total FROM ${SCHEMA}.artists`,
    );
    const targetReleases = await client.query(
      `SELECT COUNT(*)::int AS total FROM ${SCHEMA}.releases`,
    );
    const targetFans = await client.query(
      `SELECT COUNT(*)::int AS total FROM ${SCHEMA}.fan_messages`,
    );
    const targetPlays = await client.query(
      `SELECT COALESCE(SUM((stats ->> 'plays')::int), 0)::int AS total
         FROM ${SCHEMA}.releases`,
    );

    const checks = [
      { name: 'artists', source: source.artists, target: targetArtists.rows[0].total },
      { name: 'releases', source: source.releases, target: targetReleases.rows[0].total },
      {
        name: 'fan_messages',
        source: source.fanMessages,
        target: targetFans.rows[0].total,
      },
      {
        name: 'total_plays',
        source: sumPlays(source.releasesRows),
        target: targetPlays.rows[0].total,
      },
    ];

    console.log('[pg:verify] 校验结果');
    console.log('  table          sqlite      postgres    status');
    console.log('  -------------  ----------  ----------  ------');

    let failed = 0;
    for (const check of checks) {
      const ok = check.source === check.target;
      if (!ok) failed += 1;
      console.log(
        `  ${check.name.padEnd(13)}  ${String(check.source).padEnd(10)}  ${String(check.target).padEnd(10)}  ${ok ? 'OK' : 'DIFF'}`,
      );
    }

    if (failed > 0) {
      console.error(`[pg:verify] 失败：${failed} 项不一致`);
      process.exitCode = 1;
    } else {
      console.log('[pg:verify] 通过：SQLite 与 PostgreSQL 数据一致');
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[pg:verify] 错误:', error.message);
  process.exitCode = 1;
});
