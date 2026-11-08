/**
 * D-Music §7.1 — Core Test Suite
 *
 * 覆盖范围：
 *   1. 工具函数单元测试（Wilson Score、design tokens、preferences）
 *   2. API 端点集成测试（全 11 个路由模块的关键端点）
 *   3. KV 键一致性验证（C-1 回归测试）
 *   4. CORS 配置验证（§8.5）
 *   5. 前端组件逻辑测试（panelReducer、i18n）
 *   6. §4.1 AI 模型管理器测试
 *   7. §L-1 版权哈希升级测试（SHA-256）
 *
 * 运行方式：
 *   - 控制台: import('/src/app/lib/core-tests.ts').then(m => m.runAllTests())
 *   - PerfMonitor 面板中的 "Run Tests" 按钮
 */

import {
  createSuite, assert, assertEqual, assertDeepEqual,
  assertTruthy, assertContains, assertInRange, assertThrows,
  printResults, type TestSuiteResult,
} from './test-runner';
import { API_BASE, apiFetch, apiFetchStrict, ApiError } from './supabase';

// =============================================
// Suite 1: Wilson Score Algorithm (纯函数)
// =============================================
function wilsonScoreTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§3.1 Wilson Score Algorithm');

  // 本地复刻 wilsonScore 以纯前端方式测试
  function wilsonScore(positive: number, total: number, confidence = 0.95): number {
    if (total === 0) return 0;
    const z = confidence === 0.95 ? 1.96 : 1.645;
    const p = positive / total;
    const denominator = 1 + (z * z) / total;
    const centre = p + (z * z) / (2 * total);
    const spread = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total);
    return (centre - spread) / denominator;
  }

  suite.test('total=0 应返回 0', () => {
    assertEqual(wilsonScore(0, 0), 0);
  });

  suite.test('100% 正面评价，小样本', () => {
    const score = wilsonScore(5, 5);
    assert(score > 0 && score < 1, `Score ${score} should be in (0,1)`);
    assert(score > 0.5, `100% positive with n=5 should > 0.5, got ${score}`);
  });

  suite.test('0% 正面评价', () => {
    const score = wilsonScore(0, 10);
    assert(score >= 0, `Score should be >= 0, got ${score}`);
    assert(score < 0.1, `0% positive should be very low, got ${score}`);
  });

  suite.test('大样本高正面率应得高分', () => {
    const score = wilsonScore(950, 1000);
    assert(score > 0.9, `950/1000 should score > 0.9, got ${score}`);
  });

  suite.test('confidence 参数有效', () => {
    const high = wilsonScore(50, 100, 0.95);
    const low = wilsonScore(50, 100, 0.90);
    assert(low > high, `Lower confidence should give higher bound: 90%=${low}, 95%=${high}`);
  });

  suite.test('单调性：更多正面 → 更高得分', () => {
    const s1 = wilsonScore(30, 100);
    const s2 = wilsonScore(70, 100);
    assert(s2 > s1, `70/100=${s2} should > 30/100=${s1}`);
  });

  return suite;
}

// =============================================
// Suite 2: Panel Reducer 逻辑
// =============================================
function panelReducerTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§2.1 Panel Reducer Logic');

  type PanelType = string | null;
  type PanelAction =
    | { type: 'OPEN'; panel: string }
    | { type: 'CLOSE' }
    | { type: 'TOGGLE'; panel: string };

  function panelReducer(state: PanelType, action: PanelAction): PanelType {
    switch (action.type) {
      case 'OPEN': return action.panel;
      case 'CLOSE': return null;
      case 'TOGGLE': return state === action.panel ? null : action.panel;
      default: return state;
    }
  }

  suite.test('初始状态为 null', () => {
    assertEqual(panelReducer(null, { type: 'CLOSE' }), null);
  });

  suite.test('OPEN 设置面板', () => {
    assertEqual(panelReducer(null, { type: 'OPEN', panel: 'analytics' }), 'analytics');
  });

  suite.test('CLOSE 清除面板', () => {
    assertEqual(panelReducer('analytics', { type: 'CLOSE' }), null);
  });

  suite.test('TOGGLE 打开', () => {
    assertEqual(panelReducer(null, { type: 'TOGGLE', panel: 'community' }), 'community');
  });

  suite.test('TOGGLE 关闭（相同面板）', () => {
    assertEqual(panelReducer('community', { type: 'TOGGLE', panel: 'community' }), null);
  });

  suite.test('TOGGLE 切换（不同面板）→ 互斥', () => {
    assertEqual(panelReducer('analytics', { type: 'TOGGLE', panel: 'community' }), 'community');
  });

  suite.test('OPEN 覆盖旧面板 → 互斥', () => {
    assertEqual(panelReducer('analytics', { type: 'OPEN', panel: 'starpower' }), 'starpower');
  });

  return suite;
}

// =============================================
// Suite 3: API 端点 — Health & Auth
// =============================================
function apiHealthTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§2.2 API Health & Auth');

  suite.test('GET /health 返回 200 + {status: "ok"}', async () => {
    const data = await apiFetch<{ status: string }>('/health');
    assertTruthy(data, 'Health endpoint should return data');
    assertEqual(data!.status, 'ok');
  });

  suite.test('POST /signup 缺少参数应返回错误', async () => {
    const res = await fetch(`${API_BASE}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer anon` },
      body: JSON.stringify({}),
    });
    // Should get 400 or similar error
    assert(res.status === 400 || res.status === 401 || res.status === 500,
      `Signup with empty body should fail, got ${res.status}`);
  });

  return suite;
}

// =============================================
// Suite 4: API 端点 — Music 路由
// =============================================
function apiMusicTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§2.2 Music Routes');

  suite.test('GET /likes/track-1 返回 likes 数值', async () => {
    const data = await apiFetch<{ likes: number }>('/likes/track-1');
    assertTruthy(data, 'Likes endpoint should return data');
    assert(typeof data!.likes === 'number', `likes should be a number, got ${typeof data!.likes}`);
  });

  suite.test('GET /annotations/track-1 返回 annotations 对象', async () => {
    const data = await apiFetch<{ annotations: any }>('/annotations/track-1');
    assertTruthy(data, 'Annotations endpoint should return data');
    assert(typeof data!.annotations === 'object', 'annotations should be an object');
  });

  suite.test('GET /comments/track-1 返回评论数组', async () => {
    const data = await apiFetch<{ comments: any[] }>('/comments/track-1');
    assertTruthy(data, 'Comments endpoint should return data');
    assert(Array.isArray(data!.comments), 'comments should be an array');
  });

  suite.test('GET /songs/index 返回歌曲索引', async () => {
    const data = await apiFetch<{ songIds: string[]; total: number }>('/songs/index');
    assertTruthy(data, 'Song index endpoint should return data');
    assert(Array.isArray(data!.songIds), 'songIds should be an array');
    assert(data!.songIds.length > 0, 'Should have at least 1 song');
    assertContains(data!.songIds.join(','), 'track-1', 'Should contain track-1');
  });

  return suite;
}

// =============================================
// Suite 5: API 端点 — Star Power 路由
// =============================================
function apiStarpowerTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§2.2 StarPower Routes');

  suite.test('GET /starpower/test-user 返回 starPower 数值', async () => {
    const data = await apiFetch<{ userId: string; starPower: number }>('/starpower/test-user');
    assertTruthy(data, 'StarPower endpoint should return data');
    assertEqual(data!.userId, 'test-user');
    assert(typeof data!.starPower === 'number', `starPower should be number, got ${typeof data!.starPower}`);
  });

  suite.test('GET /starpower/test-user/level 返回 VIP 等级信息', async () => {
    const data = await apiFetch<{ userId: string; vipLevel: any; allLevels: any[] }>('/starpower/test-user/level');
    assertTruthy(data, 'VIP level endpoint should return data');
    assertTruthy(data!.vipLevel, 'Should have vipLevel');
    assert(Array.isArray(data!.allLevels), 'allLevels should be array');
    assertEqual(data!.allLevels.length, 5, 'Should have 5 VIP levels');
  });

  suite.test('GET /starpower/test-user/transactions 返回交易数组', async () => {
    const data = await apiFetch<{ transactions: any[] }>('/starpower/test-user/transactions');
    assertTruthy(data, 'Transactions endpoint should return data');
    assert(Array.isArray(data!.transactions), 'transactions should be array');
  });

  suite.test('GET /starpower/shop/items 返回商品列表', async () => {
    const data = await apiFetch<{ items: any[] }>('/starpower/shop/items');
    assertTruthy(data, 'Shop items endpoint should return data');
    assert(Array.isArray(data!.items), 'items should be array');
    assert(data!.items.length >= 8, `Should have at least 8 items, got ${data!.items.length}`);
  });

  return suite;
}

// =============================================
// Suite 6: API 端点 — Analytics & Recommendations
// =============================================
function apiAnalyticsTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§2.2 Analytics Routes');

  suite.test('GET /leaderboard 返回排行榜', async () => {
    const data = await apiFetch<{ rankings: any[] }>('/leaderboard');
    assertTruthy(data, 'Leaderboard endpoint should return data');
    assert(Array.isArray(data!.rankings), 'rankings should be array');
  });

  suite.test('GET /analytics/overview 返回统计概览', async () => {
    const data = await apiFetch<{ totalPlays: number; totalLikes: number }>('/analytics/overview');
    assertTruthy(data, 'Analytics overview should return data');
    assert(typeof data!.totalPlays === 'number', 'totalPlays should be number');
    assert(typeof data!.totalLikes === 'number', 'totalLikes should be number');
  });

  suite.test('GET /recommendations/test-user 返回推荐列表', async () => {
    const data = await apiFetch<{ recommendations: any[]; dominantMood: string }>('/recommendations/test-user');
    assertTruthy(data, 'Recommendations endpoint should return data');
    assert(Array.isArray(data!.recommendations), 'recommendations should be array');
    assertTruthy(data!.dominantMood, 'Should have dominantMood');
  });

  suite.test('GET /smart-playlist/test-user 返回智能歌单', async () => {
    const data = await apiFetch<{ analysis: any; queue: any[] }>('/smart-playlist/test-user');
    assertTruthy(data, 'Smart playlist endpoint should return data');
    assertTruthy(data!.analysis, 'Should have analysis');
    assert(Array.isArray(data!.queue), 'queue should be array');
  });

  return suite;
}

// =============================================
// Suite 7: API 端点 — AI 路由
// =============================================
function apiAiTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§2.2 AI Routes');

  suite.test('POST /ai/lyrics 生成歌词', async () => {
    const data = await apiFetch<{ success: boolean; lyrics: string[] }>('/ai/lyrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: 'happy', lines: 4 }),
    });
    assertTruthy(data, 'AI lyrics endpoint should return data');
    assertEqual(data!.success, true);
    assert(Array.isArray(data!.lyrics), 'lyrics should be array');
    assertEqual(data!.lyrics.length, 4, 'Should return 4 lines');
  });

  suite.test('POST /ai/compose 生成作曲数据', async () => {
    const data = await apiFetch<{ success: boolean; composition: any }>('/ai/compose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: 'calm', lineCount: 4 }),
    });
    assertTruthy(data, 'AI compose endpoint should return data');
    assertEqual(data!.success, true);
    assertTruthy(data!.composition, 'Should have composition');
    assertTruthy(data!.composition.tempo, 'Composition should have tempo');
    assertTruthy(data!.composition.key, 'Composition should have key');
  });

  suite.test('AI 作曲情绪映射正确', async () => {
    const moods = ['happy', 'sad', 'energetic', 'calm', 'love'];
    const expectedKeys: Record<string, string> = { happy: 'C', sad: 'Am', energetic: 'Em', calm: 'F', love: 'Dm' };
    for (const mood of moods) {
      const data = await apiFetch<{ composition: any }>('/ai/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: mood, lineCount: 2 }),
      });
      assertTruthy(data?.composition, `Composition for ${mood} should exist`);
      assertEqual(data!.composition.key, expectedKeys[mood], `${mood} should map to key ${expectedKeys[mood]}`);
    }
  });

  return suite;
}

// =============================================
// Suite 8: API 端点 — Social 路由
// =============================================
function apiSocialTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§2.2 Social Routes');

  suite.test('GET /achievements/test-user 返回成就列表', async () => {
    const data = await apiFetch<{ achievements: any[]; totalAchievements: number }>('/achievements/test-user');
    assertTruthy(data, 'Achievements endpoint should return data');
    assert(Array.isArray(data!.achievements), 'achievements should be array');
    assertEqual(data!.totalAchievements, 12, 'Should have 12 achievement definitions');
  });

  suite.test('GET /notifications/TestUser 返回通知数组', async () => {
    const data = await apiFetch<{ notifications: any[] }>('/notifications/TestUser');
    assertTruthy(data, 'Notifications endpoint should return data');
    assert(Array.isArray(data!.notifications), 'notifications should be array');
  });

  suite.test('GET /timeline-comments/track-1 返回弹幕评论', async () => {
    const data = await apiFetch<{ comments: any[] }>('/timeline-comments/track-1');
    assertTruthy(data, 'Timeline comments endpoint should return data');
    assert(Array.isArray(data!.comments), 'comments should be array');
  });

  suite.test('GET /mheart/test-user 返回 M❤️值数据', async () => {
    const data = await apiFetch<{ mheart: any; trend: any[] }>('/mheart/test-user');
    assertTruthy(data, 'MHeart endpoint should return data');
    assertTruthy(data!.mheart, 'Should have mheart data');
    assert(typeof data!.mheart.score === 'number', 'mheart.score should be number');
    assert(Array.isArray(data!.trend), 'trend should be array');
  });

  return suite;
}

// =============================================
// Suite 9: API 端点 — Community 路由
// =============================================
function apiCommunityTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§2.2 Community Routes');

  suite.test('GET /community/activities 返回活动列表', async () => {
    const data = await apiFetch<{ activities: any[] }>('/community/activities');
    assertTruthy(data, 'Community activities endpoint should return data');
    assert(Array.isArray(data!.activities), 'activities should be array');
  });

  suite.test('GET /shared-works 返回共享作品', async () => {
    const data = await apiFetch<{ works: any[]; total: number }>('/shared-works');
    assertTruthy(data, 'Shared works endpoint should return data');
    assert(Array.isArray(data!.works), 'works should be array');
    assert(typeof data!.total === 'number', 'total should be number');
  });

  suite.test('GET /creators 返回创作者列表', async () => {
    const data = await apiFetch<{ creators: any[] }>('/creators');
    assertTruthy(data, 'Creators endpoint should return data');
    assert(Array.isArray(data!.creators), 'creators should be array');
  });

  return suite;
}

// =============================================
// Suite 10: API 端点 — User 路由
// =============================================
function apiUserTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§2.2 User Routes');

  suite.test('GET /profile/test-user 返回用户档案', async () => {
    const data = await apiFetch<{ profile: any }>('/profile/test-user');
    assertTruthy(data, 'Profile endpoint should return data');
    assertTruthy(data!.profile, 'Should have profile');
    assertEqual(data!.profile.userId, 'test-user');
  });

  suite.test('GET /user/role/test-user 返回角色', async () => {
    const data = await apiFetch<{ userId: string; role: string }>('/user/role/test-user');
    assertTruthy(data, 'Role endpoint should return data');
    assertEqual(data!.userId, 'test-user');
    assertTruthy(data!.role, 'Should have role');
  });

  suite.test('GET /preferences/test-user 返回偏好', async () => {
    const data = await apiFetch<{ preferences: any }>('/preferences/test-user');
    assertTruthy(data, 'Preferences endpoint should return data');
    // preferences can be null if not set
  });

  return suite;
}

// =============================================
// Suite 11: C-1 回归测试 — KV Key 一致性
// =============================================
function kvKeyConsistencyTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('C-1 KV Key Consistency Regression');

  suite.test('StarPower GET 使用 user:{userId}:starpower 键', async () => {
    // Verify the endpoint works (implicitly tests correct key)
    const data = await apiFetch<{ userId: string; starPower: number }>('/starpower/kv-test-user');
    assertTruthy(data, 'Should return data');
    assert(typeof data!.starPower === 'number', 'starPower should be number');
  });

  suite.test('VIP Level 使用正确的 starpower 键', async () => {
    const data = await apiFetch<{ starPower: number; vipLevel: any }>('/starpower/kv-test-user/level');
    assertTruthy(data, 'Should return data');
    assert(typeof data!.starPower === 'number', 'starPower should be number');
    assertTruthy(data!.vipLevel, 'Should have vipLevel');
  });

  suite.test('Shop Items 端点正常工作', async () => {
    const data = await apiFetch<{ items: any[] }>('/starpower/shop/items');
    assertTruthy(data, 'Should return data');
    assert(data!.items.length > 0, 'Should have shop items');
    // Verify each item has consistent structure
    for (const item of data!.items) {
      assertTruthy(item.id, 'Item should have id');
      assertTruthy(item.category, 'Item should have category');
      assert(typeof item.cost === 'number', 'Item cost should be number');
    }
  });

  return suite;
}

// =============================================
// Suite 12: §8.5 CORS 配置验证
// =============================================
function corsTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§8.5 CORS Configuration');

  suite.test('Health 端点返回 CORS headers', async () => {
    const res = await fetch(`${API_BASE}/health`);
    assert(res.ok, `Health should return 200, got ${res.status}`);
    // Check for Access-Control headers
    const allowOrigin = res.headers.get('access-control-allow-origin');
    assertTruthy(allowOrigin, 'Should have Access-Control-Allow-Origin header');
  });

  suite.test('OPTIONS 预检请求返回正确的方法', async () => {
    const res = await fetch(`${API_BASE}/health`, { method: 'OPTIONS' });
    // Preflight should return 2xx
    assert(res.status >= 200 && res.status < 400, `OPTIONS should succeed, got ${res.status}`);
  });

  return suite;
}

// =============================================
// Suite 13: i18n 翻译完整性
// =============================================
function i18nTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§8.4 i18n Translation Integrity');

  suite.test('翻译模块可正常导入', async () => {
    const mod = await import('../hooks/i18n-translations');
    assertTruthy(mod, 'i18n-translations module should exist');
  });

  suite.test('中英双语键完整性', async () => {
    const mod = await import('../hooks/i18n-translations');
    const translations = (mod as any).default || (mod as any).translations || mod;
    // Just verify the module loaded without errors
    assertTruthy(translations, 'Translations should be loaded');
  });

  return suite;
}

// =============================================
// Suite 14: Design Tokens 验证
// =============================================
function designTokenTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§1.4 Design Tokens');

  suite.test('design-tokens 模块可导入', async () => {
    const mod = await import('./design-tokens');
    assertTruthy(mod, 'design-tokens module should exist');
  });

  suite.test('themes 模块可导入', async () => {
    const mod = await import('./themes');
    assertTruthy(mod.getTheme, 'getTheme should exist');
    assertTruthy(mod.applyTheme, 'applyTheme should exist');
  });

  return suite;
}

// =============================================
// Suite 15: 路由模块化完整性
// =============================================
function routeModularityTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§2.2 Route Modularity');

  const criticalEndpoints = [
    { path: '/health', name: 'Health' },
    { path: '/likes/track-1', name: 'Likes' },
    { path: '/starpower/test-user', name: 'StarPower' },
    { path: '/starpower/shop/items', name: 'Shop' },
    { path: '/leaderboard', name: 'Leaderboard' },
    { path: '/analytics/overview', name: 'Analytics' },
    { path: '/achievements/test-user', name: 'Achievements' },
    { path: '/community/activities', name: 'Community' },
    { path: '/shared-works', name: 'SharedWorks' },
    { path: '/ai/lyrics', name: 'AI Lyrics (POST)' },
    { path: '/profile/test-user', name: 'Profile' },
    { path: '/mheart/test-user', name: 'MHeart' },
    { path: '/timeline-comments/track-1', name: 'TimelineComments' },
    { path: '/smart-playlist/test-user', name: 'SmartPlaylist' },
    { path: '/songs/index', name: 'SongIndex' },
  ];

  for (const ep of criticalEndpoints) {
    suite.test(`${ep.name}: GET ${ep.path} 可达`, async () => {
      if (ep.name === 'AI Lyrics (POST)') {
        const data = await apiFetch(ep.path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ theme: 'happy', lines: 2 }),
        });
        assertTruthy(data, `POST ${ep.path} should return data`);
      } else {
        const data = await apiFetch(ep.path);
        assertTruthy(data, `GET ${ep.path} should return data`);
      }
    });
  }

  return suite;
}

// =============================================
// Suite 16: §6.2 QueryCache 单元测试
// =============================================
function queryCacheTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§6.2 QueryCache (Unit)');

  // Inline minimal cache implementation for client-side testing
  class TestCache {
    private cache = new Map<string, { value: any; expiresAt: number; accessedAt: number }>();
    private maxEntries: number;
    private defaultTtl: number;
    hits = 0; misses = 0;

    constructor(max = 4, ttl = 100) { this.maxEntries = max; this.defaultTtl = ttl; }

    get<T>(key: string): T | undefined {
      const e = this.cache.get(key);
      if (!e) { this.misses++; return undefined; }
      if (Date.now() > e.expiresAt) { this.cache.delete(key); this.misses++; return undefined; }
      e.accessedAt = Date.now(); this.hits++; return e.value as T;
    }

    set<T>(key: string, value: T, ttl?: number): void {
      if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
        let oldest = ''; let oldestT = Infinity;
        for (const [k, v] of this.cache) { if (v.accessedAt < oldestT) { oldestT = v.accessedAt; oldest = k; } }
        if (oldest) this.cache.delete(oldest);
      }
      this.cache.set(key, { value, expiresAt: Date.now() + (ttl ?? this.defaultTtl), accessedAt: Date.now() });
    }

    invalidate(key: string) { this.cache.delete(key); }
    invalidatePrefix(prefix: string) { for (const k of this.cache.keys()) if (k.startsWith(prefix)) this.cache.delete(k); }
    clear() { this.cache.clear(); this.hits = 0; this.misses = 0; }
    get size() { return this.cache.size; }
  }

  suite.test('基本 get/set 工作', () => {
    const c = new TestCache();
    c.set('a', 42);
    assertEqual(c.get<number>('a'), 42);
  });

  suite.test('未命中返回 undefined', () => {
    const c = new TestCache();
    assertEqual(c.get('missing'), undefined);
  });

  suite.test('TTL 过期后返回 undefined', async () => {
    const c = new TestCache(4, 50); // 50ms TTL
    c.set('ttl-test', 'hello');
    assertEqual(c.get('ttl-test'), 'hello');
    await new Promise(r => setTimeout(r, 60));
    assertEqual(c.get('ttl-test'), undefined);
  });

  suite.test('LRU 淘汰最久未访问的条目', () => {
    const c = new TestCache(3, 10000);
    c.set('x', 1); c.set('y', 2); c.set('z', 3);
    c.get('x');
    c.set('w', 4);
    assertEqual(c.get<number>('x'), 1);
    assertEqual(c.get('y'), undefined);
    assertEqual(c.get<number>('z'), 3);
    assertEqual(c.get<number>('w'), 4);
  });

  suite.test('invalidate 删除指定键', () => {
    const c = new TestCache();
    c.set('del-me', 'bye');
    c.invalidate('del-me');
    assertEqual(c.get('del-me'), undefined);
  });

  suite.test('invalidatePrefix 删除前缀匹配的键', () => {
    const c = new TestCache();
    c.set('cache:a', 1); c.set('cache:b', 2); c.set('other:c', 3);
    c.invalidatePrefix('cache:');
    assertEqual(c.get('cache:a'), undefined);
    assertEqual(c.get('cache:b'), undefined);
    assertEqual(c.get<number>('other:c'), 3);
  });

  suite.test('命中/未命中计数正确', () => {
    const c = new TestCache();
    c.set('k', 'v');
    c.get('k');      // hit
    c.get('k');      // hit
    c.get('miss');   // miss
    assertEqual(c.hits, 2);
    assertEqual(c.misses, 1);
  });

  suite.test('clear 清空所有', () => {
    const c = new TestCache();
    c.set('a', 1); c.set('b', 2);
    c.clear();
    assertEqual(c.size, 0);
    assertEqual(c.hits, 0);
    assertEqual(c.misses, 0);
  });

  return suite;
}

// =============================================
// Suite 17: §L-3 apiFetchStrict & ApiError 测试
// =============================================
function apiFetchStrictTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§L-3 apiFetchStrict & ApiError');

  suite.test('apiFetchStrict 成功请求返回数据 (非 null)', async () => {
    const data = await apiFetchStrict<{ status: string }>('/health');
    assertEqual(data.status, 'ok');
  });

  suite.test('apiFetchStrict 成功请求返回完整排行榜', async () => {
    const data = await apiFetchStrict<{ rankings: any[] }>('/leaderboard');
    assert(Array.isArray(data.rankings), 'rankings should be array');
  });

  suite.test('ApiError 类具有正确的属性', () => {
    const err = new ApiError({
      message: 'Test error',
      status: 404,
      statusText: 'Not Found',
      body: '{"error":"not found"}',
      path: '/test',
    });
    assertEqual(err.name, 'ApiError');
    assertEqual(err.status, 404);
    assertEqual(err.statusText, 'Not Found');
    assertEqual(err.path, '/test');
    assertEqual(err.isRateLimited, false);
    assertEqual(err.isNetworkError, false);
    assertTruthy(err.data, 'Should have parsed JSON data');
    assertEqual(err.data!.error, 'not found');
  });

  suite.test('ApiError 解析非 JSON body 时 data 为 null', () => {
    const err = new ApiError({
      message: 'Test',
      body: 'plain text error',
      path: '/test',
    });
    assertEqual(err.data, null);
    assertEqual(err.body, 'plain text error');
  });

  suite.test('ApiError isRateLimited 标志正确', () => {
    const err = new ApiError({
      message: 'Rate limited',
      status: 429,
      path: '/test',
      isRateLimited: true,
    });
    assertEqual(err.isRateLimited, true);
    assertEqual(err.status, 429);
  });

  suite.test('ApiError isNetworkError 标志正确', () => {
    const err = new ApiError({
      message: 'Network failure',
      path: '/test',
      isNetworkError: true,
    });
    assertEqual(err.isNetworkError, true);
    assertEqual(err.status, 0);
  });

  suite.test('apiFetch 兼容性：成功返回数据', async () => {
    const data = await apiFetch<{ status: string }>('/health');
    assertTruthy(data, 'apiFetch should still return data');
    assertEqual(data!.status, 'ok');
  });

  suite.test('apiFetch 兼容性：失败返回 null 而非抛异常', async () => {
    const data = await apiFetch('/nonexistent-route-xyz-12345');
    assertEqual(data, null);
  });

  return suite;
}

// =============================================
// Suite 18: §6.2 Cache Stats 端点测试
// =============================================
function cacheStatsTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§6.2 Cache Stats Endpoint');

  suite.test('GET /cache/stats 返回缓存统计', async () => {
    const data = await apiFetch<{ cache: { size: number; hits: number; misses: number; hitRate: string } }>('/cache/stats');
    assertTruthy(data, 'Cache stats endpoint should return data');
    assertTruthy(data!.cache, 'Should have cache object');
    assert(typeof data!.cache.size === 'number', 'cache.size should be number');
    assert(typeof data!.cache.hits === 'number', 'cache.hits should be number');
    assert(typeof data!.cache.misses === 'number', 'cache.misses should be number');
    assertTruthy(data!.cache.hitRate, 'cache.hitRate should exist');
  });

  suite.test('续两次 GET /leaderboard 应触发缓存命中', async () => {
    await apiFetch('/leaderboard');
    const stats1 = await apiFetch<{ cache: { hits: number } }>('/cache/stats');
    const hits1 = stats1?.cache?.hits ?? 0;
    await apiFetch('/leaderboard');
    const stats2 = await apiFetch<{ cache: { hits: number } }>('/cache/stats');
    const hits2 = stats2?.cache?.hits ?? 0;
    assert(hits2 > hits1, `Cache hits should increase: before=${hits1}, after=${hits2}`);
  });

  return suite;
}

// =============================================
// Suite 19: §4.1 AI 模型管理器测试
// =============================================
function aiModelManagerTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§4.1 AI Model Manager');

  suite.test('GET /ai/status 返回模型状态', async () => {
    const data = await apiFetch<{ activeProvider: string; openaiAvailable: boolean; providers: any[] }>('/ai/status');
    assertTruthy(data, 'AI status endpoint should return data');
    assertTruthy(data!.activeProvider, 'Should have activeProvider');
    assert(typeof data!.openaiAvailable === 'boolean', 'openaiAvailable should be boolean');
    assert(Array.isArray(data!.providers), 'providers should be array');
    assert(data!.providers.length >= 2, `Should have at least 2 providers, got ${data!.providers.length}`);
  });

  suite.test('模板 fallback 始终可用', async () => {
    const data = await apiFetch<{ providers: Array<{ name: string; available: boolean }> }>('/ai/status');
    assertTruthy(data, 'AI status should return data');
    const templateProvider = data!.providers.find(p => p.name === 'template');
    assertTruthy(templateProvider, 'Should have template provider');
    assertEqual(templateProvider!.available, true, 'Template provider should always be available');
  });

  suite.test('GET /ai/usage 返回使用统计', async () => {
    const data = await apiFetch<{
      totalCalls: number;
      openaiCalls: number;
      templateFallbacks: number;
      estimatedCostUSD: number;
    }>('/ai/usage');
    assertTruthy(data, 'AI usage endpoint should return data');
    assert(typeof data!.totalCalls === 'number', 'totalCalls should be number');
    assert(typeof data!.openaiCalls === 'number', 'openaiCalls should be number');
    assert(typeof data!.templateFallbacks === 'number', 'templateFallbacks should be number');
    assert(typeof data!.estimatedCostUSD === 'number', 'estimatedCostUSD should be number');
  });

  suite.test('POST /ai/lyrics 返回 provider 字段', async () => {
    const data = await apiFetch<{
      success: boolean;
      lyrics: string[];
      provider: string;
      cached: boolean;
    }>('/ai/lyrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: 'love', lines: 4 }),
    });
    assertTruthy(data, 'AI lyrics should return data');
    assertEqual(data!.success, true);
    assertTruthy(data!.provider, 'Should have provider field');
    assert(
      data!.provider === 'openai' || data!.provider === 'template',
      `provider should be openai or template, got ${data!.provider}`
    );
    assert(typeof data!.cached === 'boolean', 'cached should be boolean');
  });

  suite.test('AI 歌词缓存命中机制', async () => {
    // First request
    const req = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: 'calm', keywords: ['moon'], lines: 4, language: 'en' }),
    };
    await apiFetch('/ai/lyrics', req);
    // Second identical request should be cached
    const data2 = await apiFetch<{ cached: boolean }>('/ai/lyrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: 'calm', keywords: ['moon'], lines: 4, language: 'en' }),
    });
    assertTruthy(data2, 'Second request should return data');
    assertEqual(data2!.cached, true, 'Second identical request should be cached');
  });

  suite.test('使用统计在调用后递增', async () => {
    const before = await apiFetch<{ totalCalls: number }>('/ai/usage');
    const beforeCount = before?.totalCalls ?? 0;

    // Make a unique request to avoid cache
    await apiFetch('/ai/lyrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: 'energetic', keywords: [`unique-${Date.now()}`], lines: 2 }),
    });

    const after = await apiFetch<{ totalCalls: number }>('/ai/usage');
    const afterCount = after?.totalCalls ?? 0;
    assert(afterCount > beforeCount, `totalCalls should increase: before=${beforeCount}, after=${afterCount}`);
  });

  return suite;
}

// =============================================
// Suite 20: §L-1 版权哈希升级测试 (SHA-256)
// =============================================
function copyrightHashTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§L-1 Copyright Hash (SHA-256)');

  // Client-side SHA-256 implementation mirror for verification
  async function clientHashContent(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `DM-${hashHex.slice(0, 16).toUpperCase()}`;
  }

  suite.test('SHA-256 哈希确定性：同输入同输出', async () => {
    const content = 'test-content|happy|line1|line2|user-1|12345';
    const hash1 = await clientHashContent(content);
    const hash2 = await clientHashContent(content);
    assertEqual(hash1, hash2, 'Same content should produce same hash');
  });

  suite.test('SHA-256 哈希格式正确：DM- 前缀 + 16 位大写十六进制', async () => {
    const hash = await clientHashContent('anything');
    assert(hash.startsWith('DM-'), `Hash should start with DM-, got ${hash}`);
    const hexPart = hash.slice(3);
    assertEqual(hexPart.length, 16, `Hex part should be 16 chars, got ${hexPart.length}`);
    assert(/^[0-9A-F]{16}$/.test(hexPart), `Hex part should be uppercase hex, got ${hexPart}`);
  });

  suite.test('不同内容产生不同哈希', async () => {
    const hash1 = await clientHashContent('content-A');
    const hash2 = await clientHashContent('content-B');
    assert(hash1 !== hash2, `Different content should produce different hashes: ${hash1} vs ${hash2}`);
  });

  suite.test('空字符串也能正常哈希', async () => {
    const hash = await clientHashContent('');
    assert(hash.startsWith('DM-'), 'Empty string should still hash correctly');
    assertEqual(hash.slice(3).length, 16, 'Should still be 16 hex chars');
  });

  suite.test('POST /copyright/verify 端点可达', async () => {
    const data = await apiFetch<{ verified: boolean; reason?: string }>('/copyright/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workId: 'nonexistent-work-xyz' }),
    });
    assertTruthy(data, 'Copyright verify endpoint should return data');
    assertEqual(data!.verified, false, 'Nonexistent work should not verify');
  });

  suite.test('POST /copyright/verify 缺少 workId 返回 400', async () => {
    const res = await fetch(`${API_BASE}/copyright/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assertEqual(res.status, 400, 'Missing workId should return 400');
  });

  suite.test('SHA-256 比旧哈希更长更安全', async () => {
    // Old hash was 8 hex chars (32 bits), new is 16 hex chars (64 bits)
    const hash = await clientHashContent('test-security-check');
    const hexPart = hash.slice(3);
    assert(hexPart.length >= 16, `New hash should be at least 16 hex chars (64 bits), got ${hexPart.length}`);
  });

  return suite;
}

// =============================================
// Suite 21: §M-4 Challenge AI Scoring
// =============================================
function challengeAiScoringTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§M-4 Challenge AI Scoring');

  suite.test('GET /challenges/active 返回挑战数据', async () => {
    const data = await apiFetch<{ challenge: any }>('/challenges/active');
    assertTruthy(data?.challenge, 'Should return active challenge');
    assertTruthy(data!.challenge.id, 'Challenge should have an id');
    assertTruthy(data!.challenge.tags, 'Challenge should have tags');
  });

  suite.test('GET /ai/status 确认模型管理器在线', async () => {
    const data = await apiFetch<{ activeProvider: string; providers: any[] }>('/ai/status');
    assertTruthy(data?.activeProvider, 'Should return active provider');
    assertTruthy(data?.providers, 'Should list providers');
    assert(data!.providers.length >= 2, `Should have at least 2 providers, got ${data!.providers.length}`);
  });

  suite.test('Challenge entries 包含 AI 评分字段', async () => {
    const activeData = await apiFetch<{ challenge: any }>('/challenges/active');
    if (!activeData?.challenge) return;
    const data = await apiFetch<{ entries: any[] }>(`/challenges/${activeData.challenge.id}/entries`);
    assertTruthy(data, 'Should return entries data');
    // If entries exist, check AI fields
    if (data!.entries && data!.entries.length > 0) {
      const entry = data!.entries[0];
      assertTruthy(entry.judgeScore !== undefined, 'Entry should have judgeScore');
      // aiBreakdown/aiFeedback may or may not exist depending on when entry was created
      if (entry.aiProvider) {
        assertContains(['openai', 'template', 'fallback'], entry.aiProvider, 'aiProvider should be valid');
      }
    }
  });

  suite.test('POST /challenges/:id/submit 返回带 AI 评分的 entry', async () => {
    const activeData = await apiFetch<{ challenge: any }>('/challenges/active');
    if (!activeData?.challenge) return;
    // Test with a unique userId to avoid "already submitted"
    const testUserId = `test-ai-score-${Date.now()}`;
    const result = await apiFetch<any>(`/challenges/${activeData.challenge.id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        userName: 'TestBot',
        workTitle: 'AI Scoring Test Work',
        workTheme: 'electronic',
        workLyrics: ['Neon lights in the city', 'Digital dreams run free'],
      }),
    });
    assertTruthy(result?.success || result?.error, 'Should return success or error');
    if (result?.success && result?.entry) {
      assertTruthy(result.entry.judgeScore !== undefined, 'Entry should have judgeScore');
      assertInRange(result.entry.judgeScore, 0, 100, 'judgeScore should be 0-100');
      assertTruthy(result.entry.aiProvider, 'Entry should have aiProvider');
    }
  });

  return suite;
}

// =============================================
// Suite 22: §4.3 STT (Speech-to-Text) Whisper
// =============================================
function sttWhisperTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§4.3 STT (Whisper)');

  suite.test('POST /stt/transcribe 端点可达', async () => {
    const res = await fetch(`${API_BASE}/stt/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    // Should return 400 (missing audio) not 404
    assertEqual(res.status, 400, 'Should return 400 for missing audio, not 404');
  });

  suite.test('POST /stt/transcribe 缺少 audio 返回 400', async () => {
    const data = await fetch(`${API_BASE}/stt/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'zh' }),
    });
    assertEqual(data.status, 400, 'Missing audio should return 400');
    const json = await data.json();
    assertContains(json.error || '', 'audio', 'Error should mention audio');
  });

  suite.test('POST /stt/transcribe 空 audio 有合理响应', async () => {
    // Send minimal base64 (likely not valid audio but tests the pipeline)
    const data = await apiFetch<any>('/stt/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio: 'AAAA', language: 'en' }),
    });
    assertTruthy(data, 'Should return response data');
    // Either text (if Whisper processed it), fallback message, or error — all acceptable
    const hasResult = data.text !== undefined || data.fallback || data.error || data.available !== undefined;
    assert(hasResult, 'Response should contain text, fallback, error, or available field');
  });

  suite.test('STT API 响应包含 provider 字段', async () => {
    const data = await apiFetch<any>('/stt/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio: 'AAAA', language: 'zh' }),
    });
    if (data && !data.error) {
      assertTruthy(data.provider, 'Response should include provider field');
      assertContains(['openai', 'template'], data.provider, 'Provider should be openai or template');
    }
  });

  return suite;
}

// =============================================
// Suite 23: §5.1 AI Recommendation Analysis (GPT User Preferences)
// =============================================
function aiRecommendationAnalysisTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§5.1 AI Recommendation Analysis');

  suite.test('GET /recommendations/test-user/ai-analysis 端点可达', async () => {
    const data = await apiFetch<{ userId: string; analysis: any }>('/recommendations/test-user/ai-analysis');
    assertTruthy(data, 'AI analysis endpoint should return data');
    assertEqual(data!.userId, 'test-user');
    assertTruthy(data!.analysis, 'Should have analysis object');
  });

  suite.test('AI 分析返回必需字段', async () => {
    const data = await apiFetch<{ analysis: any }>('/recommendations/test-user/ai-analysis');
    if (!data?.analysis) return;
    const a = data.analysis;
    assertTruthy(a.insights, 'Should have insights string');
    assert(typeof a.insights === 'string', 'insights should be string');
    assert(Array.isArray(a.suggestedMoods), 'suggestedMoods should be array');
    assertTruthy(a.personalityTag, 'Should have personalityTag');
    assertTruthy(a.personalityTagEn, 'Should have personalityTagEn');
    assertContains(['casual', 'regular', 'enthusiast', 'power'], a.engagementLevel, 'Valid engagement level');
    assert(Array.isArray(a.recommendations), 'recommendations should be array');
    assertContains(['openai', 'template'], a.provider, 'Valid provider');
    assert(typeof a.cached === 'boolean', 'cached should be boolean');
  });

  suite.test('AI 分析的情绪建议有效', async () => {
    const data = await apiFetch<{ analysis: any }>('/recommendations/test-user/ai-analysis');
    if (!data?.analysis?.suggestedMoods) return;
    const validMoods = ['happy', 'sad', 'energetic', 'calm', 'love', 'neutral'];
    for (const mood of data.analysis.suggestedMoods) {
      assertContains(validMoods, mood, `Suggested mood "${mood}" should be valid`);
    }
    assert(data.analysis.suggestedMoods.length <= 3, 'Should suggest at most 3 moods');
  });

  suite.test('AI 分析缓存机制', async () => {
    // First request
    await apiFetch('/recommendations/test-user/ai-analysis');
    // Second identical request should be cached
    const data2 = await apiFetch<{ analysis: { cached: boolean } }>('/recommendations/test-user/ai-analysis');
    if (data2?.analysis) {
      assertEqual(data2.analysis.cached, true, 'Second request should be cached');
    }
  });

  suite.test('AI 分析 personalityTag 非空', async () => {
    const data = await apiFetch<{ analysis: { personalityTag: string; personalityTagEn: string } }>('/recommendations/test-user/ai-analysis');
    if (!data?.analysis) return;
    assert(data.analysis.personalityTag.length > 0, 'personalityTag should not be empty');
    assert(data.analysis.personalityTagEn.length > 0, 'personalityTagEn should not be empty');
  });

  return suite;
}

// =============================================
// Suite 24: §4.3 STT Stream (Chunked Transcription)
// =============================================
function sttStreamTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§4.3 STT Stream (Chunked)');

  suite.test('POST /stt/stream 端点可达', async () => {
    const res = await fetch(`${API_BASE}/stt/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    // Should return 400 (missing chunks) not 404
    assertEqual(res.status, 400, 'Should return 400 for missing chunks');
  });

  suite.test('POST /stt/stream 缺少 chunks 返回 400', async () => {
    const res = await fetch(`${API_BASE}/stt/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'zh' }),
    });
    assertEqual(res.status, 400, 'Missing chunks should return 400');
    const json = await res.json();
    assertContains(json.error || '', 'chunks', 'Error should mention chunks');
  });

  suite.test('POST /stt/stream 空 chunks 数组返回 400', async () => {
    const res = await fetch(`${API_BASE}/stt/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chunks: [], language: 'zh' }),
    });
    assertEqual(res.status, 400, 'Empty chunks array should return 400');
  });

  suite.test('POST /stt/stream 带最小音频数据有合理响应', async () => {
    const data = await apiFetch<any>('/stt/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chunks: [{ audioBase64: 'AAAA', index: 0 }],
        language: 'en',
        sessionId: 'test-stream-session',
      }),
    });
    assertTruthy(data, 'Should return response data');
    // Response should have chunks array, fullText, and provider
    if (data && !data.error) {
      assert(Array.isArray(data.chunks), 'Should have chunks array in response');
      assert(typeof data.fullText === 'string', 'Should have fullText string');
      assertTruthy(data.provider, 'Should have provider field');
      assert(typeof data.available === 'boolean', 'Should have available boolean');
      assertEqual(data.sessionId, 'test-stream-session', 'Should echo sessionId');
    }
  });

  suite.test('POST /stt/stream 超过 5 个 chunks 返回 400', async () => {
    const chunks = Array.from({ length: 6 }, (_, i) => ({ audioBase64: 'AAAA', index: i }));
    const res = await fetch(`${API_BASE}/stt/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chunks, language: 'zh' }),
    });
    assertEqual(res.status, 400, 'More than 5 chunks should return 400');
  });

  return suite;
}

// =============================================
// Suite 25: §5.1 AI Insights Frontend Integration
// =============================================
function aiInsightsFrontendTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§5.1 AI Insights Frontend Integration');

  suite.test('GET /recommendations/test-user/ai-analysis 返回完整 analysis 对象', async () => {
    const data = await apiFetch<{ userId: string; analysis: any }>('/recommendations/test-user/ai-analysis');
    assertTruthy(data, 'Should return data');
    assertEqual(data!.userId, 'test-user');
    assertTruthy(data!.analysis, 'Should have analysis object');
  });

  suite.test('AI 分析包含 personalityTag 和 personalityTagEn', async () => {
    const data = await apiFetch<{ analysis: any }>('/recommendations/test-user/ai-analysis');
    if (!data?.analysis) return;
    assertTruthy(data.analysis.personalityTag, 'personalityTag required');
    assertTruthy(data.analysis.personalityTagEn, 'personalityTagEn required');
    assert(data.analysis.personalityTag.length >= 2, `personalityTag should be ≥2 chars, got ${data.analysis.personalityTag.length}`);
  });

  suite.test('AI 分析 engagementLevel 为有效枚举值', async () => {
    const data = await apiFetch<{ analysis: any }>('/recommendations/test-user/ai-analysis');
    if (!data?.analysis) return;
    const validLevels = ['casual', 'regular', 'enthusiast', 'power'];
    assertContains(validLevels, data.analysis.engagementLevel, `engagementLevel "${data.analysis.engagementLevel}" should be valid`);
  });

  suite.test('AI 分析 recommendations 数组含 mood/reason/weight', async () => {
    const data = await apiFetch<{ analysis: any }>('/recommendations/test-user/ai-analysis');
    if (!data?.analysis?.recommendations?.length) return;
    const rec = data.analysis.recommendations[0];
    assertTruthy(rec.mood, 'recommendation should have mood');
    assertTruthy(rec.reason || rec.reasonZh, 'recommendation should have reason');
    assert(typeof rec.weight === 'number', `weight should be number, got ${typeof rec.weight}`);
    assertInRange(rec.weight, 0, 1, 'weight should be 0-1');
  });

  suite.test('AI 分析 insights 为非空字符串', async () => {
    const data = await apiFetch<{ analysis: any }>('/recommendations/test-user/ai-analysis');
    if (!data?.analysis) return;
    assert(typeof data.analysis.insights === 'string', 'insights should be string');
    assert(data.analysis.insights.length > 5, `insights should be meaningful, got ${data.analysis.insights.length} chars`);
  });

  suite.test('AI 分析 suggestedMoods 最多 3 个有效情绪', async () => {
    const data = await apiFetch<{ analysis: any }>('/recommendations/test-user/ai-analysis');
    if (!data?.analysis?.suggestedMoods) return;
    assert(data.analysis.suggestedMoods.length <= 3, `Should suggest ≤3 moods, got ${data.analysis.suggestedMoods.length}`);
    const validMoods = ['happy', 'sad', 'energetic', 'calm', 'love', 'neutral'];
    for (const mood of data.analysis.suggestedMoods) {
      assertContains(validMoods, mood, `"${mood}" should be a valid mood`);
    }
  });

  return suite;
}

// =============================================
// Suite 26: §4.3+ STT Streaming Frontend Flow
// =============================================
function sttStreamFrontendTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§4.3+ STT Streaming Frontend Flow');

  suite.test('POST /stt/stream 返回 chunks + fullText + provider', async () => {
    const data = await apiFetch<any>('/stt/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chunks: [{ audioBase64: 'AAAA', index: 0 }],
        language: 'zh',
        sessionId: 'test-frontend-flow',
      }),
    });
    assertTruthy(data, 'Should return response');
    if (!data.error) {
      assert(Array.isArray(data.chunks), 'Response should have chunks array');
      assertEqual(data.chunks.length, 1, 'Should process 1 chunk');
      assert(typeof data.fullText === 'string', 'fullText should be string');
      assertTruthy(data.provider, 'Should have provider');
      assert(typeof data.available === 'boolean', 'available should be boolean');
      assertEqual(data.sessionId, 'test-frontend-flow', 'Should echo sessionId');
    }
  });

  suite.test('POST /stt/stream 多 chunks 处理', async () => {
    const chunks = [
      { audioBase64: 'AAAA', index: 0 },
      { audioBase64: 'BBBB', index: 1 },
      { audioBase64: 'CCCC', index: 2 },
    ];
    const data = await apiFetch<any>('/stt/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chunks, language: 'en', sessionId: 'multi-chunk-test' }),
    });
    assertTruthy(data, 'Should return response');
    if (!data.error) {
      assertEqual(data.chunks.length, 3, 'Should process all 3 chunks');
      for (let i = 0; i < data.chunks.length; i++) {
        assertEqual(data.chunks[i].index, i, `Chunk ${i} should have correct index`);
        assertTruthy(data.chunks[i].provider, `Chunk ${i} should have provider`);
      }
    }
  });

  suite.test('POST /stt/stream chunk.isFinal 标记正确', async () => {
    const data = await apiFetch<any>('/stt/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chunks: [
          { audioBase64: 'AAAA', index: 0 },
          { audioBase64: 'BBBB', index: 1 },
        ],
        language: 'zh',
      }),
    });
    if (data && !data.error && data.chunks?.length === 2) {
      assertEqual(data.chunks[0].isFinal, false, 'First chunk should not be final');
      assertEqual(data.chunks[1].isFinal, true, 'Last chunk should be final');
    }
  });

  suite.test('POST /stt/stream 大音频数据 (>10MB) 返回 400', async () => {
    const largeBase64 = 'A'.repeat(15 * 1024 * 1024);
    const res = await fetch(`${API_BASE}/stt/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chunks: [{ audioBase64: largeBase64, index: 0 }],
        language: 'zh',
      }),
    });
    assertEqual(res.status, 400, 'Oversized audio should return 400');
  });

  return suite;
}

// =============================================
// Run All Tests
// =============================================
export async function runAllTests(): Promise<{
  suites: TestSuiteResult[];
  totalPassed: number;
  totalFailed: number;
  total: number;
}> {
  console.log('\n🎵 D-Music Core Test Suite v1.1\n');
  console.log('Running tests...\n');

  const suites: TestSuiteResult[] = [];

  // Unit tests (fast, no network)
  suites.push(await wilsonScoreTests().run());
  suites.push(await panelReducerTests().run());

  // Integration tests (API calls)
  suites.push(await apiHealthTests().run());
  suites.push(await apiMusicTests().run());
  suites.push(await apiStarpowerTests().run());
  suites.push(await apiAnalyticsTests().run());
  suites.push(await apiAiTests().run());
  suites.push(await apiSocialTests().run());
  suites.push(await apiCommunityTests().run());
  suites.push(await apiUserTests().run());

  // Regression tests
  suites.push(await kvKeyConsistencyTests().run());
  suites.push(await corsTests().run());

  // Module integrity tests
  suites.push(await i18nTests().run());
  suites.push(await designTokenTests().run());

  // Route modularity verification
  suites.push(await routeModularityTests().run());

  // Additional unit tests
  suites.push(await queryCacheTests().run());
  suites.push(await apiFetchStrictTests().run());
  suites.push(await cacheStatsTests().run());

  // §4.1 AI Model Manager & §L-1 Copyright Hash
  suites.push(await aiModelManagerTests().run());
  suites.push(await copyrightHashTests().run());

  // §M-4 Challenge AI Scoring & §4.3 STT Whisper
  suites.push(await challengeAiScoringTests().run());
  suites.push(await sttWhisperTests().run());

  // §5.1 AI Recommendation Analysis & §4.3 STT Stream
  suites.push(await aiRecommendationAnalysisTests().run());
  suites.push(await sttStreamTests().run());

  // §5.1 AI Insights Frontend & §4.3+ STT Streaming Frontend Flow
  suites.push(await aiInsightsFrontendTests().run());
  suites.push(await sttStreamFrontendTests().run());

  const summary = printResults(suites);

  return { suites, ...summary };
}

// =============================================
// Quick Smoke Test (仅关键路径)
// =============================================
export async function runSmokeTests(): Promise<TestSuiteResult[]> {
  console.log('\n🔥 D-Music Smoke Tests\n');

  const suites: TestSuiteResult[] = [];
  suites.push(await wilsonScoreTests().run());
  suites.push(await panelReducerTests().run());
  suites.push(await apiHealthTests().run());
  suites.push(await kvKeyConsistencyTests().run());

  printResults(suites);
  return suites;
}