process.env.NODE_ENV = 'test';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD = 'test-pass';
process.env.JWT_SECRET = 'test-secret';
process.env.PGDATABASE = process.env.PGTEST_DATABASE || 'yyc3_music_test';

const request = require('supertest');
const { app } = require('../src/server-postgres');
const { close } = require('../src/db/postgres');
const { setupTestDatabase } = require('./helpers/pgTestDb');

jest.setTimeout(30000);

let token = '';

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await close();
});

describe('PostgreSQL API 集成测试', () => {
  test('GET /health 返回 PG 健康状态', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.database).toBe('PostgreSQL');
    expect(res.body.schema).toBe('m98');
  });

  test('GET /api/artist/profile 返回艺人资料', async () => {
    const res = await request(app).get('/api/artist/profile');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.artistId).toBe('M98');
    expect(res.body.data.name).toBe('董小姐');
    expect(Array.isArray(res.body.data.genres)).toBe(true);
  });

  test('GET /api/music/releases 返回分页列表', async () => {
    const res = await request(app).get('/api/music/releases');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.releases).toHaveLength(2);
    expect(res.body.data.pagination.totalItems).toBe(2);
    expect(res.body.data.releases[0].releaseDate).toBe('2024-12-15');
  });

  test('非法 limit 返回 400', async () => {
    const res = await request(app).get('/api/music/releases?limit=abc');
    expect(res.statusCode).toBe(400);
  });

  test('GET /api/music/featured 按播放量降序', async () => {
    const res = await request(app).get('/api/music/featured');
    expect(res.statusCode).toBe(200);
    expect(res.body.data[0].id).toBe(2);
    expect(res.body.data[0].stats.plays).toBe(200);
  });

  test('POST /api/music/:id/play 原子自增', async () => {
    const res = await request(app).post('/api/music/1/play');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.plays).toBe(101);
  });

  test('不存在的作品返回 404', async () => {
    const res = await request(app).post('/api/music/9999/play');
    expect(res.statusCode).toBe(404);
  });

  test('GET /api/fans/wall 返回留言', async () => {
    const res = await request(app).get('/api/fans/wall');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].message).toContain('东方夜曲');
  });

  test('GET /api/content/* 从 PG 返回内容', async () => {
    const [exclusive, blog, events] = await Promise.all([
      request(app).get('/api/content/exclusive'),
      request(app).get('/api/content/blog'),
      request(app).get('/api/content/events'),
    ]);

    expect(exclusive.statusCode).toBe(200);
    expect(exclusive.body.data[0].title).toBe('测试独家');
    expect(blog.body.data[0].tags).toEqual(['测试']);
    expect(events.body.data[0].ticketPrice).toBe('¥1');
  });

  test('登录成功返回 token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'test-pass' });

    expect(res.statusCode).toBe(200);
    expect(typeof res.body.token).toBe('string');
    token = res.body.token;
  });

  test('错误密码返回 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrong' });
    expect(res.statusCode).toBe(401);
  });

  test('受保护仪表盘需要 token', async () => {
    const unauthorized = await request(app).get('/api/admin/dashboard');
    expect(unauthorized.statusCode).toBe(401);

    const authorized = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(authorized.statusCode).toBe(200);
    expect(authorized.body.data.kpis).toHaveLength(4);
    expect(authorized.body.data.activities.length).toBeGreaterThan(0);
  });
});
