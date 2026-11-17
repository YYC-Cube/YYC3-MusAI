/**
 * file: musicRoutes.js
 * description: 作品接口（PostgreSQL）· 列表、精选、最新与播放计数
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-07
 * updated: 2026-11-07
 * status: active
 * tags: [service],[api],[music],[postgres]
 *
 * dependencies: repositories/musicRepository
 * exports: Router
 */

const express = require('express');
const musicRepository = require('../../repositories/musicRepository');

const router = express.Router();
const RELEASE_TYPES = new Set(['single', 'ep', 'album', 'remix']);

function parseIntParam(raw, fallback, min, max) {
  if (raw === undefined || raw === '') return { value: fallback };
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    return { error: true };
  }
  return { value };
}

router.get('/releases', async (req, res) => {
  const limit = parseIntParam(req.query.limit, 10, 1, 100);
  const page = parseIntParam(req.query.page, 1, 1, 10000);

  if (limit.error || page.error) {
    return res.status(400).json({ success: false, message: 'limit/page 参数非法' });
  }

  const type = req.query.type;
  if (type !== undefined && !RELEASE_TYPES.has(String(type))) {
    return res.status(400).json({ success: false, message: 'type 参数非法' });
  }

  try {
    const result = await musicRepository.listReleases({
      limit: limit.value,
      page: page.value,
      type: type ? String(type) : undefined,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[music] 获取列表失败:', error.message);
    res.status(500).json({ success: false, message: '获取音乐作品失败' });
  }
});

router.get('/featured', async (req, res) => {
  try {
    const releases = await musicRepository.featured('M98', 3);
    res.json({ success: true, data: releases });
  } catch (error) {
    console.error('[music] 获取精选失败:', error.message);
    res.status(500).json({ success: false, message: '获取精选作品失败' });
  }
});

router.get('/latest', async (req, res) => {
  try {
    const release = await musicRepository.latest('M98');
    if (!release) {
      return res.status(404).json({ success: false, message: '暂无作品' });
    }
    res.json({ success: true, data: release });
  } catch (error) {
    console.error('[music] 获取最新失败:', error.message);
    res.status(500).json({ success: false, message: '获取最新作品失败' });
  }
});

router.post('/:id/play', async (req, res) => {
  try {
    const plays = await musicRepository.incrementPlay(req.params.id);
    if (plays === null) {
      return res.status(404).json({ success: false, message: '作品不存在' });
    }
    res.json({ success: true, message: '播放记录成功', data: { plays } });
  } catch (error) {
    console.error('[music] 记录播放失败:', error.message);
    res.status(500).json({ success: false, message: '记录播放失败' });
  }
});

module.exports = router;
