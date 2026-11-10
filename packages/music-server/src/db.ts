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
 * 安全执行：PG 不可用（未部署 / 无凭证 / 网络异常 / 显式禁用）时返回 fallback，
 * 保证关系表未就绪阶段仍可由 KV 提供服务。
 */
async function safeQuery<T>(label: string, fallback: T, fn: (client: any) => Promise<T>): Promise<T> {
  if (Deno.env.get("DB_DISABLED") === "1") return fallback;
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
  if (Deno.env.get("DB_DISABLED") === "1") return;
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

// ==========================================
// Album 域（musai.albums / musai.album_ownership）
// KV 侧使用字符串 id（如 album-cosmic-dreams），关系表通过 legacy_id 对齐。
// ==========================================

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function asUuid(value: unknown): string | null {
  return typeof value === "string" && UUID_RE.test(value) ? value : null;
}

function rowToAlbum(row: any): any {
  return {
    id: row.legacy_id ?? row.id,
    creatorId: row.creator_id,
    creatorName: row.creator_name ?? row.artist ?? 'Anonymous',
    title: row.title,
    description: row.description ?? '',
    coverUrl: row.cover ?? '',
    genre: row.genre ?? 'Other',
    tracks: Array.isArray(row.tracks) ? row.tracks : [],
    price: row.price ?? 0,
    limitedEdition: row.limited_edition ?? false,
    maxSupply: row.max_supply ?? null,
    circulatingSupply: row.circulating_supply ?? 0,
    releaseDate: row.release_date ? new Date(row.release_date).getTime() : 0,
    exclusiveContent: Array.isArray(row.exclusive_content) ? row.exclusive_content : [],
    tags: Array.isArray(row.tags) ? row.tags : [],
    likes: row.like_count ?? 0,
    totalSales: row.total_sales ?? 0,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : 0,
  };
}

/** 按 KV 字符串 id（legacy_id）查询专辑 */
export async function getAlbumByLegacyId(albumId: string): Promise<any | null> {
  return await safeQuery("getAlbumByLegacyId", null, async (client) => {
    const res = await client.query(
      `SELECT * FROM musai.albums WHERE legacy_id = $1 LIMIT 1`,
      [albumId],
    );
    return res.rows[0] ? rowToAlbum(res.rows[0]) : null;
  });
}

/** 列出专辑（关系表侧） */
export async function listAlbums(limit = 200): Promise<any[]> {
  return await safeQuery<any[]>("listAlbums", [], async (client) => {
    const res = await client.query(
      `SELECT * FROM musai.albums
        WHERE legacy_id IS NOT NULL
        ORDER BY release_date DESC NULLS LAST, created_at DESC
        LIMIT $1`,
      [limit],
    );
    return res.rows.map(rowToAlbum);
  });
}

/** 按创作者列出专辑（仅支持 uuid 创作者，否则交由 KV 兜底） */
export async function listAlbumsByCreator(creatorId: string): Promise<any[]> {
  const uuid = asUuid(creatorId);
  if (!uuid) return [];
  return await safeQuery<any[]>("listAlbumsByCreator", [], async (client) => {
    const res = await client.query(
      `SELECT * FROM musai.albums
        WHERE creator_id = $1
        ORDER BY created_at DESC`,
      [uuid],
    );
    return res.rows.map(rowToAlbum);
  });
}

/** 写入/更新专辑（关系表侧尽力同步） */
export async function upsertAlbum(album: any): Promise<void> {
  const creatorUuid = asUuid(album.creatorId);
  if (!creatorUuid) return; // 非 uuid 创作者（system / demo）只保留在 KV
  await safeExec("upsertAlbum", async (client) => {
    await client.query(
      `INSERT INTO musai.albums (
         legacy_id, title, artist, cover, description, release_date, genre, creator_id,
         creator_name, track_count, duration, like_count, status,
         price, limited_edition, max_supply, circulating_supply,
         exclusive_content, tags, total_sales, tracks, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8,
         $9, $10, $11, $12, 'published',
         $13, $14, $15, $16,
         $17::jsonb, $18::jsonb, $19, $20::jsonb, $21, now()
       )
       ON CONFLICT (legacy_id) DO UPDATE SET
         title = EXCLUDED.title,
         artist = EXCLUDED.artist,
         cover = EXCLUDED.cover,
         description = EXCLUDED.description,
         release_date = EXCLUDED.release_date,
         genre = EXCLUDED.genre,
         creator_name = EXCLUDED.creator_name,
         track_count = EXCLUDED.track_count,
         duration = EXCLUDED.duration,
         like_count = EXCLUDED.like_count,
         price = EXCLUDED.price,
         limited_edition = EXCLUDED.limited_edition,
         max_supply = EXCLUDED.max_supply,
         circulating_supply = EXCLUDED.circulating_supply,
         exclusive_content = EXCLUDED.exclusive_content,
         tags = EXCLUDED.tags,
         total_sales = EXCLUDED.total_sales,
         tracks = EXCLUDED.tracks,
         updated_at = now()`,
      [
        album.id,
        album.title,
        album.artist ?? album.creatorName ?? 'Unknown',
        album.coverUrl || null,
        album.description || null,
        album.releaseDate ? new Date(album.releaseDate).toISOString().slice(0, 10) : null,
        album.genre || null,
        creatorUuid,
        album.creatorName ?? null,
        Array.isArray(album.tracks) ? album.tracks.length : 0,
        Array.isArray(album.tracks)
          ? album.tracks.reduce((sum: number, t: any) => sum + (Number(t?.duration) || 0), 0)
          : 0,
        album.likes ?? 0,
        album.price ?? 0,
        album.limitedEdition ?? false,
        album.maxSupply ?? null,
        album.circulatingSupply ?? 0,
        JSON.stringify(album.exclusiveContent ?? []),
        JSON.stringify(album.tags ?? []),
        album.totalSales ?? 0,
        JSON.stringify(album.tracks ?? []),
        album.createdAt ? new Date(album.createdAt) : new Date(),
      ],
    );
  });
}

/** 同步专辑点赞数（关系表侧） */
export async function updateAlbumLikes(albumId: string, likes: number): Promise<void> {
  await safeExec("updateAlbumLikes", async (client) => {
    await client.query(
      `UPDATE musai.albums SET like_count = $2, updated_at = now() WHERE legacy_id = $1`,
      [albumId, likes],
    );
  });
}

/** 记录专辑购买归属（关系表侧） */
export async function addAlbumOwnership(
  albumId: string,
  userId: string,
  price: number,
  edition?: number | null,
): Promise<void> {
  await safeExec("addAlbumOwnership", async (client) => {
    await client.query(
      `INSERT INTO musai.album_ownership (album_id, user_id, price, edition)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (album_id, user_id) DO NOTHING`,
      [albumId, userId, price, edition ?? null],
    );
  });
}

/** 查询用户已购专辑 id 列表（关系表侧） */
export async function listOwnedAlbumIds(userId: string): Promise<string[]> {
  return await safeQuery<string[]>("listOwnedAlbumIds", [], async (client) => {
    const res = await client.query(
      `SELECT album_id FROM musai.album_ownership WHERE user_id = $1 ORDER BY purchased_at DESC`,
      [userId],
    );
    return res.rows.map((r: any) => r.album_id);
  });
}

// ==========================================
// Song 域（musai.musics，legacy_id 对齐 KV songId）
// 说明：曲目元数据仍以客户端/上传链路为准，本域先接管互动计数器。
// ==========================================

/** 查询歌曲互动计数（点赞 / 播放 / 评论） */
export async function getSongStatsByLegacyId(songId: string): Promise<any | null> {
  return await safeQuery("getSongStatsByLegacyId", null, async (client) => {
    const res = await client.query(
      `SELECT like_count, play_count, comment_count
         FROM musai.musics WHERE legacy_id = $1 LIMIT 1`,
      [songId],
    );
    return res.rows[0] ?? null;
  });
}

/** 同步歌曲互动计数（关系表侧尽力而为，仅更新传入字段） */
export async function updateSongStats(
  songId: string,
  patch: { likes?: number; plays?: number; comments?: number },
): Promise<void> {
  const sets: string[] = [];
  const values: any[] = [songId];
  let idx = 2;
  if (patch.likes !== undefined) { sets.push(`like_count = $${idx++}`); values.push(patch.likes); }
  if (patch.plays !== undefined) { sets.push(`play_count = $${idx++}`); values.push(patch.plays); }
  if (patch.comments !== undefined) { sets.push(`comment_count = $${idx++}`); values.push(patch.comments); }
  if (sets.length === 0) return;
  sets.push(`updated_at = now()`);
  await safeExec("updateSongStats", async (client) => {
    await client.query(
      `UPDATE musai.musics SET ${sets.join(", ")} WHERE legacy_id = $1`,
      values,
    );
  });
}
