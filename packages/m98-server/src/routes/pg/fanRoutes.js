/**
 * file: fanRoutes.js
 * description: 粉丝接口（PostgreSQL）· 留言墙与粉丝画像
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-07
 * updated: 2026-11-07
 * status: active
 * tags: [service],[api],[fan],[postgres]
 *
 * dependencies: repositories/fanRepository
 * exports: Router
 */

const express = require('express');
const fanRepository = require('../../repositories/fanRepository');

const router = express.Router();

router.get('/wall', async (req, res) => {
  try {
    const messages = await fanRepository.listMessages(20);
    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('[fan] 获取留言失败:', error.message);
    res.status(500).json({ success: false, message: '获取粉丝互动失败' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await fanRepository.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('[fan] 获取统计失败:', error.message);
    res.status(500).json({ success: false, message: '获取粉丝统计失败' });
  }
});

module.exports = router;
