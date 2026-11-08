const { cache } = require('../src/utils/redisClient');
const { getAllMusic, getMusicById, createMusic } = require('../src/services/musicService');
const mongoose = require('mongoose');
require('dotenv').config();

// 测试前连接到数据库
beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/m98-music-test');
  // 清除所有缓存
  await cache.flushAll();
});

// 测试后断开数据库连接
afterAll(async () => {
  await mongoose.disconnect();
});

// 测试缓存功能
describe('Redis Cache Test', () => {
  // 测试获取所有音乐的缓存
  test('should cache getAllMusic result', async () => {
    // 第一次调用 - 从数据库获取
    const firstCall = await getAllMusic();
    expect(firstCall).toBeDefined();

    // 第二次调用 - 应该从缓存获取
    const secondCall = await getAllMusic();
    expect(secondCall).toBeDefined();

    // 验证两次调用返回相同数据
    expect(JSON.stringify(firstCall)).toBe(JSON.stringify(secondCall));
  });

  // 测试获取单首音乐的缓存
  test('should cache getMusicById result', async () => {
    // 先创建一首音乐
    const music = await createMusic({
      title: 'Test Music',
      artist: 'Test Artist',
      album: 'Test Album',
      genre: 'Test Genre',
      duration: 200,
      audioUrl: '/test/audio.mp3'
    });

    // 第一次调用 - 从数据库获取
    const firstCall = await getMusicById(music._id);
    expect(firstCall).toBeDefined();
    expect(firstCall.title).toBe('Test Music');

    // 第二次调用 - 应该从缓存获取
    const secondCall = await getMusicById(music._id);
    expect(secondCall).toBeDefined();
    expect(secondCall.title).toBe('Test Music');
  });

  // 测试创建音乐后清除缓存
  test('should clear cache after creating music', async () => {
    // 先获取所有音乐，确保缓存已建立
    await getAllMusic();

    // 创建一首新音乐
    await createMusic({
      title: 'New Music',
      artist: 'Test Artist',
      album: 'Test Album',
      genre: 'Test Genre',
      duration: 200,
      audioUrl: '/test/new-audio.mp3'
    });

    // 检查缓存是否已清除
    const cachedMusic = await cache.get('all_music');
    expect(cachedMusic).toBeNull();
  });
});