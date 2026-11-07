# D-Music Supabase 项目数据库完整清单

> **项目名称**: YYC-Cube's Project
> **项目 ID**: `phgrinrlnxzjyxxhsqry`
> **Dashboard**: https://supabase.com/dashboard/project/phgrinrlnxzjyxxhsqry/database/tables
> **审计日期**: 2026-02-25
> **审计方法**: 逐文件代码扫描全部 `kv.get/set/del/getByPrefix` 调用
> **v1.1 更新**: 2026-02-25 — 新增诊断端点、通知键迁移、购买事务保护

---

## 一、基础设施概览

### 1.1 Supabase 服务清单

| 服务 | 使用情况 | 说明 |
|:---|:---|:---|
| **PostgreSQL 数据库** | 仅 1 张表 | `kv_store_f626b673` (key TEXT PK, value JSONB) |
| **Edge Functions** | 1 个函数 | `/make-server-f626b673`（Hono Web 服务器，87+ 路由） |
| **Auth** | 启用 | email/password 注册登录（`supabase.auth.admin.createUser`） |
| **Storage** | 1 个私有桶 | `make-f626b673-voice`（语音消息存储） |
| **Realtime** | 未使用 | 用轮询替代（心跳 15s / 弹幕 5s） |
| **Row Level Security** | 未配置 | KV 表通过 `SERVICE_ROLE_KEY` 直连，无 RLS |

### 1.2 环境变量

| 变量名 | 用途 | 使用位置 |
|:---|:---|:---|
| `SUPABASE_URL` | Supabase 项目 URL | `kv_store.tsx`, `server-utils.ts` |
| `SUPABASE_ANON_KEY` | 前端匿名密钥（Auth 验证） | `server-utils.ts`, 前端 `info.tsx` |
| `SUPABASE_SERVICE_ROLE_KEY` | 服务端密钥（管理员权限） | `kv_store.tsx`, 用户注册 |
| `SUPABASE_DB_URL` | 直连数据库 URL（未使用） | 预留 |
| `OPENAI_API_KEY` | OpenAI GPT / Whisper | `routes-ai.ts`, `ai-model-manager.ts` |

### 1.3 前端连接信息

```typescript
// /utils/supabase/info.tsx
export const projectId = "phgrinrlnxzjyxxhsqry"
export const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

// 前端 API 基地址:
// https://phgrinrlnxzjyxxhsqry.supabase.co/functions/v1/make-server-f626b673/<路由>
// Authorization: Bearer ${publicAnonKey}
```

### 1.4 KV Store API 接口

| 方法 | 签名 | SQL 等效 |
|:---|:---|:---|
| `kv.get(key)` | `→ Promise<any>` | `SELECT value FROM kv_store WHERE key = ?` |
| `kv.set(key, value)` | `→ Promise<void>` | `UPSERT INTO kv_store (key, value) VALUES (?, ?)` |
| `kv.del(key)` | `→ Promise<void>` | `DELETE FROM kv_store WHERE key = ?` |
| `kv.mget(keys[])` | `→ Promise<any[]>` | `SELECT value FROM kv_store WHERE key IN (?)` |
| `kv.mset(keys[], values[])` | `→ Promise<void>` | batch upsert |
| `kv.mdel(keys[])` | `→ Promise<void>` | `DELETE FROM kv_store WHERE key IN (?)` |
| `kv.getByPrefix(prefix)` | `→ Promise<any[]>` | `SELECT value FROM kv_store WHERE key LIKE ?%` |

---

## 二、KV 键完整清单（按功能域分组）

> 统计: **52 种 KV 键模式**，横跨 **14 个路由模块**，总计 **~230 次 KV 操作调用**

---

### 域 1: 用户核心 (`routes-auth.ts` / `routes-user.ts`)

| # | KV 键模式 | 值类型 | R/W | 操作数 | 说明 |
|:---|:---|:---|:---|:---|:---|
| 1 | `user:{userId}:starpower` | `string(int)` | R+W | 36 | 星力值余额（跨 6 个模块读写） |
| 2 | `user:{userId}:role` | `string` | R+W | 3 | 用户角色 (user/creator/admin) |
| 3 | `user:{userId}:profile` | `JSON string` | R+W | 3 | 用户个人资料（昵称/头像/简介等） |
| 4 | `user:{userId}:unlocked-themes` | `JSON string[]` | R+W | 3 | 已解锁主题列表 |
| 5 | `prefs:{userId}` | `JSON object` | R+W | 2 | 用户偏好设置 |
| 6 | `profile:{userId}` | `JSON object` | R | 2 | 用户档案（导出端点读取） |
| 7 | `system:error-log` | `JSON array` | R+W | 2 | 全局错误日志（最多 50 条） |

### 域 2: 星力经济 (`routes-starpower.ts`)

| # | KV 键模式 | 值类型 | R/W | 操作数 | 说明 |
|:---|:---|:---|:---|:---|:---|
| 8 | `user:{userId}:checkin` | `string(date)` | R+W | 3 | 最后签到日期 |
| 9 | `user:{userId}:checkin-streak` | `string(int)` | R+W | 3 | 连续签到天数 |
| 10 | `user:{userId}:transactions` | `JSON array` | R+W | 10 | 交易记录（最多 500 条） |
| 11 | `user:{userId}:inventory` | `JSON array` | R+W | 3 | 商城已购物品清单 |
| 12 | `user:{userId}:sp-transactions` | `JSON array` | R+W | 4 | 专辑/市场交易记录（最多 200 条） |

### 域 3: 歌曲与音乐 (`routes-music.ts` / `routes-analytics.ts`)

| # | KV 键模式 | 值类型 | R/W | 操作数 | 说明 |
|:---|:---|:---|:---|:---|:---|
| 13 | `song:{songId}:likes` | `string(int)` | R+W | 6 | 歌曲点赞数 |
| 14 | `song:{songId}:stats` | `JSON object` | R+W | 10 | 播放/点赞/评论统计 `{plays, likes, comments}` |
| 15 | `song:{songId}:annotations` | `JSON object` | R+W | 5 | 情感标注 `{lineIndex: {emotion: count}}` |
| 16 | `song:{songId}:comments` | `JSON array` | R+W | 5 | 歌曲评论列表（最多 200 条） |
| 17 | `song:{songId}:popularity` | `string(float)` | R+W | 3 | 歌曲人气值 |
| 18 | `analytics:plays:{hourKey}` | `string(int)` | R+W | 3 | 小时级播放统计（如 `2026-02-25T14`） |
| 19 | `system:all-song-ids` | `JSON string[]` | R+W | 3 | 动态歌曲 ID 索引（`server-utils.ts`） |
| 20 | `song-index` | `JSON string[]` | R | 1 | 智能歌单用歌曲索引 |

### 域 4: 收听历史与推荐 (`routes-analytics.ts`)

| # | KV 键模式 | 值类型 | R/W | 操作数 | 说明 |
|:---|:---|:---|:---|:---|:---|
| 21 | `user:{userId}:listening-history` | `JSON array` | R+W | 7 | 收听历史记录（最多 200 条） |
| 22 | `user:{userId}:emotion-prefs` | `JSON object` | R+W | 5 | 情感偏好分布 `{happy: 12, sad: 3, ...}` |

### 域 5: 作品与社区 (`routes-community.ts` / `server-utils.ts`)

| # | KV 键模式 | 值类型 | R/W | 操作数 | 说明 |
|:---|:---|:---|:---|:---|:---|
| 23 | `shared-work:{workId}` | `JSON object` | R+W | 3 | 独立作品数据 |
| 24 | `shared-work-index` | `JSON string[]` | R+W | 3 | 作品 ID 有序索引（newest first，最多 1000） |
| 25 | `community:activities` | `JSON array` | R+W | 3 | 社区动态流（最多 100 条） |
| 26 | `like-dedup:{workId}:{userId}` | `"1"` | R+W | 2 | 点赞去重标记 |
| 27 | `fork-chain:{workId}` | `JSON array` | R+W | 3 | 作品分支链 |
| 28 | `notifications:{userName}` | `JSON array` | R+W | 6 | 用户通知列表（以用户名为键，最多 100 条） |

### 域 6: 版权认证 (`routes-community.ts`)

| # | KV 键模式 | 值类型 | R/W | 操作数 | 说明 |
|:---|:---|:---|:---|:---|:---|
| 29 | `copyright:{workId}` | `JSON object` | R+W | 3 | 版权证书 `{certId, contentHash, issuedAt, ...}` |
| 30 | `copyright:user:{userId}` | `JSON array` | R+W | 2 | 用户名下所有版权证书列表（最多 200） |

### 域 7: 社交 — 成就/弹幕/M❤️ (`routes-social.ts`)

| # | KV 键模式 | 值类型 | R/W | 操作数 | 说明 |
|:---|:---|:---|:---|:---|:---|
| 31 | `user:{userId}:achievement-stats` | `JSON object` | R+W | 4 | 成就统计 `{totalWorks, streakDays, ...}` |
| 32 | `user:{userId}:achievements` | `JSON string[]` | R+W | 2 | 已解锁成就 ID 列表 |
| 33 | `achievements:stats:{userId}` | `JSON object` | R+W | 4 | 成就统计（旧键，community/challenge 使用） |
| 34 | `achievements:{userId}` | `JSON` | R | 1 | 成就数据（mheart 端点读取） |
| 35 | `timeline-comments:{songId}` | `JSON array` | R+W | 5 | 时间轴弹幕评论（最多 200 条） |
| 36 | `mheart:{userId}` | `JSON object` | R+W | 1 | M❤️值当前数据 |
| 37 | `mheart-trend:{userId}` | `JSON array` | R+W | 2 | M❤️值趋势（最多 30 点） |
| 38 | `work:{workId}` | `JSON object` | R | 1 | 作品数据（fork-tree 读取） |
| 39 | `work:{workId}:forks` | `JSON array` | R | 1 | 作品分支列表（fork-tree 读取） |

### 域 8: 时空喊话 (`routes-spacetime.ts`)

| # | KV 键模式 | 值类型 | R/W | 操作数 | 说明 |
|:---|:---|:---|:---|:---|:---|
| 40 | `spacetime:messages` | `JSON array` | R+W | 7 | 时空消息列表（最多 500 条） |
| 41 | `spacetime:replies:{messageId}` | `JSON array` | R+W | 3 | 消息回复（最多 50 条） |
| 42 | `spacetime:capsules` | `JSON array` | R+W | 5 | 时间胶囊列表（最多 200 条） |

### 域 9: 创作挑战赛 (`routes-challenge.ts`)

| # | KV 键模式 | 值类型 | R/W | 操作数 | 说明 |
|:---|:---|:---|:---|:---|:---|
| 43 | `challenges:active` | `JSON object` | R+W | 4 | 当前活跃挑战赛 |
| 44 | `challenges:entries:{challengeId}` | `JSON array` | R+W | 8 | 参赛作品列表 |
| 45 | `challenges:champions` | `JSON array` | R+W | 5 | 历史冠军记录（最多 20 条） |
| 46 | `challenge-vote:{challengeId}:{userId}` | `string` | R+W | 2 | 投票去重标记 |
| 47 | `challenge-notifications:{challengeId}` | `JSON array` | R+W | 2 | 赛事结算通知 |

### 域 10: 实时互动 (`routes-live.ts`)

| # | KV 键模式 | 值类型 | R/W | 操作数 | 说明 |
|:---|:---|:---|:---|:---|:---|
| 48 | `live-session:presence` | `JSON array` | R+W | 5 | 在线听众列表（30s 超时） |
| 49 | `live-session:danmaku` | `JSON array` | R+W | 3 | 实时弹幕消息（最多 200 条） |

### 域 11: 数字专辑 (`routes-albums.ts`)

| # | KV 键模式 | 值类型 | R/W | 操作数 | 说明 |
|:---|:---|:---|:---|:---|:---|
| 50 | `album:{albumId}` | `JSON object` | R+W | 7 | 专辑完整数据 |
| 51 | `album-index` | `JSON string[]` | R+W | 4 | 专辑 ID 索引 |
| 52 | `album:likes:{albumId}` | `string(int)` | R+W | 4 | 专辑点赞数 |
| 53 | `album:creator:{userId}` | `JSON string[]` | R+W | 3 | 创作者的专辑列表 |
| 54 | `album:collection:{userId}` | `JSON string[]` | R+W | 4 | 用户已拥有专辑列表 |
| 55 | `album:ownership:{albumId}:{userId}` | `JSON object` | R+W | 4 | 专辑所有权凭证 |

### 域 12: 二级市场 (`routes-market.ts`)

| # | KV 键模式 | 值类型 | R/W | 操作数 | 说明 |
|:---|:---|:---|:---|:---|:---|
| 56 | `market:listing:{listingId}` | `JSON object` | R+W | 4 | 挂牌详情 |
| 57 | `market:listing-index` | `JSON string[]` | R+W | 2 | 挂牌 ID 索引 |
| 58 | `market:history` | `JSON array` | R+W | 2 | 成交历史（最多 200 条） |
| 59 | `market:volume` | `string(int)` | R+W | 2 | 累计交易额 |

### 域 13: PKI / E2EE (`routes-pki.ts`)

| # | KV 键模式 | 值类型 | R/W | 操作数 | 说明 |
|:---|:---|:---|:---|:---|:---|
| 60 | `pki:public-key:{userId}` | `JSON object` | R+W+D | 5 | 公钥（JWK格式 + 指纹） |
| 61 | `pki:key-backup:{userId}` | `JSON object` | R+W+D | 4 | 加密私钥备份 |
| 62 | `pki:enrollment-log` | `JSON string[]` | R+W | 3 | 已注册 E2EE 用户列表 |

### 域 14: 速率限制 (`rate-limit.ts`)

| # | KV 键模式 | 值类型 | R/W | 操作数 | 说明 |
|:---|:---|:---|:---|:---|:---|
| — | 内存 `Map` | timestamps[] | — | — | **不使用 KV**，纯内存滑动窗口 |

---

## 三、KV 键统计汇总

### 3.1 按域统计

| 域 | 键模式数 | KV 操作次数 | 数据风险 |
|:---|:---|:---|:---|
| 用户核心 | 7 | 18 | 中（profile 数据分散） |
| 星力经济 | 5 | 23 | **高**（无事务保护的扣费操作） |
| 歌曲与音乐 | 8 | 36 | 中 |
| 收听历史 | 2 | 12 | 低 |
| 作品与社区 | 6 | 17 | 中（通知键使用 userName 而非 userId） |
| 版权认证 | 2 | 5 | 低 |
| 社交/成就/M❤️ | 9 | 21 | 中（成就统计键有 2 种格式不统一） |
| 时空喊话 | 3 | 15 | **高**（单键存 500 条消息，JSON 膨胀） |
| 挑战赛 | 5 | 21 | 中 |
| 实时互动 | 2 | 8 | 低（短期数据） |
| 数字专辑 | 6 | 26 | **高**（购买事务无原子性） |
| 二级市场 | 4 | 10 | **高**（买卖事务跨多个键） |
| PKI/E2EE | 3 | 12 | 中（密钥数据敏感） |
| **合计** | **62** | **~224** | — |

### 3.2 按操作类型统计

| 操作 | 总调用次数 | 说明 |
|:---|:---|:---|
| `kv.get()` | ~125 | 读取操作（最频繁） |
| `kv.set()` | ~92 | 写入/更新操作 |
| `kv.del()` | 2 | 仅 PKI 密钥删除使用 |
| `kv.getByPrefix()` | 2 | 仅用户数据导出使用 |
| `kv.mget()` | 0 | 未使用 |
| `kv.mset()` | 0 | 未使用 |
| `kv.mdel()` | 0 | 未使用 |

### 3.3 数据规模估算

| 指标 | 估算值 | 计算方式 |
|:---|:---|:---|
| **活跃用户数** | ~50-200 | 基于注册 + 签到数据 |
| **歌曲数** | 6 内置 + N 自定义 | `system:all-song-ids` |
| **共享作品数** | 最多 1,000 | `shared-work-index` 上限 |
| **KV 行总数** | ~2,000-10,000 行 | 用户×15键 + 歌曲×5键 + 系统键 |
| **单行最大值** | ~500KB | `spacetime:messages`（500 条 JSON） |
| **数据库总体积** | ~10-50MB | JSONB 压缩存储 |

---

## 四、Supabase Storage 桶清单

| 桶名 | 类型 | 用途 | 创建方式 |
|:---|:---|:---|:---|
| `make-f626b673-voice` | 私有 | 语音消息音频文件 | 服务器启动时 idempotent 创建 |

**文件格式**: WebM/Opus 或 WAV
**访问方式**: `supabase.storage.createSignedUrl(path, 3600)` — 1 小时有效签名 URL
**上传路径**: `voice/{userId}/{timestamp}.webm`

---

## 五、Supabase Auth 使用情况

| 功能 | 实现状态 | 说明 |
|:---|:---|:---|
| Email/Password 注册 | ✅ | `supabase.auth.admin.createUser({email_confirm: true})` |
| Email/Password 登录 | ✅ | `supabase.auth.signInWithPassword()` |
| 会话管理 | ✅ | `supabase.auth.getSession()` |
| Token 验证 | ✅ | `supabase.auth.getUser(accessToken)` in `requireAuth` |
| Social Login (OAuth) | ❌ | 未实现 |
| MFA | ❌ | 未实现 |
| 邮件验证 | ❌ | 自动确认 (`email_confirm: true`) |

---

## 六、Edge Function 路由总表

### 6.1 路由模块清单

| 模块文件 | 路由前缀 | 端点数 | Zod Schema | requireAuth | 速率限制 |
|:---|:---|:---|:---|:---|:---|
| `routes-auth.ts` | `/health`, `/signup` | 2 | — | 否 | RATE_AUTH |
| `routes-music.ts` | `/likes`, `/annotations`, `/play`, `/comments`, `/songs` | 7 | 3 个 | 部分 | RATE_SENSITIVE |
| `routes-starpower.ts` | `/starpower` | 8 | 4 个 | 是 | RATE_STARPOWER |
| `routes-user.ts` | `/profile`, `/user`, `/creators`, `/role`, `/prefs` | 8 | 1 个 | 是 | — |
| `routes-community.ts` | `/shared-works`, `/works`, `/copyright` | 6 | 2 个 | 部分 | RATE_STANDARD |
| `routes-ai.ts` | `/ai/lyrics`, `/ai/compose`, `/stt` | 4+ | — | 是 | RATE_HEAVY |
| `routes-analytics.ts` | `/leaderboard`, `/analytics`, `/listening-history`, `/recommendations`, `/smart-playlist` | 6 | — | 部分 | — |
| `routes-social.ts` | `/achievements`, `/notifications`, `/timeline-comments`, `/fork-tree`, `/mheart` | 8 | 1 个 | 是 | RATE_STANDARD |
| `routes-spacetime.ts` | `/spacetime` | 10+ | 3 个 | 是 | RATE_STANDARD |
| `routes-challenge.ts` | `/challenges` | 7 | 2 个 | 部分 | RATE_SENSITIVE |
| `routes-live.ts` | `/live-session` | 5 | 3 个 | 部分 | RATE_STANDARD |
| `routes-albums.ts` | `/albums` | 8 | 2 个 | 是 | — |
| `routes-pki.ts` | `/pki` | 6 | — | 是 | — |
| `routes-market.ts` | `/market` | 5 | 2 个 | 是 | — |
| **合计** | — | **~90** | **19** | — | — |

### 6.2 完整端点清单

#### Auth (2)
```
GET  /make-server-f626b673/health
POST /make-server-f626b673/signup
```

#### Music (7)
```
GET  /make-server-f626b673/likes/:songId
POST /make-server-f626b673/likes/:songId
GET  /make-server-f626b673/annotations/:songId
POST /make-server-f626b673/annotations/:songId
POST /make-server-f626b673/play/:songId
GET  /make-server-f626b673/comments/:songId
POST /make-server-f626b673/comments/:songId
POST /make-server-f626b673/comments/:songId/:commentId/like
POST /make-server-f626b673/songs/register
```

#### Star Power (8)
```
GET  /make-server-f626b673/starpower/:userId
POST /make-server-f626b673/starpower/:userId
POST /make-server-f626b673/starpower/:userId/checkin
GET  /make-server-f626b673/starpower/:userId/transactions
GET  /make-server-f626b673/starpower/:userId/details
POST /make-server-f626b673/starpower/:userId/consume
POST /make-server-f626b673/starpower/leaderboard-boost
POST /make-server-f626b673/starpower/shop/purchase
GET  /make-server-f626b673/starpower/:userId/inventory
```

#### User (8)
```
GET  /make-server-f626b673/profile/:userId
POST /make-server-f626b673/profile/:userId
GET  /make-server-f626b673/role/:userId
POST /make-server-f626b673/role/:userId
GET  /make-server-f626b673/user/:userId/unlocked-themes
POST /make-server-f626b673/user/:userId/unlocked-themes
GET  /make-server-f626b673/prefs/:userId
POST /make-server-f626b673/prefs/:userId
POST /make-server-f626b673/error-report
GET  /make-server-f626b673/export/:userId
```

#### Community (6)
```
GET  /make-server-f626b673/community
POST /make-server-f626b673/community
GET  /make-server-f626b673/shared-works
POST /make-server-f626b673/shared-works
POST /make-server-f626b673/shared-works/:workId/like
POST /make-server-f626b673/shared-works/:workId/play
GET  /make-server-f626b673/creators
GET  /make-server-f626b673/creators/:userName/works
POST /make-server-f626b673/works/fork
GET  /make-server-f626b673/works/:workId/forks
POST /make-server-f626b673/copyright/apply
GET  /make-server-f626b673/copyright/:workId
GET  /make-server-f626b673/copyright/user/:userId
POST /make-server-f626b673/copyright/verify
```

#### AI (4+)
```
POST /make-server-f626b673/ai/lyrics
POST /make-server-f626b673/ai/compose
POST /make-server-f626b673/stt/transcribe
POST /make-server-f626b673/stt/stream
```

#### Analytics (6)
```
GET  /make-server-f626b673/leaderboard
GET  /make-server-f626b673/analytics
POST /make-server-f626b673/listening-history
GET  /make-server-f626b673/recommendations/:userId
GET  /make-server-f626b673/recommendations/:userId/preferences
GET  /make-server-f626b673/recommendations/:userId/ai-analysis
GET  /make-server-f626b673/smart-playlist/:userId
```

#### Social (8)
```
GET  /make-server-f626b673/achievements/:userId
POST /make-server-f626b673/achievements/:userId/track
GET  /make-server-f626b673/notifications/:userName
POST /make-server-f626b673/notifications/:userName/read
GET  /make-server-f626b673/timeline-comments/:songId
POST /make-server-f626b673/timeline-comments/:songId
POST /make-server-f626b673/timeline-comments/:songId/like/:commentId
GET  /make-server-f626b673/fork-tree/:workId
GET  /make-server-f626b673/mheart/:userId
```

#### Space-Time (10+)
```
POST /make-server-f626b673/spacetime/messages
GET  /make-server-f626b673/spacetime/messages
POST /make-server-f626b673/spacetime/messages/:msgId/like
POST /make-server-f626b673/spacetime/messages/:msgId/replies
GET  /make-server-f626b673/spacetime/messages/:msgId/replies
GET  /make-server-f626b673/spacetime/messages/nearby
POST /make-server-f626b673/spacetime/capsules
GET  /make-server-f626b673/spacetime/capsules
POST /make-server-f626b673/spacetime/capsules/:capId/like
POST /make-server-f626b673/voice/upload
GET  /make-server-f626b673/voice/url
```

#### Challenge (7)
```
GET  /make-server-f626b673/challenges/active
POST /make-server-f626b673/challenges/:challengeId/submit
GET  /make-server-f626b673/challenges/:challengeId/entries
POST /make-server-f626b673/challenges/:challengeId/vote
GET  /make-server-f626b673/challenges/champions
GET  /make-server-f626b673/challenges/notifications/:userId
POST /make-server-f626b673/challenges/:challengeId/finalize
```

#### Live Session (5)
```
POST /make-server-f626b673/live-session/heartbeat
POST /make-server-f626b673/live-session/leave
GET  /make-server-f626b673/live-session/presence
POST /make-server-f626b673/live-session/danmaku
GET  /make-server-f626b673/live-session/danmaku
```

#### Albums (8)
```
GET  /make-server-f626b673/albums
GET  /make-server-f626b673/albums/:albumId
POST /make-server-f626b673/albums
POST /make-server-f626b673/albums/:albumId/purchase
GET  /make-server-f626b673/albums/collection/:userId
GET  /make-server-f626b673/albums/creator/:userId
POST /make-server-f626b673/albums/:albumId/like
```

#### PKI (6)
```
POST /make-server-f626b673/pki/public-key
GET  /make-server-f626b673/pki/public-key/:userId
DELETE /make-server-f626b673/pki/public-key/:userId
POST /make-server-f626b673/pki/key-backup
GET  /make-server-f626b673/pki/key-backup/:userId
GET  /make-server-f626b673/pki/status/:userId
```

#### Market (5)
```
GET  /make-server-f626b673/market/listings
GET  /make-server-f626b673/market/listings/:userId
POST /make-server-f626b673/market/list
POST /make-server-f626b673/market/buy/:listingId
DELETE /make-server-f626b673/market/cancel/:listingId
GET  /make-server-f626b673/market/history
GET  /make-server-f626b673/market/stats
```

---

## 七、已知数据风险与不一致

| # | 问题 | 位置 | 严重性 | 说明 |
|:---|:---|:---|:---|:---|
| 1 | ~~**通知键使用 userName**~~ | `notifications:{userName}` → `notifications:user:{userId}` | ~~中~~ ✅已修复 | v11.1: 迁移至 userId 键，含向后兼容自动迁移 |
| 2 | **成就统计双键** | `user:{id}:achievement-stats` vs `achievements:stats:{id}` | 低 | 两种键模式共存，数据可能不同步 |
| 3 | **profile 双键** | `user:{id}:profile` vs `profile:{id}` | 低 | 导出端点读 `profile:{id}`，主端点读 `user:{id}:profile` |
| 4 | ~~**无事务保护**~~ | 购买操作 | ~~高~~ ✅已缓解 | v11.1: 添加乐观并发保护（SP re-read + listing status re-check） |
| 5 | **大 JSON 膨胀** | `spacetime:messages` (500条) | 中 | 单键值可达数百 KB |
| 6 | **内存截断** | 多处 `.slice(0, N)` | 中 | 旧数据被硬性丢弃，无归档 |

---

## 八、v11.1 新增内容

### 8.1 诊断端点（`routes-diagnostics.ts`）

| 端点 | 方法 | 说明 |
|:---|:---|:---|
| `/diagnostics/kv-stats` | GET | KV 表行数统计（按 28 个前缀分组） |
| `/diagnostics/health` | GET | 系统健康检查（KV/Auth/Storage/Cache/OpenAI） |

**使用方式**: 在浏览器或 curl 中访问:
```
GET https://phgrinrlnxzjyxxhsqry.supabase.co/functions/v1/make-server-f626b673/diagnostics/kv-stats
Authorization: Bearer <publicAnonKey>
```

**返回数据示例**:
```json
{
  "summary": { "totalRows": 157, "estimatedSizeMB": 0.08 },
  "domainStats": { "userDomain": 45, "songDomain": 32, ... },
  "prefixStats": [
    { "prefix": "user:", "count": 45, "sampleKeys": ["user:abc:starpower", ...] },
    ...
  ]
}
```

### 8.2 通知键迁移（§v11.1）

| 变更 | 旧键 | 新键 | 影响文件 |
|:---|:---|:---|:---|
| 通知读取 | `notifications:{userName}` | `notifications:user:{userId}` | `routes-social.ts` |
| 通知写入（点赞） | `notifications:{authorName}` | `notifications:user:{authorId}` | `routes-community.ts` |
| 通知写入（Fork） | `notifications:{originalAuthor}` | `notifications:user:{originalAuthorId}` | `routes-community.ts` |
| 前端获取 | `/notifications/${userName}` | `/notifications/${userId}` | `App.tsx`, `api.ts` |

**向后兼容**: 当新键为空时，自动查找 profile 中的 displayName，读取旧键并迁移到新键。

### 8.3 购买事务保护（§v11.1）

| 操作 | 保护机制 | 文件 |
|:---|:---|:---|
| 专辑购买 | SP re-read + supply re-check before deduction | `routes-albums.ts` |
| 二级市场购买 | listing status re-read + SP re-read before deduction | `routes-market.ts` |

### 8.4 PostgreSQL 迁移说明

> **重要**: Figma Make 环境不支持 DDL 语句或数据库迁移脚本的执行。现有 KV 表 `kv_store_f626b673` 是唯一可用的持久化存储。
> 迁移方案文档 `/guidelines/DeepAnalysis_PostgreSQL_Migration_v1.md` 设计为在本地 Hono + PostgreSQL 15 环境中执行，不适用于当前 Supabase Edge Function 沙箱。
> 如需执行实际迁移，请在本地开发环境中按 7-Phase 计划操作。

---

**文档版本**: v1.1
**创建日期**: 2026-02-25
**最后更新**: 2026-02-25
**维护团队**: YYC3 Team