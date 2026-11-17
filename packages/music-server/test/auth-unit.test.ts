/**
 * 鉴权核心单元测试（Vitest / Node）
 * 覆盖：密码哈希、JWT 签名/校验、会话签发与吊销、注册失败语义
 */

process.env.KV_DRIVER = 'memory';
process.env.JWT_SECRET = 'test-secret-for-unit-tests';

import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  verifyJwt,
  issueAccessToken,
  revokeToken,
  registerUser,
  AuthError,
} from '../src/auth.ts';
import { kv } from '../src/kv.ts';

describe('密码哈希', () => {
  it('正确密码可通过', () => {
    const stored = hashPassword('SmokePass123');
    expect(stored.startsWith('pbkdf2$sha256$')).toBe(true);
    expect(verifyPassword('SmokePass123', stored)).toBe(true);
  });

  it('错误密码被拒绝', () => {
    const stored = hashPassword('SmokePass123');
    expect(verifyPassword('WrongPass123', stored)).toBe(false);
  });

  it('损坏哈希被拒绝', () => {
    expect(verifyPassword('x', 'not-a-hash')).toBe(false);
  });

  it('相同密码产生不同盐', () => {
    expect(hashPassword('same')).not.toBe(hashPassword('same'));
  });
});

describe('JWT 签名与校验', () => {
  it('签名后可解析出 sub 与 jti', () => {
    const token = signAccessToken({ userId: 'u-1', email: 'a@b.c', role: 'user' });
    const payload = verifyJwt(token);
    expect(payload?.sub).toBe('u-1');
    expect(typeof payload?.jti).toBe('string');
    expect(payload?.iss).toBe(process.env.JWT_ISSUER || 'YYC3-MusAI');
  });

  it('篡改签名后校验失败', () => {
    const token = signAccessToken({ userId: 'u-1', email: 'a@b.c' });
    const [h, b, s] = token.split('.');
    const tampered = `${h}.${b}.${s.slice(0, -2)}AA`;
    expect(verifyJwt(tampered)).toBeNull();
  });

  it('格式错误返回 null', () => {
    expect(verifyJwt('abc')).toBeNull();
  });
});

describe('会话签发与吊销', () => {
  it('签发后写入会话表，吊销后删除', async () => {
    const { accessToken, jti } = await issueAccessToken({ userId: 'u-2', email: 'b@c.d' });
    const session = await kv.get(`auth:session:${jti}`);
    expect(session).toBeTruthy();

    await revokeToken(accessToken);
    expect(await kv.get(`auth:session:${jti}`)).toBeUndefined();
  });
});

describe('注册失败语义（数据库不可用）', () => {
  it('DB_DISABLED 时不签发 token，抛 DB_UNAVAILABLE', async () => {
    process.env.DB_DISABLED = '1';
    try {
      await expect(
        registerUser({ email: 'x@y.z', password: 'Passw0rd!', displayName: 'X' }),
      ).rejects.toMatchObject({ code: 'DB_UNAVAILABLE' });
      await expect(
        registerUser({ email: 'x@y.z', password: 'Passw0rd!', displayName: 'X' }),
      ).rejects.toBeInstanceOf(AuthError);
    } finally {
      delete process.env.DB_DISABLED;
    }
  });
});
