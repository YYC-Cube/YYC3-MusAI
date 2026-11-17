/**
 * file: pgTestDb.js
 * description: PostgreSQL 测试库辅助 · 创建测试库、重建 m98 schema 与固定数据
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-07
 * updated: 2026-11-07
 * status: active
 * tags: [test],[postgres],[fixture]
 *
 * dependencies: pg, fs
 * notes: 仅操作 yyc3_music_test，不影响 yyc3_music
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const ADMIN_DB = process.env.PGTEST_ADMIN_DATABASE || 'yyc3_music';
const TEST_DB = process.env.PGTEST_DATABASE || 'yyc3_music_test';
const SCHEMA = process.env.PGSCHEMA || 'm98';
const MIGRATION = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'database',
  'migrations',
  'postgres',
  '001_init.sql',
);

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

async function ensureDatabase() {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(TEST_DB)) {
    throw new Error(`测试库名非法: ${TEST_DB}`);
  }

  const admin = new Client(config(ADMIN_DB));
  await admin.connect();

  try {
    const { rowCount } = await admin.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [TEST_DB],
    );
    if (!rowCount) {
      await admin.query(`CREATE DATABASE "${TEST_DB}"`);
    }
  } finally {
    await admin.end();
  }
}

async function setupTestDatabase() {
  await ensureDatabase();

  const client = new Client(config(TEST_DB));
  await client.connect();

  try {
    await client.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
    await client.query(fs.readFileSync(MIGRATION, 'utf8'));
    await client.query(`SET search_path TO ${SCHEMA}, public`);

    await client.query('BEGIN');

    await client.query(
      `INSERT INTO artists (artist_id, name, bio, genres, stats, social_links)
       VALUES ('M98', '董小姐', '测试艺人', '["电子"]'::jsonb,
               '{"monthlyListeners":500,"totalPlays":300,"followers":1000}'::jsonb,
               '{}'::jsonb)`,
    );

    await client.query(
      `INSERT INTO releases
         (legacy_id, title, artist_id, release_date, type, cover_art, tracks, stats, is_exclusive)
       VALUES
         (1, '东方夜曲', 'M98', '2024-12-15', 'single', '/D-cover/D-cover-01.jpg',
          '[{"title":"东方夜曲","duration":245}]'::jsonb,
          '{"plays":100,"downloads":1,"shares":1}'::jsonb, false),
         (2, '数字禅境', 'M98', '2024-11-28', 'single', '/D-cover/D-cover-02.jpg',
          '[]'::jsonb, '{"plays":200,"downloads":2,"shares":2}'::jsonb, false)`,
    );

    await client.query(
      `INSERT INTO fan_messages (legacy_id, username, message, type, likes, created_at)
       VALUES (1, '夜听者', '《东方夜曲》真好听', 'text', 42, now())`,
    );

    await client.query(
      `INSERT INTO exclusive_content
         (title, type, thumbnail, description, duration, release_date, is_locked)
       VALUES ('测试独家', 'video', '/D-poster/D-poster-01.jpg', '测试内容', '1:00', '2024-12-20', false)`,
    );

    await client.query(
      `INSERT INTO blog_posts
         (title, excerpt, content, publish_date, read_time, tags, cover_image)
       VALUES ('测试博客', '摘要', '正文', '2024-12-22', 8, '["测试"]'::jsonb,
               '/D-poster/D-poster-02.jpg')`,
    );

    await client.query(
      `INSERT INTO events
         (title, description, event_date, location, ticket_price, status, image)
       VALUES ('测试活动', '描述', '2025-01-01', '上海', '¥1', 'upcoming',
               '/D-poster/D-poster-03.jpg')`,
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

module.exports = { setupTestDatabase, TEST_DB };
