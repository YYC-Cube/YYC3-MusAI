/**
 * file: artistRepository.js
 * description: 艺人数据仓库 · PG 查询与默认档案兜底
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-07
 * updated: 2026-11-07
 * status: active
 * tags: [service],[repository],[artist]
 *
 * dependencies: db/postgres
 * exports: getProfile, ensureArtist, getStats, getLatestActivity
 */

const { query } = require('../db/postgres');

const DEFAULT_ARTIST_ID = 'M98';

const ARTIST_COLUMNS = `
  artist_id AS "artistId",
  name,
  bio,
  genres,
  stats,
  social_links AS "socialLinks",
  created_at AS "createdAt"
`;

function mapArtist(row) {
  if (!row) return null;
  return {
    ...row,
    genres: Array.isArray(row.genres) ? row.genres : [],
    stats: row.stats && typeof row.stats === 'object' ? row.stats : {},
    socialLinks:
      row.socialLinks && typeof row.socialLinks === 'object' ? row.socialLinks : {},
  };
}

function toDateString(value) {
  if (!value) return null;
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

async function getProfile(artistId = DEFAULT_ARTIST_ID) {
  const { rows } = await query(
    `SELECT ${ARTIST_COLUMNS} FROM artists WHERE artist_id = $1 LIMIT 1`,
    [artistId],
  );
  return mapArtist(rows[0]);
}

async function ensureArtist(artistId = DEFAULT_ARTIST_ID) {
  const existing = await getProfile(artistId);
  if (existing) return existing;

  const defaults = {
    name: '董小姐',
    bio: '电子音乐制作人，融合东方传统音乐元素与现代电子音乐，创造独特的“东方未来之声”风格。',
    genres: ['电子', '融合', '东方韵律', '未来音乐'],
    stats: { monthlyListeners: 128000, totalPlays: 2400000, followers: 64200 },
    socialLinks: {
      weibo: 'https://weibo.com/m98dongxiaojie',
      douyin: '@m98dongxiaojie',
      bilibili: 'https://space.bilibili.com/m98',
      xiaohongshu: '@董小姐M98',
    },
  };

  const { rows } = await query(
    `INSERT INTO artists (artist_id, name, bio, genres, stats, social_links)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb)
     ON CONFLICT (artist_id) DO NOTHING
     RETURNING ${ARTIST_COLUMNS}`,
    [
      artistId,
      defaults.name,
      defaults.bio,
      JSON.stringify(defaults.genres),
      JSON.stringify(defaults.stats),
      JSON.stringify(defaults.socialLinks),
    ],
  );

  return rows[0] ? mapArtist(rows[0]) : getProfile(artistId);
}

async function getStats(artistId = DEFAULT_ARTIST_ID) {
  const artist = await ensureArtist(artistId);

  const [{ rows: countRows }, { rows: latestRows }] = await Promise.all([
    query('SELECT COUNT(*)::int AS total FROM releases WHERE artist_id = $1', [artistId]),
    query(
      `SELECT title, release_date AS "releaseDate"
         FROM releases
        WHERE artist_id = $1
        ORDER BY release_date DESC NULLS LAST
        LIMIT 1`,
      [artistId],
    ),
  ]);

  const latest = latestRows[0];
  return {
    ...artist.stats,
    totalReleases: countRows[0] ? countRows[0].total : 0,
    latestRelease: latest
      ? {
          title: latest.title,
          releaseDate: toDateString(latest.releaseDate),
        }
      : null,
  };
}

async function getLatestActivity(artistId = DEFAULT_ARTIST_ID) {
  const { rows } = await query(
    `SELECT id::int AS id, title, release_date AS "releaseDate", type
       FROM releases
      WHERE artist_id = $1
      ORDER BY release_date DESC NULLS LAST
      LIMIT 5`,
    [artistId],
  );

  return {
    latestReleases: rows.map((row) => ({
      ...row,
      releaseDate: toDateString(row.releaseDate),
    })),
    socialActivity: [
      {
        platform: 'weibo',
        content: '新作品《东方夜曲》正在制作中，融合了更多传统乐器元素',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        likes: 1247,
        comments: 89,
      },
      {
        platform: 'douyin',
        content: '工作室花絮：古筝与合成器的完美结合',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        likes: 5632,
        comments: 234,
      },
    ],
  };
}

module.exports = { getProfile, ensureArtist, getStats, getLatestActivity };
