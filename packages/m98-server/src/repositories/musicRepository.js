/**
 * file: musicRepository.js
 * description: 作品数据仓库 · 列表、精选、最新、播放计数与后台聚合
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-07
 * updated: 2026-11-07
 * status: active
 * tags: [service],[repository],[music]
 *
 * dependencies: db/postgres
 * exports: listReleases, listAll, featured, latest, incrementPlay
 */

const { query } = require('../db/postgres');

const DEFAULT_ARTIST_ID = 'M98';

const RELEASE_COLUMNS = `
  id::int AS id,
  legacy_id::int AS "legacyId",
  title,
  artist_id AS "artistId",
  release_date AS "releaseDate",
  type,
  cover_art AS "coverArt",
  tracks,
  stats,
  is_exclusive AS "isExclusive"
`;

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

function mapRelease(row) {
  if (!row) return null;
  return {
    ...row,
    releaseDate: toDateString(row.releaseDate),
    tracks: Array.isArray(row.tracks) ? row.tracks : [],
    stats: row.stats && typeof row.stats === 'object' ? row.stats : {},
  };
}

async function listReleases({ artistId = DEFAULT_ARTIST_ID, limit = 10, page = 1, type } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  const params = [artistId];
  let where = 'artist_id = $1';

  if (type) {
    params.push(type);
    where += ` AND type = $${params.length}`;
  }

  const listParams = [...params, safeLimit, offset];
  const { rows } = await query(
    `SELECT ${RELEASE_COLUMNS}
       FROM releases
      WHERE ${where}
      ORDER BY release_date DESC NULLS LAST, id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    listParams,
  );

  const { rows: countRows } = await query(
    `SELECT COUNT(*)::int AS total FROM releases WHERE ${where}`,
    params,
  );

  const total = countRows[0] ? countRows[0].total : 0;

  return {
    releases: rows.map(mapRelease),
    pagination: {
      currentPage: safePage,
      totalPages: Math.ceil(total / safeLimit),
      totalItems: total,
      hasMore: offset + rows.length < total,
    },
  };
}

async function listAll(artistId = DEFAULT_ARTIST_ID) {
  const { rows } = await query(
    `SELECT ${RELEASE_COLUMNS}
       FROM releases
      WHERE artist_id = $1
      ORDER BY release_date DESC NULLS LAST, id DESC`,
    [artistId],
  );
  return rows.map(mapRelease);
}

async function featured(artistId = DEFAULT_ARTIST_ID, limit = 3) {
  const { rows } = await query(
    `SELECT ${RELEASE_COLUMNS}
       FROM releases
      WHERE artist_id = $1
      ORDER BY ((stats ->> 'plays')::int) DESC NULLS LAST, id DESC
      LIMIT $2`,
    [artistId, Math.min(Math.max(Number(limit) || 3, 1), 20)],
  );
  return rows.map(mapRelease);
}

async function latest(artistId = DEFAULT_ARTIST_ID) {
  const { rows } = await query(
    `SELECT ${RELEASE_COLUMNS}
       FROM releases
      WHERE artist_id = $1
      ORDER BY release_date DESC NULLS LAST, id DESC
      LIMIT 1`,
    [artistId],
  );
  return mapRelease(rows[0]);
}

async function incrementPlay(id) {
  const releaseId = Number(id);
  if (!Number.isInteger(releaseId) || releaseId <= 0) return null;

  const { rows } = await query(
    `UPDATE releases
        SET stats = jsonb_set(
              stats,
              '{plays}',
              to_jsonb(COALESCE((stats ->> 'plays')::int, 0) + 1)
            ),
            updated_at = now()
      WHERE id = $1
      RETURNING (stats ->> 'plays')::int AS plays`,
    [releaseId],
  );

  return rows[0] ? rows[0].plays : null;
}

module.exports = { listReleases, listAll, featured, latest, incrementPlay };
