/**
 * file: contentRoutes.js
 * description: 内容接口（PostgreSQL）· 独家内容、博客与活动
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-07
 * updated: 2026-11-07
 * status: active
 * tags: [service],[api],[content],[postgres]
 *
 * dependencies: repositories/contentRepository
 * exports: Router
 */

const express = require('express');
const contentRepository = require('../../repositories/contentRepository');

const router = express.Router();

/**
 * @swagger
 * /api/content/exclusive:
 *   get:
 *     summary: 获取独家内容
 *     tags: [Content]
 */
router.get('/exclusive', async (req, res) => {
  try {
    const items = await contentRepository.listExclusive();
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('[content] 获取独家内容失败:', error.message);
    res.status(500).json({ success: false, message: '获取独家内容失败' });
  }
});

/**
 * @swagger
 * /api/content/blog:
 *   get:
 *     summary: 获取博客文章
 *     tags: [Content]
 */
router.get('/blog', async (req, res) => {
  try {
    const posts = await contentRepository.listBlogPosts();
    res.json({ success: true, data: posts });
  } catch (error) {
    console.error('[content] 获取博客失败:', error.message);
    res.status(500).json({ success: false, message: '获取博客文章失败' });
  }
});

/**
 * @swagger
 * /api/content/events:
 *   get:
 *     summary: 获取活动信息
 *     tags: [Content]
 */
router.get('/events', async (req, res) => {
  try {
    const events = await contentRepository.listEvents();
    res.json({ success: true, data: events });
  } catch (error) {
    console.error('[content] 获取活动失败:', error.message);
    res.status(500).json({ success: false, message: '获取活动信息失败' });
  }
});

module.exports = router;
