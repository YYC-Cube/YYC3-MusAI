/**
 * file: adminRoutes.js
 * description: 管理后台接口（PostgreSQL）· 受保护的仪表盘聚合
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-07
 * updated: 2026-11-07
 * status: active
 * tags: [service],[api],[admin],[postgres]
 *
 * dependencies: repositories/adminRepository, middleware/auth
 * exports: Router
 */

const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const adminRepository = require('../../repositories/adminRepository');

const router = express.Router();

router.use(requireAuth);

router.get('/dashboard', async (req, res) => {
  try {
    const data = await adminRepository.getDashboard();
    res.json({ success: true, data });
  } catch (error) {
    console.error('[admin] 仪表盘聚合失败:', error.message);
    res.status(500).json({ success: false, message: '仪表盘数据加载失败' });
  }
});

module.exports = router;
