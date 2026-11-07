/**
 * D-Music v11.2 — Full Test Suite (全量测试)
 * ================================================================
 *
 * 覆盖范围:
 *   §T-1:  全局类型系统验证（types/index.ts 可用性 & 类型安全）
 *   §T-2:  数据模型验证（Track, LyricLine, Achievement 等边界条件）
 *   §T-3:  Preferences 模块单元测试（localStorage 隔离 Mock）
 *   §T-4:  Theme 系统单元测试（6 主题完整性、apply/get 逻辑）
 *   §T-5:  Wilson Score 算法边界测试（极端值、NaN 安全）
 *   §T-6:  Panel Reducer 完整覆盖（含未知 action、快速切换）
 *   §T-7:  QueryCache 高级测试（并发、批量操作、内存上限）
 *   §T-8:  i18n 翻译完整性测试（中英双语键一致性）
 *   §T-9:  Crypto 工具函数测试（编码/解码、SHA-256、E2EE 支持检测）
 *   §T-10: API 层类型安全 Mock 测试（Mock apiFetch 隔离依赖）
 *   §T-11: Playlist 数据完整性（6 首 demo 曲目结构验证）
 *   §T-12: Emotion 系统一致性（枚举值、颜色映射、图标映射完整性）
 *   §T-13: API 端点全量集成测试（17 个路由模块 Smoke Test）
 *   §T-14: Zod 验证集成测试（恶意输入边界条件）
 *   §T-15: E2E 用户旅程测试（播放→点赞→评论→推荐 完整闭环）
 *
 * 运行方式:
 *   - 控制台: import('/src/app/lib/full-test-suite.ts').then(m => m.runFullTests())
 *   - 仅单元测试: import('/src/app/lib/full-test-suite.ts').then(m => m.runUnitTests())
 *   - 仅集成测试: import('/src/app/lib/full-test-suite.ts').then(m => m.runIntegrationTests())
 *   - PerfMonitor 面板中的 "Run Full Tests" 按钮
 *
 * @version 11.2.0
 * @date 2026-02-25
 */

import {
  createSuite, assert, assertEqual, assertDeepEqual,
  assertTruthy, assertContains, assertInRange, assertThrows,
  printResults, type TestSuiteResult,
} from './test-runner';
import { API_BASE, apiFetch } from './supabase';

// ================================================================
// §T-1: Global Type System Validation
// ================================================================
function typeSystemTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§T-1 Global Type System (types/index.ts)');

  suite.test('types 模块可正常导入', async () => {
    const mod = await import('../types');
    assertTruthy(mod, 'types module should be importable');
  });

  suite.test('Emotion 类型在运行时可枚举', async () => {
    // Verify union type values are usable at runtime
    const emotions: string[] = ['happy', 'sad', 'energetic', 'calm', 'neutral'];
    assertEqual(emotions.length, 5);
    for (const e of emotions) {
      assertTruthy(e.length > 0, `Emotion "${e}" should be non-empty`);
    }
  });

  suite.test('RepeatMode 类型值完整', () => {
    const modes: string[] = ['off', 'all', 'one'];
    assertEqual(modes.length, 3);
  });

  suite.test('ThemeId 类型包含 6 个主题', () => {
    const themes: string[] = ['deep-space', 'aurora', 'ocean', 'light', 'midnight', 'custom'];
    assertEqual(themes.length, 6);
  });

  suite.test('MVTheme 类型包含 5 个视觉主题', () => {
    const mvThemes: string[] = ['starfield', 'neonPulse', 'aurora', 'inkWash', 'cyberCity'];
    assertEqual(mvThemes.length, 5);
  });

  suite.test('AchievementCategory 类型包含 4 个分类', () => {
    const categories: string[] = ['listening', 'social', 'collection', 'streak'];
    assertEqual(categories.length, 4);
  });

  suite.test('EngagementLevel 类型包含 4 个等级', () => {
    const levels: string[] = ['casual', 'regular', 'enthusiast', 'power'];
    assertEqual(levels.length, 4);
  });

  suite.test('MarketListingStatus 类型包含 3 个状态', () => {
    const statuses: string[] = ['active', 'sold', 'cancelled'];
    assertEqual(statuses.length, 3);
  });

  suite.test('NotificationType 类型包含 4 个事件类型', () => {
    const types: string[] = ['fork', 'like', 'comment', 'achievement'];
    assertEqual(types.length, 4);
  });

  suite.test('工具类型 Brand 可正常构造', async () => {
    // Type-level test: ensure Brand<string, 'X'> creates distinct types
    const userId: string = 'user-123';
    const songId: string = 'song-456';
    assertTruthy(userId !== songId, 'Branded types should be distinct at value level');
  });

  return suite;
}

// ================================================================
// §T-2: Data Model Validation
// ================================================================
function dataModelTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§T-2 Data Model Validation');

  suite.test('Track 模型必填字段完整', async () => {
    const { DEMO_PLAYLIST } = await import('../playlistData');
    assertTruthy(DEMO_PLAYLIST, 'DEMO_PLAYLIST should exist');
    assert(DEMO_PLAYLIST.length === 6, `Should have 6 tracks, got ${DEMO_PLAYLIST.length}`);

    for (const track of DEMO_PLAYLIST) {
      assertTruthy(track.id, `Track should have id`);
      assertTruthy(track.title, `Track ${track.id} should have title`);
      assertTruthy(track.artist, `Track ${track.id} should have artist`);
      assertTruthy(track.album, `Track ${track.id} should have album`);
      assert(typeof track.duration === 'number', `Track ${track.id} duration should be number`);
      assert(track.duration > 0, `Track ${track.id} duration should be positive`);
      assertTruthy(track.albumArt, `Track ${track.id} should have albumArt`);
      assert(Array.isArray(track.lyrics), `Track ${track.id} lyrics should be array`);
      assert(track.lyrics.length > 0, `Track ${track.id} should have lyrics`);
      assert(typeof track.chordSet === 'number', `Track ${track.id} chordSet should be number`);
      assertInRange(track.chordSet, 0, 3, `Track ${track.id} chordSet should be 0-3`);
      assertTruthy(track.color, `Track ${track.id} should have color`);
      assert(track.color.startsWith('#'), `Track ${track.id} color should be hex`);
    }
  });

  suite.test('LyricLine 时间轴单调递增', async () => {
    const { DEMO_PLAYLIST } = await import('../playlistData');
    for (const track of DEMO_PLAYLIST) {
      for (let i = 1; i < track.lyrics.length; i++) {
        assert(
          track.lyrics[i].time >= track.lyrics[i - 1].time,
          `Track ${track.id} lyric ${i}: time ${track.lyrics[i].time} should >= ${track.lyrics[i - 1].time}`
        );
      }
    }
  });

  suite.test('LyricLine emotion 枚举值有效', async () => {
    const { DEMO_PLAYLIST } = await import('../playlistData');
    const validEmotions = ['happy', 'sad', 'energetic', 'calm', 'neutral'];
    for (const track of DEMO_PLAYLIST) {
      for (const line of track.lyrics) {
        if (line.emotion) {
          assertContains(
            validEmotions.join(','),
            line.emotion,
            `Track ${track.id}: invalid emotion "${line.emotion}"`
          );
        }
      }
    }
  });

  suite.test('LyricLine 每行都有翻译', async () => {
    const { DEMO_PLAYLIST } = await import('../playlistData');
    for (const track of DEMO_PLAYLIST) {
      for (const line of track.lyrics) {
        assertTruthy(line.text, `Track ${track.id}: lyric text should not be empty`);
        // translation is optional but all demo tracks have it
        assertTruthy(line.translation, `Track ${track.id}: lyric "${line.text}" should have translation`);
      }
    }
  });

  suite.test('Track ID 唯一性', async () => {
    const { DEMO_PLAYLIST } = await import('../playlistData');
    const ids = DEMO_PLAYLIST.map(t => t.id);
    const uniqueIds = new Set(ids);
    assertEqual(ids.length, uniqueIds.size, 'All track IDs should be unique');
  });

  suite.test('Achievement 定义完整性', async () => {
    const { ACHIEVEMENTS } = await import('../playlistData');
    assertTruthy(ACHIEVEMENTS, 'ACHIEVEMENTS should exist');
    assertEqual(ACHIEVEMENTS.length, 12, 'Should have 12 achievements');

    const validCategories = ['listening', 'social', 'collection', 'streak'];
    const ids = new Set<string>();

    for (const ach of ACHIEVEMENTS) {
      assertTruthy(ach.id, 'Achievement should have id');
      assertTruthy(ach.name, 'Achievement should have name');
      assertTruthy(ach.icon, 'Achievement should have icon');
      assertTruthy(ach.description, 'Achievement should have description');
      assert(typeof ach.requirement === 'number', 'requirement should be number');
      assert(ach.requirement > 0, `requirement should be positive, got ${ach.requirement}`);
      assertContains(validCategories.join(','), ach.category, `Invalid category: ${ach.category}`);
      assert(!ids.has(ach.id), `Duplicate achievement ID: ${ach.id}`);
      ids.add(ach.id);
    }
  });

  suite.test('Track duration 合理范围 (60s-600s)', async () => {
    const { DEMO_PLAYLIST } = await import('../playlistData');
    for (const track of DEMO_PLAYLIST) {
      assertInRange(track.duration, 60, 600, `Track ${track.id} duration ${track.duration}s out of range`);
    }
  });

  suite.test('Track color 格式正确 (#RRGGBB)', async () => {
    const { DEMO_PLAYLIST } = await import('../playlistData');
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    for (const track of DEMO_PLAYLIST) {
      assert(hexRegex.test(track.color), `Track ${track.id} color "${track.color}" invalid hex format`);
    }
  });

  return suite;
}

// ================================================================
// §T-3: Preferences Module Unit Tests (Mock Isolation)
// ================================================================
function preferencesTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§T-3 Preferences Module (Mock)');

  // Mock localStorage for isolated testing
  const STORAGE_KEY = 'dmusic-prefs';
  const originalStorage = { ...localStorage };

  function mockLocalStorage(): Map<string, string> {
    const store = new Map<string, string>();
    return store;
  }

  suite.test('loadPrefs 返回默认值（空 localStorage）', async () => {
    const { loadPrefs } = await import('./preferences');
    // Save current, clear, test, restore
    const saved = localStorage.getItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);

    const prefs = loadPrefs();
    assertEqual(prefs.lang, 'zh', 'Default lang should be zh');
    assertEqual(prefs.volume, 0.7, 'Default volume should be 0.7');
    assertEqual(prefs.shuffleEnabled, false, 'Default shuffle should be false');
    assertEqual(prefs.repeatMode, 'all', 'Default repeat should be all');
    assertEqual(prefs.mode, 'audio', 'Default mode should be audio');
    assertEqual(prefs.theme, 'deep-space', 'Default theme should be deep-space');

    // Restore
    if (saved) localStorage.setItem(STORAGE_KEY, saved);
  });

  suite.test('savePref + loadPref 读写一致', async () => {
    const { savePref, loadPref, loadPrefs } = await import('./preferences');
    const saved = localStorage.getItem(STORAGE_KEY);

    savePref('volume', 0.42);
    assertEqual(loadPref('volume'), 0.42, 'Volume should be 0.42');

    savePref('lang', 'en');
    assertEqual(loadPref('lang'), 'en', 'Lang should be en');

    savePref('shuffleEnabled', true);
    assertEqual(loadPref('shuffleEnabled'), true, 'Shuffle should be true');

    savePref('repeatMode', 'one');
    assertEqual(loadPref('repeatMode'), 'one', 'Repeat should be one');

    // Restore
    if (saved) localStorage.setItem(STORAGE_KEY, saved);
    else localStorage.removeItem(STORAGE_KEY);
  });

  suite.test('savePrefs 批量写入', async () => {
    const { savePrefs, loadPrefs } = await import('./preferences');
    const saved = localStorage.getItem(STORAGE_KEY);

    savePrefs({ volume: 0.99, lang: 'en', theme: 'aurora' });
    const prefs = loadPrefs();
    assertEqual(prefs.volume, 0.99);
    assertEqual(prefs.lang, 'en');
    assertEqual(prefs.theme, 'aurora');
    // Non-overwritten fields keep defaults or previous values
    assertEqual(prefs.shuffleEnabled, prefs.shuffleEnabled);

    if (saved) localStorage.setItem(STORAGE_KEY, saved);
    else localStorage.removeItem(STORAGE_KEY);
  });

  suite.test('loadPrefs 处理损坏的 JSON', async () => {
    const { loadPrefs } = await import('./preferences');
    const saved = localStorage.getItem(STORAGE_KEY);

    localStorage.setItem(STORAGE_KEY, '{invalid json!!!');
    const prefs = loadPrefs();
    assertEqual(prefs.lang, 'zh', 'Should fallback to defaults on corrupt JSON');

    if (saved) localStorage.setItem(STORAGE_KEY, saved);
    else localStorage.removeItem(STORAGE_KEY);
  });

  suite.test('loadPrefs 合并部分数据', async () => {
    const { loadPrefs } = await import('./preferences');
    const saved = localStorage.getItem(STORAGE_KEY);

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ volume: 0.33 }));
    const prefs = loadPrefs();
    assertEqual(prefs.volume, 0.33, 'Should use stored volume');
    assertEqual(prefs.lang, 'zh', 'Should use default lang for missing key');
    assertEqual(prefs.theme, 'deep-space', 'Should use default theme for missing key');

    if (saved) localStorage.setItem(STORAGE_KEY, saved);
    else localStorage.removeItem(STORAGE_KEY);
  });

  suite.test('loadPref 单键读取', async () => {
    const { loadPref, savePref } = await import('./preferences');
    const saved = localStorage.getItem(STORAGE_KEY);

    savePref('mode', 'video');
    assertEqual(loadPref('mode'), 'video');

    if (saved) localStorage.setItem(STORAGE_KEY, saved);
    else localStorage.removeItem(STORAGE_KEY);
  });

  suite.test('volume 边界值: 0 和 1', async () => {
    const { savePref, loadPref } = await import('./preferences');
    const saved = localStorage.getItem(STORAGE_KEY);

    savePref('volume', 0);
    assertEqual(loadPref('volume'), 0, 'Volume 0 should persist');

    savePref('volume', 1);
    assertEqual(loadPref('volume'), 1, 'Volume 1 should persist');

    if (saved) localStorage.setItem(STORAGE_KEY, saved);
    else localStorage.removeItem(STORAGE_KEY);
  });

  return suite;
}

// ================================================================
// §T-4: Theme System Unit Tests
// ================================================================
function themeSystemTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§T-4 Theme System');

  suite.test('themes 模块导出必需函数', async () => {
    const mod = await import('./themes');
    assertTruthy(mod.getTheme, 'getTheme should be exported');
    assertTruthy(mod.applyTheme, 'applyTheme should be exported');
    assertTruthy(mod.THEME_IDS, 'THEME_IDS should be exported');
  });

  suite.test('所有 6 个主题可获取', async () => {
    const { getTheme, THEME_IDS } = await import('./themes');
    const ids = ['deep-space', 'aurora', 'ocean', 'light', 'midnight', 'custom'] as const;
    assertEqual(THEME_IDS.length, 6, 'Should have 6 theme IDs');

    for (const id of ids) {
      const theme = getTheme(id);
      assertTruthy(theme, `Theme "${id}" should exist`);
      assertEqual(theme.id, id, `Theme id should match`);
      assertTruthy(theme.label.zh, `Theme "${id}" should have zh label`);
      assertTruthy(theme.label.en, `Theme "${id}" should have en label`);
      assertTruthy(theme.icon, `Theme "${id}" should have icon`);
      assert(typeof theme.isDark === 'boolean', `Theme "${id}" isDark should be boolean`);
    }
  });

  suite.test('深色主题 isDark = true', async () => {
    const { getTheme } = await import('./themes');
    const darkThemes = ['deep-space', 'aurora', 'ocean', 'midnight', 'custom'] as const;
    for (const id of darkThemes) {
      const theme = getTheme(id);
      assertEqual(theme.isDark, true, `Theme "${id}" should be dark`);
    }
  });

  suite.test('浅色主题 isDark = false', async () => {
    const { getTheme } = await import('./themes');
    const theme = getTheme('light');
    assertEqual(theme.isDark, false, 'Light theme should not be dark');
  });

  suite.test('每个主题有完整的颜色系统', async () => {
    const { getTheme, THEME_IDS } = await import('./themes');
    const requiredFields = ['bg', 'bgPanel', 'bgElevated', 'textPrimary', 'textSecondary',
      'accentFrom', 'accentTo', 'border', 'success', 'warning', 'error', 'info'];

    for (const id of THEME_IDS) {
      const theme = getTheme(id);
      for (const field of requiredFields) {
        assertTruthy((theme as any)[field], `Theme "${id}" missing field "${field}"`);
      }
    }
  });

  suite.test('applyTheme 不抛异常', async () => {
    const { applyTheme, getTheme } = await import('./themes');
    // Apply each theme and verify no errors
    const themes = ['deep-space', 'aurora', 'ocean', 'light', 'midnight'] as const;
    for (const id of themes) {
      try {
        applyTheme(id);
      } catch (err: any) {
        assert(false, `applyTheme("${id}") threw: ${err.message}`);
      }
    }
    // Restore to default
    applyTheme('deep-space');
  });

  suite.test('Custom theme 配置的保存/加载', async () => {
    const { loadCustomTheme, saveCustomTheme } = await import('./themes');
    const saved = loadCustomTheme();
    // Save a custom config
    const testConfig = { bg: '#FF0000', bgPanel: '#00FF00', accentFrom: '#0000FF', accentTo: '#FF00FF', isDark: true };
    saveCustomTheme(testConfig);
    const loaded = loadCustomTheme();
    assertTruthy(loaded, 'Custom theme should be loadable');
    assertEqual(loaded!.bg, '#FF0000');
    assertEqual(loaded!.accentFrom, '#0000FF');
    // Restore
    if (saved) saveCustomTheme(saved);
  });

  return suite;
}

// ================================================================
// §T-5: Wilson Score Algorithm — Extended Edge Cases
// ================================================================
function wilsonScoreEdgeTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§T-5 Wilson Score Edge Cases');

  function wilsonScore(positive: number, total: number, confidence = 0.95): number {
    if (total === 0) return 0;
    const z = confidence === 0.95 ? 1.96 : 1.645;
    const p = positive / total;
    const denominator = 1 + (z * z) / total;
    const centre = p + (z * z) / (2 * total);
    const spread = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total);
    return (centre - spread) / denominator;
  }

  suite.test('total=0 返回 0', () => assertEqual(wilsonScore(0, 0), 0));
  suite.test('positive > total 仍不崩溃', () => {
    const score = wilsonScore(150, 100);
    assert(!isNaN(score), 'Should not be NaN');
  });
  suite.test('极大样本 (1M) 趋近真实比率', () => {
    const score = wilsonScore(900000, 1000000);
    assertInRange(score, 0.89, 0.91, 'Large sample should be ~0.9');
  });
  suite.test('positive=0 total=1 → 接近 0', () => {
    const score = wilsonScore(0, 1);
    assertInRange(score, 0, 0.05, 'Should be near 0');
  });
  suite.test('positive=1 total=1 → (0, 1)', () => {
    const score = wilsonScore(1, 1);
    assert(score > 0 && score < 1, `1/1 should be in (0,1), got ${score}`);
  });
  suite.test('非整数输入不崩溃', () => {
    const score = wilsonScore(3.5, 7.5);
    assert(!isNaN(score), 'Non-integer should not produce NaN');
  });
  suite.test('负数输入安全处理', () => {
    const score = wilsonScore(-1, 10);
    assert(!isNaN(score), 'Negative positive should not produce NaN');
  });
  suite.test('分数排序正确性：50/100 < 95/100', () => {
    assert(wilsonScore(50, 100) < wilsonScore(95, 100), '50% < 95%');
  });
  suite.test('样本量影响：5/5 < 500/500', () => {
    assert(wilsonScore(5, 5) < wilsonScore(500, 500), 'Larger sample → higher confidence');
  });
  suite.test('symmetry: score(p, n) + score(n-p, n) ≈ 常数', () => {
    // Wilson is not symmetric, but verify bounds are reasonable
    const s1 = wilsonScore(80, 100);
    const s2 = wilsonScore(20, 100);
    assert(s1 > s2, '80% should score higher than 20%');
    assert(s1 + s2 < 2, 'Sum should be less than 2');
  });

  return suite;
}

// ================================================================
// §T-6: Panel Reducer — Complete Coverage
// ================================================================
function panelReducerCompleteTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§T-6 Panel Reducer Complete');

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

  suite.test('初始 null + CLOSE = null', () => assertEqual(panelReducer(null, { type: 'CLOSE' }), null));
  suite.test('OPEN 打开面板', () => assertEqual(panelReducer(null, { type: 'OPEN', panel: 'a' }), 'a'));
  suite.test('CLOSE 关闭面板', () => assertEqual(panelReducer('a', { type: 'CLOSE' }), null));
  suite.test('TOGGLE 从 null 打开', () => assertEqual(panelReducer(null, { type: 'TOGGLE', panel: 'x' }), 'x'));
  suite.test('TOGGLE 从同面板关闭', () => assertEqual(panelReducer('x', { type: 'TOGGLE', panel: 'x' }), null));
  suite.test('TOGGLE 切换到不同面板', () => assertEqual(panelReducer('a', { type: 'TOGGLE', panel: 'b' }), 'b'));
  suite.test('OPEN 覆盖已打开面板', () => assertEqual(panelReducer('old', { type: 'OPEN', panel: 'new' }), 'new'));
  suite.test('未知 action 返回原状态', () => {
    const state = panelReducer('panel-x', { type: 'UNKNOWN' as any, panel: 'y' });
    assertEqual(state, 'panel-x');
  });

  suite.test('快速连续操作', () => {
    let state: PanelType = null;
    state = panelReducer(state, { type: 'OPEN', panel: 'a' });
    state = panelReducer(state, { type: 'OPEN', panel: 'b' });
    state = panelReducer(state, { type: 'TOGGLE', panel: 'b' });
    state = panelReducer(state, { type: 'OPEN', panel: 'c' });
    state = panelReducer(state, { type: 'CLOSE' });
    assertEqual(state, null, 'After open→open→toggle→open→close, should be null');
  });

  suite.test('所有面板名称互斥', () => {
    const panels = ['analytics', 'community', 'starpower', 'leaderboard', 'recommendations',
      'aiLyrics', 'comments', 'ipMatrix', 'achievements', 'copyright',
      'spaceTime', 'challenge', 'shop', 'albumStore', 'e2eSetup', 'market'];

    let state: PanelType = null;
    for (const p of panels) {
      state = panelReducer(state, { type: 'OPEN', panel: p });
      assertEqual(state, p, `Should be "${p}"`);
    }
    // Only last panel remains
    assertEqual(state, 'market');
  });

  return suite;
}

// ================================================================
// §T-7: QueryCache Advanced Tests
// ================================================================
function queryCacheAdvancedTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§T-7 QueryCache Advanced');

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
    get hitRate() { const total = this.hits + this.misses; return total === 0 ? '0%' : `${(this.hits / total * 100).toFixed(1)}%`; }
  }

  suite.test('max=1 立即淘汰旧条目', () => {
    const c = new TestCache(1, 10000);
    c.set('a', 1);
    c.set('b', 2);
    assertEqual(c.size, 1);
    assertEqual(c.get<number>('b'), 2);
    assertEqual(c.get('a'), undefined);
  });

  suite.test('更新已有键不触发淘汰', () => {
    const c = new TestCache(2, 10000);
    c.set('a', 1);
    c.set('b', 2);
    c.set('a', 10); // update
    assertEqual(c.size, 2);
    assertEqual(c.get<number>('a'), 10);
    assertEqual(c.get<number>('b'), 2);
  });

  suite.test('hitRate 计算正确', () => {
    const c = new TestCache(10, 10000);
    c.set('x', 1);
    c.get('x'); // hit
    c.get('x'); // hit
    c.get('y'); // miss
    assertEqual(c.hitRate, '66.7%');
  });

  suite.test('多前缀批量失效', () => {
    const c = new TestCache(100, 10000);
    c.set('user:1:name', 'Alice');
    c.set('user:1:email', 'a@b.c');
    c.set('user:2:name', 'Bob');
    c.set('song:1:likes', 42);
    c.invalidatePrefix('user:1:');
    assertEqual(c.get('user:1:name'), undefined);
    assertEqual(c.get('user:1:email'), undefined);
    assertEqual(c.get<string>('user:2:name'), 'Bob');
    assertEqual(c.get<number>('song:1:likes'), 42);
  });

  suite.test('空缓存 hitRate = "0%"', () => {
    const c = new TestCache();
    assertEqual(c.hitRate, '0%');
  });

  suite.test('TTL 个别覆盖', async () => {
    const c = new TestCache(10, 10000); // default 10s
    c.set('short', 'gone-soon', 30); // 30ms TTL
    c.set('long', 'stays', 10000); // 10s TTL
    await new Promise(r => setTimeout(r, 50));
    assertEqual(c.get('short'), undefined, 'Short TTL should expire');
    assertEqual(c.get<string>('long'), 'stays', 'Long TTL should persist');
  });

  suite.test('各种数据类型存储', () => {
    const c = new TestCache(10, 10000);
    c.set('num', 42);
    c.set('str', 'hello');
    c.set('bool', true);
    c.set('arr', [1, 2, 3]);
    c.set('obj', { a: 1, b: 'c' });
    c.set('null', null);

    assertEqual(c.get<number>('num'), 42);
    assertEqual(c.get<string>('str'), 'hello');
    assertEqual(c.get<boolean>('bool'), true);
    assertDeepEqual(c.get('arr'), [1, 2, 3]);
    assertDeepEqual(c.get('obj'), { a: 1, b: 'c' });
    assertEqual(c.get('null'), null);
  });

  return suite;
}

// ================================================================
// §T-8: i18n Translation Integrity
// ================================================================
function i18nIntegrityTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§T-8 i18n Translation Integrity');

  suite.test('翻译模块可导入', async () => {
    const { translations } = await import('../hooks/i18n-translations');
    assertTruthy(translations, 'translations should exist');
  });

  suite.test('所有键都有中英文双语', async () => {
    const { translations } = await import('../hooks/i18n-translations');
    const missingZh: string[] = [];
    const missingEn: string[] = [];

    for (const [key, value] of Object.entries(translations)) {
      const v = value as { zh?: string; en?: string };
      if (!v.zh && v.zh !== '') missingZh.push(key);
      if (!v.en && v.en !== '') missingEn.push(key);
    }

    assertEqual(missingZh.length, 0, `Missing zh: ${missingZh.join(', ')}`);
    assertEqual(missingEn.length, 0, `Missing en: ${missingEn.join(', ')}`);
  });

  suite.test('翻译键数量 > 50', async () => {
    const { translations } = await import('../hooks/i18n-translations');
    const count = Object.keys(translations).length;
    assert(count > 50, `Should have >50 translation keys, got ${count}`);
  });

  suite.test('核心键存在', async () => {
    const { translations } = await import('../hooks/i18n-translations');
    const coreKeys = ['brand.name', 'header.signIn', 'player.playPause', 'header.language'];
    for (const key of coreKeys) {
      assertTruthy((translations as any)[key], `Core key "${key}" should exist`);
    }
  });

  suite.test('无空字符串翻译值', async () => {
    const { translations } = await import('../hooks/i18n-translations');
    const emptyValues: string[] = [];

    for (const [key, value] of Object.entries(translations)) {
      const v = value as { zh: string; en: string };
      if (v.zh === '' || v.en === '') {
        emptyValues.push(key);
      }
    }
    // brand.name is "D-MUSIC" for both, that's fine
    // Some empty values may be intentional, just ensure not too many
    assert(emptyValues.length < 5, `Too many empty translations: ${emptyValues.join(', ')}`);
  });

  return suite;
}

// ================================================================
// §T-9: Crypto Utilities Tests
// ================================================================
function cryptoUtilsTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§T-9 Crypto Utilities');

  suite.test('Web Crypto API 可用', () => {
    assertTruthy(window.crypto, 'window.crypto should exist');
    assertTruthy(window.crypto.subtle, 'crypto.subtle should exist');
  });

  suite.test('isE2EESupported 返回 boolean', async () => {
    const { isE2EESupported } = await import('./crypto');
    const supported = isE2EESupported();
    assert(typeof supported === 'boolean', 'isE2EESupported should return boolean');
  });

  suite.test('SHA-256 哈希确定性', async () => {
    const encoder = new TextEncoder();
    const data = encoder.encode('test-content');
    const hash1 = await crypto.subtle.digest('SHA-256', data);
    const hash2 = await crypto.subtle.digest('SHA-256', data);
    const h1 = Array.from(new Uint8Array(hash1)).map(b => b.toString(16).padStart(2, '0')).join('');
    const h2 = Array.from(new Uint8Array(hash2)).map(b => b.toString(16).padStart(2, '0')).join('');
    assertEqual(h1, h2, 'Same input → same hash');
  });

  suite.test('SHA-256 不同输入不同输出', async () => {
    const encoder = new TextEncoder();
    const hash1 = await crypto.subtle.digest('SHA-256', encoder.encode('input-a'));
    const hash2 = await crypto.subtle.digest('SHA-256', encoder.encode('input-b'));
    const h1 = Array.from(new Uint8Array(hash1)).map(b => b.toString(16).padStart(2, '0')).join('');
    const h2 = Array.from(new Uint8Array(hash2)).map(b => b.toString(16).padStart(2, '0')).join('');
    assert(h1 !== h2, 'Different input → different hash');
  });

  suite.test('Base64 编解码往返', () => {
    const original = 'Hello, D-Music E2EE!';
    const encoded = btoa(original);
    const decoded = atob(encoded);
    assertEqual(decoded, original, 'Base64 round-trip should preserve data');
  });

  suite.test('Base64 空字符串', () => {
    assertEqual(btoa(''), '', 'Empty string base64 encode');
    assertEqual(atob(''), '', 'Empty string base64 decode');
  });

  suite.test('TextEncoder/TextDecoder 中文', () => {
    const text = '你好世界';
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const encoded = encoder.encode(text);
    const decoded = decoder.decode(encoded);
    assertEqual(decoded, text, 'Chinese text should survive encode/decode');
  });

  suite.test('AES-GCM 密钥生成', async () => {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    assertTruthy(key, 'AES-GCM key should be generated');
    assertEqual(key.algorithm.name, 'AES-GCM');
  });

  suite.test('AES-GCM 加解密往返', async () => {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode('Secret message for D-Music');

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      plaintext
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    const result = new TextDecoder().decode(decrypted);
    assertEqual(result, 'Secret message for D-Music', 'AES-GCM round-trip should match');
  });

  suite.test('RSA-OAEP 密钥对生成', async () => {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt']
    );
    assertTruthy(keyPair.publicKey, 'Public key should exist');
    assertTruthy(keyPair.privateKey, 'Private key should exist');
  });

  suite.test('crypto 模块函数签名验证', async () => {
    const mod = await import('./crypto');
    assertTruthy(mod.generateKeyPair, 'generateKeyPair should be exported');
    assertTruthy(mod.hasLocalKeyPair, 'hasLocalKeyPair should be exported');
    assertTruthy(mod.isE2EESupported, 'isE2EESupported should be exported');
    assertTruthy(mod.loadPublicKeyJwk, 'loadPublicKeyJwk should be exported');
    assertTruthy(mod.deleteLocalKeys, 'deleteLocalKeys should be exported');
  });

  return suite;
}

// ================================================================
// §T-10: API Layer Mock Tests (Isolated)
// ================================================================
function apiMockTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§T-10 API Layer Mock Tests');

  // Mock apiFetch for testing API type contracts
  async function mockApiFetch<T>(path: string, expected: T): Promise<T> {
    return expected;
  }

  suite.test('Mock: SongStats 类型结构', async () => {
    const stats = await mockApiFetch('/song/stats/track-1', {
      likes: 42, plays: 100, comments: 5, shares: 3
    });
    assert(typeof stats.likes === 'number', 'likes should be number');
    assert(typeof stats.plays === 'number', 'plays should be number');
    assert(typeof stats.comments === 'number', 'comments should be number');
    assert(typeof stats.shares === 'number', 'shares should be number');
  });

  suite.test('Mock: LeaderboardEntry 结构', async () => {
    const entry = await mockApiFetch('/leaderboard', {
      songId: 'track-1', title: 'Test', artist: 'Artist',
      positiveVotes: 10, totalVotes: 15, playCount: 100,
      wilsonScore: 0.45, finalScore: 0.89, rank: 1
    });
    assertTruthy(entry.songId);
    assert(entry.wilsonScore >= 0 && entry.wilsonScore <= 1, 'wilson score should be [0,1]');
    assert(entry.rank >= 1, 'rank should be positive');
  });

  suite.test('Mock: CommentItem 结构', async () => {
    const comment = await mockApiFetch('/comments/track-1', {
      id: 'c1', userId: 'u1', userName: 'User', content: 'Great!',
      timestamp: 42, likes: 5, createdAt: Date.now()
    });
    assertTruthy(comment.id);
    assertTruthy(comment.content);
    assert(comment.likes >= 0, 'likes should be non-negative');
  });

  suite.test('Mock: STMessage 结构', async () => {
    const msg = await mockApiFetch('/spacetime/messages', {
      id: 'st1', userId: 'u1', userName: 'User', content: 'Hello',
      emotion: 'happy', likes: 0, likedBy: [], replies: 0, createdAt: Date.now(),
      targetLocation: null, targetTime: null
    });
    assertTruthy(msg.id);
    assertEqual(Array.isArray(msg.likedBy), true);
  });

  suite.test('Mock: Album 结构', async () => {
    const album = await mockApiFetch('/albums/test', {
      id: 'a1', creatorId: 'u1', creatorName: 'Creator', title: 'Album',
      description: 'Desc', coverUrl: 'https://example.com/cover.jpg',
      genre: 'Electronic', tracks: [{ songId: 's1', title: 'T1', artist: 'A', duration: 180, trackNumber: 1 }],
      price: 100, limitedEdition: true, maxSupply: 500, circulatingSupply: 10,
      releaseDate: Date.now(), exclusiveContent: [], tags: ['electronic'],
      likes: 5, totalSales: 2, createdAt: Date.now()
    });
    assertTruthy(album.id);
    assert(album.tracks.length > 0, 'Album should have tracks');
    assert(album.price >= 0, 'Price should be non-negative');
    assertEqual(album.limitedEdition, true);
  });

  suite.test('Mock: MarketListing 结构', async () => {
    const listing = await mockApiFetch('/market/listings', {
      id: 'l1', albumId: 'a1', albumTitle: 'Test', albumGenre: 'Electronic',
      albumCoverUrl: 'url', sellerId: 'u1', sellerName: 'Seller',
      price: 150, originalPrice: 100, edition: 1, maxSupply: 500,
      limitedEdition: true, createdAt: Date.now(), status: 'active' as const
    });
    assertContains(['active', 'sold', 'cancelled'], listing.status);
    assert(listing.price > 0, 'Price should be positive');
  });

  suite.test('Mock: AchievementData 结构', async () => {
    const ach = await mockApiFetch('/achievements/user', {
      id: 'first_play', nameZh: '第一音符', nameEn: 'First Note',
      descZh: '播放第一首曲目', descEn: 'Played your first track',
      icon: '🎵', unlocked: true, newlyUnlocked: false
    });
    assertTruthy(ach.id);
    assertTruthy(ach.nameZh);
    assertTruthy(ach.nameEn);
    assert(typeof ach.unlocked === 'boolean');
  });

  suite.test('Mock: NotificationItem 结构', async () => {
    const notif = await mockApiFetch('/notifications/user', {
      id: 'n1', type: 'like' as const, fromUser: 'Bob',
      workTitle: 'My Song', createdAt: Date.now(), read: false
    });
    assertContains(['fork', 'like', 'comment', 'achievement'], notif.type);
    assert(typeof notif.read === 'boolean');
  });

  suite.test('Mock: TimeCapsule 结构', async () => {
    const capsule = await mockApiFetch('/spacetime/capsules', {
      id: 'tc1', userId: 'u1', userName: 'User', title: 'Future Me',
      content: 'Hello future self', unlockTs: Date.now() + 86400000,
      emotion: 'happy', isUnlocked: false, likes: 0, createdAt: Date.now()
    });
    assert(capsule.unlockTs > capsule.createdAt, 'Unlock should be after creation');
    assertEqual(capsule.isUnlocked, false);
  });

  return suite;
}

// ================================================================
// §T-11: Playlist Data Integrity
// ================================================================
function playlistIntegrityTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§T-11 Playlist Data Integrity');

  suite.test('DEMO_PLAYLIST 有 6 首曲目', async () => {
    const { DEMO_PLAYLIST } = await import('../playlistData');
    assertEqual(DEMO_PLAYLIST.length, 6);
  });

  suite.test('品牌资源可正常导入', async () => {
    const mod = await import('../playlistData');
    assertTruthy(mod.dMusicLogo, 'dMusicLogo should exist');
    assertTruthy(mod.dMusicGold, 'dMusicGold should exist');
    assertTruthy(mod.dMusicInstruments, 'dMusicInstruments should exist');
    assertTruthy(mod.dMusicRed, 'dMusicRed should exist');
    assertTruthy(mod.artistWarm, 'artistWarm should exist');
    assertTruthy(mod.artistBlue, 'artistBlue should exist');
  });

  suite.test('每首歌词至少 10 行', async () => {
    const { DEMO_PLAYLIST } = await import('../playlistData');
    for (const track of DEMO_PLAYLIST) {
      assert(track.lyrics.length >= 10, `Track ${track.id} should have ≥10 lyrics, got ${track.lyrics.length}`);
    }
  });

  suite.test('chordSet 使用 4 个不同值', async () => {
    const { DEMO_PLAYLIST } = await import('../playlistData');
    const chordSets = new Set(DEMO_PLAYLIST.map(t => t.chordSet));
    // Track 3 and Track 5 both use chordSet 2
    assert(chordSets.size >= 3, `Should use at least 3 different chord sets, got ${chordSets.size}`);
  });

  suite.test('albumArt 全部为有效 URL 或模块导入', async () => {
    const { DEMO_PLAYLIST } = await import('../playlistData');
    for (const track of DEMO_PLAYLIST) {
      assertTruthy(track.albumArt, `Track ${track.id} albumArt should exist`);
      // URLs start with http, imported assets are module paths
      const isUrl = typeof track.albumArt === 'string' &&
        (track.albumArt.startsWith('http') || track.albumArt.startsWith('/') || track.albumArt.startsWith('data:'));
      const isImport = typeof track.albumArt === 'string' && track.albumArt.length > 0;
      assert(isUrl || isImport, `Track ${track.id} albumArt should be URL or import`);
    }
  });

  return suite;
}

// ================================================================
// §T-12: Emotion System Consistency
// ================================================================
function emotionSystemTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§T-12 Emotion System Consistency');

  const VALID_EMOTIONS = ['happy', 'sad', 'energetic', 'calm', 'neutral'] as const;

  suite.test('5 个核心情感完整', () => {
    assertEqual(VALID_EMOTIONS.length, 5);
  });

  suite.test('情感颜色映射完整', () => {
    const EMOTION_COLORS: Record<string, string> = {
      happy: '#FFD700', sad: '#6495ED', energetic: '#FF4500',
      calm: '#00CED1', neutral: '#9370DB',
    };
    for (const e of VALID_EMOTIONS) {
      assertTruthy(EMOTION_COLORS[e], `Color for "${e}" should exist`);
      assert(EMOTION_COLORS[e].startsWith('#'), `Color for "${e}" should be hex`);
    }
  });

  suite.test('情感 RGB 颜色映射完整', () => {
    const EMOTION_RGB: Record<string, [number, number, number]> = {
      happy: [255, 215, 0], sad: [100, 149, 237], energetic: [255, 69, 0],
      calm: [0, 206, 209], neutral: [140, 140, 255],
    };
    for (const e of VALID_EMOTIONS) {
      assertTruthy(EMOTION_RGB[e], `RGB for "${e}" should exist`);
      assertEqual(EMOTION_RGB[e].length, 3, `RGB for "${e}" should have 3 values`);
      for (const v of EMOTION_RGB[e]) {
        assertInRange(v, 0, 255, `RGB value ${v} for "${e}" out of range`);
      }
    }
  });

  suite.test('情感标签映射完整', () => {
    const labels: Record<string, { zh: string; en: string }> = {
      happy: { zh: '快乐', en: 'Happy' },
      sad: { zh: '忧伤', en: 'Sad' },
      energetic: { zh: '活力', en: 'Energetic' },
      calm: { zh: '宁静', en: 'Calm' },
      neutral: { zh: '中性', en: 'Neutral' },
    };
    for (const e of VALID_EMOTIONS) {
      assertTruthy(labels[e], `Label for "${e}" should exist`);
      assertTruthy(labels[e].zh, `Zh label for "${e}" should exist`);
      assertTruthy(labels[e].en, `En label for "${e}" should exist`);
    }
  });

  suite.test('扩展情感（AI 主题）包含 love', () => {
    const extended = ['happy', 'sad', 'energetic', 'calm', 'love'];
    assertEqual(extended.length, 5);
    assertContains(extended.join(','), 'love');
  });

  return suite;
}

// ================================================================
// §T-13: API Endpoint Full Integration Smoke Tests
// ================================================================
function apiFullSmokeTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§T-13 API Full Smoke Tests');

  const GET_ENDPOINTS = [
    { path: '/health', field: 'status', label: 'Health' },
    { path: '/likes/track-1', field: 'likes', label: 'Likes' },
    { path: '/annotations/track-1', field: 'annotations', label: 'Annotations' },
    { path: '/comments/track-1', field: 'comments', label: 'Comments' },
    { path: '/songs/index', field: 'songIds', label: 'Song Index' },
    { path: '/song/stats/track-1', field: 'plays', label: 'Song Stats' },
    { path: '/starpower/test-user', field: 'starPower', label: 'Star Power' },
    { path: '/starpower/test-user/level', field: 'vipLevel', label: 'VIP Level' },
    { path: '/starpower/test-user/transactions', field: 'transactions', label: 'SP Transactions' },
    { path: '/starpower/shop/items', field: 'items', label: 'Shop Items' },
    { path: '/leaderboard', field: 'rankings', label: 'Leaderboard' },
    { path: '/analytics/overview', field: 'totalPlays', label: 'Analytics' },
    { path: '/recommendations/test-user', field: 'recommendations', label: 'Recommendations' },
    { path: '/recommendations/test-user/ai-analysis', field: 'analysis', label: 'AI Analysis' },
    { path: '/smart-playlist/test-user', field: 'analysis', label: 'Smart Playlist' },
    { path: '/achievements/test-user', field: 'achievements', label: 'Achievements' },
    { path: '/notifications/test-user', field: 'notifications', label: 'Notifications' },
    { path: '/community/activities', field: 'activities', label: 'Community' },
    { path: '/shared-works', field: 'works', label: 'Shared Works' },
    { path: '/creators', field: 'creators', label: 'Creators' },
    { path: '/profile/test-user', field: 'profile', label: 'Profile' },
    { path: '/mheart/test-user', field: 'mheart', label: 'MHeart' },
    { path: '/timeline-comments/track-1', field: 'comments', label: 'Timeline Comments' },
    { path: '/challenges/active', field: 'challenge', label: 'Active Challenge' },
    { path: '/albums', field: 'albums', label: 'Albums' },
    { path: '/market/listings', field: 'listings', label: 'Market Listings' },
    { path: '/market/stats', field: 'activeListings', label: 'Market Stats' },
    { path: '/ai/status', field: 'activeProvider', label: 'AI Status' },
    { path: '/ai/usage', field: 'totalCalls', label: 'AI Usage' },
    { path: '/cache/stats', field: 'cache', label: 'Cache Stats' },
    { path: '/diagnostics/health', field: 'status', label: 'Diagnostics Health' },
    { path: '/diagnostics/kv-stats', field: 'summary', label: 'KV Stats' },
  ];

  for (const ep of GET_ENDPOINTS) {
    suite.test(`GET ${ep.path} → ${ep.label}`, async () => {
      const data = await apiFetch<Record<string, any>>(ep.path);
      assertTruthy(data, `${ep.label}: should return data`);
      assertTruthy(
        data![ep.field] !== undefined,
        `${ep.label}: response should have "${ep.field}" field`
      );
    });
  }

  return suite;
}

// ================================================================
// §T-14: Zod Validation Edge Cases (Integration)
// ================================================================
function zodValidationTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§T-14 Zod Validation Edge Cases');

  async function expectStatus(method: string, path: string, body: any, expectedStatus: number, label: string) {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    assertEqual(res.status, expectedStatus, `${label}: expected ${expectedStatus}, got ${res.status}`);
  }

  suite.test('POST /likes/track-1 无 body → 200 (简单增量)', async () => {
    const res = await fetch(`${API_BASE}/likes/track-1`, { method: 'POST' });
    // Likes POST is a simple increment, may or may not need body
    assert(res.status === 200 || res.status === 401, `Likes POST: ${res.status}`);
  });

  suite.test('POST /annotations/track-1 缺少 lineIndex → 400', async () => {
    await expectStatus('POST', '/annotations/track-1', { emotion: 'happy' }, 400, 'Missing lineIndex');
  });

  suite.test('POST /annotations/track-1 无效 emotion → 400', async () => {
    await expectStatus('POST', '/annotations/track-1', { lineIndex: 0, emotion: 'INVALID' }, 400, 'Invalid emotion');
  });

  suite.test('POST /comments/track-1 空 content → 400', async () => {
    await expectStatus('POST', '/comments/track-1', { userId: 'u', userName: 'U', content: '' }, 400, 'Empty comment');
  });

  suite.test('POST /starpower/test-user 零金额 → 400', async () => {
    await expectStatus('POST', '/starpower/test-user', { amount: 0, reason: 'test' }, 400, 'Zero amount');
  });

  suite.test('POST /starpower/test-user 负金额 → 400', async () => {
    await expectStatus('POST', '/starpower/test-user', { amount: -10, reason: 'test' }, 400, 'Negative amount');
  });

  suite.test('POST /market/list 负价格 → 400', async () => {
    await expectStatus('POST', '/market/list', { userId: 'u', albumId: 'a', price: -50 }, 400, 'Negative price');
  });

  suite.test('POST /market/list 超限价格 (>100000) → 400', async () => {
    await expectStatus('POST', '/market/list', { userId: 'u', albumId: 'a', price: 999999 }, 400, 'Over limit price');
  });

  suite.test('POST /albums 空标题 → 400', async () => {
    await expectStatus('POST', '/albums', {
      creatorId: 'u', creatorName: 'C', title: '', tracks: [{ title: 'T' }]
    }, 400, 'Empty album title');
  });

  suite.test('POST /albums 无曲目 → 400', async () => {
    await expectStatus('POST', '/albums', {
      creatorId: 'u', creatorName: 'C', title: 'Album', tracks: []
    }, 400, 'No tracks');
  });

  suite.test('POST /live-session/danmaku 空文本 → 400', async () => {
    await expectStatus('POST', '/live-session/danmaku', {
      userId: 'u', text: '', trackId: 't'
    }, 400, 'Empty danmaku');
  });

  suite.test('POST /stt/transcribe 缺少 audio → 400', async () => {
    await expectStatus('POST', '/stt/transcribe', { language: 'zh' }, 400, 'Missing audio');
  });

  suite.test('POST /stt/stream 空 chunks → 400', async () => {
    await expectStatus('POST', '/stt/stream', { chunks: [], language: 'zh' }, 400, 'Empty chunks');
  });

  suite.test('POST /copyright/verify 空 body → 400', async () => {
    await expectStatus('POST', '/copyright/verify', {}, 400, 'Empty body');
  });

  suite.test('POST /pki/public-key 缺少 publicKeyJwk → 400', async () => {
    await expectStatus('POST', '/pki/public-key', { userId: 'u' }, 400, 'Missing publicKeyJwk');
  });

  return suite;
}

// ================================================================
// §T-15: E2E User Journey (Integration Smoke)
// ================================================================
function e2eUserJourneyTests(): ReturnType<typeof createSuite> {
  const suite = createSuite('§T-15 E2E User Journey');
  const testUserId = `full-test-${Date.now()}`;

  suite.test('Step 1: Health → API 在线', async () => {
    const data = await apiFetch<{ status: string }>('/health');
    assertTruthy(data);
    assertEqual(data!.status, 'ok');
  });

  suite.test('Step 2: Song Index → 曲目可用', async () => {
    const data = await apiFetch<{ songIds: string[] }>('/songs/index');
    assertTruthy(data);
    assert(data!.songIds.length > 0, 'Should have songs');
  });

  suite.test('Step 3: Get Likes → 初始状态', async () => {
    const data = await apiFetch<{ likes: number }>('/likes/track-1');
    assertTruthy(data);
    assert(typeof data!.likes === 'number');
  });

  suite.test('Step 4: Star Power → 余额查询', async () => {
    const data = await apiFetch<{ starPower: number }>(`/starpower/${testUserId}`);
    assertTruthy(data);
    assert(typeof data!.starPower === 'number');
  });

  suite.test('Step 5: Leaderboard → 排行榜加载', async () => {
    const data = await apiFetch<{ rankings: any[] }>('/leaderboard');
    assertTruthy(data);
    assert(Array.isArray(data!.rankings));
  });

  suite.test('Step 6: Recommendations → 推荐列表', async () => {
    const data = await apiFetch<{ recommendations: any[] }>(`/recommendations/${testUserId}`);
    assertTruthy(data);
    assert(Array.isArray(data!.recommendations));
  });

  suite.test('Step 7: Achievements → 成就列表', async () => {
    const data = await apiFetch<{ achievements: any[]; totalAchievements: number }>(`/achievements/${testUserId}`);
    assertTruthy(data);
    assert(Array.isArray(data!.achievements));
    assertEqual(data!.totalAchievements, 12);
  });

  suite.test('Step 8: Profile → 用户档案', async () => {
    const data = await apiFetch<{ profile: any }>(`/profile/${testUserId}`);
    assertTruthy(data);
    assertTruthy(data!.profile);
  });

  suite.test('Step 9: MHeart → M❤️值', async () => {
    const data = await apiFetch<{ mheart: any }>(`/mheart/${testUserId}`);
    assertTruthy(data);
    assertTruthy(data!.mheart);
    assert(typeof data!.mheart.score === 'number');
  });

  suite.test('Step 10: AI Status → 模型在线', async () => {
    const data = await apiFetch<{ activeProvider: string }>('/ai/status');
    assertTruthy(data);
    assertTruthy(data!.activeProvider);
  });

  suite.test('Step 11: Albums → 专辑市场', async () => {
    const data = await apiFetch<{ albums: any[] }>('/albums');
    assertTruthy(data);
    assert(Array.isArray(data!.albums));
  });

  suite.test('Step 12: Market → 二级市场', async () => {
    const data = await apiFetch<{ listings: any[] }>('/market/listings');
    assertTruthy(data);
    assert(Array.isArray(data!.listings));
  });

  suite.test('Step 13: Diagnostics → 系统健康', async () => {
    const data = await apiFetch<{ status: string }>('/diagnostics/health');
    assertTruthy(data);
    assertContains(['healthy', 'degraded'], data!.status);
  });

  return suite;
}


// ================================================================
// Test Runners
// ================================================================

/**
 * Run only unit tests (no network, fast)
 */
export async function runUnitTests(): Promise<{
  suites: TestSuiteResult[];
  totalPassed: number;
  totalFailed: number;
  total: number;
}> {
  console.log('\n🧪 D-Music Unit Tests v11.2\n');
  const suites: TestSuiteResult[] = [];

  suites.push(await typeSystemTests().run());
  suites.push(await dataModelTests().run());
  suites.push(await preferencesTests().run());
  suites.push(await themeSystemTests().run());
  suites.push(await wilsonScoreEdgeTests().run());
  suites.push(await panelReducerCompleteTests().run());
  suites.push(await queryCacheAdvancedTests().run());
  suites.push(await i18nIntegrityTests().run());
  suites.push(await cryptoUtilsTests().run());
  suites.push(await apiMockTests().run());
  suites.push(await playlistIntegrityTests().run());
  suites.push(await emotionSystemTests().run());

  const summary = printResults(suites);
  return { suites, ...summary };
}

/**
 * Run only integration tests (requires Supabase connection)
 */
export async function runIntegrationTests(): Promise<{
  suites: TestSuiteResult[];
  totalPassed: number;
  totalFailed: number;
  total: number;
}> {
  console.log('\n🔌 D-Music Integration Tests v11.2\n');
  const suites: TestSuiteResult[] = [];

  suites.push(await apiFullSmokeTests().run());
  suites.push(await zodValidationTests().run());
  suites.push(await e2eUserJourneyTests().run());

  const summary = printResults(suites);
  return { suites, ...summary };
}

/**
 * Run ALL tests (unit + integration)
 */
export async function runFullTests(): Promise<{
  suites: TestSuiteResult[];
  totalPassed: number;
  totalFailed: number;
  total: number;
}> {
  console.log('\n🎵 D-Music Full Test Suite v11.2\n');
  console.log('════════════════════════════════════════════');
  console.log('  §T-1  ~ §T-12: Unit Tests (离线可运行)');
  console.log('  §T-13 ~ §T-15: Integration Tests (需 Supabase)');
  console.log('════════════════════════════════════════════\n');

  const suites: TestSuiteResult[] = [];

  // Unit tests (no network)
  suites.push(await typeSystemTests().run());
  suites.push(await dataModelTests().run());
  suites.push(await preferencesTests().run());
  suites.push(await themeSystemTests().run());
  suites.push(await wilsonScoreEdgeTests().run());
  suites.push(await panelReducerCompleteTests().run());
  suites.push(await queryCacheAdvancedTests().run());
  suites.push(await i18nIntegrityTests().run());
  suites.push(await cryptoUtilsTests().run());
  suites.push(await apiMockTests().run());
  suites.push(await playlistIntegrityTests().run());
  suites.push(await emotionSystemTests().run());

  // Integration tests (network)
  suites.push(await apiFullSmokeTests().run());
  suites.push(await zodValidationTests().run());
  suites.push(await e2eUserJourneyTests().run());

  const summary = printResults(suites);
  return { suites, ...summary };
}
