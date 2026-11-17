/**
 * file: auth.js
 * description: 管理后台鉴权中间件 · JWT 签发与校验
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-07
 * updated: 2026-11-07
 * status: active
 * tags: [service],[auth],[jwt]
 *
 * dependencies: jsonwebtoken
 * exports: signToken, requireAuth
 * notes: 生产环境必须通过环境变量注入 JWT_SECRET
 */

const jwt = require('jsonwebtoken');

const DEV_SECRET = 'm98-dev-only-secret-change-me';

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    console.warn('[auth] 生产环境缺少 JWT_SECRET，已拒绝使用默认密钥');
    return null;
  }
  return secret || DEV_SECRET;
}

function signToken(payload, expiresIn = process.env.JWT_EXPIRES_IN || '8h') {
  const secret = getSecret();
  if (!secret) {
    throw new Error('JWT_SECRET 未配置');
  }
  return jwt.sign(payload, secret, { expiresIn });
}

function requireAuth(req, res, next) {
  const secret = getSecret();
  if (!secret) {
    return res.status(503).json({ success: false, message: '鉴权服务未配置' });
  }

  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ success: false, message: '未登录或凭证缺失' });
  }

  try {
    req.user = jwt.verify(token, secret);
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: '登录已过期，请重新登录' });
  }
}

module.exports = { signToken, requireAuth };
