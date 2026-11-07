/**
 * D-Music Seed Users Script
 * 创建测试用户数据
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://phgrinrlnxzjyxxhsqry.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoZ3JpbnJsbnh6anl4eGhzcXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzgzNDEsImV4cCI6MjA4NTI1NDM0MX0.bNn7XeoXmFD0dGIXIkh_YzQw-i-IqWW4x5gvl8nMcDA";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 测试用户数据
const testUsers = [
  {
    id: 'user-001',
    email: 'user001@test.com',
    password: 'password123',
    username: 'user001',
    display_name: '普通用户',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user001',
    role: 'user',
    bio: '这是一个普通用户，可以播放音乐和创建播放列表。',
    preferences: {
      theme: 'deep-space',
      language: 'zh-CN',
      autoplay: true,
      shuffle: false,
      repeat: 'off',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'user-002',
    email: 'user002@test.com',
    password: 'password123',
    username: 'user002',
    display_name: '创作者用户',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user002',
    role: 'creator',
    bio: '这是一个创作者用户，可以上传作品和创建 MV。',
    preferences: {
      theme: 'aurora',
      language: 'zh-CN',
      autoplay: true,
      shuffle: true,
      repeat: 'all',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'user-003',
    email: 'user003@test.com',
    password: 'password123',
    username: 'user003',
    display_name: 'VIP 用户',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user003',
    role: 'vip',
    bio: '这是一个 VIP 用户，可以访问 VIP 功能和 AI 高级功能。',
    preferences: {
      theme: 'ocean',
      language: 'en-US',
      autoplay: true,
      shuffle: false,
      repeat: 'one',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'user-004',
    email: 'user004@test.com',
    password: 'password123',
    username: 'user004',
    display_name: '管理员用户',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user004',
    role: 'admin',
    bio: '这是一个管理员用户，可以审核内容和管理用户。',
    preferences: {
      theme: 'light',
      language: 'zh-CN',
      autoplay: false,
      shuffle: false,
      repeat: 'off',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'user-005',
    email: 'user005@test.com',
    password: 'password123',
    username: 'user005',
    display_name: '测试用户',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user005',
    role: 'tester',
    bio: '这是一个测试用户，用于压力测试和模拟各种场景。',
    preferences: {
      theme: 'midnight',
      language: 'en-US',
      autoplay: true,
      shuffle: true,
      repeat: 'all',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

async function seedUsers() {
  console.log('\n=== D-Music Seed Users ===\n');

  let successCount = 0;
  let failCount = 0;

  for (const user of testUsers) {
    try {
      console.log(`Creating user: ${user.display_name} (${user.id})`);

      // 创建用户
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          password: user.password,
          username: user.username,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          role: user.role,
          bio: user.bio,
          created_at: user.created_at,
          updated_at: user.updated_at,
        })
        .select();

      if (userError) {
        console.error(`  ❌ Error creating user: ${userError.message}`);
        failCount++;
        continue;
      }

      console.log(`  ✅ User created: ${user.id}`);

      // 创建用户偏好设置
      const { error: prefError } = await supabase
        .from('user_preferences')
        .insert({
          user_id: user.id,
          theme: user.preferences.theme,
          language: user.preferences.language,
          autoplay: user.preferences.autoplay,
          shuffle: user.preferences.shuffle,
          repeat: user.preferences.repeat,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (prefError) {
        console.error(`  ❌ Error creating preferences: ${prefError.message}`);
        failCount++;
        continue;
      }

      console.log(`  ✅ Preferences created for: ${user.id}`);

      // 创建用户星力值
      const { error: starPowerError } = await supabase
        .from('user_star_power')
        .insert({
          user_id: user.id,
          star_power: 1000, // 初始星力值
          total_earned: 1000,
          total_spent: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (starPowerError) {
        console.error(`  ❌ Error creating star power: ${starPowerError.message}`);
        failCount++;
        continue;
      }

      console.log(`  ✅ Star power created for: ${user.id}`);

      successCount++;
    } catch (error) {
      console.error(`  ❌ Exception: ${error.message}`);
      failCount++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Total users: ${testUsers.length}`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Failed: ${failCount}`);
  console.log(`\n=== Complete ===\n`);
}

seedUsers().catch(console.error);
