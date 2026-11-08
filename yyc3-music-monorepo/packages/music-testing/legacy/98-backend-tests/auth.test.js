const request = require('supertest');
const app = require('../src/index');
const User = require('../src/models/User');

// 测试前清空用户集合
beforeEach(async () => {
  await User.deleteMany({});
});

describe('Auth API', () => {
  // 测试注册功能
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: ['legacy', 'fixture', 'pw98'].join('-')
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.username).toBe('testuser');
      expect(res.body.user.email).toBe('test@example.com');
    });

    it('should not register a user with existing email', async () => {
      // 先创建一个用户
      await User.create({
        username: 'existinguser',
        email: 'test@example.com',
        password: ['legacy', 'fixture', 'pw98'].join('-')
      });

      // 尝试用相同邮箱注册
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'test@example.com',
          password: ['legacy', 'fixture', 'pw98'].join('-')
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // 测试登录功能
  describe('POST /api/auth/login', () => {
    it('should login a user with valid credentials', async () => {
      // 先创建一个用户
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: ['legacy', 'fixture', 'pw98'].join('-')
      });

      // 尝试登录
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: ['legacy', 'fixture', 'pw98'].join('-')
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('token');
    });

    it('should not login with invalid credentials', async () => {
      // 尝试用不存在的邮箱登录
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: ['legacy', 'fixture', 'pw98'].join('-')
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});