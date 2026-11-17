/**
 * file: contentRepository.js
 * description: 内容数据仓库 · 独家内容、博客与活动的 PG 查询
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-07
 * updated: 2026-11-07
 * status: active
 * tags: [service],[repository],[content]
 *
 * dependencies: db/postgres
 * exports: listExclusive, listBlogPosts, listEvents
 */

const { query } = require('../db/postgres');

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

async function listExclusive() {
  const { rows } = await query(
    `SELECT id::int AS id,
            title,
            type,
            thumbnail,
            description,
            duration,
            release_date AS "releaseDate",
            is_locked AS "isLocked",
            unlock_condition AS "unlockCondition"
       FROM exclusive_content
      ORDER BY release_date DESC NULLS LAST, id DESC`,
  );

  return rows.map((row) => ({
    ...row,
    releaseDate: toDateString(row.releaseDate),
  }));
}

async function listBlogPosts() {
  const { rows } = await query(
    `SELECT id::int AS id,
            title,
            excerpt,
            content,
            publish_date AS "publishDate",
            read_time AS "readTime",
            tags,
            cover_image AS "coverImage"
       FROM blog_posts
      ORDER BY publish_date DESC NULLS LAST, id DESC`,
  );

  return rows.map((row) => ({
    ...row,
    publishDate: toDateString(row.publishDate),
    tags: Array.isArray(row.tags) ? row.tags : [],
  }));
}

async function listEvents() {
  const { rows } = await query(
    `SELECT id::int AS id,
            title,
            description,
            event_date AS "date",
            location,
            ticket_price AS "ticketPrice",
            status,
            image
       FROM events
      ORDER BY event_date ASC NULLS LAST, id ASC`,
  );

  return rows.map((row) => ({
    ...row,
    date: toDateString(row.date),
  }));
}

module.exports = { listExclusive, listBlogPosts, listEvents };
