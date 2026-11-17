/**
 * file: pg-seed-content.js
 * description: 内容种子脚本 · 幂等写入独家内容、博客与活动
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-07
 * updated: 2026-11-07
 * status: active
 * tags: [script],[postgres],[seed],[content]
 *
 * dependencies: pg, dotenv
 * exports: 无
 * notes: 以 title 判重，可重复执行；不使用破坏性清理
 */

const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SCHEMA = process.env.PGSCHEMA || 'm98';

const EXCLUSIVE = [
  {
    title: '制作花絮：《东方夜曲》背后的故事',
    type: 'video',
    thumbnail: '/D-poster/D-poster-01.jpg',
    description: '深入了解《东方夜曲》的创作过程，从灵感到成品的完整记录',
    duration: '8:32',
    releaseDate: '2024-12-20',
    isLocked: false,
    unlockCondition: null,
  },
  {
    title: '古筝与合成器的对话',
    type: 'audio',
    thumbnail: '/D-poster/D-poster-02.jpg',
    description: '试听版本：传统乐器与现代电子的即兴创作片段',
    duration: '3:45',
    releaseDate: '2024-12-18',
    isLocked: false,
    unlockCondition: null,
  },
  {
    title: '工作室直播录像：新作品预览',
    type: 'video',
    thumbnail: '/D-poster/D-poster-03.jpg',
    description: '12月15日工作室直播完整录像，包含新作品片段',
    duration: '45:12',
    releaseDate: '2024-12-15',
    isLocked: true,
    unlockCondition: '关注满30天',
  },
  {
    title: '东方电子音乐制作教程',
    type: 'video',
    thumbnail: '/D-poster/D-poster-04.jpg',
    description: '董小姐亲自讲解如何将传统东方元素融入现代电子音乐',
    duration: '25:18',
    releaseDate: '2024-12-10',
    isLocked: true,
    unlockCondition: '铁杆粉丝等级',
  },
];

const BLOG_POSTS = [
  {
    title: '我的音乐创作理念：东方与未来的对话',
    excerpt:
      '在这个快速变化的时代，我一直在思考如何将我们深厚的东方文化底蕴与现代电子音乐完美融合...',
    content: '完整文章内容...',
    publishDate: '2024-12-22',
    readTime: 8,
    tags: ['创作理念', '东方音乐', '电子音乐'],
    coverImage: '/D-poster/D-poster-05.jpg',
  },
  {
    title: '制作《东方夜曲》的技术细节分享',
    excerpt:
      '很多朋友问我《东方夜曲》是如何制作的，今天就来详细分享一下技术层面的内容...',
    content: '完整文章内容...',
    publishDate: '2024-12-20',
    readTime: 12,
    tags: ['制作技巧', 'DAW', '混音'],
    coverImage: '/D-poster/D-poster-06.jpg',
  },
];

const EVENTS = [
  {
    title: '新年电子音乐会：东方未来之夜',
    description: '2025年新年特别演出，现场演绎经典作品并首发新曲',
    date: '2025-01-01',
    location: '上海 M50创意园区',
    ticketPrice: '¥180-580',
    status: 'upcoming',
    image: '/D-poster/D-poster-01.jpg',
  },
  {
    title: '粉丝见面会 & 新专辑发布',
    description: '与粉丝近距离互动，分享创作故事，首次公开新专辑完整曲目',
    date: '2025-02-14',
    location: '北京 798艺术区',
    ticketPrice: '¥120-380',
    status: 'upcoming',
    image: '/D-poster/D-poster-02.jpg',
  },
  {
    title: '电子音乐制作工作坊',
    description: '小班制教学，董小姐亲自指导，学习东方电子音乐制作技巧',
    date: '2025-03-15',
    location: '深圳 华侨城创意园',
    ticketPrice: '¥480',
    status: 'upcoming',
    image: '/D-poster/D-poster-03.jpg',
  },
];

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
  const client = createClient();
  await client.connect();
  await client.query(`SET search_path TO ${SCHEMA}, public`);

  try {
    await client.query('BEGIN');

    for (const item of EXCLUSIVE) {
      await client.query(
        `INSERT INTO exclusive_content
           (title, type, thumbnail, description, duration, release_date, is_locked, unlock_condition)
         SELECT $1, $2, $3, $4, $5, $6, $7, $8
          WHERE NOT EXISTS (SELECT 1 FROM exclusive_content WHERE title = $1)`,
        [
          item.title,
          item.type,
          item.thumbnail,
          item.description,
          item.duration,
          item.releaseDate,
          item.isLocked,
          item.unlockCondition,
        ],
      );
    }

    for (const item of BLOG_POSTS) {
      await client.query(
        `INSERT INTO blog_posts
           (title, excerpt, content, publish_date, read_time, tags, cover_image)
         SELECT $1, $2, $3, $4, $5, $6::jsonb, $7
          WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE title = $1)`,
        [
          item.title,
          item.excerpt,
          item.content,
          item.publishDate,
          item.readTime,
          JSON.stringify(item.tags),
          item.coverImage,
        ],
      );
    }

    for (const item of EVENTS) {
      await client.query(
        `INSERT INTO events
           (title, description, event_date, location, ticket_price, status, image)
         SELECT $1, $2, $3, $4, $5, $6, $7
          WHERE NOT EXISTS (SELECT 1 FROM events WHERE title = $1)`,
        [
          item.title,
          item.description,
          item.date,
          item.location,
          item.ticketPrice,
          item.status,
          item.image,
        ],
      );
    }

    await client.query('COMMIT');

    const { rows } = await client.query(
      `SELECT
         (SELECT COUNT(*)::int FROM exclusive_content) AS exclusive,
         (SELECT COUNT(*)::int FROM blog_posts) AS blog,
         (SELECT COUNT(*)::int FROM events) AS events`,
    );

    console.log(
      `[pg:seed:content] 完成：exclusive_content=${rows[0].exclusive} blog_posts=${rows[0].blog} events=${rows[0].events}`,
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[pg:seed:content] 错误:', error.message);
  process.exitCode = 1;
});
