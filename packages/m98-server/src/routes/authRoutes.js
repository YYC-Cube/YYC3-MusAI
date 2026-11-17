/**
 * file: authRoutes.js
 * description: 管理后台认证路由 · 账号密码登录与当前用户
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-07
 * updated: 2026-11-07
 * status: active
 * tags: [service],[auth],[api]
 *
 * dependencies: express, express-rate-limit, crypto
 * exports: createAuthRouter
 * notes: 账号密码来自 ADMIN_USERNAME / ADMIN_PASSWORD，生产环境必须覆盖
 */

const crypto = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const { signToken, requireAuth } = require('../middleware/auth');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '登录尝试过于频繁，请稍后再试' },
});

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function createAuthRouter() {
  const router = express.Router();

  router.post('/login', loginLimiter, (req, res) => {
    const { username, password } = req.body || {};

    if (
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      !username.trim() ||
      !password
    ) {
      return res.status(400).json({ success: false, message: '请输入账号与密码' });
    }

    const expectedUser = process.env.ADMIN_USERNAME || 'admin';
    const expectedPass =
      process.env.ADMIN_PASSWORD ||
      (process.env.NODE_ENV === 'production' ? '' : 'm98-admin-dev');

    if (!expectedPass) {
      return res.status(503).json({ success: false, message: '管理员账号未配置' });
    }

    if (!safeEqual(username, expectedUser) || !safeEqual(password, expectedPass)) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const user = { name: expectedUser, role: 'admin' };
    let token;

    try {
      token = signToken({ sub: expectedUser, name: user.name, role: user.role });
    } catch (error) {
      console.error('[auth] 签发令牌失败:', error.message);
      return res.status(503).json({ success: false, message: '鉴权服务未配置' });
    }

    return res.json({ success: true, token, user });
  });

  router.get('/me', requireAuth, (req, res) => {
    res.json({
      success: true,
      data: { name: req.user.name, role: req.user.role },
    });
  });

  return router;
}

module.exports = createAuthRouter;
