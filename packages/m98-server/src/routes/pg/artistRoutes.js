/**
 * file: artistRoutes.js
 * description: 艺人接口（PostgreSQL）· 资料、统计与最新动态
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-07
 * updated: 2026-11-07
 * status: active
 * tags: [service],[api],[artist],[postgres]
 *
 * dependencies: repositories/artistRepository
 * exports: Router
 */

const express = require('express');
const artistRepository = require('../../repositories/artistRepository');

const router = express.Router();

router.get('/profile', async (req, res) => {
  try {
    const artist = await artistRepository.ensureArtist('M98');
    res.json({ success: true, data: artist });
  } catch (error) {
    console.error('[artist] 获取资料失败:', error.message);
    res.status(500).json({ success: false, message: '获取艺术家信息失败' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await artistRepository.getStats('M98');
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('[artist] 获取统计失败:', error.message);
    res.status(500).json({ success: false, message: '获取统计数据失败' });
  }
});

router.get('/latest-activity', async (req, res) => {
  try {
    const activity = await artistRepository.getLatestActivity('M98');
    res.json({ success: true, data: activity });
  } catch (error) {
    console.error('[artist] 获取动态失败:', error.message);
    res.status(500).json({ success: false, message: '获取最新动态失败' });
  }
});

module.exports = router;
