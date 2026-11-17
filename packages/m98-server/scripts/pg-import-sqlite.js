/**
 * file: pg-import-sqlite.js
 * description: SQLite → PostgreSQL 数据导入 · 幂等迁移艺人、作品与粉丝留言
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-07
 * updated: 2026-11-07
 * status: active
 * tags: [script],[postgres],[migration],[sqlite]
 *
 * dependencies: pg, sqlite3, dotenv
 * exports: 无
 * notes: 以 legacy_id 幂等 upsert；执行前请先运行 pg:migrate
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

function all(db, sql) {
  return new Promise((resolve, reject) => {
    db.all(sql, (error, rows) => (error ? reject(error) : resolve(rows)));
  });
}

function closeSqlite(db) {
  return new Promise((resolve) => db.close(() => resolve()));
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toDate(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
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

async function main() {
  console.log(`[pg:import] SQLite: ${DB_PATH}`);
  const sqlite = await openSqlite(DB_PATH);

  const artists = await all(sqlite, 'SELECT * FROM artists');
  const releases = await all(sqlite, 'SELECT * FROM releases');
  const fanMessages = await all(sqlite, 'SELECT * FROM fan_messages');

  await closeSqlite(sqlite);

  const client = createClient();
  await client.connect();
  await client.query(`SET search_path TO ${SCHEMA}, public`);

  try {
    await client.query('BEGIN');

    for (const row of artists) {
      await client.query(
        `INSERT INTO ${SCHEMA}.artists
           (artist_id, name, bio, genres, stats, social_links, created_at, updated_at)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7, now())
         ON CONFLICT (artist_id) DO UPDATE SET
           name = EXCLUDED.name,
           bio = EXCLUDED.bio,
           genres = EXCLUDED.genres,
           stats = EXCLUDED.stats,
           social_links = EXCLUDED.social_links,
           updated_at = now()`,
        [
          row.artistId,
          row.name,
          row.bio || null,
          JSON.stringify(parseJson(row.genres, [])),
          JSON.stringify(parseJson(row.stats, {})),
          JSON.stringify(parseJson(row.socialLinks, {})),
          toIso(row.createdAt) || new Date().toISOString(),
        ],
      );
    }

    for (const row of releases) {
      await client.query(
        `INSERT INTO ${SCHEMA}.releases
           (legacy_id, title, artist_id, release_date, type, cover_art,
            tracks, stats, is_exclusive, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, now())
         ON CONFLICT (legacy_id) DO UPDATE SET
           title = EXCLUDED.title,
           artist_id = EXCLUDED.artist_id,
           release_date = EXCLUDED.release_date,
           type = EXCLUDED.type,
           cover_art = EXCLUDED.cover_art,
           tracks = EXCLUDED.tracks,
           stats = EXCLUDED.stats,
           is_exclusive = EXCLUDED.is_exclusive,
           updated_at = now()`,
        [
          row.id,
          row.title,
          row.artistId,
          toDate(row.releaseDate),
          row.type || 'single',
          row.coverArt || null,
          JSON.stringify(parseJson(row.tracks, [])),
          JSON.stringify(parseJson(row.stats, {})),
          Boolean(row.isExclusive),
          toIso(row.createdAt) || new Date().toISOString(),
        ],
      );
    }

    for (const row of fanMessages) {
      await client.query(
        `INSERT INTO ${SCHEMA}.fan_messages
           (legacy_id, username, avatar, message, type, likes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, now())
         ON CONFLICT (legacy_id) DO UPDATE SET
           username = EXCLUDED.username,
           avatar = EXCLUDED.avatar,
           message = EXCLUDED.message,
           type = EXCLUDED.type,
           likes = EXCLUDED.likes,
           updated_at = now()`,
        [
          row.id,
          row.username,
          row.avatar || null,
          row.message,
          row.type || 'text',
          Number(row.likes) || 0,
          toIso(row.createdAt) || new Date().toISOString(),
        ],
      );
    }

    await client.query(
      `SELECT setval(
         pg_get_serial_sequence('${SCHEMA}.artists', 'id'),
         COALESCE((SELECT MAX(id) FROM ${SCHEMA}.artists), 1),
         true
       )`,
    );
    await client.query(
      `SELECT setval(
         pg_get_serial_sequence('${SCHEMA}.releases', 'id'),
         COALESCE((SELECT MAX(id) FROM ${SCHEMA}.releases), 1),
         true
       )`,
    );
    await client.query(
      `SELECT setval(
         pg_get_serial_sequence('${SCHEMA}.fan_messages', 'id'),
         COALESCE((SELECT MAX(id) FROM ${SCHEMA}.fan_messages), 1),
         true
       )`,
    );

    await client.query('COMMIT');

    console.log(
      `[pg:import] 完成：artists=${artists.length} releases=${releases.length} fan_messages=${fanMessages.length}`,
    );
    console.log('[pg:import] 注：exclusive_content / blog_posts / events 表结构已就绪，暂无 SQLite 数据源');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[pg:import] 错误:', error.message);
  process.exitCode = 1;
});
