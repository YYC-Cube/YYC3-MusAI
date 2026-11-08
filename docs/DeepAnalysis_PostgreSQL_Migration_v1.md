# D-Music 深度分析总结 & Supabase → 本地 Hono + PostgreSQL 15 迁移方案

> **版本**: v1.0
> **日期**: 2026-02-25
> **范围**: `D-Music-Guidelines.md` v3.5 对标分析 + 全量 KV→PostgreSQL 迁移方案
> **维护团队**: YYC3 Team

---

## 第一部分：项目深度分析总结

### 一、D-Music-Guidelines.md 对标矩阵

#### 1.1 章节完成度总览

| Guidelines 章节 | 子节 | 实际完成度 | 关键差距 |
|:---|:---|:---|:---|
| **一、标准化建设** | §1.1 技术标准 | **92%** | FLAC/MP3 音频标准在前端合成器层面模拟实现；色彩系统 indigo→pink 渐变已落地 |
| | §1.2 内容标准 | **88%** | LRC 歌词格式通过 `LyricsDisplay` 实现；元数据标准通过 `dmusic_types.ts` 定义 |
| | §1.3 用户体验 | **95%** | WCAG aria-label 全覆盖；键盘快捷键组件；<100ms 交互响应 |
| **二、流程化建设** | §2.1 音乐管理 | **100%** | AI 创作→元数据→版权确认→发布→数据分析 全链路 |
| | §2.2 用户服务 | **98%** | 注册→验证→偏好→推荐→播放→反馈→收集 已闭环 |
| | §2.3 内容创作 | **100%** | 主题→风格→关键词→AI生成→编辑→预览→保存 全实现 |
| | §2.4 数据分析 | **95%** | 数据采集→清洗→存储→分析→可视化→报告 已实现 |
| **三、科技化建设** | §3.1 音频技术 | **96%** | Web Audio API 合成器引擎；AudioContext 频谱分析；自适应音质（模拟） |
| | §3.2 前端技术 | **98%** | Flexbox/Grid 响应式；Canvas 音频可视化+粒子+波纹；PWA 全支持 |
| | §3.3 后端技术 | **75%** | Hono 微服务已模块化拆分为 14 个路由文件；**但仍是 KV Store 而非关系数据库** |
| **四、规范化建设** | §4.1 管理制度 | **85%** | Git 工作流隐含；代码审查通过 ESLint；版本通过 ProgressReport 追踪 |
| | §4.2 内容管理 | **90%** | 版权审核流程完整；分类体系通过 emotion/genre 实现 |
| | §4.3 服务质量 | **88%** | 速率限制已实现；查询缓存（LRU+TTL）已实现；性能监控（PerfMonitor）已实现 |
| **五、智能化建设** | §5.1 智能推荐 | **100%** | GPT 偏好分析 + 协同过滤 + 情感匹配三算法融合 |
| | §5.2 智能创作 | **100%** | AI 歌词生成 + AI 作曲 + 情感分析 全链路 |
| | §5.3 智能交互 | **95%** | 语音录制(Web Audio API) + STT(Whisper) + AI助手对话 |
| | §5.4 智能数据 | **90%** | 用户行为分析+内容效果分析 已实现；趋势预测通过 M❤️值趋势曲线部分实现 |
| **六、国标化建设** | §6.1-6.3 | **76%** | WCAG 2.1 AA 已覆盖；GB/T 22239 输入验证已通过 Zod 全覆盖；ISO 27001 部分符合 |
| **七、六化一体整合** | 整体 | **90%** | 数据中台(KV+缓存)、业务中台(14路由模块)、技术中台(组件库+hooks) 已初步成型 |

#### 1.2 代码架构与 Guidelines §2.2 后端模块化对标

| Guidelines 建议模块 | 实际实现文件 | 路由数 | 状态 |
|:---|:---|:---|:---|
| `routes/auth.tsx` | `/supabase/functions/server/routes-auth.ts` | 2 | 已实现 |
| `routes/users.tsx` | `/supabase/functions/server/routes-user.ts` | 8 | 已实现 |
| `routes/music.tsx` | `/supabase/functions/server/routes-music.ts` | 7 | 已实现 |
| `routes/starpower.tsx` | `/supabase/functions/server/routes-starpower.ts` | 8 | 已实现 |
| `routes/community.tsx` | `/supabase/functions/server/routes-community.ts` | 6 | 已实现 |
| `routes/ai.tsx` | `/supabase/functions/server/routes-ai.ts` | 4+ | 已实现 |
| `routes/challenges.tsx` | `/supabase/functions/server/routes-challenge.ts` | 7 | 已实现 |
| `routes/analytics.tsx` | `/supabase/functions/server/routes-analytics.ts` | 6 | 已实现 |
| `routes/shop.tsx` | 合并在 `routes-starpower.ts` 内 | 2 | 已实现 |
| `routes/achievements.tsx` | `routes-social.ts`（含成就） | 5 | 已实现 |
| `routes/notifications.tsx` | `routes-social.ts`（含通知） | 3 | 已实现 |
| `middleware/auth.tsx` | `server-utils.ts` (`requireAuth`) | - | 已实现 |
| `middleware/ratelimit.tsx` | `rate-limit.ts` | - | 已实现 |
| `middleware/validation.tsx` | `validation.ts` (19 Zod schemas) | - | 已实现 |
| 新增: `routes/albums` | `routes-albums.ts` | 8 | Guidelines 未覆盖 |
| 新增: `routes/market` | `routes-market.ts` | 5 | Guidelines 未覆盖 |
| 新增: `routes/pki` | `routes-pki.ts` | 3 | Guidelines 未覆盖 |
| 新增: `routes/live` | `routes-live.ts` | 5 | Guidelines 未覆盖 |
| 新增: `routes/spacetime` | `routes-spacetime.ts` | 10+ | Guidelines 未覆盖 |

**结论**: 实际实现**超越** Guidelines 建议的模块范围。Guidelines 建议 12 个路由模块，实际拆分为 14 个功能域路由文件 + 3 个中间件/工具文件。

#### 1.3 Guidelines §5.2 数据验证对标

| Guidelines 建议 | 实际实现 | 差距 |
|:---|:---|:---|
| 使用 Zod schema 验证 | 19 个 Zod schema (`validation.ts`) | 已超额完成 |
| `CreateUserSchema` | 通过 Supabase Auth 处理 | 略有不同 |
| `UpdateProfileSchema` | `profileUpdateSchema` (`.passthrough()`) | 已实现 |
| `PurchaseItemSchema` | `shopPurchaseSchema` + `albumPurchaseSchema` | 已实现 |
| 统一 `validateBody` 中间件 | `validate()` 函数 + 路由内调用 | 实现方式不同但效果相同 |

#### 1.4 Guidelines §8.x 优化项完成追踪

| Guidelines 章节 | 状态 | 实现详情 |
|:---|:---|:---|
| §8.1 动态歌曲索引 | **已完成** | `getAllSongIds()` + `registerSongId()` in `server-utils.ts` |
| §8.2 共享作品存储重构 | **已完成** | `shared-work:{workId}` + `shared-work-index` 独立键模式 |
| §8.3 Error Boundary | **已完成** | `ErrorBoundary.tsx` 全局包裹 |
| §8.4 i18n 翻译键提取 | **已完成** | `i18n-translations.ts` 独立文件 |
| §8.5 CORS 配置收紧 | **已完成** | 域名白名单 + 审计日志 |
| §8.6 速率限制实现 | **已完成** | `rate-limit.ts` KV-based 滑动窗口 |

---

### 二、KV 键命名空间完整清单

以下为代码库中所有 KV 键的完整盘点，这是 PostgreSQL 迁移的核心依据。

#### 2.1 用户域 (`user:*`)

| KV 键模式 | 数据类型 | 使用模块 | 读写频率 | 迁移目标表 |
|:---|:---|:---|:---|:---|
| `user:{userId}:starpower` | `string(int)` | starpower, market, albums | 极高 | `users.star_power` |
| `user:{userId}:profile` | `JSON object` | user | 高 | `users.*` (多字段) |
| `user:{userId}:role` | `string` | user, server-utils | 高 | `users.role` |
| `user:{userId}:transactions` | `JSON array` | starpower | 高 | `transactions` 表 |
| `user:{userId}:sp-transactions` | `JSON array` | albums, market | 中 | `transactions` 表 (合并) |
| `user:{userId}:checkin` | `JSON object` | starpower | 中 | `user_checkins` 表 |
| `user:{userId}:inventory` | `JSON array` | starpower | 低 | `user_inventory` 表 |
| `user:{userId}:achievements` | `JSON array` | social | 低 | `user_achievements` 表 |
| `user:{userId}:achievement-stats` | `JSON object` | social | 中 | `user_achievement_stats` 表 |
| `user:{userId}:notifications` | `JSON array` | social | 中 | `notifications` 表 |
| `user:{userId}:preferences` | `JSON object` | user | 低 | `user_preferences` 表 |
| `user:{userId}:vip` | `JSON object` | starpower | 低 | `users.vip_level, vip_exp` |
| `user:{userId}:listening-history` | `JSON array` | analytics | 高 | `listening_history` 表 |
| `user:{userId}:emotion-prefs` | `JSON object` | analytics | 中 | `user_emotion_prefs` 表 |
| `user:{userId}:theme` | `string` | user | 低 | `user_preferences.theme` |

#### 2.2 歌曲域 (`song:*`)

| KV 键模式 | 数据类型 | 使用模块 | 迁移目标表 |
|:---|:---|:---|:---|
| `song:{songId}:stats` | `JSON object` | music, analytics | `songs` 表 (stats 字段) |
| `song:{songId}:likes` | `JSON object` | music, analytics | `song_likes` 表 |
| `song:{songId}:comments` | `JSON array` | music | `comments` 表 |
| `song:{songId}:annotations` | `JSON array` | music, analytics | `annotations` 表 |
| `song:{songId}:popularity` | `string(int)` | analytics | `songs.popularity` |
| `song-index` | `JSON array` | analytics | `songs` 表 (索引自动) |
| `system:all-song-ids` | `JSON array` | server-utils | 不再需要（SQL 查询替代） |

#### 2.3 作品域 (`work:*` / `shared-work:*`)

| KV 键模式 | 数据类型 | 使用模块 | 迁移目标表 |
|:---|:---|:---|:---|
| `shared-work:{workId}` | `JSON object` | community | `works` 表 |
| `shared-work-index` | `JSON array` | server-utils | 不再需要（SQL ORDER BY 替代） |
| `work:{workId}:forks` | `JSON array` | social | `work_forks` 表 |

#### 2.4 专辑域 (`album:*`)

| KV 键模式 | 数据类型 | 使用模块 | 迁移目标表 |
|:---|:---|:---|:---|
| `album:{albumId}` | `JSON object` | albums | `albums` 表 |
| `album-index` | `JSON array` | albums | 不再需要 |
| `album:likes:{albumId}` | `string(int)` | albums | `albums.likes` |
| `album:creator:{userId}` | `JSON array` | albums | `albums` 表 + `WHERE creator_id = ?` |
| `album:collection:{userId}` | `JSON array` | albums, market | `album_ownership` 表 |
| `album:ownership:{albumId}:{userId}` | `JSON object` | albums, market | `album_ownership` 表 |

#### 2.5 二级市场域 (`market:*`)

| KV 键模式 | 数据类型 | 使用模块 | 迁移目标表 |
|:---|:---|:---|:---|
| `market:listing:{listingId}` | `JSON object` | market | `market_listings` 表 |
| `market:listing-index` | `JSON array` | market | 不再需要 |
| `market:history` | `JSON array` | market | `market_transactions` 表 |
| `market:volume` | `string(int)` | market | `market_stats.total_volume` |

#### 2.6 挑战赛域 (`challenge*`)

| KV 键模式 | 数据类型 | 使用模块 | 迁移目标表 |
|:---|:---|:---|:---|
| `challenges:active` | `JSON object` | challenge | `challenges` 表 + `WHERE status = 'active'` |
| `challenges:entries:{challengeId}` | `JSON array` | challenge | `challenge_entries` 表 |
| `challenges:champions` | `JSON array` | challenge | `challenge_champions` 表 |
| `challenge-vote:{challengeId}:{userId}` | `string` | challenge | `challenge_votes` 表 (UNIQUE约束去重) |
| `challenge-notifications:{challengeId}` | `JSON array` | challenge | `notifications` 表 (合并) |

#### 2.7 时空喊话域 (`spacetime:*`)

| KV 键模式 | 数据类型 | 使用模块 | 迁移目标表 |
|:---|:---|:---|:---|
| `spacetime:messages` | `JSON array` | spacetime | `spacetime_messages` 表 |
| `spacetime:capsules` | `JSON array` | spacetime | `time_capsules` 表 |
| `spacetime:replies:{msgId}` | `JSON array` | spacetime | `spacetime_replies` 表 |

#### 2.8 实时互动域 (`live-session:*`)

| KV 键模式 | 数据类型 | 使用模块 | 迁移目标表 |
|:---|:---|:---|:---|
| `live-session:presence` | `JSON array` | live | `live_presence` 表 (或 Redis) |
| `live-session:danmaku` | `JSON array` | live | `live_danmaku` 表 (或 Redis) |

#### 2.9 社交域

| KV 键模式 | 数据类型 | 使用模块 | 迁移目标表 |
|:---|:---|:---|:---|
| `timeline-comments:{songId}` | `JSON array` | social | `timeline_comments` 表 |
| `mheart:{userId}` | `JSON object` | social | `user_mheart` 表 |
| `mheart-trend:{userId}` | `JSON array` | social | `mheart_trend` 表 |

#### 2.10 PKI / E2EE 域

| KV 键模式 | 数据类型 | 使用模块 | 迁移目标表 |
|:---|:---|:---|:---|
| `pki:public_keys:{userId}` | `JSON object` | pki | `user_public_keys` 表 |

#### 2.11 版权域

| KV 键模式 | 数据类型 | 使用模块 | 迁移目标表 |
|:---|:---|:---|:---|
| `copyright:{workId}` | `JSON object` | community | `copyright_certificates` 表 |

#### 2.12 系统域

| KV 键模式 | 数据类型 | 使用模块 | 迁移目标表 |
|:---|:---|:---|:---|
| `analytics:plays:{hourKey}` | `string(int)` | analytics | `analytics_hourly` 表 |
| `ratelimit:{category}:{identifier}:{window}` | `JSON object` | rate-limit | Redis (或 `rate_limit_entries` 表) |

**KV 键总计**: 约 **45+ 种键模式**，映射到 **25+ 张关系表**。

---

### 三、代码规模与复杂度分析

#### 3.1 前端组件清单 (44 个)

| 层级 | 组件 | 复杂度 | 关键依赖 |
|:---|:---|:---|:---|
| 核心播放 | `PlayerControls`, `LyricsDisplay`, `MediaDisplay`, `AudioVisualizer`, `MobilePlayer` | 高 | `useAudioEngine` |
| AI 创作 | `AILyricsGenerator`, `CreationStudio`, `MVCreator`, `AIAssistant` | 高 | `useAudioComposer`, OpenAI API |
| 社交互动 | `CommunityFeed`, `CommentSystem`, `ShareWorkModal`, `ForkTree`, `TimelineComments` | 中 | KV API |
| 经济系统 | `StarPowerPanel`, `StarPowerShop`, `LeaderboardPanel`, `AchievementsPanel` | 中 | KV API |
| 高级功能 | `SpaceTimePanel`, `ChallengePanel`, `LiveSessionPanel`, `SecondaryMarket`, `AlbumStore` | 高 | E2EE, KV API |
| 可视化 | `EmotionRipple`, `Starfield`, `PerfMonitor`, `AnalyticsDashboard`, `MHeartSystem` | 高 | Canvas, Recharts |
| 工具/辅助 | `AuthModal`, `ErrorBoundary`, `KeyboardShortcuts`, `E2EKeySetup`, `ThemeSwitcher` 等 | 低-中 | Supabase Auth |

#### 3.2 后端文件清单 (20 个)

| 文件 | 行数(估) | 路由数 | 验证 Schema | requireAuth |
|:---|:---|:---|:---|:---|
| `index.tsx` | ~91 | 0 | - | - |
| `server-utils.ts` | ~330 | 0 | - | 定义 `requireAuth` |
| `validation.ts` | ~313 | 0 | 19 schemas | - |
| `rate-limit.ts` | ~80 | 0 | - | - |
| `ai-model-manager.ts` | ~100 | 0 | - | - |
| `routes-auth.ts` | ~100 | 2 | - | 部分 |
| `routes-music.ts` | ~300 | 7 | 3 | 部分 |
| `routes-starpower.ts` | ~350 | 8 | 4 | 是 |
| `routes-user.ts` | ~280 | 8 | 1 | 是 |
| `routes-community.ts` | ~350 | 6 | 2 | 部分 |
| `routes-ai.ts` | ~400 | 4+ | - | 是 |
| `routes-analytics.ts` | ~420 | 6 | - | 部分 |
| `routes-social.ts` | ~380 | 8 | 1 | 是 |
| `routes-spacetime.ts` | ~500 | 10+ | 3 | 是 |
| `routes-challenge.ts` | ~280 | 7 | 2 | 部分 |
| `routes-live.ts` | ~200 | 5 | 3 | 部分 |
| `routes-albums.ts` | ~480 | 8 | 2 | 是 |
| `routes-pki.ts` | ~150 | 3 | - | 是 |
| `routes-market.ts` | ~420 | 5 | 2 | 是 |
| **总计** | **~5,534** | **87+** | **19** | - |

#### 3.3 六化一体综合评分 (v11.0)

```
标准化  ████████████████████░░  94%  ← Zod 全覆盖 + 统一响应格式
流程化  ███████████████████░░░  98%  ← 全链路业务流程闭环
科技化  ███████████████████████  99%  ← Web Audio + Canvas + E2EE + AI
规范化  █████████████████░░░░░  88%  ← 14 路由模块 + 19 schema
智能化  ██████████████████░░░░  93%  ← GPT 推荐 + AI 评分 + STT
国标化  ███████████████░░░░░░░  76%  ← WCAG + 输入验证; 缺部分安全审计
──────────────────────────────────────
六化均值  ████████████████████░░  91.3%
```

---

## 第二部分：Supabase → 本地 Hono + PostgreSQL 15 迁移方案

### 一、迁移目标与架构对比

#### 1.1 现有架构

```
┌────────────────┐     HTTPS      ┌─────────────────────────┐
│   React SPA    │ ──────────────→│  Supabase Edge Function  │
│  (Figma Make)  │                │  (Hono on Deno)          │
│                │                │  ROUTE_PREFIX =          │
│  前端组件 44+  │                │  /make-server-f626b673   │
│  Hooks 9       │                ├─────────────────────────┤
│  API: fetch()  │                │  kv_store.tsx            │
│                │                │  → Supabase PostgREST    │
│  Auth:         │                │  → kv_store_f626b673     │
│  Supabase SDK  │                │    (单表 key-value)      │
│                │                ├─────────────────────────┤
│  Storage:      │                │  Supabase Storage        │
│  Signed URLs   │                │  (voice bucket)          │
└────────────────┘                └─────────────────────────┘
```

#### 1.2 目标架构

```
┌────────────────┐     HTTPS      ┌─────────────────────────┐
│   React SPA    │ ──────────────→│  Hono (Standalone)       │
│  (Vite Build)  │                │  Node.js / Bun / Deno    │
│                │                │  PORT: 3001              │
│  前端组件 44+  │                │  CORS: localhost:3000    │
│  Hooks 9       │                ├─────────────────────────┤
│  API: fetch()  │                │  PostgreSQL 15           │
│                │                │  → 25+ 关系表            │
│  Auth:         │                │  → 索引 + 外键约束       │
│  JWT (自签)    │                │  → 连接池 (pg/pgPool)    │
│  or Supabase   │                ├─────────────────────────┤
│                │                │  Local File Storage      │
│  Storage:      │                │  or MinIO (S3 兼容)      │
│  Local/MinIO   │                │  (voice, album assets)   │
└────────────────┘                └─────────────────────────┘
```

#### 1.3 迁移范围评估

| 组件 | 迁移复杂度 | 工作量 | 说明 |
|:---|:---|:---|:---|
| 后端路由代码 | **中** | 16h | Hono 代码可直接复用，主要替换 `kv.*` → SQL |
| 数据库 Schema | **高** | 8h | 45+ KV 键模式 → 25+ 关系表 |
| 数据迁移脚本 | **高** | 8h | KV JSON → 关系行转换 |
| 认证系统 | **高** | 12h | Supabase Auth → 自签 JWT 或保留 Supabase |
| 文件存储 | **中** | 4h | Supabase Storage → MinIO 或本地磁盘 |
| 前端 API 层 | **低** | 4h | 仅更改 `BASE_URL` 和 `Authorization` 头 |
| 验证/中间件 | **低** | 2h | Zod + rate-limit 可直接复用 |
| **总计** | | **~54h** | 约 7 个工作日 |

---

### 二、PostgreSQL 15 完整数据库 Schema

#### 2.1 用户与认证

```sql
-- ==========================================
-- 扩展
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. 用户表
-- ==========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255),          -- bcrypt hash (自签 JWT 模式)
    display_name VARCHAR(64),
    bio TEXT DEFAULT '',
    avatar VARCHAR(500) DEFAULT '',
    role VARCHAR(20) CHECK (role IN ('user', 'creator', 'admin', 'moderator')) DEFAULT 'user',
    star_power INT DEFAULT 100,
    vip_level INT DEFAULT 1,
    vip_exp INT DEFAULT 0,
    mheart_value INT DEFAULT 0,
    mheart_level INT DEFAULT 1,
    theme VARCHAR(30) DEFAULT 'deepSpace',
    status VARCHAR(20) CHECK (status IN ('active', 'inactive', 'banned')) DEFAULT 'active',
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_star_power ON users(star_power DESC);

-- ==========================================
-- 2. 用户偏好
-- ==========================================
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(10) DEFAULT 'zh-CN',
    theme VARCHAR(30) DEFAULT 'deepSpace',
    auto_play BOOLEAN DEFAULT TRUE,
    emotion_prefs JSONB DEFAULT '{}',    -- {happy: 0.3, sad: 0.1, ...}
    notification_settings JSONB DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. 用户签到
-- ==========================================
CREATE TABLE user_checkins (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    streak INT DEFAULT 1,
    last_checkin_date DATE NOT NULL,
    total_checkins INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- ==========================================
-- 4. PKI 公钥 (E2EE)
-- ==========================================
CREATE TABLE user_public_keys (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    public_key TEXT NOT NULL,             -- JWK 格式
    fingerprint VARCHAR(200),
    algorithm VARCHAR(20) DEFAULT 'RSA-OAEP',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2.2 歌曲与音乐

```sql
-- ==========================================
-- 5. 歌曲表
-- ==========================================
CREATE TABLE songs (
    id VARCHAR(128) PRIMARY KEY,          -- 'track-1', 'ai-{timestamp}', 'custom-{timestamp}'
    title VARCHAR(200) NOT NULL,
    artist VARCHAR(100),
    album_name VARCHAR(200),
    duration REAL DEFAULT 180,
    cover_url VARCHAR(500),
    audio_url VARCHAR(500),
    genre VARCHAR(50),
    play_count INT DEFAULT 0,
    skip_count INT DEFAULT 0,
    finish_count INT DEFAULT 0,
    total_listen_seconds REAL DEFAULT 0,
    popularity INT DEFAULT 0,
    stats JSONB DEFAULT '{}',             -- 扩展统计
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_songs_play_count ON songs(play_count DESC);
CREATE INDEX idx_songs_popularity ON songs(popularity DESC);

-- ==========================================
-- 6. 歌曲点赞
-- ==========================================
CREATE TABLE song_likes (
    id SERIAL PRIMARY KEY,
    song_id VARCHAR(128) NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(song_id, user_id)
);

CREATE INDEX idx_song_likes_song ON song_likes(song_id);

-- ==========================================
-- 7. 歌曲评论
-- ==========================================
CREATE TABLE comments (
    id VARCHAR(128) PRIMARY KEY DEFAULT 'cmt-' || extract(epoch from now())::text,
    song_id VARCHAR(128) NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(64) NOT NULL,
    text TEXT NOT NULL,
    timestamp_seconds REAL,               -- 歌曲时间点（可选）
    likes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comments_song ON comments(song_id, created_at DESC);

-- ==========================================
-- 8. 情感标注
-- ==========================================
CREATE TABLE annotations (
    id SERIAL PRIMARY KEY,
    song_id VARCHAR(128) NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    line_index INT NOT NULL,
    emotion VARCHAR(30) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_annotations_song ON annotations(song_id);

-- ==========================================
-- 9. 时间轴评论（弹幕）
-- ==========================================
CREATE TABLE timeline_comments (
    id VARCHAR(128) PRIMARY KEY,
    song_id VARCHAR(128) NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(64) NOT NULL,
    text VARCHAR(500) NOT NULL,
    timestamp_seconds REAL NOT NULL,      -- 弹幕时间锚点
    likes INT DEFAULT 0,
    channel INT DEFAULT 0,                -- 碰撞通道
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_timeline_comments_song ON timeline_comments(song_id, timestamp_seconds);

-- ==========================================
-- 10. 收听历史
-- ==========================================
CREATE TABLE listening_history (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    song_id VARCHAR(128) NOT NULL,
    song_title VARCHAR(200),
    emotion VARCHAR(30) DEFAULT 'neutral',
    duration_seconds REAL DEFAULT 0,
    completion_rate REAL DEFAULT 0,       -- 0.0 ~ 1.0
    session_id VARCHAR(128),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_listening_history_user ON listening_history(user_id, created_at DESC);
CREATE INDEX idx_listening_history_song ON listening_history(song_id);
```

#### 2.3 作品与创作

```sql
-- ==========================================
-- 11. 共享作品
-- ==========================================
CREATE TABLE works (
    id VARCHAR(128) PRIMARY KEY,          -- workId
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(64),
    title VARCHAR(200) NOT NULL,
    theme VARCHAR(50) DEFAULT 'happy',
    lyrics JSONB DEFAULT '[]',            -- string[]
    mode VARCHAR(30) DEFAULT 'quick',
    likes INT DEFAULT 0,
    fork_count INT DEFAULT 0,
    parent_work_id VARCHAR(128) REFERENCES works(id) ON DELETE SET NULL,  -- fork 来源
    parent_author VARCHAR(64),
    is_original BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_works_user ON works(user_id);
CREATE INDEX idx_works_created ON works(created_at DESC);
CREATE INDEX idx_works_parent ON works(parent_work_id);
CREATE INDEX idx_works_likes ON works(likes DESC);

-- ==========================================
-- 12. 版权证书
-- ==========================================
CREATE TABLE copyright_certificates (
    id VARCHAR(128) PRIMARY KEY,          -- 'CR-{workId}'
    work_id VARCHAR(128) NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(64),
    work_title VARCHAR(200),
    content_hash VARCHAR(100),            -- 'DM-XXXX...'
    description TEXT DEFAULT '',
    status VARCHAR(20) DEFAULT 'registered',
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(work_id)
);
```

#### 2.4 专辑与市场

```sql
-- ==========================================
-- 13. 数字专辑
-- ==========================================
CREATE TABLE albums (
    id VARCHAR(128) PRIMARY KEY,
    creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    creator_name VARCHAR(64),
    title VARCHAR(200) NOT NULL,
    description TEXT DEFAULT '',
    genre VARCHAR(50) DEFAULT 'Other',
    cover_url VARCHAR(500),
    tracks JSONB NOT NULL DEFAULT '[]',   -- [{songId, title, artist, duration}]
    price INT DEFAULT 100,                -- Star Power
    limited_edition BOOLEAN DEFAULT FALSE,
    max_supply INT,
    circulating_supply INT DEFAULT 0,
    likes INT DEFAULT 0,
    tags JSONB DEFAULT '[]',
    release_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_albums_creator ON albums(creator_id);
CREATE INDEX idx_albums_genre ON albums(genre);

-- ==========================================
-- 14. 专辑所有权
-- ==========================================
CREATE TABLE album_ownership (
    id SERIAL PRIMARY KEY,
    album_id VARCHAR(128) NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purchase_price INT,
    purchased_from VARCHAR(128),          -- 'primary' or seller userId
    transaction_type VARCHAR(20) DEFAULT 'primary',  -- 'primary' | 'secondary'
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(album_id, user_id)
);

CREATE INDEX idx_ownership_user ON album_ownership(user_id);

-- ==========================================
-- 15. 二级市场挂牌
-- ==========================================
CREATE TABLE market_listings (
    id VARCHAR(128) PRIMARY KEY,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_name VARCHAR(64),
    album_id VARCHAR(128) NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    album_title VARCHAR(200),
    price INT NOT NULL,
    status VARCHAR(20) CHECK (status IN ('active', 'sold', 'cancelled')) DEFAULT 'active',
    buyer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    buyer_name VARCHAR(64),
    listed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sold_at TIMESTAMP
);

CREATE INDEX idx_listings_status ON market_listings(status, listed_at DESC);
CREATE INDEX idx_listings_seller ON market_listings(seller_id);

-- ==========================================
-- 16. 市场统计
-- ==========================================
CREATE TABLE market_stats (
    id INT PRIMARY KEY DEFAULT 1,         -- 单行表
    total_volume BIGINT DEFAULT 0,
    total_transactions INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO market_stats DEFAULT VALUES;
```

#### 2.5 交易系统

```sql
-- ==========================================
-- 17. 交易记录（统一）
-- ==========================================
CREATE TABLE transactions (
    id VARCHAR(128) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL,            -- 'earn', 'spend', 'failed_spend', 'checkin', ...
    amount INT NOT NULL,
    reason VARCHAR(200),
    detail TEXT,
    balance_after INT,
    related_entity_id VARCHAR(128),       -- songId, albumId, listingId, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_user ON transactions(user_id, created_at DESC);
CREATE INDEX idx_transactions_type ON transactions(type);
```

#### 2.6 社交与互动

```sql
-- ==========================================
-- 18. 通知
-- ==========================================
CREATE TABLE notifications (
    id VARCHAR(128) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,            -- 'like', 'fork', 'challenge_result', ...
    title VARCHAR(200),
    message TEXT,
    related_entity_id VARCHAR(128),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- ==========================================
-- 19. 成就
-- ==========================================
CREATE TABLE achievements (
    id VARCHAR(64) PRIMARY KEY,           -- 'badge-first-song', 'badge-10-likes', ...
    name_zh VARCHAR(100),
    name_en VARCHAR(100),
    description_zh TEXT,
    description_en TEXT,
    icon VARCHAR(50),
    tier VARCHAR(20),                     -- 'bronze', 'silver', 'gold', 'diamond'
    condition JSONB
);

CREATE TABLE user_achievements (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id VARCHAR(64) NOT NULL REFERENCES achievements(id),
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, achievement_id)
);

CREATE TABLE user_achievement_stats (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_works INT DEFAULT 0,
    streak_days INT DEFAULT 0,
    total_likes_received INT DEFAULT 0,
    total_forks INT DEFAULT 0,
    total_plays INT DEFAULT 0,
    total_messages INT DEFAULT 0,
    total_capsules INT DEFAULT 0,
    peak_star_power INT DEFAULT 0,
    location_messages INT DEFAULT 0,
    voice_messages INT DEFAULT 0,
    last_active_date DATE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 20. 用户库存（商城购买物品）
-- ==========================================
CREATE TABLE user_inventory (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id VARCHAR(64) NOT NULL,
    item_name VARCHAR(100),
    item_category VARCHAR(30),
    quantity INT DEFAULT 1,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, item_id)
);

-- ==========================================
-- 21. M♥ 值趋势
-- ==========================================
CREATE TABLE mheart_trend (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    value INT NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mheart_trend_user ON mheart_trend(user_id, recorded_at DESC);
```

#### 2.7 挑战赛

```sql
-- ==========================================
-- 22. 挑战赛
-- ==========================================
CREATE TABLE challenges (
    id VARCHAR(128) PRIMARY KEY,
    title_zh VARCHAR(200),
    title_en VARCHAR(200),
    description_zh TEXT,
    description_en TEXT,
    theme VARCHAR(50),
    status VARCHAR(20) CHECK (status IN ('active', 'ended', 'upcoming')) DEFAULT 'active',
    started_at TIMESTAMP,
    ends_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_challenges_status ON challenges(status);

CREATE TABLE challenge_entries (
    id VARCHAR(128) PRIMARY KEY,
    challenge_id VARCHAR(128) NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(64),
    work_id VARCHAR(128),
    work_title VARCHAR(200),
    work_theme VARCHAR(50),
    work_lyrics JSONB DEFAULT '[]',
    judge_score REAL DEFAULT 0,
    community_votes INT DEFAULT 0,
    total_score REAL DEFAULT 0,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_entries_challenge ON challenge_entries(challenge_id, total_score DESC);

CREATE TABLE challenge_votes (
    challenge_id VARCHAR(128) NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entry_id VARCHAR(128) NOT NULL REFERENCES challenge_entries(id),
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (challenge_id, user_id)
);

CREATE TABLE challenge_champions (
    id SERIAL PRIMARY KEY,
    challenge_id VARCHAR(128) NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    title_zh VARCHAR(200),
    title_en VARCHAR(200),
    top_entries JSONB NOT NULL DEFAULT '[]',  -- [{userName, workTitle, totalScore, rank}]
    total_entries INT DEFAULT 0,
    finalized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2.8 时空喊话

```sql
-- ==========================================
-- 23. 时空消息
-- ==========================================
CREATE TABLE spacetime_messages (
    id VARCHAR(128) PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(64),
    content TEXT NOT NULL,
    type VARCHAR(10) DEFAULT 'text',       -- 'text', 'voice'
    target_time VARCHAR(50),
    target_location JSONB,                 -- {lat, lng, label}
    song_id VARCHAR(128),
    song_title VARCHAR(200),
    emotion VARCHAR(30) DEFAULT 'neutral',
    is_public BOOLEAN DEFAULT TRUE,
    likes INT DEFAULT 0,
    reply_count INT DEFAULT 0,
    -- E2EE fields
    encrypted BOOLEAN DEFAULT FALSE,
    encrypted_content TEXT,
    encrypted_session_key TEXT,
    encryption_iv VARCHAR(200),
    sender_fingerprint VARCHAR(200),
    recipient_user_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_spacetime_created ON spacetime_messages(created_at DESC);
CREATE INDEX idx_spacetime_location ON spacetime_messages USING GIST (
    -- 若需位置查询，使用 PostGIS 或 JSONB 索引
);

-- ==========================================
-- 24. 时空消息回复
-- ==========================================
CREATE TABLE spacetime_replies (
    id VARCHAR(128) PRIMARY KEY,
    message_id VARCHAR(128) NOT NULL REFERENCES spacetime_messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(64),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_replies_message ON spacetime_replies(message_id, created_at);

-- ==========================================
-- 25. 时间胶囊
-- ==========================================
CREATE TABLE time_capsules (
    id VARCHAR(128) PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(64),
    title VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    unlock_at TIMESTAMP NOT NULL,
    emotion VARCHAR(30) DEFAULT 'neutral',
    recipient_name VARCHAR(64),
    song_id VARCHAR(128),
    song_title VARCHAR(200),
    is_opened BOOLEAN DEFAULT FALSE,
    likes INT DEFAULT 0,
    -- E2EE fields
    encrypted BOOLEAN DEFAULT FALSE,
    encrypted_content TEXT,
    encrypted_session_key TEXT,
    encryption_iv VARCHAR(200),
    sender_fingerprint VARCHAR(200),
    recipient_user_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_capsules_unlock ON time_capsules(unlock_at);
CREATE INDEX idx_capsules_user ON time_capsules(user_id);
```

#### 2.9 实时互动 & 分析

```sql
-- ==========================================
-- 26. 实时互动（短期数据）
-- ==========================================
CREATE TABLE live_presence (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    user_name VARCHAR(64),
    track_id VARCHAR(128),
    track_title VARCHAR(200),
    emotion VARCHAR(30),
    is_playing BOOLEAN DEFAULT FALSE,
    last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_presence_heartbeat ON live_presence(last_heartbeat DESC);

CREATE TABLE live_danmaku (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(64),
    text VARCHAR(100) NOT NULL,
    track_id VARCHAR(128),
    color VARCHAR(20) DEFAULT '#FFD700',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_danmaku_created ON live_danmaku(created_at DESC);

-- ==========================================
-- 27. 小时分析数据
-- ==========================================
CREATE TABLE analytics_hourly (
    id SERIAL PRIMARY KEY,
    hour_key VARCHAR(20) NOT NULL,        -- '2026-02-25-14'
    play_count INT DEFAULT 0,
    UNIQUE(hour_key)
);

-- ==========================================
-- 28. 速率限制（可选，也可用 Redis）
-- ==========================================
CREATE TABLE rate_limit_entries (
    key VARCHAR(256) PRIMARY KEY,
    count INT DEFAULT 0,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    window_ms INT DEFAULT 60000
);
```

---

### 三、后端迁移实施步骤

#### 3.1 Phase 0: 基础设施准备 (2h)

```bash
# 1. 安装 PostgreSQL 15
sudo apt install postgresql-15 postgresql-client-15

# 2. 创建数据库和用户
sudo -u postgres psql
CREATE DATABASE dmusic;
CREATE USER dmusic_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE dmusic TO dmusic_user;
\c dmusic
GRANT ALL ON SCHEMA public TO dmusic_user;

# 3. 执行 Schema（上述 SQL 保存为 schema.sql）
psql -U dmusic_user -d dmusic -f schema.sql

# 4. 项目初始化
mkdir dmusic-server && cd dmusic-server
npm init -y
npm install hono @hono/node-server pg zod jsonwebtoken bcryptjs dotenv
npm install -D typescript @types/pg @types/jsonwebtoken @types/bcryptjs
```

#### 3.2 Phase 1: 数据库连接层 (2h)

创建 `db.ts`（替代 `kv_store.tsx`）:

```typescript
// server/db.ts — PostgreSQL 连接池
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'dmusic',
  user: process.env.DB_USER || 'dmusic_user',
  password: process.env.DB_PASSWORD,
  max: 20,                    // 连接池上限
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// 统一查询接口
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

// 单行查询
export async function queryOne<T = any>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

// 事务支持
export async function transaction<T>(
  fn: (client: any) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export { pool };
```

#### 3.3 Phase 2: 路由代码迁移模板 (核心)

以 `routes-starpower.ts` 为例，展示 KV→SQL 的典型转换模式：

**Before (KV)**:
```typescript
const spRaw = await kv.get(`user:${userId}:starpower`);
let sp = spRaw ? parseInt(spRaw as string) : 0;
sp += amount;
await kv.set(`user:${userId}:starpower`, sp.toString());
```

**After (SQL)**:
```typescript
import { query, queryOne, transaction } from './db';

// 读取
const user = await queryOne<{ star_power: number }>(
  'SELECT star_power FROM users WHERE id = $1', [userId]
);
const sp = user?.star_power ?? 0;

// 原子更新（防并发）
await query(
  'UPDATE users SET star_power = star_power + $1, updated_at = NOW() WHERE id = $2',
  [amount, userId]
);

// 事务（购买场景）
await transaction(async (client) => {
  // 1. 扣费
  const { rows: [buyer] } = await client.query(
    'UPDATE users SET star_power = star_power - $1 WHERE id = $2 AND star_power >= $1 RETURNING star_power',
    [cost, buyerId]
  );
  if (!buyer) throw new Error('Insufficient Star Power');
  
  // 2. 卖家收入
  await client.query(
    'UPDATE users SET star_power = star_power + $1 WHERE id = $2',
    [earnings, sellerId]
  );
  
  // 3. 记录交易
  await client.query(
    'INSERT INTO transactions (id, user_id, type, amount, reason, balance_after) VALUES ($1, $2, $3, $4, $5, $6)',
    [txnId, buyerId, 'spend', cost, 'album_purchase', buyer.star_power]
  );
});
```

#### 3.4 Phase 3: 各模块迁移清单

| 路由模块 | KV 操作数 | 主要替换 | 事务需求 | 预估时间 |
|:---|:---|:---|:---|:---|
| `routes-auth.ts` | 2 | `supabase.auth` → JWT 或保留 | 否 | 1h |
| `routes-music.ts` | 12 | `song:*` → `songs/comments/annotations` | 是(点赞) | 2h |
| `routes-starpower.ts` | 20 | `user:*:starpower` → `users.star_power` + `transactions` | 是(购买) | 3h |
| `routes-user.ts` | 8 | `user:*:profile` → `users.*` | 否 | 1h |
| `routes-community.ts` | 10 | `shared-work:*` → `works` | 否 | 1.5h |
| `routes-analytics.ts` | 24 | `song:*:stats` + `listening-history` → SQL JOIN | 否 | 2h |
| `routes-social.ts` | 15 | `achievements` + `notifications` → 独立表 | 否 | 1.5h |
| `routes-spacetime.ts` | 15 | `spacetime:*` → `spacetime_messages` + `time_capsules` | 否 | 2h |
| `routes-challenge.ts` | 12 | `challenges:*` → `challenges` + `challenge_entries` | 是(投票) | 2h |
| `routes-live.ts` | 6 | `live-session:*` → `live_presence` + `live_danmaku` | 否 | 1h |
| `routes-albums.ts` | 30 | `album:*` → `albums` + `album_ownership` | 是(购买) | 3h |
| `routes-market.ts` | 27 | `market:*` → `market_listings` + 交易事务 | 是(买卖) | 3h |
| `routes-pki.ts` | 4 | `pki:*` → `user_public_keys` | 否 | 0.5h |
| **总计** | **~185** | | | **~23h** |

#### 3.5 Phase 4: 认证迁移 (2 方案)

**方案 A: 自签 JWT（完全脱离 Supabase）**

```typescript
// server/auth.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query, queryOne } from './db';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES = '7d';

export async function signup(email: string, password: string, name: string) {
  const hash = await bcrypt.hash(password, 12);
  const [user] = await query(
    'INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id, email, role',
    [email, hash, name]
  );
  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  return { user, token };
}

export async function login(email: string, password: string) {
  const user = await queryOne('SELECT * FROM users WHERE email = $1', [email]);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new Error('Invalid credentials');
  }
  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
  return { user: { id: user.id, email: user.email, role: user.role }, token };
}

// Hono 中间件
export async function requireAuth(c: any, next: () => Promise<void>) {
  const token = c.req.header('Authorization')?.split(' ')[1];
  if (!token) return c.json({ error: 'Unauthorized' }, 401);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    c.set('authedUser', decoded);
    return next();
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
}
```

**方案 B: 保留 Supabase Auth（混合模式）**

```typescript
// 前端继续使用 supabase.auth.signInWithPassword()
// 后端验证 JWT 改为远程调用 Supabase Auth API
import { createClient } from '@supabase/supabase-js';

export async function requireAuth(c: any, next: () => Promise<void>) {
  const token = c.req.header('Authorization')?.split(' ')[1];
  if (!token) return c.json({ error: 'Unauthorized' }, 401);
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return c.json({ error: 'Unauthorized' }, 401);
  c.set('authedUser', { userId: user.id, email: user.email });
  return next();
}
```

**推荐**: 方案 A（完全自主），因为既然目标是脱离 Supabase。

#### 3.6 Phase 5: 前端迁移 (4h)

```typescript
// 1. 修改 api.ts — 替换 BASE_URL
// Before:
const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-f626b673`;
const AUTH_HEADER = `Bearer ${publicAnonKey}`;

// After:
const BASE = process.env.VITE_API_URL || 'http://localhost:3001/api';
// Authorization 头由登录时获取的 JWT token 填充

// 2. 修改 AuthModal.tsx — 替换认证方式
// Before: supabase.auth.signInWithPassword(...)
// After:  fetch(`${BASE}/auth/login`, { method: 'POST', body: JSON.stringify({email, password}) })

// 3. supabase.ts → 可删除或仅保留 Storage 调用
```

#### 3.7 Phase 6: 数据迁移脚本 (8h)

```typescript
// scripts/migrate-kv-to-pg.ts
import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const pg = new Pool({ connectionString: PG_CONNECTION_STRING });

async function getKV(key: string): Promise<any> {
  const { data } = await supabase.from('kv_store_f626b673').select('value').eq('key', key).maybeSingle();
  return data?.value;
}

// === 迁移用户 ===
async function migrateUsers() {
  // 1. 列出所有 user:{id}:profile 键
  const { data: rows } = await supabase.from('kv_store_f626b673')
    .select('key, value')
    .like('key', 'user:%:profile');
  
  for (const row of rows || []) {
    const profile = row.value;
    const userId = row.key.split(':')[1];
    
    // 读取关联数据
    const sp = await getKV(`user:${userId}:starpower`);
    const role = await getKV(`user:${userId}:role`);
    const vip = await getKV(`user:${userId}:vip`);
    
    await pg.query(`
      INSERT INTO users (id, email, display_name, bio, avatar, role, star_power, vip_level, vip_exp, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO NOTHING
    `, [
      userId,
      profile.email || `${userId}@migrated.local`,
      profile.displayName || 'User',
      profile.bio || '',
      profile.avatar || '',
      (role as string) || 'user',
      sp ? parseInt(sp as string) : 100,
      vip?.level || 1,
      vip?.exp || 0,
      profile.joinedAt || new Date().toISOString(),
    ]);
  }
  console.log(`Migrated ${rows?.length || 0} users`);
}

// === 迁移交易记录 ===
async function migrateTransactions() {
  const { data: rows } = await supabase.from('kv_store_f626b673')
    .select('key, value')
    .like('key', 'user:%:transactions');
  
  for (const row of rows || []) {
    const userId = row.key.split(':')[1];
    const txns = Array.isArray(row.value) ? row.value : JSON.parse(row.value);
    
    for (const txn of txns) {
      await pg.query(`
        INSERT INTO transactions (id, user_id, type, amount, reason, detail, balance_after, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, to_timestamp($8::double precision / 1000))
        ON CONFLICT (id) DO NOTHING
      `, [txn.id, userId, txn.type, txn.amount, txn.reason, txn.detail, txn.balance, txn.timestamp]);
    }
  }
}

// === 迁移共享作品 ===
async function migrateWorks() {
  const indexRaw = await getKV('shared-work-index');
  const index = indexRaw ? (Array.isArray(indexRaw) ? indexRaw : JSON.parse(indexRaw)) : [];
  
  for (const workId of index) {
    const work = await getKV(`shared-work:${workId}`);
    if (!work) continue;
    
    await pg.query(`
      INSERT INTO works (id, user_id, user_name, title, theme, lyrics, mode, likes, fork_count, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, to_timestamp($10::double precision / 1000))
      ON CONFLICT (id) DO NOTHING
    `, [
      workId, work.userId, work.userName, work.title, work.theme,
      JSON.stringify(work.lyrics || []), work.mode || 'quick',
      work.likes || 0, work.forkCount || 0, work.createdAt || Date.now(),
    ]);
  }
}

// === 迁移专辑 ===
async function migrateAlbums() {
  const indexRaw = await getKV('album-index');
  const index = indexRaw ? (Array.isArray(indexRaw) ? indexRaw : JSON.parse(indexRaw)) : [];
  
  for (const albumId of index) {
    const album = await getKV(`album:${albumId}`);
    if (!album) continue;
    
    await pg.query(`
      INSERT INTO albums (id, creator_id, creator_name, title, description, genre, tracks, price, limited_edition, max_supply, circulating_supply, likes, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO NOTHING
    `, [
      albumId, album.creatorId, album.creatorName, album.title,
      album.description, album.genre, JSON.stringify(album.tracks),
      album.price, album.limitedEdition, album.maxSupply,
      album.circulatingSupply, album.likes, JSON.stringify(album.tags || []),
    ]);
  }
}

// === 主迁移流程 ===
async function main() {
  console.log('Starting KV → PostgreSQL migration...');
  await migrateUsers();
  await migrateTransactions();
  await migrateWorks();
  await migrateAlbums();
  // ... 其余模块类似
  console.log('Migration complete!');
  await pg.end();
}

main().catch(console.error);
```

#### 3.8 Phase 7: Hono 独立服务器入口

```typescript
// server/index.ts — 替代 supabase/functions/server/index.tsx
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import 'dotenv/config';

// 路由模块（迁移后）
import { registerAuthRoutes } from './routes/auth';
import { registerMusicRoutes } from './routes/music';
import { registerStarpowerRoutes } from './routes/starpower';
// ... 其余 11 个模块

const app = new Hono();

app.use('*', logger());
app.use('/*', cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://dmusic.yyc3.com',
  ],
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

// 路由前缀可简化
const API_PREFIX = '/api';

registerAuthRoutes(app);
registerMusicRoutes(app);
registerStarpowerRoutes(app);
// ...

serve({
  fetch: app.fetch,
  port: parseInt(process.env.PORT || '3001'),
}, (info) => {
  console.log(`D-Music API Server running at http://localhost:${info.port}`);
});
```

---

### 四、迁移风险与缓解

| 风险 | 级别 | 缓解措施 |
|:---|:---|:---|
| 数据丢失 | 高 | 迁移前完整备份 KV 数据；迁移后逐表校验行数 |
| 并发写入冲突 | 中 | KV 模式无事务保护的购买/扣费操作，迁移到 SQL 后用事务修复 |
| 认证切换停服 | 中 | 方案 B 先保留 Supabase Auth，稳定后再切方案 A |
| 索引不足导致慢查询 | 中 | Schema 已预设索引；上线后 `EXPLAIN ANALYZE` 调优 |
| 文件存储迁移 | 低 | 语音桶可暂时保留在 Supabase Storage，后期迁 MinIO |
| 前端 API 不兼容 | 低 | 路由路径保持一致，仅替换 base URL |

---

### 五、迁移验证清单

```
□ Phase 0: PostgreSQL 15 安装 + Schema 执行
□ Phase 1: db.ts 连接池通过连接测试
□ Phase 2: 各路由模块 KV→SQL 替换完成
□ Phase 3: 14 个路由模块编译通过
□ Phase 4: 认证系统（JWT/Supabase）切换完成
□ Phase 5: 前端 API 层 base URL 替换
□ Phase 6: 数据迁移脚本执行成功
□ Phase 7: 独立 Hono 服务器启动
□ E2E 测试: 13 个套件 221+ 用例全部通��
□ 性能对比: SQL 查询 P95 < 200ms
□ 数据完整性: 迁移前后行数一致
```

---

### 六、迁移后收益预估

| 维度 | KV 模式 | PostgreSQL 模式 | 改善 |
|:---|:---|:---|:---|
| 查询能力 | 仅 key 精确匹配 | SQL JOIN + 全文搜索 + 聚合 | **质变** |
| 数据完整性 | 无约束 | 外键 + UNIQUE + CHECK | **大幅提升** |
| 并发安全 | 无事务（race condition） | ACID 事务 | **关键修复** |
| 索引性能 | 无 | B-Tree + GiST + GIN | **10x+ 提速** |
| 分页查询 | `slice()` 内存截断 | `LIMIT/OFFSET` 或游标 | **标准化** |
| 存储效率 | JSON 冗余（索引键重复） | 范式化存储 | **~40% 节省** |
| 运维工具 | Supabase Dashboard | pgAdmin / psql / pg_dump | **更灵活** |
| 六化对标 | 科技化 75% | 科技化 **95%+** | +20% |

---

**文档版本**: v1.0
**创建日期**: 2026-02-25
**维护团队**: YYC3 Team
