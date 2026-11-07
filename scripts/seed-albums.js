/**
 * D-Music Seed Albums Script
 * 创建测试专辑数据
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://phgrinrlnxzjyxxhsqry.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoZ3JpbnJsbnh6anl4eGhzcXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzgzNDEsImV4cCI6MjA4NTI1NDM0MX0.bNn7XeoXmFD0dGIXIkh_YzQw-i-IqWW4x5gvl8nMcDA";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 测试专辑数据
const testAlbums = [
  {
    id: 'album-001',
    title: '星辰大海',
    artist: '张雨生',
    genre: '流行',
    cover_url: 'https://picsum.photos/seed/album001/600/600.jpg',
    description: '一张充满梦想和希望的流行专辑，带你穿越星辰大海。',
    release_date: new Date('2024-01-15').toISOString(),
    created_by: 'user-002',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'album-002',
    title: '摇滚青春',
    artist: '青春乐队',
    genre: '摇滚',
    cover_url: 'https://picsum.photos/seed/album002/600/600.jpg',
    description: '一张充满激情和力量的摇滚专辑，点燃你的青春之火。',
    release_date: new Date('2024-02-20').toISOString(),
    created_by: 'user-002',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'album-003',
    title: '电子梦境',
    artist: '电子音乐家',
    genre: '电子',
    cover_url: 'https://picsum.photos/seed/album003/600/600.jpg',
    description: '一张充满未来感的电子专辑，带你进入数字梦境。',
    release_date: new Date('2024-03-10').toISOString(),
    created_by: 'user-002',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'album-004',
    title: '古典之韵',
    artist: '古典乐团',
    genre: '古典',
    cover_url: 'https://picsum.photos/seed/album004/600/600.jpg',
    description: '一张充满艺术气息的古典专辑，感受永恒的旋律。',
    release_date: new Date('2024-04-05').toISOString(),
    created_by: 'user-002',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'album-005',
    title: '民谣之声',
    artist: '民谣歌手',
    genre: '民谣',
    cover_url: 'https://picsum.photos/seed/album005/600/600.jpg',
    description: '一张充满自然气息的民谣专辑，感受大地的呼吸。',
    release_date: new Date('2024-05-12').toISOString(),
    created_by: 'user-002',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

async function seedAlbums() {
  console.log('\n=== D-Music Seed Albums ===\n');

  let successCount = 0;
  let failCount = 0;

  for (const album of testAlbums) {
    try {
      console.log(`Creating album: ${album.title} (${album.id})`);

      const { data: albumData, error: albumError } = await supabase
        .from('albums')
        .insert({
          id: album.id,
          title: album.title,
          artist: album.artist,
          genre: album.genre,
          cover_url: album.cover_url,
          description: album.description,
          release_date: album.release_date,
          created_by: album.created_by,
          created_at: album.created_at,
          updated_at: album.updated_at,
        })
        .select();

      if (albumError) {
        console.error(`  ❌ Error creating album: ${albumError.message}`);
        failCount++;
        continue;
      }

      console.log(`  ✅ Album created: ${album.id}`);
      successCount++;
    } catch (error) {
      console.error(`  ❌ Exception: ${error.message}`);
      failCount++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Total albums: ${testAlbums.length}`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Failed: ${failCount}`);
  console.log(`\n=== Complete ===\n`);
}

seedAlbums().catch(console.error);
