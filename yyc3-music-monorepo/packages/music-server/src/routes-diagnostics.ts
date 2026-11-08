/**
 * D-Music — Diagnostics Routes
 * KV 数据库统计端点，用于数据资产盘点和健康检查
 *
 * Routes:
 *   GET /diagnostics/kv-stats   — KV 表行数统计（按前缀分组）
 *   GET /diagnostics/health     — 系统健康检查（含缓存、Auth、Storage 状态）
 */

import { ROUTE_PREFIX, kv, queryCache, requireAuth, createAdminClient } from "./server-utils.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// KV prefix groups for statistics
const KV_PREFIX_GROUPS = [
  { prefix: 'user:', label: '用户数据', labelEn: 'User Data' },
  { prefix: 'prefs:', label: '用户偏好', labelEn: 'Preferences' },
  { prefix: 'profile:', label: '用户档案', labelEn: 'Profiles' },
  { prefix: 'song:', label: '歌曲数据', labelEn: 'Song Data' },
  { prefix: 'analytics:', label: '分析数据', labelEn: 'Analytics' },
  { prefix: 'shared-work:', label: '共享作品', labelEn: 'Shared Works' },
  { prefix: 'shared-work-index', label: '作品索引', labelEn: 'Work Index' },
  { prefix: 'community:', label: '社区动态', labelEn: 'Community' },
  { prefix: 'like-dedup:', label: '点赞去重', labelEn: 'Like Dedup' },
  { prefix: 'fork-chain:', label: '分支链', labelEn: 'Fork Chains' },
  { prefix: 'copyright:', label: '版权认证', labelEn: 'Copyright' },
  { prefix: 'notifications:', label: '通知', labelEn: 'Notifications' },
  { prefix: 'spacetime:', label: '时空喊话', labelEn: 'SpaceTime' },
  { prefix: 'challenges:', label: '挑战赛', labelEn: 'Challenges' },
  { prefix: 'challenge-vote:', label: '投票去重', labelEn: 'Vote Dedup' },
  { prefix: 'challenge-notifications:', label: '赛事通知', labelEn: 'Challenge Notifs' },
  { prefix: 'live-session:', label: '实时互动', labelEn: 'Live Sessions' },
  { prefix: 'timeline-comments:', label: '时间轴弹幕', labelEn: 'Timeline Comments' },
  { prefix: 'achievements:', label: '成就统计', labelEn: 'Achievements' },
  { prefix: 'mheart:', label: 'M Heart 值', labelEn: 'M Heart' },
  { prefix: 'mheart-trend:', label: 'M Heart 趋势', labelEn: 'M Heart Trend' },
  { prefix: 'album:', label: '数字专辑', labelEn: 'Albums' },
  { prefix: 'album-index', label: '专辑索引', labelEn: 'Album Index' },
  { prefix: 'market:', label: '二级市场', labelEn: 'Market' },
  { prefix: 'pki:', label: 'PKI/E2EE', labelEn: 'PKI/E2EE' },
  { prefix: 'song-index', label: '歌曲索引', labelEn: 'Song Index' },
  { prefix: 'system:', label: '系统键', labelEn: 'System' },
  { prefix: 'work:', label: '作品树', labelEn: 'Work Tree' },
];

export function registerDiagnosticsRoutes(app: any) {

  // ---- GET /diagnostics/kv-stats — KV 表行数统计 ----
  app.get(`${ROUTE_PREFIX}/diagnostics/kv-stats`, async (c: any) => {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );

      // 1. Total row count
      const { count: totalRows, error: countError } = await supabase
        .from('kv_store_f626b673')
        .select('key', { count: 'exact', head: true });

      if (countError) {
        console.log(`[Diagnostics] Count error: ${countError.message}`);
        return c.json({ error: `Failed to count rows: ${countError.message}` }, 500);
      }

      // 2. Fetch all keys (for prefix grouping)
      const { data: allKeys, error: keysError } = await supabase
        .from('kv_store_f626b673')
        .select('key');

      if (keysError) {
        console.log(`[Diagnostics] Keys error: ${keysError.message}`);
        return c.json({ error: `Failed to fetch keys: ${keysError.message}` }, 500);
      }

      const keys: string[] = allKeys?.map((r: any) => r.key) || [];

      // 3. Group by prefix
      const prefixStats: Array<{
        prefix: string;
        label: string;
        labelEn: string;
        count: number;
        sampleKeys: string[];
      }> = [];

      const matchedKeys = new Set<string>();

      for (const group of KV_PREFIX_GROUPS) {
        const matching = keys.filter(k => k.startsWith(group.prefix));
        matching.forEach(k => matchedKeys.add(k));
        prefixStats.push({
          prefix: group.prefix,
          label: group.label,
          labelEn: group.labelEn,
          count: matching.length,
          sampleKeys: matching.slice(0, 5),
        });
      }

      // 4. Uncategorized keys
      const uncategorized = keys.filter(k => !matchedKeys.has(k));

      // 5. Domain aggregation
      const domainStats = {
        userDomain: 0,
        songDomain: 0,
        socialDomain: 0,
        spacetimeDomain: 0,
        economyDomain: 0,
        systemDomain: 0,
      };

      for (const k of keys) {
        if (k.startsWith('user:') || k.startsWith('prefs:') || k.startsWith('profile:')) {
          domainStats.userDomain++;
        } else if (k.startsWith('song:') || k.startsWith('analytics:') || k.startsWith('song-index')) {
          domainStats.songDomain++;
        } else if (k.startsWith('shared-work') || k.startsWith('community:') || k.startsWith('fork-chain:') ||
                   k.startsWith('copyright:') || k.startsWith('notifications:') || k.startsWith('like-dedup:') ||
                   k.startsWith('achievements:') || k.startsWith('timeline-comments:') || k.startsWith('mheart') ||
                   k.startsWith('work:') || k.startsWith('challenges:') || k.startsWith('challenge-')) {
          domainStats.socialDomain++;
        } else if (k.startsWith('spacetime:') || k.startsWith('live-session:')) {
          domainStats.spacetimeDomain++;
        } else if (k.startsWith('album:') || k.startsWith('album-index') || k.startsWith('market:')) {
          domainStats.economyDomain++;
        } else {
          domainStats.systemDomain++;
        }
      }

      // 6. Estimate storage size (rough: avg key ~40 bytes + avg value ~500 bytes)
      const estimatedSizeKB = Math.round(keys.length * 0.54); // ~540 bytes per row average

      const result = {
        summary: {
          totalRows: totalRows || keys.length,
          totalPrefixGroups: KV_PREFIX_GROUPS.length,
          uncategorizedCount: uncategorized.length,
          estimatedSizeKB,
          estimatedSizeMB: Math.round(estimatedSizeKB / 1024 * 100) / 100,
          queriedAt: new Date().toISOString(),
        },
        domainStats,
        prefixStats: prefixStats.filter(p => p.count > 0).sort((a, b) => b.count - a.count),
        emptyPrefixes: prefixStats.filter(p => p.count === 0).map(p => p.prefix),
        uncategorizedKeys: uncategorized.slice(0, 20),
        cacheStats: queryCache.stats(),
      };

      console.log(`[Diagnostics] KV stats: ${result.summary.totalRows} total rows, ${result.prefixStats.length} active prefix groups`);
      return c.json(result);
    } catch (error) {
      console.log(`[Diagnostics] KV stats error:`, error);
      return c.json({ error: `Diagnostics failed: ${error}` }, 500);
    }
  });

  // ---- GET /diagnostics/health — System health check ----
  app.get(`${ROUTE_PREFIX}/diagnostics/health`, async (c: any) => {
    const checks: Record<string, { status: string; latencyMs?: number; detail?: string }> = {};

    // 1. KV Store connectivity
    const kvStart = Date.now();
    try {
      await kv.get('__health_check__');
      checks.kvStore = { status: 'ok', latencyMs: Date.now() - kvStart };
    } catch (e) {
      checks.kvStore = { status: 'error', latencyMs: Date.now() - kvStart, detail: String(e) };
    }

    // 2. Auth service
    const authStart = Date.now();
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { error } = await supabase.auth.getSession();
      checks.auth = { status: error ? 'degraded' : 'ok', latencyMs: Date.now() - authStart };
    } catch (e) {
      checks.auth = { status: 'error', latencyMs: Date.now() - authStart, detail: String(e) };
    }

    // 3. Storage service
    const storageStart = Date.now();
    try {
      const adminClient = createAdminClient();
      const { data: buckets, error } = await adminClient.storage.listBuckets();
      checks.storage = {
        status: error ? 'degraded' : 'ok',
        latencyMs: Date.now() - storageStart,
        detail: `${buckets?.length || 0} bucket(s)`,
      };
    } catch (e) {
      checks.storage = { status: 'error', latencyMs: Date.now() - storageStart, detail: String(e) };
    }

    // 4. Query Cache
    checks.queryCache = { status: 'ok', detail: JSON.stringify(queryCache.stats()) };

    // 5. OpenAI key presence
    checks.openAI = {
      status: Deno.env.get('OPENAI_API_KEY') ? 'configured' : 'missing',
    };

    const allOk = Object.values(checks).every(c => c.status === 'ok' || c.status === 'configured');

    return c.json({
      status: allOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
      environment: {
        supabaseUrl: Deno.env.get('SUPABASE_URL') ? 'configured' : 'missing',
        serviceRoleKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'configured' : 'missing',
        anonKey: Deno.env.get('SUPABASE_ANON_KEY') ? 'configured' : 'missing',
        dbUrl: Deno.env.get('SUPABASE_DB_URL') ? 'configured' : 'missing',
        openAiKey: Deno.env.get('OPENAI_API_KEY') ? 'configured' : 'missing',
      },
      routeModules: 15,
      version: 'v11.1+',
    });
  });
}