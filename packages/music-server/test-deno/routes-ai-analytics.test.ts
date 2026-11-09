/**
 * AI 路由 + AIModelManager + Analytics/Leaderboard 测试
 */
import { assert, assertEquals, assertMatch } from 'jsr:@std/assert@1';

import { FakeSupabase } from './helpers/fake-supabase.ts';
import { createTestApp, jsonBody, request } from './helpers/test-app.ts';
import { aiModelManager } from '../src/ai-model-manager.ts';
import { queryCache, registerSongId } from '../src/server-utils.ts';

const fake = new FakeSupabase();
fake.install();
Deno.env.set('SUPABASE_URL', 'http://localhost:54321');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');

const app = createTestApp();
const P = '/make-server-f626b673';

const OPENAI_KEY = 'sk-test-key-1234567890';

function withKey(): void {
  Deno.env.set('OPENAI_API_KEY', OPENAI_KEY);
}
function withoutKey(): void {
  Deno.env.delete('OPENAI_API_KEY');
}

// ============================================================
// AIModelManager 单元测试
// ============================================================

Deno.test('manager: 无 Key 时使用模板并缓存', async () => {
  withoutKey();
  queryCache.clear();
  const first = await aiModelManager.generateLyrics({
    theme: 'unknown-theme',
    keywords: ['star', 'moon', 'dream'],
    lines: 14,
    language: 'zh',
  });
  assertEquals(first.provider, 'template');
  assertEquals(first.themeLabel, 'unknown-theme');
  assertEquals(first.lyrics.length, 14);
  assertEquals(first.cached, false);

  const second = await aiModelManager.generateLyrics({
    theme: 'unknown-theme',
    keywords: ['dream', 'moon', 'star'],
    lines: 14,
    language: 'zh',
  });
  assertEquals(second.cached, true);
  assertEquals(second.lyrics, first.lyrics);
});

Deno.test('manager: OpenAI 成功生成歌词', async () => {
  withKey();
  fake.openaiMode = 'ok';
  fake.openaiContent = 'Line one\n\nLine two\nLine three\n';
  queryCache.clear();
  const result = await aiModelManager.generateLyrics({
    theme: 'happy', keywords: ['sun'], lines: 4, language: 'en',
  });
  assertEquals(result.provider, 'openai');
  assertEquals(result.lyrics, ['Line one', 'Line two', 'Line three']);
  assertEquals(result.themeLabel, '快乐');
});

Deno.test('manager: OpenAI 失败降级模板', async () => {
  withKey();
  fake.openaiMode = 'error';
  queryCache.clear();
  const result = await aiModelManager.generateLyrics({
    theme: 'sad', keywords: [], lines: 10, language: 'en',
  });
  assertEquals(result.provider, 'template');
  assertEquals(result.lyrics.length, 10);

  fake.openaiMode = 'empty';
  queryCache.clear();
  const empty = await aiModelManager.generateLyrics({
    theme: 'calm', keywords: [], lines: 8, language: 'en',
  });
  assertEquals(empty.provider, 'template');
  fake.openaiMode = 'ok';
});

Deno.test('manager: 情绪分析模板/缓存/降级', async () => {
  withoutKey();
  queryCache.clear();
  const withLyrics = await aiModelManager.analyzeEmotion({
    workTitle: 'Summer Song',
    workTheme: 'summer',
    workLyrics: ['sunny days', 'ocean waves'],
    challengeTags: ['summer', 'ocean'],
  });
  assertEquals(withLyrics.provider, 'template');
  assert(withLyrics.score > 0);
  assertMatch(withLyrics.feedback, /meaningful lyrics/);

  const cached = await aiModelManager.analyzeEmotion({
    workTitle: 'Summer Song',
    workTheme: 'summer',
    workLyrics: ['a', 'b'],
    challengeTags: ['summer'],
  });
  assertEquals(cached.cached, true);

  const noLyrics = await aiModelManager.analyzeEmotion({ workTitle: 'No Lyrics' });
  assertEquals(noLyrics.provider, 'template');
  assertMatch(noLyrics.feedback, /adding lyrics/);

  withKey();
  fake.openaiContent = '```json\n{"themeRelevance":99,"emotionalDepth":-5,"creativity":30,"technicalQuality":10}\n```';
  queryCache.clear();
  const openai = await aiModelManager.analyzeEmotion({ workTitle: 'Clamped', workLyrics: ['x'] });
  assertEquals(openai.provider, 'openai');
  assertEquals(openai.breakdown.themeRelevance, 30);
  assertEquals(openai.breakdown.emotionalDepth, 0);
  assertEquals(openai.breakdown.creativity, 25);
  assertEquals(openai.breakdown.technicalQuality, 10);
  assertEquals(openai.feedback, 'Good effort!');

  fake.openaiMode = 'badjson';
  queryCache.clear();
  const fallback = await aiModelManager.analyzeEmotion({ workTitle: 'Bad JSON', workLyrics: ['y'] });
  assertEquals(fallback.provider, 'template');
  fake.openaiMode = 'ok';
});

Deno.test('manager: 转录模板/OpenAI/错误降级', async () => {
  withoutKey();
  const template = await aiModelManager.transcribeAudio({ audioBase64: 'AAAA', language: 'zh' });
  assertEquals(template.provider, 'template');
  assertEquals(template.text, '');
  assertEquals(template.language, 'zh');

  withKey();
  fake.openaiMode = 'ok';
  fake.openaiText = '你好世界';
  const openai = await aiModelManager.transcribeAudio({
    audioBase64: 'AAAA', mimeType: 'audio/mpeg', language: 'zh',
  });
  assertEquals(openai.provider, 'openai');
  assertEquals(openai.text, '你好世界');
  assertEquals(openai.duration, 1.5);

  fake.openaiMode = 'error';
  const fallback = await aiModelManager.transcribeAudio({ audioBase64: 'AAAA' });
  assertEquals(fallback.provider, 'template');
  assertEquals(fallback.language, 'unknown');
  fake.openaiMode = 'ok';
});

Deno.test('manager: 用户偏好分析模板与 GPT', async () => {
  withoutKey();
  queryCache.clear();
  const template = await aiModelManager.analyzeUserPreferences({
    userId: 'pref-template',
    emotionPrefs: { happy: 5, sad: 2, calm: 1, unknown: 9 },
    recentHistory: [],
    dominantMood: 'happy',
    totalListeningEvents: 30,
  });
  assertEquals(template.provider, 'template');
  assertEquals(template.engagementLevel, 'regular');
  assertEquals(template.suggestedMoods[0], 'unknown');
  assertEquals(template.personalityTag, '音乐探索者');
  assertEquals(template.recommendations.length, 3);
  assertMatch(template.recommendations[0].reasonZh, /unknown/);

  const cached = await aiModelManager.analyzeUserPreferences({
    userId: 'pref-template',
    emotionPrefs: { happy: 5 },
    recentHistory: [],
    dominantMood: 'happy',
    totalListeningEvents: 30,
  });
  assertEquals(cached.cached, true);

  const neutral = await aiModelManager.analyzeUserPreferences({
    userId: 'pref-neutral',
    emotionPrefs: {},
    recentHistory: [],
    dominantMood: 'neutral',
    totalListeningEvents: 5,
  });
  assertEquals(neutral.personalityTag, '音乐探索者');
  assertEquals(neutral.engagementLevel, 'casual');

  withKey();
  fake.openaiContent = JSON.stringify({
    insights: '你很棒',
    suggestedMoods: ['happy', 'calm', 'love', 'sad'],
    personalityTag: '测试者',
    personalityTagEn: 'Tester',
    engagementLevel: 'wizard',
    recommendations: [{ mood: 'happy', reason: 'r', reasonZh: '理由', weight: 0.9 }],
  });
  queryCache.clear();
  const gpt = await aiModelManager.analyzeUserPreferences({
    userId: 'pref-gpt',
    emotionPrefs: { happy: 3 },
    recentHistory: [{ songId: 's1', songTitle: 'S', emotion: 'happy', completionRate: 0.9 }],
    dominantMood: 'happy',
    totalListeningEvents: 60,
  });
  assertEquals(gpt.provider, 'openai');
  assertEquals(gpt.suggestedMoods.length, 3);
  assertEquals(gpt.engagementLevel, 'enthusiast');
  assertEquals(gpt.recommendations.length, 1);

  fake.openaiMode = 'badjson';
  queryCache.clear();
  const fallback = await aiModelManager.analyzeUserPreferences({
    userId: 'pref-bad',
    emotionPrefs: { sad: 4 },
    recentHistory: [],
    dominantMood: 'sad',
    totalListeningEvents: 60,
  });
  assertEquals(fallback.provider, 'template');
  fake.openaiMode = 'ok';
});

Deno.test('manager: 流式转录与用量统计', async () => {
  withKey();
  fake.openaiMode = 'ok';
  fake.openaiText = 'chunk text';
  const streamed = await aiModelManager.streamTranscribe(
    [{ audioBase64: 'AAAA', index: 0 }, { audioBase64: 'BBBB', index: 1 }],
    'zh',
    'audio/webm',
  );
  assertEquals(streamed.length, 2);
  assertEquals(streamed[0].isFinal, false);
  assertEquals(streamed[1].isFinal, true);
  assertEquals(streamed[0].provider, 'openai');

  await aiModelManager.resetUsageStats();
  assertEquals((await aiModelManager.getUsageStats()).totalCalls, 0);

  withoutKey();
  queryCache.clear();
  await aiModelManager.generateLyrics({ theme: 'love', lines: 2 });
  const stats = await aiModelManager.getUsageStats();
  assert(stats.totalCalls >= 1);
  assert(stats.templateFallbacks >= 1);
  assertEquals(fake.readJson('ai:usage-stats').totalCalls, stats.totalCalls);

  // 损坏的用量数据回退默认值
  fake.seed('ai:usage-stats', 'not-json');
  assertEquals((await aiModelManager.getUsageStats()).totalCalls, 0);

  fake.kvDown = true;
  assertEquals((await aiModelManager.getUsageStats()).openaiCalls, 0);
  fake.kvDown = false;

  const status = aiModelManager.getStatus();
  assertEquals(status.activeProvider, 'template');
  assertEquals(status.openaiAvailable, false);
  assertEquals(status.providers.length, 2);

  withKey();
  assertEquals(aiModelManager.isAIAvailable(), true);
  assertEquals(aiModelManager.getActiveProvider(), 'openai');
  withoutKey();
});

// ============================================================
// AI 路由
// ============================================================

Deno.test('ai routes: status 与 usage', async () => {
  withoutKey();
  const status = await request(app, `${P}/ai/status`);
  assertEquals(status.status, 200);
  const statusBody = await jsonBody(status);
  assertEquals(statusBody.openaiAvailable, false);
  assertEquals(statusBody.activeProvider, 'template');

  const usage = await request(app, `${P}/ai/usage`);
  assertEquals(usage.status, 200);
  assert(typeof (await jsonBody(usage)).totalCalls === 'number');
});

Deno.test('ai routes: lyrics 模板与 OpenAI', async () => {
  withoutKey();
  queryCache.clear();
  const templateRes = await request(app, `${P}/ai/lyrics`, {
    body: { theme: 'happy', keywords: ['sun'], lines: 6, language: 'zh' },
  });
  assertEquals(templateRes.status, 200);
  const template = await jsonBody(templateRes);
  assertEquals(template.provider, 'template');
  assertEquals(template.themeLabel, '快乐');
  assertEquals(template.lyrics.length, 6);

  const cachedRes = await request(app, `${P}/ai/lyrics`, {
    body: { theme: 'happy', keywords: ['sun'], lines: 6, language: 'zh' },
  });
  assertEquals((await jsonBody(cachedRes)).cached, true);

  withKey();
  fake.openaiContent = 'AI line one\nAI line two';
  queryCache.clear();
  const openaiRes = await request(app, `${P}/ai/lyrics`, {
    body: { theme: 'sad', keywords: [], lines: 2 },
  });
  assertEquals((await jsonBody(openaiRes)).provider, 'openai');
  withoutKey();
  fake.openaiContent = 'mock lyric line one\nmock lyric line two';
});

Deno.test('ai routes: lyrics 非法 JSON 返回 500', async () => {
  const res = await request(app, `${P}/ai/lyrics`, { body: '{oops' });
  assertEquals(res.status, 500);
  assertMatch((await jsonBody(res)).error, /AI lyrics failed/);
});

Deno.test('ai routes: compose 已知/未知 mood 与错误', async () => {
  const sad = await request(app, `${P}/ai/compose`, {
    body: { theme: 'sad', lyrics: ['a', 'b'], lineCount: 4 },
  });
  assertEquals(sad.status, 200);
  const sadComp = (await jsonBody(sad)).composition;
  assertEquals(sadComp.key, 'Am');
  assertEquals(sadComp.tempo, 72);
  assertEquals(sadComp.sections.length, 4);

  const unknown = await request(app, `${P}/ai/compose`, {
    body: { theme: 'mystery', lyrics: [], lineCount: 8 },
  });
  const unknownComp = (await jsonBody(unknown)).composition;
  assertEquals(unknownComp.key, 'C');
  assertEquals(unknownComp.tempo, 110);
  assertEquals(unknownComp.rhythmPattern.length, 8);

  const broken = await request(app, `${P}/ai/compose`, { body: '{bad' });
  assertEquals(broken.status, 500);
});

Deno.test('ai routes: stt/transcribe 校验/降级/成功/过大', async () => {
  withoutKey();
  const missing = await request(app, `${P}/stt/transcribe`, { body: {} });
  assertEquals(missing.status, 400);

  const fallback = await request(app, `${P}/stt/transcribe`, {
    body: { audio: 'AAAA', language: 'en' },
  });
  assertEquals(fallback.status, 200);
  const fallbackBody = await jsonBody(fallback);
  assertEquals(fallbackBody.available, false);
  assertEquals(fallbackBody.provider, 'template');
  assertMatch(fallbackBody.fallback, /requires OpenAI/);

  withKey();
  fake.openaiMode = 'ok';
  fake.openaiText = 'hello';
  const ok = await request(app, `${P}/stt/transcribe`, {
    body: { audio: 'AAAA', language: 'en', mimeType: 'audio/wav' },
  });
  const okBody = await jsonBody(ok);
  assertEquals(okBody.available, true);
  assertEquals(okBody.text, 'hello');

  const tooLarge = await request(app, `${P}/stt/transcribe`, {
    body: { audio: 'A'.repeat(7_100_000) },
  });
  assertEquals(tooLarge.status, 400);
  withoutKey();
});

Deno.test('ai routes: stt/stream 校验与成功/降级', async () => {
  withoutKey();
  const noChunks = await request(app, `${P}/stt/stream`, { body: {} });
  assertEquals(noChunks.status, 400);

  const missingAudio = await request(app, `${P}/stt/stream`, {
    body: { chunks: [{ index: 0 }] },
  });
  assertEquals(missingAudio.status, 400);
  assertMatch((await jsonBody(missingAudio)).error, /missing audioBase64/);

  const tooMany = await request(app, `${P}/stt/stream`, {
    body: { chunks: Array.from({ length: 6 }, (_, i) => ({ audioBase64: 'AAAA', index: i })) },
  });
  assertEquals(tooMany.status, 400);

  const fallback = await request(app, `${P}/stt/stream`, {
    body: { chunks: [{ audioBase64: 'AAAA', index: 0 }], language: 'zh', sessionId: 's1' },
  });
  const fallbackBody = await jsonBody(fallback);
  assertEquals(fallbackBody.available, false);
  assertEquals(fallbackBody.provider, 'template');
  assertEquals(fallbackBody.sessionId, 's1');
  assertMatch(fallbackBody.fallback, /流式语音转文字/);

  withKey();
  fake.openaiMode = 'ok';
  fake.openaiText = 'part';
  const ok = await request(app, `${P}/stt/stream`, {
    body: { chunks: [{ audioBase64: 'AAAA', index: 0 }, { audioBase64: 'BBBB', index: 1 }] },
  });
  const okBody = await jsonBody(ok);
  assertEquals(okBody.available, true);
  assertEquals(okBody.provider, 'openai');
  assertEquals(okBody.fullText, 'part part');
  withoutKey();
});

// ============================================================
// Analytics / Leaderboard
// ============================================================

Deno.test('analytics: leaderboard 计算与缓存', async () => {
  queryCache.clear();
  await registerSongId('lb-song-a');
  await registerSongId('lb-song-b');
  fake.seedJson('song:lb-song-a:stats', { plays: 100, likes: 0, comments: 10 });
  fake.seed('song:lb-song-a:likes', '50');
  fake.seedJson('song:lb-song-b:stats', { plays: 10, likes: 2, comments: 0 });
  fake.seed('song:lb-song-b:likes', '2');

  const res = await request(app, `${P}/leaderboard`);
  assertEquals(res.status, 200);
  const rankings = (await jsonBody(res)).rankings;
  const a = rankings.find((r: any) => r.songId === 'lb-song-a');
  const b = rankings.find((r: any) => r.songId === 'lb-song-b');
  assertEquals(a.likes, 50);
  assertEquals(b.engagement, Math.round((2 / 12) * 100));
  assert(rankings[0].wilsonScore >= rankings[rankings.length - 1].wilsonScore);

  const cached = await request(app, `${P}/leaderboard`);
  assertEquals((await jsonBody(cached)).rankings.length, rankings.length);

  queryCache.clear();
  fake.kvDown = true;
  const down = await request(app, `${P}/leaderboard`);
  fake.kvDown = false;
  assertEquals(down.status, 500);
  assertMatch((await jsonBody(down)).error, /Leaderboard failed/);
});

Deno.test('analytics: overview 聚合与缓存', async () => {
  queryCache.clear();
  fake.seedJson('song:lb-song-a:stats', { plays: 100, likes: 0, comments: 10 });
  fake.seed('song:lb-song-a:likes', '50');
  fake.seedJson('song:lb-song-a:annotations', { 1: { happy: 2, sad: 1 }, 2: { unknown: 5 } });

  const res = await request(app, `${P}/analytics/overview`);
  assertEquals(res.status, 200);
  const body = await jsonBody(res);
  assertEquals(body.hourlyPlays.length, 24);
  assert(body.totalPlays >= 100);
  assert(body.totalLikes >= 50);
  assertEquals(body.emotionDistribution.find((e: any) => e.name === 'happy').value, 2);
  assert(body.songBreakdown.length >= 2);

  const cached = await request(app, `${P}/analytics/overview`);
  assert((await jsonBody(cached)).songBreakdown.length >= 2);

  queryCache.clear();
  fake.kvDown = true;
  const down = await request(app, `${P}/analytics/overview`);
  fake.kvDown = false;
  assertEquals(down.status, 500);
});

Deno.test('analytics: listening-history 记录与推荐', async () => {
  const missing = await request(app, `${P}/listening-history`, { body: {} });
  assertEquals(missing.status, 400);

  const ok = await request(app, `${P}/listening-history`, {
    body: {
      userId: 'listener-1', songId: 'lb-song-a', songTitle: 'Song A',
      emotion: 'happy', listenDuration: 120, totalDuration: 180,
      completionRate: 0.9, skipped: false,
    },
  });
  assertEquals(ok.status, 200);
  assertEquals((await jsonBody(ok)).success, true);

  const history = fake.readJson('user:listener-1:listening-history');
  assertEquals(history.length, 1);
  assertEquals(history[0].completionRate, 0.9);
  assert(fake.readJson('user:listener-1:emotion-prefs').happy > 0);
  assertEquals(fake.read('song:lb-song-a:popularity'), '0.9');

  const skipped = await request(app, `${P}/listening-history`, {
    body: { userId: 'listener-1', songId: 'lb-song-b', emotion: 'weird', skipped: true },
  });
  assertEquals(skipped.status, 200);

  const recs = await request(app, `${P}/recommendations/listener-1`);
  assertEquals(recs.status, 200);
  const recBody = await jsonBody(recs);
  assertEquals(recBody.dominantMood, 'happy');
  assertEquals(recBody.totalListeningEvents, 2);
  assert(recBody.recommendations.length >= 2);

  const historyRes = await request(app, `${P}/listening-history/listener-1`);
  const historyBody = await jsonBody(historyRes);
  assertEquals(historyBody.totalEvents, 2);
  assertEquals(historyBody.emotionPreferences.happy > 0, true);

  const statsRes = await request(app, `${P}/listening-stats/listener-1`);
  assertEquals((await jsonBody(statsRes)).history.length, 2);

  const badJson = await request(app, `${P}/listening-history`, { body: '{bad' });
  assertEquals(badJson.status, 500);

  fake.kvDown = true;
  const downHist = await request(app, `${P}/listening-history/listener-1`);
  const downStats = await request(app, `${P}/listening-stats/listener-1`);
  const downRecs = await request(app, `${P}/recommendations/listener-1`);
  fake.kvDown = false;
  assertEquals(downHist.status, 500);
  assertEquals(downStats.status, 500);
  assertEquals(downRecs.status, 500);
});

Deno.test('analytics: recommendations 新歌与情绪匹配分支', async () => {
  queryCache.clear();
  fake.seed('user:listener-2:emotion-prefs', JSON.stringify({ happy: 4, sad: 1 }));
  fake.seedJson('user:listener-2:listening-history', [
    { songId: 'lb-song-a', emotion: 'happy', completionRate: 1 },
  ]);
  fake.seedJson('song:lb-song-a:annotations', { 1: { happy: 6 } });
  fake.seedJson('song:lb-song-b:annotations', { 1: { sad: 3 } });
  fake.seed('song:lb-song-a:popularity', '40');

  const res = await request(app, `${P}/recommendations/listener-2`);
  const body = await jsonBody(res);
  const a = body.recommendations.find((r: any) => r.songId === 'lb-song-a');
  assertMatch(a.reason, /happy/);
  const b = body.recommendations.find((r: any) => r.songId === 'lb-song-b');
  assertEquals(b.isNew, true);
});

Deno.test('analytics: smart-playlist 与缓存统计', async () => {
  fake.seedJson('user:listener-3:listening-history', [
    { songId: 's1', songTitle: 'S1', emotion: 'happy', completionRate: 0.9 },
    { songId: 's1', songTitle: 'S1', emotion: 'happy', completionRate: 0.8 },
    { songId: 's2', songTitle: 'S2', emotion: 'sad', completionRate: 0.4 },
  ]);
  fake.seedJson('song-index', ['s1', 's2']);

  const res = await request(app, `${P}/smart-playlist/listener-3?emotion=happy`);
  assertEquals(res.status, 200);
  const body = await jsonBody(res);
  assertEquals(body.analysis.dominant, 'happy');
  assertEquals(body.analysis.listenCount, 3);
  assertEquals(body.queue.length, 2);
  assertEquals(body.queue[0].title, 'S1');

  fake.seed('user:listener-4:listening-history', JSON.stringify([
    { songId: 's9', songTitle: 'S9', emotion: 'calm', completionRate: 0.5 },
  ]));
  fake.kv.delete('song-index');
  const fallbackQueue = await request(app, `${P}/smart-playlist/listener-4`);
  const fallbackBody = await jsonBody(fallbackQueue);
  assertEquals(fallbackBody.analysis.dominant, 'calm');
  assertEquals(fallbackBody.queue.length, 1);

  const cacheStats = await request(app, `${P}/cache/stats`);
  assertEquals(cacheStats.status, 200);
  assert(typeof (await jsonBody(cacheStats)).cache.size === 'number');

  fake.kvDown = true;
  const down = await request(app, `${P}/smart-playlist/listener-3`);
  fake.kvDown = false;
  assertEquals(down.status, 500);
});

Deno.test('analytics: ai-analysis 模板与 OpenAI', async () => {
  withoutKey();
  queryCache.clear();
  fake.seed('user:listener-5:emotion-prefs', JSON.stringify({ happy: 3, calm: 1 }));
  fake.seedJson('user:listener-5:listening-history', [
    { songId: 's1', songTitle: 'S1', emotion: 'happy', completionRate: 0.8 },
  ]);

  const template = await request(app, `${P}/recommendations/listener-5/ai-analysis`);
  assertEquals(template.status, 200);
  const templateBody = await jsonBody(template);
  assertEquals(templateBody.analysis.provider, 'template');
  assertEquals(templateBody.analysis.suggestedMoods[0], 'happy');

  withKey();
  fake.openaiContent = JSON.stringify({
    insights: 'insight', suggestedMoods: ['calm'], personalityTag: '标签',
    personalityTagEn: 'Tag', engagementLevel: 'power', recommendations: [],
  });
  queryCache.clear();
  const gpt = await request(app, `${P}/recommendations/listener-5/ai-analysis`);
  assertEquals((await jsonBody(gpt)).analysis.provider, 'openai');
  withoutKey();

  fake.kvDown = true;
  const down = await request(app, `${P}/recommendations/listener-5/ai-analysis`);
  fake.kvDown = false;
  assertEquals(down.status, 500);
});
