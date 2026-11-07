/**
 * D-Music Seed Songs Script
 * 创建测试歌曲数据
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://phgrinrlnxzjyxxhsqry.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoZ3JpbnJsbnh6anl4eGhzcXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzgzNDEsImV4cCI6MjA4NTI1NDM0MX0.bNn7XeoXmFD0dGIXIkh_YzQw-i-IqWW4x5gvl8nMcDA";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 测试歌曲数据
const testSongs = [
  {
    id: 'song-001',
    title: '星辰大海',
    artist: '张雨生',
    album: '星辰大海',
    duration: 245, // 4:05
    bpm: 120,
    key: 'C',
    mode: 'major',
    emotion: 'calm',
    genre: '流行',
    cover_url: 'https://picsum.photos/seed/song001/400/400.jpg',
    audio_url: 'https://example.com/audio/song001.mp3',
    lyrics: [
      { time: 0, text: '星辰大海' },
      { time: 5, text: '夜空中最亮的星' },
      { time: 10, text: '指引我前行' },
      { time: 15, text: '穿越无尽的黑暗' },
      { time: 20, text: '寻找心中的光明' },
    ],
    created_by: 'user-002',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'song-002',
    title: '摇滚青春',
    artist: '青春乐队',
    album: '摇滚青春',
    duration: 210, // 3:30
    bpm: 140,
    key: 'G',
    mode: 'major',
    emotion: 'energetic',
    genre: '摇滚',
    cover_url: 'https://picsum.photos/seed/song002/400/400.jpg',
    audio_url: 'https://example.com/audio/song002.mp3',
    lyrics: [
      { time: 0, text: '摇滚青春' },
      { time: 5, text: '燃烧的火焰' },
      { time: 10, text: '永不熄灭' },
      { time: 15, text: '追逐梦想' },
      { time: 20, text: '无畏前行' },
    ],
    created_by: 'user-002',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'song-003',
    title: '电子梦境',
    artist: '电子音乐家',
    album: '电子梦境',
    duration: 180, // 3:00
    bpm: 128,
    key: 'A',
    mode: 'minor',
    emotion: 'happy',
    genre: '电子',
    cover_url: 'https://picsum.photos/seed/song003/400/400.jpg',
    audio_url: 'https://example.com/audio/song003.mp3',
    lyrics: [
      { time: 0, text: '电子梦境' },
      { time: 5, text: '数字的海洋' },
      { time: 10, text: '电流的脉动' },
      { time: 15, text: '未来的声音' },
      { time: 20, text: '无限的可能' },
    ],
    created_by: 'user-002',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'song-004',
    title: '古典之韵',
    artist: '古典乐团',
    album: '古典之韵',
    duration: 300, // 5:00
    bpm: 100,
    key: 'D',
    mode: 'major',
    emotion: 'calm',
    genre: '古典',
    cover_url: 'https://picsum.photos/seed/song004/400/400.jpg',
    audio_url: 'https://example.com/audio/song004.mp3',
    lyrics: [
      { time: 0, text: '古典之韵' },
      { time: 5, text: '岁月的沉淀' },
      { time: 10, text: '永恒的旋律' },
      { time: 15, text: '优雅的乐章' },
      { time: 20, text: '艺术的巅峰' },
    ],
    created_by: 'user-002',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'song-005',
    title: '民谣之声',
    artist: '民谣歌手',
    album: '民谣之声',
    duration: 195, // 3:15
    bpm: 110,
    key: 'E',
    mode: 'major',
    emotion: 'sad',
    genre: '民谣',
    cover_url: 'https://picsum.photos/seed/song005/400/400.jpg',
    audio_url: 'https://example.com/audio/song005.mp3',
    lyrics: [
      { time: 0, text: '民谣之声' },
      { time: 5, text: '大地的呼吸' },
      { time: 10, text: '自然的韵律' },
      { time: 15, text: '朴实的情感' },
      { time: 20, text: '纯粹的表达' },
    ],
    created_by: 'user-002',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

async function seedSongs() {
  console.log('\n=== D-Music Seed Songs ===\n');

  let successCount = 0;
  let failCount = 0;

  for (const song of testSongs) {
    try {
      console.log(`Creating song: ${song.title} (${song.id})`);

      const { data: songData, error: songError } = await supabase
        .from('songs')
        .insert({
          id: song.id,
          title: song.title,
          artist: song.artist,
          album: song.album,
          duration: song.duration,
          bpm: song.bpm,
          key: song.key,
          mode: song.mode,
          emotion: song.emotion,
          genre: song.genre,
          cover_url: song.cover_url,
          audio_url: song.audio_url,
          lyrics: song.lyrics,
          created_by: song.created_by,
          created_at: song.created_at,
          updated_at: song.updated_at,
        })
        .select();

      if (songError) {
        console.error(`  ❌ Error creating song: ${songError.message}`);
        failCount++;
        continue;
      }

      console.log(`  ✅ Song created: ${song.id}`);
      successCount++;
    } catch (error) {
      console.error(`  ❌ Exception: ${error.message}`);
      failCount++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Total songs: ${testSongs.length}`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Failed: ${failCount}`);
  console.log(`\n=== Complete ===\n`);
}

seedSongs().catch(console.error);
