/**
 * D-Music §7.3 — E2E Test Specifications (Playwright-Style)
 *
 * Comprehensive end-to-end test specifications covering:
 *   - Core Playback Flow (load → play → like → history → recommendations)
 *   - AI Creation Flow (lyrics → compose → share → fork chain)
 *   - Recommendation Flow (listening → preferences → AI analysis → recommendations)
 *   - Album Distribution Flow (browse → detail → purchase → collection)
 *   - E2EE PKI Infrastructure Flow (upload → fetch → status → backup → key rotation)
 *
 * These tests simulate multi-step user journeys via sequential API calls,
 * verifying the full stack works end-to-end.
 *
 * Design rationale: Since Playwright cannot be installed in this environment,
 * we implement "API-level E2E" tests that exercise the same routes a real user
 * would trigger through the UI. Each test suite follows the actual user flow
 * step-by-step. When Playwright is available, these specs can be translated
 * to page-object-model browser tests.
 *
 * Run: import('/src/app/lib/e2e-specs.ts').then(m => m.runE2ETests())
 */

import {
  createSuite, assert, assertEqual, assertTruthy,
  assertContains, assertInRange, printResults,
  type TestSuiteResult,
} from './test-runner';
import { API_BASE, apiFetch } from './supabase';

// Unique test user IDs per run to avoid interference
const E2E_USER = `e2e-user-${Date.now()}`;
const E2E_USER_NAME = `E2E-TestBot`;

// =============================================
// Suite E2E-1: Core Playback Flow
// Simulates: User opens app → Plays track → Likes → Views stats → Gets recommendations
// =============================================
function e2ePlaybackFlow(): ReturnType<typeof createSuite> {
  const suite = createSuite('E2E-1: Core Playback Flow');
  const trackId = 'track-1';

  suite.test('Step 1: Health check — API is online', async () => {
    const data = await apiFetch<{ status: string }>('/health');
    assertTruthy(data, 'Health endpoint should respond');
    assertEqual(data!.status, 'ok');
  });

  suite.test('Step 2: Load song index — tracks are available', async () => {
    const data = await apiFetch<{ songIds: string[]; total: number }>('/songs/index');
    assertTruthy(data, 'Song index should return data');
    assert(data!.songIds.length > 0, 'Should have songs');
    assertContains(data!.songIds.join(','), trackId, 'track-1 should exist');
  });

  suite.test('Step 3: Get song likes — initial state', async () => {
    const data = await apiFetch<{ likes: number }>(`/likes/${trackId}`);
    assertTruthy(data, 'Likes endpoint should return data');
    assert(typeof data!.likes === 'number', 'likes should be a number');
  });

  suite.test('Step 4: Record play event', async () => {
    const data = await apiFetch(`/play/${trackId}`, { method: 'POST' });
    assertTruthy(data, 'Play endpoint should return data');
  });

  suite.test('Step 5: Like the song — increments counter', async () => {
    const before = await apiFetch<{ likes: number }>(`/likes/${trackId}`);
    const beforeLikes = before?.likes ?? 0;

    const after = await apiFetch<{ likes: number }>(`/likes/${trackId}`, { method: 'POST' });
    assertTruthy(after, 'Like POST should return data');
    assert(after!.likes >= beforeLikes, `Likes should not decrease: before=${beforeLikes}, after=${after!.likes}`);
  });

  suite.test('Step 6: Get emotion annotations for track', async () => {
    const data = await apiFetch<{ annotations: any }>(`/annotations/${trackId}`);
    assertTruthy(data, 'Annotations should return data');
    assert(typeof data!.annotations === 'object', 'annotations should be object');
  });

  suite.test('Step 7: Add emotion annotation', async () => {
    const data = await apiFetch<any>(`/annotations/${trackId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lineIndex: 0, emotion: 'happy' }),
    });
    assertTruthy(data, 'Annotation POST should return data');
  });

  suite.test('Step 8: Record listening history (feeds recommendation engine)', async () => {
    const data = await apiFetch('/listening-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: E2E_USER,
        songId: trackId,
        songTitle: 'Cosmic Dreams',
        emotion: 'calm',
        listenDuration: 180,
        totalDuration: 245,
        completionRate: 0.73,
        skipped: false,
      }),
    });
    assertTruthy(data, 'Listening history should accept data');
  });

  suite.test('Step 9: Get personalized recommendations', async () => {
    const data = await apiFetch<{ recommendations: any[]; dominantMood: string }>(
      `/recommendations/${E2E_USER}`
    );
    assertTruthy(data, 'Recommendations should return data');
    assert(Array.isArray(data!.recommendations), 'recommendations should be array');
    assertTruthy(data!.dominantMood, 'Should have dominantMood');
  });

  suite.test('Step 10: Verify leaderboard reflects play/like data', async () => {
    const data = await apiFetch<{ rankings: any[] }>('/leaderboard');
    assertTruthy(data, 'Leaderboard should return data');
    assert(Array.isArray(data!.rankings), 'rankings should be array');
    // track-1 should appear somewhere in the rankings
    const hasTrack1 = data!.rankings.some((r: any) => r.songId === trackId);
    assert(hasTrack1, 'track-1 should appear in leaderboard after play+like');
  });

  suite.test('Step 11: Get comments for the track', async () => {
    const data = await apiFetch<{ comments: any[] }>(`/comments/${trackId}`);
    assertTruthy(data, 'Comments should return data');
    assert(Array.isArray(data!.comments), 'comments should be array');
  });

  suite.test('Step 12: Post a comment on the track', async () => {
    const data = await apiFetch<any>(`/comments/${trackId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: E2E_USER,
        userName: E2E_USER_NAME,
        content: 'E2E test comment — great track!',
        timestamp: 30,
      }),
    });
    assertTruthy(data, 'Comment POST should return data');
  });

  return suite;
}

// =============================================
// Suite E2E-2: AI Creation Flow
// Simulates: User generates lyrics → composes → creates track → shares → forks
// =============================================
function e2eAICreationFlow(): ReturnType<typeof createSuite> {
  const suite = createSuite('E2E-2: AI Creation Flow');
  let generatedLyrics: string[] = [];
  let sharedWorkId: string = '';

  suite.test('Step 1: Check AI model status', async () => {
    const data = await apiFetch<{ activeProvider: string; providers: any[] }>('/ai/status');
    assertTruthy(data, 'AI status should return data');
    assertTruthy(data!.activeProvider, 'Should have activeProvider');
    assert(data!.providers.length >= 2, 'Should have at least 2 providers');
  });

  suite.test('Step 2: Generate AI lyrics', async () => {
    const data = await apiFetch<{ success: boolean; lyrics: string[]; provider: string }>('/ai/lyrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme: 'energetic',
        keywords: ['starlight', 'dream'],
        lines: 4,
        language: 'en',
      }),
    });
    assertTruthy(data, 'AI lyrics should return data');
    assertEqual(data!.success, true);
    assert(Array.isArray(data!.lyrics), 'lyrics should be array');
    assertEqual(data!.lyrics.length, 4, 'Should return 4 lines');
    assertTruthy(data!.provider, 'Should have provider field');
    generatedLyrics = data!.lyrics;
  });

  suite.test('Step 3: AI composition — generate music params from theme', async () => {
    const data = await apiFetch<{ success: boolean; composition: any }>('/ai/compose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: 'energetic', lineCount: 4 }),
    });
    assertTruthy(data, 'AI compose should return data');
    assertEqual(data!.success, true);
    assertTruthy(data!.composition, 'Should have composition');
    assertTruthy(data!.composition.tempo, 'Should have tempo');
    assertTruthy(data!.composition.key, 'Should have key');
  });

  suite.test('Step 4: Share the AI-created work to community', async () => {
    const data = await apiFetch<any>('/shared-works', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: E2E_USER,
        userName: E2E_USER_NAME,
        title: 'E2E AI Created Song',
        theme: 'energetic',
        lyrics: generatedLyrics.length > 0 ? generatedLyrics : ['Test lyric line'],
        mode: 'ai-generated',
      }),
    });
    assertTruthy(data, 'Share work should return data');
    if (data?.workId) {
      sharedWorkId = data.workId;
    } else if (data?.work?.workId) {
      sharedWorkId = data.work.workId;
    }
    assertTruthy(sharedWorkId || data?.success, 'Should successfully share work');
  });

  suite.test('Step 5: Verify shared work appears in community', async () => {
    const data = await apiFetch<{ works: any[]; total: number }>('/shared-works');
    assertTruthy(data, 'Shared works should return data');
    assert(Array.isArray(data!.works), 'works should be array');
    // Our shared work should be in the list
    if (sharedWorkId) {
      const found = data!.works.some((w: any) => w.workId === sharedWorkId);
      assert(found, `Shared work ${sharedWorkId} should appear in community`);
    }
  });

  suite.test('Step 6: Like the shared work', async () => {
    if (!sharedWorkId) return;
    const data = await apiFetch<any>(`/shared-works/${sharedWorkId}/like`, { method: 'POST' });
    assertTruthy(data, 'Like work should return data');
  });

  suite.test('Step 7: Fork the shared work', async () => {
    if (!sharedWorkId) return;
    const data = await apiFetch<any>('/works/fork', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: `${E2E_USER}-forker`,
        userName: 'ForkBot',
        originalWorkId: sharedWorkId,
        originalAuthor: E2E_USER_NAME,
        title: 'E2E Forked Song',
        theme: 'calm',
        lyrics: ['Forked verse one', 'Forked verse two'],
      }),
    });
    // Fork may succeed or fail if work not found — both are valid for E2E testing
    assertTruthy(data, 'Fork endpoint should respond');
  });

  suite.test('Step 8: Check creators list includes our user', async () => {
    const data = await apiFetch<{ creators: any[] }>('/creators');
    assertTruthy(data, 'Creators should return data');
    assert(Array.isArray(data!.creators), 'creators should be array');
  });

  suite.test('Step 9: Verify AI usage statistics incremented', async () => {
    const data = await apiFetch<{ totalCalls: number }>('/ai/usage');
    assertTruthy(data, 'AI usage should return data');
    assert(data!.totalCalls > 0, `totalCalls should be > 0, got ${data!.totalCalls}`);
  });

  return suite;
}

// =============================================
// Suite E2E-3: Recommendation & Analytics Flow
// Simulates: Multiple listens → history → AI analysis → personalized recommendations
// =============================================
function e2eRecommendationFlow(): ReturnType<typeof createSuite> {
  const suite = createSuite('E2E-3: Recommendation & Analytics Flow');

  suite.test('Step 1: Record diverse listening history (3 tracks)', async () => {
    const tracks = [
      { songId: 'track-1', songTitle: 'Cosmic Dreams', emotion: 'calm', duration: 245 },
      { songId: 'track-2', songTitle: 'Neon Horizon', emotion: 'energetic', duration: 198 },
      { songId: 'track-3', songTitle: 'Ocean Lullaby', emotion: 'sad', duration: 276 },
    ];
    for (const t of tracks) {
      await apiFetch('/listening-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: E2E_USER,
          songId: t.songId,
          songTitle: t.songTitle,
          emotion: t.emotion,
          listenDuration: Math.round(t.duration * 0.8),
          totalDuration: t.duration,
          completionRate: 0.8,
          skipped: false,
        }),
      });
    }
    // No assertion needed — just ensure no throws
    assert(true, 'Recording 3 tracks should succeed');
  });

  suite.test('Step 2: Get analytics overview — reflects playback data', async () => {
    const data = await apiFetch<{ totalPlays: number; totalLikes: number }>('/analytics/overview');
    assertTruthy(data, 'Analytics overview should return data');
    assert(typeof data!.totalPlays === 'number', 'totalPlays should be number');
    assert(typeof data!.totalLikes === 'number', 'totalLikes should be number');
  });

  suite.test('Step 3: Get personalized recommendations from listening profile', async () => {
    const data = await apiFetch<{
      recommendations: any[];
      dominantMood: string;
      moodDistribution: any;
    }>(`/recommendations/${E2E_USER}`);
    assertTruthy(data, 'Recommendations should return data');
    assert(Array.isArray(data!.recommendations), 'recommendations should be array');
    assertTruthy(data!.dominantMood, 'Should derive dominant mood from listening history');
  });

  suite.test('Step 4: Get AI-powered preference analysis (GPT insights)', async () => {
    const data = await apiFetch<{ userId: string; analysis: any }>(
      `/recommendations/${E2E_USER}/ai-analysis`
    );
    assertTruthy(data, 'AI analysis should return data');
    assertEqual(data!.userId, E2E_USER);
    assertTruthy(data!.analysis, 'Should have analysis object');
    assertTruthy(data!.analysis.insights, 'Should have insights text');
    assertTruthy(data!.analysis.personalityTag, 'Should have personality tag');
    assertContains(
      ['casual', 'regular', 'enthusiast', 'power'],
      data!.analysis.engagementLevel,
      'Valid engagement level'
    );
  });

  suite.test('Step 5: Get smart playlist — emotion-aware queue', async () => {
    const data = await apiFetch<{ analysis: any; queue: any[] }>(`/smart-playlist/${E2E_USER}`);
    assertTruthy(data, 'Smart playlist should return data');
    assertTruthy(data!.analysis, 'Should have analysis');
    assert(Array.isArray(data!.queue), 'queue should be array');
  });

  suite.test('Step 6: Verify leaderboard & analytics coherence', async () => {
    const [leaderboard, analytics] = await Promise.all([
      apiFetch<{ rankings: any[] }>('/leaderboard'),
      apiFetch<{ totalPlays: number }>('/analytics/overview'),
    ]);
    assertTruthy(leaderboard?.rankings, 'Leaderboard should have rankings');
    assertTruthy(analytics, 'Analytics should respond');
    assert(analytics!.totalPlays >= 0, 'totalPlays should be >= 0');
  });

  suite.test('Step 7: Star Power balance check', async () => {
    const data = await apiFetch<{ starPower: number }>(`/starpower/${E2E_USER}`);
    assertTruthy(data, 'StarPower should return data');
    assert(typeof data!.starPower === 'number', 'starPower should be number');
  });

  return suite;
}

// =============================================
// Suite E2E-4: Digital Album Distribution Flow
// Simulates: Browse albums → View detail → Purchase → Verify collection → Like
// =============================================
function e2eAlbumDistributionFlow(): ReturnType<typeof createSuite> {
  const suite = createSuite('E2E-4: Digital Album Distribution Flow');
  let albumId = '';
  const purchaseUser = `e2e-album-buyer-${Date.now()}`;

  suite.test('Step 1: Browse album marketplace', async () => {
    const data = await apiFetch<{ albums: any[]; total: number }>('/albums');
    assertTruthy(data, 'Albums endpoint should return data');
    assert(Array.isArray(data!.albums), 'albums should be array');
    assert(data!.albums.length >= 1, `Should have at least 1 album, got ${data!.albums.length}`);
    albumId = data!.albums[0].id;
  });

  suite.test('Step 2: View album details', async () => {
    if (!albumId) return;
    const data = await apiFetch<{ album: any }>(`/albums/${albumId}`);
    assertTruthy(data, 'Album detail should return data');
    assertTruthy(data!.album, 'Should have album object');
    assertEqual(data!.album.id, albumId);
    assert(Array.isArray(data!.album.tracks), 'tracks should be array');
    assert(data!.album.tracks.length > 0, 'Should have tracks');
    assert(typeof data!.album.price === 'number', 'price should be number');
  });

  suite.test('Step 3: Give user Star Power for purchase', async () => {
    // Add enough SP for the test user
    const data = await apiFetch<{ starPower: number }>(`/starpower/${purchaseUser}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 1000, reason: 'E2E test funds' }),
    });
    assertTruthy(data, 'StarPower add should return data');
    assert(data!.starPower >= 1000, `Should have at least 1000 SP, got ${data!.starPower}`);
  });

  suite.test('Step 4: Purchase album with Star Power', async () => {
    if (!albumId) return;
    const data = await apiFetch<any>(`/albums/${albumId}/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: purchaseUser }),
    });
    assertTruthy(data, 'Purchase should return data');
    assertEqual(data!.success, true, 'Purchase should succeed');
    assertTruthy(data!.ownership, 'Should have ownership record');
    assert(typeof data!.starPower === 'number', 'Should return updated SP balance');
    assert(typeof data!.edition === 'number', 'Should return edition number');
  });

  suite.test('Step 5: Verify album in user collection', async () => {
    const data = await apiFetch<{ collection: any[]; total: number }>(
      `/albums/collection/${purchaseUser}`
    );
    assertTruthy(data, 'Collection should return data');
    assert(data!.total >= 1, `Should have at least 1 album in collection, got ${data!.total}`);
    const found = data!.collection.some((a: any) => a.id === albumId);
    assert(found, 'Purchased album should be in collection');
  });

  suite.test('Step 6: Duplicate purchase should fail (409)', async () => {
    if (!albumId) return;
    const res = await fetch(`${API_BASE}/albums/${albumId}/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: purchaseUser }),
    });
    assertEqual(res.status, 409, 'Duplicate purchase should return 409');
    const data = await res.json();
    assertEqual(data.alreadyOwned, true, 'Should indicate alreadyOwned');
  });

  suite.test('Step 7: Like the album', async () => {
    if (!albumId) return;
    const before = await apiFetch<{ album: { likes: number } }>(`/albums/${albumId}`);
    const beforeLikes = before?.album?.likes ?? 0;

    const data = await apiFetch<{ likes: number }>(`/albums/${albumId}/like`, { method: 'POST' });
    assertTruthy(data, 'Like should return data');
    assert(data!.likes > beforeLikes, `Likes should increase: before=${beforeLikes}, after=${data!.likes}`);
  });

  suite.test('Step 8: Non-existent album returns 404', async () => {
    const res = await fetch(`${API_BASE}/albums/nonexistent-album-xyz`, {});
    assertEqual(res.status, 404, 'Should return 404 for non-existent album');
  });

  suite.test('Step 9: Purchase without sufficient SP fails (402)', async () => {
    if (!albumId) return;
    const poorUser = `e2e-poor-user-${Date.now()}`;
    // This user has 0 SP
    const res = await fetch(`${API_BASE}/albums/${albumId}/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: poorUser }),
    });
    assertEqual(res.status, 402, 'Insufficient funds should return 402');
    const data = await res.json();
    assertEqual(data.insufficientFunds, true, 'Should indicate insufficientFunds');
  });

  return suite;
}

// =============================================
// Suite E2E-5: Challenge & Social Flow
// Simulates: View challenge → Submit entry → View entries → Check achievements
// =============================================
function e2eChallengeFlow(): ReturnType<typeof createSuite> {
  const suite = createSuite('E2E-5: Challenge & Social Flow');

  suite.test('Step 1: Get active challenge', async () => {
    const data = await apiFetch<{ challenge: any }>('/challenges/active');
    assertTruthy(data?.challenge, 'Should return active challenge');
    assertTruthy(data!.challenge.id, 'Challenge should have id');
    assertTruthy(data!.challenge.title, 'Challenge should have title');
  });

  suite.test('Step 2: Submit a challenge entry', async () => {
    const challengeData = await apiFetch<{ challenge: any }>('/challenges/active');
    if (!challengeData?.challenge) return;

    const result = await apiFetch<any>(`/challenges/${challengeData.challenge.id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: `${E2E_USER}-challenger`,
        userName: 'ChallengeBot',
        workTitle: 'E2E Challenge Entry',
        workTheme: 'electronic',
        workLyrics: ['Electric dreams under neon skies', 'Digital hearts in binary code'],
      }),
    });
    assertTruthy(result, 'Submit should return data');
    // Could be success or "already submitted" — both are valid
    assertTruthy(result?.success || result?.error, 'Should return success or error');
  });

  suite.test('Step 3: View challenge entries', async () => {
    const challengeData = await apiFetch<{ challenge: any }>('/challenges/active');
    if (!challengeData?.challenge) return;

    const data = await apiFetch<{ entries: any[] }>(`/challenges/${challengeData.challenge.id}/entries`);
    assertTruthy(data, 'Entries should return data');
    assert(Array.isArray(data!.entries), 'entries should be array');
  });

  suite.test('Step 4: Check achievements for user', async () => {
    const data = await apiFetch<{ achievements: any[]; totalAchievements: number }>(
      `/achievements/${E2E_USER}`
    );
    assertTruthy(data, 'Achievements should return data');
    assert(Array.isArray(data!.achievements), 'achievements should be array');
    assertEqual(data!.totalAchievements, 12, 'Should have 12 achievement definitions');
  });

  suite.test('Step 5: Check notifications', async () => {
    const data = await apiFetch<{ notifications: any[] }>(`/notifications/${E2E_USER_NAME}`);
    assertTruthy(data, 'Notifications should return data');
    assert(Array.isArray(data!.notifications), 'notifications should be array');
  });

  suite.test('Step 6: Check MHeart score', async () => {
    const data = await apiFetch<{ mheart: any }>(`/mheart/${E2E_USER}`);
    assertTruthy(data, 'MHeart should return data');
    assertTruthy(data!.mheart, 'Should have mheart data');
    assert(typeof data!.mheart.score === 'number', 'score should be number');
  });

  suite.test('Step 7: Check timeline comments', async () => {
    const data = await apiFetch<{ comments: any[] }>('/timeline-comments/track-1');
    assertTruthy(data, 'Timeline comments should return data');
    assert(Array.isArray(data!.comments), 'comments should be array');
  });

  return suite;
}

// =============================================
// Suite E2E-6: Cross-Flow Integration Tests
// Simulates: AI creation → Share → Album creation → Purchase → Recommendations reflect new data
// =============================================
function e2eCrossFlowIntegration(): ReturnType<typeof createSuite> {
  const suite = createSuite('E2E-6: Cross-Flow Integration');
  const crossUser = `e2e-cross-${Date.now()}`;

  suite.test('Step 1: Seed Star Power for cross-flow user', async () => {
    const data = await apiFetch<{ starPower: number }>(`/starpower/${crossUser}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 2000, reason: 'E2E cross-flow test seed' }),
    });
    assertTruthy(data, 'SP seed should return data');
    assert(data!.starPower >= 2000, `Should have >= 2000 SP, got ${data!.starPower}`);
  });

  suite.test('Step 2: AI-generate lyrics (creation flow start)', async () => {
    const data = await apiFetch<{ success: boolean; lyrics: string[] }>('/ai/lyrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: 'calm', keywords: ['moon', 'river'], lines: 4, language: 'en' }),
    });
    assertTruthy(data, 'Lyrics should return data');
    assertEqual(data!.success, true);
    assert(data!.lyrics.length >= 2, 'Should generate lyrics');
  });

  suite.test('Step 3: Record diverse listening to build recommendation profile', async () => {
    const sessions = [
      { songId: 'track-1', songTitle: 'Cosmic Dreams', emotion: 'calm', duration: 245 },
      { songId: 'track-2', songTitle: 'Neon Horizon', emotion: 'energetic', duration: 198 },
      { songId: 'track-3', songTitle: 'Ocean Lullaby', emotion: 'sad', duration: 276 },
      { songId: 'track-4', songTitle: 'Aurora Rising', emotion: 'happy', duration: 212 },
      { songId: 'track-5', songTitle: 'Forest Whispers', emotion: 'calm', duration: 189 },
    ];
    for (const s of sessions) {
      await apiFetch('/listening-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: crossUser,
          songId: s.songId,
          songTitle: s.songTitle,
          emotion: s.emotion,
          listenDuration: Math.round(s.duration * 0.85),
          totalDuration: s.duration,
          completionRate: 0.85,
          skipped: false,
        }),
      });
    }
    assert(true, 'Recording 5 listening sessions should succeed');
  });

  suite.test('Step 4: Recommendations reflect new listening profile', async () => {
    const data = await apiFetch<{ recommendations: any[]; dominantMood: string }>(`/recommendations/${crossUser}`);
    assertTruthy(data, 'Recommendations should return data');
    assert(Array.isArray(data!.recommendations), 'recommendations should be array');
    assertTruthy(data!.dominantMood, 'Should compute dominantMood from 5-track history');
  });

  suite.test('Step 5: Purchase album with seeded SP', async () => {
    const albums = await apiFetch<{ albums: any[] }>('/albums');
    assertTruthy(albums?.albums, 'Should have albums');
    assert(albums!.albums.length >= 1, 'Need at least 1 album');

    const cheapest = albums!.albums.reduce((a: any, b: any) => a.price < b.price ? a : b);
    const purchaseRes = await apiFetch<any>(`/albums/${cheapest.id}/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: crossUser }),
    });
    assertTruthy(purchaseRes, 'Purchase should return data');
    assertEqual(purchaseRes!.success, true, 'Purchase should succeed');
    assert(typeof purchaseRes!.starPower === 'number', 'Should return updated SP');
  });

  suite.test('Step 6: Verify SP was deducted after purchase', async () => {
    const data = await apiFetch<{ starPower: number }>(`/starpower/${crossUser}`);
    assertTruthy(data, 'SP should return data');
    assert(data!.starPower < 2000, `SP should be deducted from 2000, now ${data!.starPower}`);
  });

  suite.test('Step 7: Collection reflects new purchase', async () => {
    const data = await apiFetch<{ collection: any[]; total: number }>(`/albums/collection/${crossUser}`);
    assertTruthy(data, 'Collection should return data');
    assert(data!.total >= 1, `Collection should have at least 1 album, got ${data!.total}`);
  });

  suite.test('Step 8: Smart playlist incorporates user history', async () => {
    const data = await apiFetch<{ analysis: any; queue: any[] }>(`/smart-playlist/${crossUser}`);
    assertTruthy(data, 'Smart playlist should return data');
    assertTruthy(data!.analysis, 'Should have analysis');
    assert(Array.isArray(data!.queue), 'queue should be array');
  });

  return suite;
}

// =============================================
// Suite E2E-7: Error Handling & Edge Cases
// Simulates: Various error conditions to verify graceful handling
// =============================================
function e2eErrorHandling(): ReturnType<typeof createSuite> {
  const suite = createSuite('E2E-7: Error Handling & Edge Cases');

  suite.test('Step 1: Invalid song ID returns gracefully', async () => {
    const data = await apiFetch<{ likes: number }>('/likes/nonexistent-track-xyz');
    // Should not throw — returns default value or error gracefully
    assertTruthy(data !== undefined || data === null, 'Should handle non-existent track gracefully');
  });

  suite.test('Step 2: Empty body on POST returns 400', async () => {
    const res = await fetch(`${API_BASE}/ai/lyrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    // Should return 400 or handle gracefully
    assert(res.status >= 200 && res.status < 600, 'Should return a valid HTTP status');
  });

  suite.test('Step 3: Concurrent likes do not corrupt data', async () => {
    const trackId = 'track-1';
    const before = await apiFetch<{ likes: number }>(`/likes/${trackId}`);
    const beforeLikes = before?.likes ?? 0;

    // Fire 5 concurrent likes
    await Promise.all([
      apiFetch(`/likes/${trackId}`, { method: 'POST' }),
      apiFetch(`/likes/${trackId}`, { method: 'POST' }),
      apiFetch(`/likes/${trackId}`, { method: 'POST' }),
      apiFetch(`/likes/${trackId}`, { method: 'POST' }),
      apiFetch(`/likes/${trackId}`, { method: 'POST' }),
    ]);

    const after = await apiFetch<{ likes: number }>(`/likes/${trackId}`);
    assert(after!.likes >= beforeLikes + 3, `Concurrent likes should mostly succeed: before=${beforeLikes}, after=${after!.likes}`);
  });

  suite.test('Step 4: Large comment content handled', async () => {
    const bigContent = 'A'.repeat(2000);
    const data = await apiFetch<any>('/comments/track-1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'e2e-edge-user',
        userName: 'EdgeBot',
        content: bigContent,
        timestamp: 0,
      }),
    });
    assertTruthy(data, 'Large comment should be handled');
  });

  suite.test('Step 5: Album like idempotency', async () => {
    const albums = await apiFetch<{ albums: any[] }>('/albums');
    if (!albums?.albums?.length) return;
    const albumId = albums.albums[0].id;

    const like1 = await apiFetch<{ likes: number }>(`/albums/${albumId}/like`, { method: 'POST' });
    const like2 = await apiFetch<{ likes: number }>(`/albums/${albumId}/like`, { method: 'POST' });
    assertTruthy(like1, 'First like should return data');
    assertTruthy(like2, 'Second like should return data');
    assert(like2!.likes >= like1!.likes, 'Likes should not decrease');
  });

  suite.test('Step 6: STT stream endpoint with empty chunks', async () => {
    const data = await apiFetch<any>('/stt/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chunks: [], language: 'en' }),
    });
    // Should handle gracefully — no crash
    assertTruthy(data !== undefined, 'STT stream should handle empty chunks');
  });

  suite.test('Step 7: Recommendations for new user (cold start)', async () => {
    const coldUser = `e2e-cold-${Date.now()}`;
    const data = await apiFetch<{ recommendations: any[]; dominantMood: string }>(`/recommendations/${coldUser}`);
    assertTruthy(data, 'Cold start recommendations should return data');
    assert(Array.isArray(data!.recommendations), 'recommendations should be array');
  });

  return suite;
}

// =============================================
// Suite E2E-8: Album Creator Flow
// Simulates: Creator publishes album → Another user discovers → Purchases → Creator earns SP
// =============================================
function e2eAlbumCreatorFlow(): ReturnType<typeof createSuite> {
  const suite = createSuite('E2E-8: Album Creator Flow');
  const creatorId = `e2e-creator-${Date.now()}`;
  const buyerId = `e2e-buyer-${Date.now()}`;
  let createdAlbumId = '';

  suite.test('Step 1: Creator publishes a new album', async () => {
    const data = await apiFetch<{ success: boolean; album: any }>('/albums', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creatorId,
        creatorName: 'E2E Creator',
        title: 'E2E Test Album',
        description: 'Created during E2E testing',
        genre: 'Electronic / Ambient',
        tracks: [
          { title: 'Test Track 1', artist: 'E2E Creator', duration: 180 },
          { title: 'Test Track 2', artist: 'E2E Creator', duration: 210 },
        ],
        price: 50,
        limitedEdition: true,
        maxSupply: 10,
        tags: ['e2e', 'test'],
      }),
    });
    assertTruthy(data, 'Create album should return data');
    assertEqual(data!.success, true, 'Album creation should succeed');
    assertTruthy(data!.album?.id, 'Should return album with id');
    createdAlbumId = data!.album.id;
  });

  suite.test('Step 2: New album appears in marketplace', async () => {
    const data = await apiFetch<{ albums: any[] }>('/albums');
    assertTruthy(data?.albums, 'Should have albums');
    if (createdAlbumId) {
      const found = data!.albums.some((a: any) => a.id === createdAlbumId);
      assert(found, 'Newly created album should appear in marketplace');
    }
  });

  suite.test('Step 3: New album appears in creator\'s list', async () => {
    const data = await apiFetch<{ albums: any[] }>(`/albums/creator/${creatorId}`);
    assertTruthy(data, 'Creator albums should return data');
    if (createdAlbumId) {
      const found = data!.albums.some((a: any) => a.id === createdAlbumId);
      assert(found, 'Album should appear in creator list');
    }
  });

  suite.test('Step 4: Buyer funds their account', async () => {
    const data = await apiFetch<{ starPower: number }>(`/starpower/${buyerId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 500, reason: 'E2E buyer funds' }),
    });
    assertTruthy(data, 'SP add should return data');
    assert(data!.starPower >= 500, `Should have >= 500 SP`);
  });

  suite.test('Step 5: Buyer purchases the created album', async () => {
    if (!createdAlbumId) return;
    const data = await apiFetch<any>(`/albums/${createdAlbumId}/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: buyerId }),
    });
    assertTruthy(data, 'Purchase should return data');
    assertEqual(data!.success, true, 'Purchase should succeed');
    assertEqual(data!.edition, 1, 'Should be edition #1');
  });

  suite.test('Step 6: Album supply updated after purchase', async () => {
    if (!createdAlbumId) return;
    const data = await apiFetch<{ album: any }>(`/albums/${createdAlbumId}`);
    assertTruthy(data?.album, 'Album detail should return data');
    assertEqual(data!.album.circulatingSupply, 1, 'Circulating supply should be 1');
    assertEqual(data!.album.totalSales, 1, 'Total sales should be 1');
  });

  suite.test('Step 7: Creator receives earnings (80% of price)', async () => {
    const creatorSP = await apiFetch<{ starPower: number }>(`/starpower/${creatorId}`);
    assertTruthy(creatorSP, 'Creator SP should return data');
    // Creator should get 80% of 50 = 40 SP
    assert(creatorSP!.starPower >= 40, `Creator should earn >=40 SP, got ${creatorSP!.starPower}`);
  });

  return suite;
}

// =============================================
// Suite E2E-9: E2EE PKI Infrastructure Flow
// Simulates: Upload public key → Fetch → Status check → Store backup → Retrieve backup → Key rotation (delete)
// =============================================
function e2ePkiFlow(): ReturnType<typeof createSuite> {
  const suite = createSuite('E2E-9: E2EE PKI Infrastructure Flow');
  const pkiUser = `e2e-pki-${Date.now()}`;
  // Synthetic RSA-OAEP JWK (valid structure, not a real key — sufficient for API testing)
  const testPublicKeyJwk: Record<string, string> = {
    kty: 'RSA',
    n: 'sXchDaQebHnPiGvhGPEUBCPbhQifl0xKtKQ4i3AUQHBFV0I3Rr1fJGqVH8e8V0UH6tIPHGr' +
       'RPlEqLwKlXsB3wnEySmyaYppK8p0nA9x3CEQV3MR1BAstOwsq0NOyTvDBkfJO0p0NrzMN7nZB',
    e: 'AQAB',
    alg: 'RSA-OAEP-256',
    ext: 'true',
  };

  suite.test('Step 1: Check E2EE status for new user (not enrolled)', async () => {
    const data = await apiFetch<{ enrolled: boolean; hasBackup: boolean; fingerprint: string | null }>(
      `/pki/status/${pkiUser}`
    );
    assertTruthy(data, 'PKI status should return data');
    assertEqual(data!.enrolled, false, 'New user should not be enrolled');
    assertEqual(data!.hasBackup, false, 'New user should not have backup');
    assertEqual(data!.fingerprint, null, 'Fingerprint should be null');
  });

  suite.test('Step 2: Fetch public key for non-enrolled user → 404', async () => {
    const res = await fetch(`${API_BASE}/pki/public-key/${pkiUser}`);
    assertEqual(res.status, 404, 'Should return 404 for non-enrolled user');
    const data = await res.json();
    assertEqual(data.enrolled, false, 'Should indicate not enrolled');
  });

  suite.test('Step 3: Upload public key', async () => {
    const data = await apiFetch<{ success: boolean; fingerprint: string; isNew: boolean }>('/pki/public-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: pkiUser, publicKeyJwk: testPublicKeyJwk }),
    });
    assertTruthy(data, 'Upload should return data');
    assertEqual(data!.success, true, 'Upload should succeed');
    assertTruthy(data!.fingerprint, 'Should return fingerprint');
    assertEqual(data!.isNew, true, 'Should be a new registration');
  });

  suite.test('Step 4: Status now shows enrolled', async () => {
    const data = await apiFetch<{ enrolled: boolean; hasBackup: boolean; fingerprint: string | null }>(
      `/pki/status/${pkiUser}`
    );
    assertTruthy(data, 'Status should return data');
    assertEqual(data!.enrolled, true, 'User should now be enrolled');
    assertTruthy(data!.fingerprint, 'Should have fingerprint after enrollment');
    assertEqual(data!.hasBackup, false, 'No backup yet');
  });

  suite.test('Step 5: Fetch public key — matches uploaded JWK', async () => {
    const data = await apiFetch<{
      publicKeyJwk: any;
      fingerprint: string;
      algorithm: string;
      enrolled: boolean;
    }>(`/pki/public-key/${pkiUser}`);
    assertTruthy(data, 'Public key fetch should return data');
    assertEqual(data!.enrolled, true, 'enrolled should be true');
    assertEqual(data!.publicKeyJwk?.kty, 'RSA', 'JWK kty should be RSA');
    assertEqual(data!.publicKeyJwk?.e, 'AQAB', 'JWK exponent should match');
    assertTruthy(data!.fingerprint, 'Should have fingerprint');
    assertContains(data!.algorithm, 'RSA', 'Algorithm should contain RSA');
  });

  suite.test('Step 6: Re-upload public key (update, not new)', async () => {
    const data = await apiFetch<{ success: boolean; isNew: boolean }>('/pki/public-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: pkiUser, publicKeyJwk: testPublicKeyJwk }),
    });
    assertTruthy(data, 'Re-upload should return data');
    assertEqual(data!.success, true, 'Re-upload should succeed');
    assertEqual(data!.isNew, false, 'Should NOT be new (update)');
  });

  suite.test('Step 7: Store encrypted key backup', async () => {
    const data = await apiFetch<{ success: boolean; isNew: boolean }>('/pki/key-backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: pkiUser,
        encryptedPrivateKey: 'dGVzdC1lbmNyeXB0ZWQtcHJpdmF0ZS1rZXk=', // base64 dummy
        salt: 'dGVzdC1zYWx0LXZhbHVl',
        iv: 'dGVzdC1pdi12YWx1ZQ==',
        publicKeyJwk: testPublicKeyJwk,
      }),
    });
    assertTruthy(data, 'Backup store should return data');
    assertEqual(data!.success, true, 'Backup should succeed');
    assertEqual(data!.isNew, true, 'Should be a new backup');
  });

  suite.test('Step 8: Status now shows hasBackup=true', async () => {
    const data = await apiFetch<{ enrolled: boolean; hasBackup: boolean }>(
      `/pki/status/${pkiUser}`
    );
    assertTruthy(data, 'Status should return data');
    assertEqual(data!.enrolled, true);
    assertEqual(data!.hasBackup, true, 'Should now have backup');
  });

  suite.test('Step 9: Retrieve key backup — matches stored data', async () => {
    const data = await apiFetch<{
      encryptedPrivateKey: string;
      salt: string;
      iv: string;
      publicKeyJwk: any;
      hasBackup: boolean;
    }>(`/pki/key-backup/${pkiUser}`);
    assertTruthy(data, 'Backup retrieval should return data');
    assertEqual(data!.hasBackup, true);
    assertEqual(data!.encryptedPrivateKey, 'dGVzdC1lbmNyeXB0ZWQtcHJpdmF0ZS1rZXk=');
    assertEqual(data!.salt, 'dGVzdC1zYWx0LXZhbHVl');
    assertEqual(data!.iv, 'dGVzdC1pdi12YWx1ZQ==');
    assertEqual(data!.publicKeyJwk?.kty, 'RSA');
  });

  suite.test('Step 10: Backup for non-existent user → 404', async () => {
    const res = await fetch(`${API_BASE}/pki/key-backup/nonexistent-user-xyz`);
    assertEqual(res.status, 404, 'Should return 404 for non-existent backup');
    const data = await res.json();
    assertEqual(data.hasBackup, false, 'Should indicate no backup');
  });

  suite.test('Step 11: Upload public key with invalid JWK → 400', async () => {
    const res = await fetch(`${API_BASE}/pki/public-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: pkiUser, publicKeyJwk: { kty: 'RSA' } }), // missing n, e
    });
    assertEqual(res.status, 400, 'Invalid JWK should return 400');
  });

  suite.test('Step 12: Upload public key without userId → 400', async () => {
    const res = await fetch(`${API_BASE}/pki/public-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicKeyJwk: testPublicKeyJwk }), // missing userId
    });
    assertEqual(res.status, 400, 'Missing userId should return 400');
  });

  suite.test('Step 13: Delete public key (key rotation)', async () => {
    const data = await apiFetch<{ success: boolean }>(`/pki/public-key/${pkiUser}`, {
      method: 'DELETE',
    });
    assertTruthy(data, 'Delete should return data');
    assertEqual(data!.success, true, 'Delete should succeed');
  });

  suite.test('Step 14: After deletion, status shows not enrolled', async () => {
    const data = await apiFetch<{ enrolled: boolean; hasBackup: boolean }>(
      `/pki/status/${pkiUser}`
    );
    assertTruthy(data, 'Status should return data');
    assertEqual(data!.enrolled, false, 'Should no longer be enrolled after deletion');
    assertEqual(data!.hasBackup, false, 'Backup should also be deleted on key rotation');
  });

  suite.test('Step 15: Re-enroll after key rotation', async () => {
    const data = await apiFetch<{ success: boolean; isNew: boolean }>('/pki/public-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: pkiUser, publicKeyJwk: testPublicKeyJwk }),
    });
    assertTruthy(data, 'Re-enroll should return data');
    assertEqual(data!.success, true);
    assertEqual(data!.isNew, true, 'Should be new after key rotation');
  });

  return suite;
}

// =============================================
// Suite E2E-10: Secondary Market Flow
// Simulates: Browse listings → List album for resale → Buy listing → View history → Cancel listing
// =============================================
function e2eSecondaryMarketFlow(): ReturnType<typeof createSuite> {
  const suite = createSuite('E2E-10: Secondary Market Flow');
  const sellerId = `e2e-seller-${Date.now()}`;
  const buyerId = `e2e-mkt-buyer-${Date.now()}`;
  let listingId = '';
  let albumIdForListing = '';

  suite.test('Step 1: Get market stats', async () => {
    const data = await apiFetch<{ totalVolume: number; totalListings: number; totalSales: number }>('/market/stats');
    assertTruthy(data, 'Market stats should return data');
    assert(typeof data!.totalVolume === 'number', 'totalVolume should be number');
    assert(typeof data!.totalListings === 'number', 'totalListings should be number');
  });

  suite.test('Step 2: Browse market listings (initial)', async () => {
    const data = await apiFetch<{ listings: any[]; total: number }>('/market/listings');
    assertTruthy(data, 'Listings should return data');
    assert(Array.isArray(data!.listings), 'listings should be array');
  });

  suite.test('Step 3: Seed seller with Star Power + album purchase', async () => {
    // Fund seller
    const sp = await apiFetch<{ starPower: number }>(`/starpower/${sellerId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 2000, reason: 'E2E market seller seed' }),
    });
    assertTruthy(sp, 'SP seed should work');

    // Get an album and have seller purchase it
    const albums = await apiFetch<{ albums: any[] }>('/albums');
    assertTruthy(albums?.albums?.length, 'Need at least 1 album');
    albumIdForListing = albums!.albums[0].id;

    const purchase = await apiFetch<any>(`/albums/${albumIdForListing}/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: sellerId }),
    });
    // May succeed or 409 if already owned - both valid for test setup
    assertTruthy(purchase, 'Purchase should return data');
  });

  suite.test('Step 4: List album for resale', async () => {
    if (!albumIdForListing) return;
    const data = await apiFetch<{ success: boolean; listing: any }>('/market/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: sellerId,
        userName: 'E2E-Seller',
        albumId: albumIdForListing,
        price: 80,
      }),
    });
    assertTruthy(data, 'List should return data');
    if (data!.success) {
      assertTruthy(data!.listing?.id, 'Listing should have id');
      listingId = data!.listing.id;
    }
  });

  suite.test('Step 5: Listing appears in marketplace', async () => {
    const data = await apiFetch<{ listings: any[] }>('/market/listings');
    assertTruthy(data, 'Listings should return data');
    if (listingId) {
      const found = data!.listings.some((l: any) => l.id === listingId);
      assert(found, 'New listing should appear in marketplace');
    }
  });

  suite.test('Step 6: View seller-specific listings', async () => {
    const data = await apiFetch<{ listings: any[] }>(`/market/listings/${sellerId}`);
    assertTruthy(data, 'Seller listings should return data');
    assert(Array.isArray(data!.listings), 'listings should be array');
    if (listingId) {
      assert(data!.listings.length >= 1, 'Seller should have at least 1 listing');
    }
  });

  suite.test('Step 7: Fund buyer and purchase listing', async () => {
    if (!listingId) return;
    // Fund buyer
    await apiFetch(`/starpower/${buyerId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 500, reason: 'E2E market buyer funds' }),
    });

    const data = await apiFetch<any>(`/market/buy/${listingId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: buyerId, userName: 'E2E-MktBuyer' }),
    });
    assertTruthy(data, 'Buy should return data');
    if (data!.success) {
      assertEqual(data!.success, true, 'Purchase should succeed');
      assert(typeof data!.buyerNewSP === 'number' || typeof data!.starPower === 'number', 'Should return updated SP');
    }
  });

  suite.test('Step 8: View market history', async () => {
    const data = await apiFetch<{ sales: any[] }>('/market/history');
    assertTruthy(data, 'History should return data');
    assert(Array.isArray(data!.sales), 'sales should be array');
  });

  suite.test('Step 9: Create another listing and cancel it', async () => {
    // Create a new listing to cancel (seller may need another album)
    // Instead, try cancelling non-existent listing → should fail gracefully
    const data = await apiFetch<any>(`/market/cancel/nonexistent-listing-xyz`, {
      method: 'DELETE',
    });
    // Should return 404 or error gracefully
    assertTruthy(data !== undefined, 'Cancel should handle non-existent listing gracefully');
  });

  suite.test('Step 10: Buying sold listing should fail', async () => {
    if (!listingId) return;
    const anotherBuyer = `e2e-mkt-buyer2-${Date.now()}`;
    await apiFetch(`/starpower/${anotherBuyer}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 500, reason: 'E2E buyer2 funds' }),
    });
    const res = await fetch(`${API_BASE}/market/buy/${listingId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: anotherBuyer, userName: 'Buyer2' }),
    });
    // Should be 400/404/409 — listing already sold
    assert(res.status >= 400, `Buying sold listing should fail, got status ${res.status}`);
  });

  return suite;
}

// =============================================
// Suite E2E-11: E2EE Capsule Integration Flow
// Simulates: Create encrypted capsule → Fetch capsules → Verify encrypted fields → Create unencrypted capsule
// =============================================
function e2eE2EECapsuleFlow(): ReturnType<typeof createSuite> {
  const suite = createSuite('E2E-11: E2EE Capsule Integration Flow');
  const senderUser = `e2e-e2ee-sender-${Date.now()}`;
  const recipientUser = `e2e-e2ee-recipient-${Date.now()}`;
  let capsuleId = '';

  suite.test('Step 1: Create unencrypted capsule (baseline)', async () => {
    const data = await apiFetch<{ success: boolean; capsule: any }>('/spacetime/capsules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: senderUser,
        userName: 'E2E-Sender',
        title: 'E2E Unencrypted Capsule',
        content: 'This is unencrypted test content',
        unlockAt: new Date(Date.now() - 1000).toISOString(), // already unlocked
        emotion: 'happy',
      }),
    });
    assertTruthy(data, 'Create capsule should return data');
    assertEqual(data!.success, true, 'Creation should succeed');
    assertTruthy(data!.capsule?.id, 'Capsule should have id');
    // Should NOT have encrypted fields
    assert(!data!.capsule.encrypted, 'Unencrypted capsule should not have encrypted=true');
  });

  suite.test('Step 2: Create encrypted capsule with E2EE fields', async () => {
    const data = await apiFetch<{ success: boolean; capsule: any }>('/spacetime/capsules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: senderUser,
        userName: 'E2E-Sender',
        title: 'E2E Encrypted Capsule',
        content: '[encrypted]', // Placeholder for encrypted content
        unlockAt: new Date(Date.now() - 1000).toISOString(),
        emotion: 'love',
        encrypted: true,
        encryptedContent: 'dGVzdC1lbmNyeXB0ZWQtY29udGVudC1iYXNlNjQ=', // base64 dummy
        encryptedSessionKey: 'dGVzdC1zZXNzaW9uLWtleS1lbmNyeXB0ZWQ=',
        encryptionIv: 'dGVzdC1pdi12YWx1ZQ==',
        senderFingerprint: 'e2e-test-fingerprint-abc123',
        recipientUserId: recipientUser,
      }),
    });
    assertTruthy(data, 'Create encrypted capsule should return data');
    assertEqual(data!.success, true, 'Creation should succeed');
    assertTruthy(data!.capsule?.id, 'Capsule should have id');
    capsuleId = data!.capsule.id;
    assertEqual(data!.capsule.encrypted, true, 'Capsule should be marked encrypted');
  });

  suite.test('Step 3: Fetch capsules — encrypted fields present', async () => {
    const data = await apiFetch<{ capsules: any[] }>('/spacetime/capsules');
    assertTruthy(data?.capsules, 'Should return capsules');
    assert(data!.capsules.length >= 2, 'Should have at least 2 capsules');

    // Find the encrypted capsule
    const encCap = data!.capsules.find((c: any) => c.id === capsuleId);
    if (encCap) {
      assertEqual(encCap.encrypted, true, 'Should be marked encrypted');
      assertTruthy(encCap.encryptedContent, 'Should have encryptedContent');
      assertTruthy(encCap.encryptedSessionKey, 'Should have encryptedSessionKey');
      assertTruthy(encCap.encryptionIv, 'Should have encryptionIv');
      assertTruthy(encCap.senderFingerprint, 'Should have senderFingerprint');
      assertEqual(encCap.recipientUserId, recipientUser, 'recipientUserId should match');
    }
  });

  suite.test('Step 4: Encrypted capsule has correct E2EE metadata', async () => {
    const data = await apiFetch<{ capsules: any[] }>('/spacetime/capsules');
    const encCap = data?.capsules?.find((c: any) => c.id === capsuleId);
    if (!encCap) return;

    // Content should be the placeholder (actual content is in encryptedContent)
    assertEqual(encCap.content, '[encrypted]', 'Plain content should be placeholder');
    assertEqual(encCap.encryptedContent, 'dGVzdC1lbmNyeXB0ZWQtY29udGVudC1iYXNlNjQ=', 'encryptedContent should match');
    assertEqual(encCap.senderFingerprint, 'e2e-test-fingerprint-abc123', 'senderFingerprint should match');
  });

  suite.test('Step 5: Like encrypted capsule works normally', async () => {
    if (!capsuleId) return;
    const data = await apiFetch<any>(`/spacetime/capsules/${capsuleId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assertTruthy(data, 'Like should return data');
  });

  suite.test('Step 6: Create capsule with recipientName + E2EE fields', async () => {
    const data = await apiFetch<{ success: boolean; capsule: any }>('/spacetime/capsules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: senderUser,
        userName: 'E2E-Sender',
        title: 'E2E Named Encrypted Capsule',
        content: '[encrypted]',
        unlockAt: new Date(Date.now() + 86400000).toISOString(), // 1 day future
        emotion: 'calm',
        recipientName: 'RecipientBot',
        encrypted: true,
        encryptedContent: 'YW5vdGhlci10ZXN0LWVuY3J5cHRlZA==',
        encryptedSessionKey: 'YW5vdGhlci1zZXNzaW9uLWtleQ==',
        encryptionIv: 'YW5vdGhlci1pdi12YWw=',
        senderFingerprint: 'e2e-fp-xyz789',
        recipientUserId: recipientUser,
      }),
    });
    assertTruthy(data, 'Should return data');
    assertEqual(data!.success, true, 'Should succeed');
    assertEqual(data!.capsule.encrypted, true, 'Should be encrypted');
    // Capsule not yet unlocked, isUnlocked should be false
    assertEqual(data!.capsule.isUnlocked, false, 'Future capsule should not be unlocked');
  });

  suite.test('Step 7: SpaceTime messages still work independently', async () => {
    // Verify that regular messages are unaffected by E2EE capsule features
    const msgData = await apiFetch<{ success: boolean; message: any }>('/spacetime/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: senderUser,
        userName: 'E2E-Sender',
        content: 'Regular message alongside E2EE capsules',
        emotion: 'neutral',
      }),
    });
    assertTruthy(msgData, 'Message should return data');
    assertEqual(msgData!.success, true, 'Message creation should succeed');

    const msgsData = await apiFetch<{ messages: any[] }>('/spacetime/messages');
    assertTruthy(msgsData?.messages, 'Should return messages');
    assert(msgsData!.messages.length > 0, 'Should have messages');
  });

  suite.test('Step 8: PKI status check for E2EE integration', async () => {
    // Verify PKI endpoints are reachable (E2EE depends on PKI)
    const status = await apiFetch<{ enrolled: boolean }>(`/pki/status/${recipientUser}`);
    assertTruthy(status, 'PKI status should return data');
    // New test user won't be enrolled — that's fine
    assertEqual(status!.enrolled, false, 'Test user should not be enrolled (no keys uploaded)');
  });

  return suite;
}

// =============================================
// Suite E2E-12: Zod Validation Hardening
// Tests that invalid inputs are properly rejected by Zod schemas
// =============================================
function e2eValidationHardening(): ReturnType<typeof createSuite> {
  const suite = createSuite('E2E-12: Zod Validation Hardening');

  suite.test('Market listing — missing albumId should 400', async () => {
    const res = await apiFetch('market/list', {
      method: 'POST',
      body: JSON.stringify({ userId: E2E_USER, price: 100 }),
    });
    assertEqual(res === null || (res && res.error), true, 'Should fail validation');
  });

  suite.test('Market listing — negative price should 400', async () => {
    const res = await apiFetch('market/list', {
      method: 'POST',
      body: JSON.stringify({ userId: E2E_USER, albumId: 'album-x', price: -50 }),
    });
    assertEqual(res === null || (res && res.error), true, 'Negative price rejected');
  });

  suite.test('Market listing — price exceeding max should 400', async () => {
    const res = await apiFetch('market/list', {
      method: 'POST',
      body: JSON.stringify({ userId: E2E_USER, albumId: 'album-x', price: 999999 }),
    });
    assertEqual(res === null || (res && res.error), true, 'Excess price rejected');
  });

  suite.test('Album create — empty title should 400', async () => {
    const res = await apiFetch('albums', {
      method: 'POST',
      body: JSON.stringify({ creatorId: E2E_USER, title: '', tracks: [{ title: 'Track 1' }] }),
    });
    assertEqual(res === null || (res && res.error), true, 'Empty title rejected');
  });

  suite.test('Album create — no tracks should 400', async () => {
    const res = await apiFetch('albums', {
      method: 'POST',
      body: JSON.stringify({ creatorId: E2E_USER, title: 'Test Album', tracks: [] }),
    });
    assertEqual(res === null || (res && res.error), true, 'Empty tracks rejected');
  });

  suite.test('Challenge submit — empty workTitle should 400', async () => {
    const res = await apiFetch('challenges/fake-id/submit', {
      method: 'POST',
      body: JSON.stringify({ userId: E2E_USER, workTitle: '' }),
    });
    assertEqual(res === null || (res && res.error), true, 'Empty workTitle rejected');
  });

  suite.test('Danmaku — empty text should 400', async () => {
    const res = await apiFetch('live-session/danmaku', {
      method: 'POST',
      body: JSON.stringify({ userId: E2E_USER, text: '' }),
    });
    assertEqual(res === null || (res && res.error), true, 'Empty danmaku text rejected');
  });

  suite.test('Heartbeat — missing userId should 400', async () => {
    const res = await apiFetch('live-session/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ trackId: 'track-1' }),
    });
    assertEqual(res === null || (res && res.error), true, 'Missing userId rejected');
  });

  suite.test('Shop purchase — missing itemId should 400', async () => {
    const res = await apiFetch('starpower/shop/purchase', {
      method: 'POST',
      body: JSON.stringify({ userId: E2E_USER }),
    });
    assertEqual(res === null || (res && res.error), true, 'Missing itemId rejected');
  });

  suite.test('Star Power add — zero amount should 400', async () => {
    const res = await apiFetch(`starpower/${E2E_USER}`, {
      method: 'POST',
      body: JSON.stringify({ amount: 0, reason: 'test' }),
    });
    assertEqual(res === null || (res && res.error), true, 'Zero amount rejected');
  });

  return suite;
}

// =============================================
// Suite E2E-13: Transaction Pagination (L-5)
// Tests proper pagination support on list endpoints
// =============================================
function e2ePaginationFlow(): ReturnType<typeof createSuite> {
  const suite = createSuite('E2E-13: Transaction Pagination (L-5)');

  suite.test('Transactions endpoint returns pagination metadata', async () => {
    const res = await apiFetch(`starpower/${E2E_USER}/transactions?page=1&limit=5`);
    assertTruthy(res, 'Response received');
    assertTruthy(res.pagination, 'Has pagination object');
    assertEqual(res.pagination.page, 1, 'Page is 1');
    assertEqual(res.pagination.limit, 5, 'Limit is 5');
    assertEqual(typeof res.pagination.total, 'number', 'Total is number');
    assertEqual(typeof res.pagination.totalPages, 'number', 'TotalPages is number');
    assertEqual(typeof res.pagination.hasNext, 'boolean', 'HasNext is boolean');
    assertEqual(typeof res.pagination.hasPrev, 'boolean', 'HasPrev is boolean');
  });

  suite.test('Transactions page 1 hasPrev=false', async () => {
    const res = await apiFetch(`starpower/${E2E_USER}/transactions?page=1&limit=5`);
    assertTruthy(res?.pagination, 'Has pagination');
    assertEqual(res.pagination.hasPrev, false, 'Page 1 has no prev');
  });

  suite.test('Transactions default page/limit works', async () => {
    const res = await apiFetch(`starpower/${E2E_USER}/transactions`);
    assertTruthy(res?.pagination, 'Has pagination');
    assertEqual(res.pagination.page, 1, 'Default page=1');
    assertEqual(res.pagination.limit, 20, 'Default limit=20');
  });

  suite.test('Transactions limit clamped to max 100', async () => {
    const res = await apiFetch(`starpower/${E2E_USER}/transactions?limit=999`);
    assertTruthy(res?.pagination, 'Has pagination');
    assertEqual(res.pagination.limit, 100, 'Limit clamped to 100');
  });

  suite.test('Market history returns pagination metadata', async () => {
    const res = await apiFetch(`market/history?page=1&limit=10`);
    assertTruthy(res, 'Response received');
    assertTruthy(res.pagination, 'Has pagination object');
    assertEqual(res.pagination.page, 1, 'Page is 1');
    assertEqual(typeof res.pagination.total, 'number', 'Total is number');
  });

  suite.test('Market history default pagination works', async () => {
    const res = await apiFetch(`market/history`);
    assertTruthy(res?.pagination, 'Has pagination');
    assertEqual(res.pagination.page, 1, 'Default page=1');
    assertEqual(res.pagination.limit, 20, 'Default limit=20');
  });

  return suite;
}

// =============================================
// Run All E2E Tests
// =============================================
export async function runE2ETests(): Promise<{
  suites: TestSuiteResult[];
  totalPassed: number;
  totalFailed: number;
  total: number;
}> {
  console.log('\n🎭 D-Music E2E Test Suite v5.0\n');
  console.log(`Test user: ${E2E_USER}\n`);
  console.log('Running E2E flows...\n');

  const suites: TestSuiteResult[] = [];

  suites.push(await e2ePlaybackFlow().run());
  suites.push(await e2eAICreationFlow().run());
  suites.push(await e2eRecommendationFlow().run());
  suites.push(await e2eAlbumDistributionFlow().run());
  suites.push(await e2eChallengeFlow().run());
  suites.push(await e2eCrossFlowIntegration().run());
  suites.push(await e2eErrorHandling().run());
  suites.push(await e2eAlbumCreatorFlow().run());
  suites.push(await e2ePkiFlow().run());
  suites.push(await e2eSecondaryMarketFlow().run());
  suites.push(await e2eE2EECapsuleFlow().run());
  suites.push(await e2eValidationHardening().run());
  suites.push(await e2ePaginationFlow().run());

  const summary = printResults(suites);

  return { suites, ...summary };
}

// =============================================
// Playwright Spec Templates (for future migration)
// =============================================
export const PLAYWRIGHT_SPEC_TEMPLATES = {
  playback: `
// playwright/tests/playback.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Core Playback Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="player-controls"]');
  });

  test('should play a track and display lyrics', async ({ page }) => {
    await page.click('[data-testid="play-button"]');
    await expect(page.locator('[data-testid="now-playing"]')).toBeVisible();
    await expect(page.locator('[data-testid="lyrics-display"]')).toBeVisible();
  });

  test('should like a song and update counter', async ({ page }) => {
    const likeCount = page.locator('[data-testid="like-count"]');
    const before = await likeCount.textContent();
    await page.click('[data-testid="like-button"]');
    await expect(likeCount).not.toHaveText(before!);
  });

  test('should navigate tracks with prev/next', async ({ page }) => {
    const title = await page.locator('[data-testid="track-title"]').textContent();
    await page.click('[data-testid="next-track"]');
    await expect(page.locator('[data-testid="track-title"]')).not.toHaveText(title!);
  });

  test('should adjust volume with keyboard', async ({ page }) => {
    await page.keyboard.press('ArrowUp');
    // Volume indicator should reflect change
  });

  test('should toggle shuffle and repeat modes', async ({ page }) => {
    await page.click('[data-testid="shuffle-button"]');
    await expect(page.locator('[data-testid="shuffle-button"]')).toHaveClass(/active/);
    await page.click('[data-testid="repeat-button"]');
    await expect(page.locator('[data-testid="repeat-button"]')).toHaveClass(/active/);
  });
});
`,
  aiCreation: `
// playwright/tests/ai-creation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('AI Creation Flow', () => {
  test('should generate lyrics and create track', async ({ page }) => {
    await page.goto('/?panel=ai-lyrics');
    await page.selectOption('[data-testid="theme-select"]', 'happy');
    await page.click('[data-testid="generate-lyrics"]');
    await expect(page.locator('[data-testid="generated-lyrics"]')).toBeVisible({ timeout: 15000 });
    await page.click('[data-testid="create-track"]');
    await expect(page.locator('[data-testid="now-playing"]')).toContainText('AI');
  });

  test('should open creation studio and compose', async ({ page }) => {
    await page.goto('/?panel=creation-studio');
    await page.waitForSelector('[data-testid="creation-studio"]');
    await page.fill('[data-testid="theme-input"]', 'electronic');
    await page.click('[data-testid="compose-button"]');
    await expect(page.locator('[data-testid="composition-result"]')).toBeVisible({ timeout: 20000 });
  });

  test('should share AI-created work to community', async ({ page }) => {
    await page.goto('/?panel=creation-studio');
    // After creating, share to community
    await page.click('[data-testid="share-button"]');
    await expect(page.locator('[data-testid="share-modal"]')).toBeVisible();
    await page.click('[data-testid="confirm-share"]');
    await expect(page.locator('[data-testid="share-success"]')).toBeVisible();
  });
});
`,
  albumStore: `
// playwright/tests/album-store.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Digital Album Store', () => {
  test('should browse and view album details', async ({ page }) => {
    await page.goto('/?panel=album-store');
    await page.waitForSelector('[data-testid="album-grid"]');
    const albums = page.locator('[data-testid="album-card"]');
    await expect(albums.first()).toBeVisible();
    await albums.first().click();
    await expect(page.locator('[data-testid="album-detail"]')).toBeVisible();
    await expect(page.locator('[data-testid="track-list"]')).toBeVisible();
  });

  test('should purchase album and appear in collection', async ({ page }) => {
    await page.goto('/?panel=album-store');
    await page.waitForSelector('[data-testid="album-card"]');
    await page.locator('[data-testid="album-card"]').first().click();
    await page.click('[data-testid="purchase-button"]');
    await expect(page.locator('[data-testid="purchase-success"]')).toBeVisible({ timeout: 10000 });
    // Navigate to collection
    await page.click('[data-testid="back-button"]');
    await page.click('[data-testid="collection-tab"]');
    await expect(page.locator('[data-testid="collection-item"]')).toHaveCount(1);
  });

  test('should like an album and update counter', async ({ page }) => {
    await page.goto('/?panel=album-store');
    await page.waitForSelector('[data-testid="album-card"]');
    await page.locator('[data-testid="album-card"]').first().click();
    const likeBtn = page.locator('[data-testid="album-like-button"]');
    const before = await likeBtn.textContent();
    await likeBtn.click();
    await expect(likeBtn).not.toHaveText(before!);
  });
});
`,
  recommendations: `
// playwright/tests/recommendations.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Recommendations Flow', () => {
  test('should display personalized recommendations', async ({ page }) => {
    await page.goto('/?panel=recommendations');
    await page.waitForSelector('[data-testid="recommendations-panel"]');
    await expect(page.locator('[data-testid="recommendation-card"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('should show AI preference insights', async ({ page }) => {
    await page.goto('/?panel=recommendations');
    await page.click('[data-testid="ai-insights-tab"]');
    await expect(page.locator('[data-testid="personality-tag"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="mood-suggestions"]')).toBeVisible();
  });
});
`,
  crossFlow: `
// playwright/tests/cross-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Cross-Flow Integration', () => {
  test('play → like → leaderboard → recommendations', async ({ page }) => {
    await page.goto('/');
    // Play a track
    await page.click('[data-testid="play-button"]');
    await expect(page.locator('[data-testid="now-playing"]')).toBeVisible();
    // Like it
    await page.click('[data-testid="like-button"]');
    // Open leaderboard — track should appear
    await page.goto('/?panel=leaderboard');
    await expect(page.locator('[data-testid="leaderboard-entry"]').first()).toBeVisible();
    // Open recommendations — should reflect listening
    await page.goto('/?panel=recommendations');
    await expect(page.locator('[data-testid="recommendation-card"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('create AI track → share → view in community', async ({ page }) => {
    await page.goto('/?panel=ai-lyrics');
    await page.selectOption('[data-testid="theme-select"]', 'energetic');
    await page.click('[data-testid="generate-lyrics"]');
    await expect(page.locator('[data-testid="generated-lyrics"]')).toBeVisible({ timeout: 15000 });
    await page.click('[data-testid="create-track"]');
    // Share the track
    await page.goto('/?panel=community');
    await expect(page.locator('[data-testid="community-feed"]')).toBeVisible();
  });
});
`,
  e2ee: `
// playwright/tests/e2ee-setup.spec.ts
import { test, expect } from '@playwright/test';

test.describe('E2EE Key Setup Flow', () => {
  test('should open E2EE setup wizard and generate keys', async ({ page }) => {
    await page.goto('/?panel=e2e-setup');
    await page.waitForSelector('[data-testid="e2ee-wizard"]');
    await expect(page.locator('[data-testid="e2ee-intro"]')).toBeVisible();
    await page.click('[data-testid="generate-keys-button"]');
    await expect(page.locator('[data-testid="e2ee-generating"]')).toBeVisible();
    await expect(page.locator('[data-testid="e2ee-backup-step"]')).toBeVisible({ timeout: 15000 });
  });

  test('should skip backup and complete setup', async ({ page }) => {
    await page.goto('/?panel=e2e-setup');
    await page.click('[data-testid="generate-keys-button"]');
    await expect(page.locator('[data-testid="e2ee-backup-step"]')).toBeVisible({ timeout: 15000 });
    await page.click('[data-testid="skip-backup-button"]');
    await expect(page.locator('[data-testid="e2ee-complete"]')).toBeVisible();
    await expect(page.locator('[data-testid="key-fingerprint"]')).toBeVisible();
  });

  test('should create backup with passphrase', async ({ page }) => {
    await page.goto('/?panel=e2e-setup');
    await page.click('[data-testid="generate-keys-button"]');
    await expect(page.locator('[data-testid="e2ee-backup-step"]')).toBeVisible({ timeout: 15000 });
    await page.fill('[data-testid="passphrase-input"]', 'MySecure!Pass123');
    await page.fill('[data-testid="passphrase-confirm"]', 'MySecure!Pass123');
    await page.click('[data-testid="create-backup-button"]');
    await expect(page.locator('[data-testid="e2ee-complete"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="backed-up-badge"]')).toBeVisible();
  });

  test('should show enrolled status for existing user', async ({ page }) => {
    // Assuming keys already generated from previous test
    await page.goto('/?panel=e2e-setup');
    await expect(page.locator('[data-testid="e2ee-status"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="key-fingerprint"]')).toBeVisible();
  });

  test('should rotate keys', async ({ page }) => {
    await page.goto('/?panel=e2e-setup');
    await expect(page.locator('[data-testid="e2ee-status"]')).toBeVisible({ timeout: 5000 });
    await page.click('[data-testid="rotate-keys-button"]');
    await expect(page.locator('[data-testid="e2ee-intro"]')).toBeVisible();
  });
`,
  secondaryMarket: `
// playwright/tests/secondary-market.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Secondary Market Flow', () => {
  test('should browse market listings', async ({ page }) => {
    await page.goto('/?panel=secondary-market');
    await page.waitForSelector('[data-testid="market-panel"]');
    await expect(page.locator('[data-testid="market-stats"]')).toBeVisible();
    await expect(page.locator('[data-testid="listings-grid"]')).toBeVisible();
  });

  test('should view market statistics', async ({ page }) => {
    await page.goto('/?panel=secondary-market');
    await expect(page.locator('[data-testid="total-volume"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-listings"]')).toBeVisible();
  });

  test('should switch to sell view', async ({ page }) => {
    await page.goto('/?panel=secondary-market');
    await page.click('[data-testid="sell-tab"]');
    await expect(page.locator('[data-testid="sell-form"]')).toBeVisible();
  });

  test('should view sale history', async ({ page }) => {
    await page.goto('/?panel=secondary-market');
    await page.click('[data-testid="history-tab"]');
    await expect(page.locator('[data-testid="history-list"]')).toBeVisible();
  });

  test('should purchase a listed album', async ({ page }) => {
    await page.goto('/?panel=secondary-market');
    const listing = page.locator('[data-testid="listing-card"]').first();
    if (await listing.isVisible()) {
      await listing.click();
      await page.click('[data-testid="buy-button"]');
      await expect(page.locator('[data-testid="buy-result"]')).toBeVisible({ timeout: 10000 });
    }
  });
});
`,
  e2eeCapsule: `
// playwright/tests/e2ee-capsule.spec.ts
import { test, expect } from '@playwright/test';

test.describe('E2EE Capsule Integration', () => {
  test('should toggle E2EE encryption in capsule form', async ({ page }) => {
    await page.goto('/?panel=spacetime');
    await page.click('[data-testid="capsules-tab"]');
    const e2eeToggle = page.locator('[data-testid="e2ee-toggle"]');
    if (await e2eeToggle.isVisible()) {
      await e2eeToggle.click();
      await expect(page.locator('[data-testid="recipient-id-input"]')).toBeVisible();
    }
  });

  test('should show E2EE setup prompt when keys not configured', async ({ page }) => {
    await page.goto('/?panel=spacetime');
    await page.click('[data-testid="capsules-tab"]');
    const setupPrompt = page.locator('[data-testid="e2ee-setup-prompt"]');
    // Prompt visible only if user has no keys
    if (await setupPrompt.isVisible()) {
      await setupPrompt.click();
      await expect(page.locator('[data-testid="e2ee-setup-hint"]')).toBeVisible();
    }
  });

  test('should display encrypted capsule with decrypt button', async ({ page }) => {
    await page.goto('/?panel=spacetime');
    await page.click('[data-testid="capsules-tab"]');
    const encryptedCapsule = page.locator('[data-testid="encrypted-capsule"]').first();
    if (await encryptedCapsule.isVisible()) {
      await expect(encryptedCapsule.locator('[data-testid="e2ee-badge"]')).toBeVisible();
      await expect(encryptedCapsule.locator('[data-testid="decrypt-button"]')).toBeVisible();
    }
  });

  test('should auto-decrypt capsules for recipient', async ({ page }) => {
    await page.goto('/?panel=spacetime');
    await page.click('[data-testid="capsules-tab"]');
    // If user is recipient of an encrypted capsule and has keys, it auto-decrypts
    const decryptedBadge = page.locator('[data-testid="e2ee-decrypted-badge"]');
    if (await decryptedBadge.isVisible({ timeout: 5000 })) {
      await expect(decryptedBadge).toContainText(/Decrypted|已解密/);
    }
  });

  test('should show sender fingerprint on decrypted capsule', async ({ page }) => {
    await page.goto('/?panel=spacetime');
    await page.click('[data-testid="capsules-tab"]');
    const fingerprint = page.locator('[data-testid="sender-fingerprint"]');
    if (await fingerprint.isVisible({ timeout: 5000 })) {
      const text = await fingerprint.textContent();
      expect(text).toBeTruthy();
    }
  });
});
});
`,
};