const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/index');
const Music = require('../src/models/Music');
const User = require('../src/models/User');

// 测试音乐API
describe('Music API', () => {
  let token;
  let musicId;
  let adminUser;

  // 在所有测试前运行
  beforeAll(async () => {
    // 创建管理员用户
    adminUser = await User.create({
      username: 'admin',
      email: 'admin@test.com',
      password: ['legacy', 'fixture', 'pw98'].join('-'),
      role: 'admin'
    });

    // 登录获取token
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: ['legacy', 'fixture', 'pw98'].join('-')
      });

    token = res.body.token;

    // 创建测试音乐
    const music = await Music.create({
      title: 'Test Music',
      artist: 'Test Artist',
      album: 'Test Album',
      genre: 'Pop',
      duration: 240,
      audioUrl: 'https://example.com/test.mp3'
    });

    musicId = music._id;
  });

  // 测试获取所有音乐
  describe('GET /api/music', () => {
    it('should get all music', async () => {
      const res = await request(app).get('/api/music');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  // 测试获取单个音乐
  describe('GET /api/music/:id', () => {
    it('should get music by id', async () => {
      const res = await request(app).get(`/api/music/${musicId}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(musicId.toString());
      expect(res.body.data.title).toBe('Test Music');
    });

    it('should return 404 if music not found', async () => {
      const invalidId = mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/music/${invalidId}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // 测试创建音乐
  describe('POST /api/music', () => {
    it('should create new music', async () => {
      const res = await request(app)
        .post('/api/music')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'New Music',
          artist: 'New Artist',
          album: 'New Album',
          genre: 'Rock',
          duration: 180,
          audioUrl: 'https://example.com/new.mp3'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('New Music');
    });

    it('should not create music without required fields', async () => {
      const res = await request(app)
        .post('/api/music')
        .set('Authorization', `Bearer ${token}`)
        .send({
          artist: 'New Artist'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // 测试更新音乐
  describe('PUT /api/music/:id', () => {
    it('should update music', async () => {
      const res = await request(app)
        .put(`/api/music/${musicId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Updated Music',
          genre: 'Jazz'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Updated Music');
      expect(res.body.data.genre).toBe('Jazz');
    });
  });

  // 测试删除音乐
  describe('DELETE /api/music/:id', () => {
    it('should delete music', async () => {
      const res = await request(app)
        .delete(`/api/music/${musicId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeNull();

      // 确认音乐已被删除
      const music = await Music.findById(musicId);
      expect(music).toBeNull();
    });
  });

  // 在所有测试后清理
  afterAll(async () => {
    await User.deleteMany({});
    await Music.deleteMany({});
    await mongoose.connection.close();
  });
});