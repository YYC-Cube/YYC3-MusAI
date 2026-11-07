/**
 * D-Music Seed Challenges Script
 * 创建测试挑战赛数据
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://phgrinrlnxzjyxxhsqry.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoZ3JpbnJsbnh6anl4eGhzcXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzgzNDEsImV4cCI6MjA4NTI1NDM0MX0.bNn7XeoXmFD0dGIXIkh_YzQw-i-IqWW4x5gvl8nMcDA";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 测试挑战赛数据
const testChallenges = [
  {
    id: 'challenge-001',
    title: 'AI 音乐创作大赛',
    description: '使用 AI 工具创作一首原创音乐作品，展示你的创造力！',
    type: 'ai-creation',
    status: 'active',
    start_date: new Date('2024-02-01').toISOString(),
    end_date: new Date('2024-03-01').toISOString(),
    voting_end_date: new Date('2024-03-05').toISOString(),
    prize_pool: 10000,
    max_entries: 100,
    current_entries: 45,
    rules: [
      '使用 AI 工具创作音乐',
      '作品时长不少于 2 分钟',
      '作品必须为原创',
      '每人最多提交 3 个作品',
    ],
    created_by: 'user-004',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'challenge-002',
    title: '翻唱挑战赛',
    description: '翻唱一首经典歌曲，展示你的演唱技巧！',
    type: 'cover',
    status: 'completed',
    start_date: new Date('2024-01-01').toISOString(),
    end_date: new Date('2024-01-31').toISOString(),
    voting_end_date: new Date('2024-02-05').toISOString(),
    prize_pool: 5000,
    max_entries: 50,
    current_entries: 50,
    rules: [
      '翻唱经典歌曲',
      '作品时长不少于 2 分钟',
      '可以使用伴奏',
      '每人最多提交 2 个作品',
    ],
    winner_id: 'user-002',
    created_by: 'user-004',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'challenge-003',
    title: '原创歌曲大赛',
    description: '创作一首原创歌曲，展示你的音乐才华！',
    type: 'original',
    status: 'upcoming',
    start_date: new Date('2024-04-01').toISOString(),
    end_date: new Date('2024-04-30').toISOString(),
    voting_end_date: new Date('2024-05-05').toISOString(),
    prize_pool: 15000,
    max_entries: 100,
    current_entries: 0,
    rules: [
      '创作原创歌曲',
      '作品时长不少于 3 分钟',
      '必须包含歌词',
      '每人最多提交 5 个作品',
    ],
    created_by: 'user-004',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

async function seedChallenges() {
  console.log('\n=== D-Music Seed Challenges ===\n');

  let successCount = 0;
  let failCount = 0;

  for (const challenge of testChallenges) {
    try {
      console.log(`Creating challenge: ${challenge.title} (${challenge.id})`);

      const { data: challengeData, error: challengeError } = await supabase
        .from('challenges')
        .insert({
          id: challenge.id,
          title: challenge.title,
          description: challenge.description,
          type: challenge.type,
          status: challenge.status,
          start_date: challenge.start_date,
          end_date: challenge.end_date,
          voting_end_date: challenge.voting_end_date,
          prize_pool: challenge.prize_pool,
          max_entries: challenge.max_entries,
          current_entries: challenge.current_entries,
          rules: challenge.rules,
          winner_id: challenge.winner_id,
          created_by: challenge.created_by,
          created_at: challenge.created_at,
          updated_at: challenge.updated_at,
        })
        .select();

      if (challengeError) {
        console.error(`  ❌ Error creating challenge: ${challengeError.message}`);
        failCount++;
        continue;
      }

      console.log(`  ✅ Challenge created: ${challenge.id}`);
      successCount++;
    } catch (error) {
      console.error(`  ❌ Exception: ${error.message}`);
      failCount++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Total challenges: ${testChallenges.length}`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Failed: ${failCount}`);
  console.log(`\n=== Complete ===\n`);
}

seedChallenges().catch(console.error);
