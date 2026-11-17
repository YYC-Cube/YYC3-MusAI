/**
 * file: fanRepository.js
 * description: 粉丝数据仓库 · 留言墙、留言计数与粉丝画像
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-07
 * updated: 2026-11-07
 * status: active
 * tags: [service],[repository],[fan]
 *
 * dependencies: db/postgres, artistRepository
 * exports: listMessages, countMessages, getStats
 */

const { query } = require('../db/postgres');
const artistRepository = require('./artistRepository');

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function mapMessage(row) {
  const createdAt = toIso(row.createdAt);
  return {
    ...row,
    createdAt,
    timestamp: createdAt,
  };
}

async function listMessages(limit = 20) {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const { rows } = await query(
    `SELECT id::int AS id,
            username,
            avatar,
            message,
            type,
            likes,
            created_at AS "createdAt"
       FROM fan_messages
      ORDER BY created_at DESC
      LIMIT $1`,
    [safeLimit],
  );
  return rows.map(mapMessage);
}

async function countMessages() {
  const { rows } = await query('SELECT COUNT(*)::int AS total FROM fan_messages');
  return rows[0] ? rows[0].total : 0;
}

async function getStats() {
  let followers = 0;
  try {
    const artist = await artistRepository.getProfile('M98');
    followers = Number(artist && artist.stats && artist.stats.followers) || 0;
  } catch {
    followers = 0;
  }

  return {
    totalFans: followers,
    activeToday: 2340,
    newThisWeek: 890,
    topCountries: [
      { country: '中国', percentage: 78 },
      { country: '美国', percentage: 8 },
      { country: '日本', percentage: 5 },
      { country: '韩国', percentage: 4 },
      { country: '其他', percentage: 5 },
    ],
    ageGroups: [
      { age: '18-24', percentage: 35 },
      { age: '25-34', percentage: 40 },
      { age: '35-44', percentage: 20 },
      { age: '45+', percentage: 5 },
    ],
  };
}

module.exports = { listMessages, countMessages, getStats };
