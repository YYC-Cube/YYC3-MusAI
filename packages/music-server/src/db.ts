// ==========================================
// P1b · 关系表数据层 — pg 驱动（Deno 运行时，musai schema）
//
// 读写策略（逐域迁移，user 域先行）：
//   - 读：优先查询关系表（pg），命中返回；未命中或 PG 不可用回退 KV（legacy）
//   - 写：双写 KV + PG，PG 侧尽力而为（失败仅告警，不阻断主流程）
//   - 路由层无需感知驱动差异
//
// 连接串：PG_* 环境变量（与 kv_store_pg.ts 一致），默认本机 PG15:5433 yyc3_music musai schema
// ==========================================

import pg from "npm:pg@8.13.1";

const { Pool } = pg as any;

let _pool: any = null;

function getPool() {
  if (!_pool) {
    _pool = new Pool({
      host: Deno.env.get("PG_HOST") ?? "localhost",
      port: Number(Deno.env.get("PG_PORT") ?? "5433"),
      user: Deno.env.get("PG_USER") ?? "musai_app_rw",
      password: Deno.env.get("PG_PASSWORD") ?? "",
      database: Deno.env.get("PG_DATABASE") ?? "yyc3_music",
      max: 10,
      connectionTimeoutMillis: 3000,
    });
  }
  return _pool;
}

/**
 * 安全执行：PG 不可用（未部署 / 无凭证 / 网络异常）时返回 fallback，
 * 保证关系表未就绪阶段仍可由 KV 提供服务。
 */
async function safeQuery<T>(label: string, fallback: T, fn: (client: any) => Promise<T>): Promise<T> {
  let client: any = null;
  try {
    client = await getPool().connect();
    return await fn(client);
  } catch (error) {
    console.log(`[DB] ${label} skipped: ${error instanceof Error ? error.message : error}`);
    return fallback;
  } finally {
    client?.release();
  }
}

/** 安全写入：失败仅告警，不影响 KV 主链路 */
async function safeExec(label: string, fn: (client: any) => Promise<void>): Promise<void> {
  let client: any = null;
  try {
    client = await getPool().connect();
    await fn(client);
  } catch (error) {
    console.log(`[DB] ${label} skipped: ${error instanceof Error ? error.message : error}`);
  } finally {
    client?.release();
  }
}

// ==========================================
// User 域查询（映射 musai 现有关系表，不重复建表）
// ==========================================

/** 查询用户基础信息（含 role / nickname / avatar / email） */
export async function getUserProfile(userId: string): Promise<any> {
  return await safeQuery("getUserProfile", null, async (client) => {
    const res = await client.query(
      `SELECT id, username, email, nickname, avatar, role, status, created_at
       FROM musai.users WHERE id = $1`,
      [userId],
    );
    return res.rows[0] || null;
  });
}

/** 查询用户星力 */
export async function getUserStarPower(userId: string): Promise<any> {
  return await safeQuery("getUserStarPower", null, async (client) => {
    const res = await client.query(
      `SELECT total_star_power, available_star_power, frozen_star_power,
              vip_level, mheart_value, daily_checkin_streak
       FROM musai.user_star_power WHERE user_id = $1`,
      [userId],
    );
    return res.rows[0] || null;
  });
}

/** 查询用户偏好 */
export async function getUserPreferences(userId: string): Promise<any> {
  return await safeQuery("getUserPreferences", null, async (client) => {
    const res = await client.query(
      `SELECT language, theme, autoplay, default_quality, download_quality,
              notification_enabled, email_notification, private_profile, show_play_history
       FROM musai.user_preferences WHERE user_id = $1`,
      [userId],
    );
    return res.rows[0] || null;
  });
}

/** 查询用户已解锁主题列表 */
export async function getUserUnlockedThemes(userId: string): Promise<string[]> {
  return await safeQuery<string[]>("getUserUnlockedThemes", [], async (client) => {
    const res = await client.query(
      `SELECT theme_id FROM musai.user_unlocked_themes WHERE user_id = $1 ORDER BY unlocked_at`,
      [userId],
    );
    return res.rows.map((r: any) => r.theme_id);
  });
}

// ==========================================
// User 域写入（双写 KV + PG）
// ==========================================

/** 写入/更新用户基础信息 */
export async function upsertUserProfile(
  userId: string,
  data: {
    email?: string;
    nickname?: string;
    avatar?: string;
    role?: string;
  },
): Promise<void> {
  await safeExec("upsertUserProfile", async (client) => {
    const fields: string[] = [];
    const values: any[] = [userId];
    let idx = 2;
    if (data.email !== undefined) { fields.push(`email = $${idx++}`); values.push(data.email); }
    if (data.nickname !== undefined) { fields.push(`nickname = $${idx++}`); values.push(data.nickname); }
    if (data.avatar !== undefined) { fields.push(`avatar = $${idx++}`); values.push(data.avatar); }
    if (data.role !== undefined) { fields.push(`role = $${idx++}`); values.push(data.role); }
    if (fields.length === 0) return;
    fields.push(`updated_at = now()`);
    await client.query(
      `INSERT INTO musai.users (id, username, email, role, created_at, updated_at)
       VALUES ($1, $1, $2, 'user', now(), now())
       ON CONFLICT (id) DO UPDATE SET ${fields.join(", ")}`,
      values,
    );
  });
}

/** 写入/更新用户星力 */
export async function upsertUserStarPower(
  userId: string,
  totalStarPower: number,
): Promise<void> {
  await safeExec("upsertUserStarPower", async (client) => {
    await client.query(
      `INSERT INTO musai.user_star_power (user_id, total_star_power, available_star_power)
       VALUES ($1, $2, $2)
       ON CONFLICT (user_id) DO UPDATE SET total_star_power = $2, available_star_power = $2, updated_at = now()`,
      [userId, totalStarPower],
    );
  });
}

/** 写入/更新用户偏好 */
export async function upsertUserPreferences(
  userId: string,
  prefs: Record<string, any>,
): Promise<void> {
  await safeExec("upsertUserPreferences", async (client) => {
    await client.query(
      `INSERT INTO musai.user_preferences (user_id, language, theme, autoplay, default_quality, download_quality,
               notification_enabled, email_notification, private_profile, show_play_history)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (user_id) DO UPDATE SET
         language = EXCLUDED.language,
         theme = EXCLUDED.theme,
         autoplay = EXCLUDED.autoplay,
         default_quality = EXCLUDED.default_quality,
         download_quality = EXCLUDED.download_quality,
         notification_enabled = EXCLUDED.notification_enabled,
         email_notification = EXCLUDED.email_notification,
         private_profile = EXCLUDED.private_profile,
         show_play_history = EXCLUDED.show_play_history,
         updated_at = now()`,
      [
        userId,
        prefs.language ?? prefs.lang ?? 'zh-CN',
        prefs.theme ?? prefs.mode ?? 'cosmic',
        prefs.autoplay ?? prefs.shuffleEnabled ?? true,
        prefs.defaultQuality ?? 'high',
        prefs.downloadQuality ?? 'high',
        prefs.notificationEnabled ?? true,
        prefs.emailNotification ?? true,
        prefs.privateProfile ?? false,
        prefs.showPlayHistory ?? true,
      ],
    );
  });
}

/** 添加用户已解锁主题 */
export async function addUserUnlockedTheme(userId: string, themeId: string): Promise<void> {
  await safeExec("addUserUnlockedTheme", async (client) => {
    await client.query(
      `INSERT INTO musai.user_unlocked_themes (user_id, theme_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, theme_id) DO NOTHING`,
      [userId, themeId],
    );
  });
}

/** 创建用户（signup 双写配套） */
export async function createUser(
  userId: string,
  data: { email: string; passwordHash: string; displayName: string },
): Promise<void> {
  await safeExec("createUser", async (client) => {
    await client.query(
      `INSERT INTO musai.users (id, username, email, password_hash, nickname, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'user', 'active', now(), now())
       ON CONFLICT (id) DO NOTHING`,
      [userId, data.displayName || data.email.split('@')[0], data.email, data.passwordHash, data.displayName || data.email.split('@')[0]],
    );
    await client.query(
      `INSERT INTO musai.user_star_power (user_id, total_star_power, available_star_power)
       VALUES ($1, 100, 100)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId],
    );
    await client.query(
      `INSERT INTO musai.user_preferences (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId],
    );
  });
}
