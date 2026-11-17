const request = require('supertest');
const express = require('express');
const createAuthRouter = require('../src/routes/authRoutes');

process.env.NODE_ENV = 'test';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD = 'test-pass';
process.env.JWT_SECRET = 'test-secret';

const app = express();
app.use(express.json());
app.use('/api/auth', createAuthRouter());

describe('管理后台认证', () => {
  test('正确账号密码应返回 token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'test-pass' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user).toEqual({ name: 'admin', role: 'admin' });
  });

  test('错误密码应返回 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrong-pass' });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('缺少字段应返回 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin' });
    expect(res.statusCode).toBe(400);
  });

  test('无 token 访问 /me 应返回 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });

  test('合法 token 可访问 /me', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'test-pass' });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.name).toBe('admin');
  });
});
