/**
 * D-Music Seed KV Script
 * 创建测试 KV 数据
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://phgrinrlnxzjyxxhsqry.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoZ3JpbnJsbnh6anl4eGhzcXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzgzNDEsImV4cCI6MjA4NTI1NDM0MX0.bNn7XeoXmFD0dGIXIkh_YzQw-i-IqWW4x5gvl8nMcDA";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 测试 KV 数据
const testKVData = [
  // 用户数据
  { key: 'user:user-001:profile', value: { id: 'user-001', display_name: '普通用户', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user001' } },
  { key: 'user:user-002:profile', value: { id: 'user-002', display_name: '创作者用户', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user002' } },
  { key: 'user:user-003:profile', value: { id: 'user-003', display_name: 'VIP 用户', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user003' } },
  { key: 'user:user-004:profile', value: { id: 'user-004', display_name: '管理员用户', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user004' } },
  { key: 'user:user-005:profile', value: { id: 'user-005', display_name: '测试用户', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user005' } },

  // 歌曲数据
  { key: 'song:song-001:details', value: { id: 'song-001', title: '星辰大海', artist: '张雨生', duration: 245 } },
  { key: 'song:song-002:details', value: { id: 'song-002', title: '摇滚青春', artist: '青春乐队', duration: 210 } },
  { key: 'song:song-003:details', value: { id: 'song-003', title: '电子梦境', artist: '电子音乐家', duration: 180 } },
  { key: 'song:song-004:details', value: { id: 'song-004', title: '古典之韵', artist: '古典乐团', duration: 300 } },
  { key: 'song:song-005:details', value: { id: 'song-005', title: '民谣之声', artist: '民谣歌手', duration: 195 } },

  // 通知数据
  { key: 'notifications:user-001:unread', value: 5 },
  { key: 'notifications:user-002:unread', value: 3 },
  { key: 'notifications:user-003:unread', value: 2 },
  { key: 'notifications:user-004:unread', value: 10 },
  { key: 'notifications:user-005:unread', value: 0 },

  // 成就数据
  { key: 'achievements:user-001:stats', value: { total: 10, unlocked: 5 } },
  { key: 'achievements:user-002:stats', value: { total: 15, unlocked: 8 } },
  { key: 'achievements:user-003:stats', value: { total: 20, unlocked: 12 } },
  { key: 'achievements:user-004:stats', value: { total: 25, unlocked: 20 } },
  { key: 'achievements:user-005:stats', value: { total: 30, unlocked: 15 } },

  // 星力值数据
  { key: 'starpower:user-001:balance', value: 1000 },
  { key: 'starpower:user-002:balance', value: 2000 },
  { key: 'starpower:user-003:balance', value: 5000 },
  { key: 'starpower:user-004:balance', value: 10000 },
  { key: 'starpower:user-005:balance', value: 500 },

  // 挑战赛数据
  { key: 'challenges:challenge-001:participants', value: ['user-001', 'user-002', 'user-003'] },
  { key: 'challenges:challenge-002:participants', value: ['user-001', 'user-002', 'user-003', 'user-004', 'user-005'] },
  { key: 'challenges:challenge-003:participants', value: [] },

  // 市场数据
  { key: 'market:listing-001:details', value: { id: 'listing-001', song_id: 'song-001', price: 100, status: 'active' } },
  { key: 'market:listing-002:details', value: { id: 'listing-002', song_id: 'song-002', price: 150, status: 'active' } },
  { key: 'market:listing-003:details', value: { id: 'listing-003', song_id: 'song-003', price: 200, status: 'active' } },
  { key: 'market:listing-004:details', value: { id: 'listing-004', song_id: 'song-004', price: 300, status: 'active' } },
  { key: 'market:listing-005:details', value: { id: 'listing-005', song_id: 'song-005', price: 250, status: 'active' } },

  // 专辑数据
  { key: 'albums:album-001:details', value: { id: 'album-001', title: '星辰大海', artist: '张雨生', genre: '流行' } },
  { key: 'albums:album-002:details', value: { id: 'album-002', title: '摇滚青春', artist: '青春乐队', genre: '摇滚' } },
  { key: 'albums:album-003:details', value: { id: 'album-003', title: '电子梦境', artist: '电子音乐家', genre: '电子' } },
  { key: 'albums:album-004:details', value: { id: 'album-004', title: '古典之韵', artist: '古典乐团', genre: '古典' } },
  { key: 'albums:album-005:details', value: { id: 'album-005', title: '民谣之声', artist: '民谣歌手', genre: '民谣' } },

  // 时空喊话数据
  { key: 'spacetime:messages', value: [
    { id: 'msg-001', user_id: 'user-001', content: '大家好！', timestamp: new Date().toISOString() },
    { id: 'msg-002', user_id: 'user-002', content: '欢迎来到 D-Music！', timestamp: new Date().toISOString() },
    { id: 'msg-003', user_id: 'user-003', content: '这个平台太棒了！', timestamp: new Date().toISOString() },
  ]},

  // 直播数据
  { key: 'live:active-sessions', value: [
    { id: 'live-001', user_id: 'user-002', title: '音乐创作直播', viewers: 150 },
    { id: 'live-002', user_id: 'user-003', title: '音乐分享会', viewers: 200 },
  ]},

  // 弹幕数据
  { key: 'danmaku:live-001:messages', value: [
    { id: 'danmaku-001', user_id: 'user-001', content: '太棒了！', timestamp: new Date().toISOString() },
    { id: 'danmaku-002', user_id: 'user-003', content: '继续加油！', timestamp: new Date().toISOString() },
  ]},

  // 时间轴数据
  { key: 'timeline:user-001:events', value: [
    { id: 'event-001', type: 'play', song_id: 'song-001', timestamp: new Date().toISOString() },
    { id: 'event-002', type: 'like', song_id: 'song-002', timestamp: new Date().toISOString() },
  ]},

  // 协作数据
  { key: 'collaboration:projects', value: [
    { id: 'collab-001', name: '音乐创作项目', members: ['user-001', 'user-002', 'user-003'] },
    { id: 'collab-002', name: '翻唱项目', members: ['user-002', 'user-004'] },
  ]},

  // 加密数据
  { key: 'encryption:user-001:public-key', value: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...' },
  { key: 'encryption:user-002:public-key', value: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...' },

  // PKI 数据
  { key: 'pki:certificates', value: [
    { id: 'cert-001', user_id: 'user-001', status: 'valid', expires_at: '2025-02-26' },
    { id: 'cert-002', user_id: 'user-002', status: 'valid', expires_at: '2025-02-26' },
  ]},

  // 二级市场数据
  { key: 'secondary-market:active-listings', value: [
    { id: 'sec-listing-001', song_id: 'song-001', price: 100, status: 'active' },
    { id: 'sec-listing-002', song_id: 'song-002', price: 150, status: 'active' },
  ]},

  // 语音转文字数据
  { key: 'stt:transcriptions', value: [
    { id: 'stt-001', audio_id: 'audio-001', text: '这是一段测试音频的转录文本。', language: 'zh-CN' },
    { id: 'stt-002', audio_id: 'audio-002', text: 'This is a test audio transcription.', language: 'en-US' },
  ]},

  // 推荐数据
  { key: 'recommendation:user-001:songs', value: ['song-001', 'song-002', 'song-003'] },
  { key: 'recommendation:user-002:songs', value: ['song-004', 'song-005', 'song-001'] },
  { key: 'recommendation:user-003:songs', value: ['song-002', 'song-003', 'song-004'] },
];

async function seedKV() {
  console.log('\n=== D-Music Seed KV ===\n');

  let successCount = 0;
  let failCount = 0;

  for (const kv of testKVData) {
    try {
      console.log(`Creating KV: ${kv.key}`);

      const { data: kvData, error: kvError } = await supabase
        .from('kv_store_f626b673')
        .insert({
          key: kv.key,
          value: kv.value,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select();

      if (kvError) {
        console.error(`  ❌ Error creating KV: ${kvError.message}`);
        failCount++;
        continue;
      }

      console.log(`  ✅ KV created: ${kv.key}`);
      successCount++;
    } catch (error) {
      console.error(`  ❌ Exception: ${error.message}`);
      failCount++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Total KV entries: ${testKVData.length}`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Failed: ${failCount}`);
  console.log(`\n=== Complete ===\n`);
}

seedKV().catch(console.error);
