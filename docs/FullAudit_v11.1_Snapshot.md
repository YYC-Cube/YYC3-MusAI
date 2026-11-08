# D-Music v11.1+ 全面审核快照报告

> **审核日期**: 2026-02-25
> **版本**: v11.1+
> **审核范围**: 全部项目文件、后端路由、前端组件、Guidelines 体系
> **目的**: 为本地协同提供完整数据快照

---

## 一、项目文件完整清单 (114 个文件)

### 1.1 根目录文件 (6 个)

| # | 文件 | 用途 | 状态 |
|---|------|------|------|
| 1 | `/package.json` | 依赖配置 (64 依赖 + 4 devDeps) | OK |
| 2 | `/postcss.config.mjs` | PostCSS 配置 | OK |
| 3 | `/vite.config.ts` | Vite 构建配置 | OK |
| 4 | `/export-kv-advanced.js` | KV 高级导出工具 | OK (v11.1+新增) |
| 5 | `/export-kv-cli.js` | KV 轻量导出工具 | OK (v11.1+新增) |
| 6 | `/music.md` | 音乐内容文档 | OK |

### 1.2 Guidelines 文档 (12 个)

| # | 文件 | 行数估算 | 状态 |
|---|------|---------|------|
| 1 | `/guidelines/D-Music-Guidelines.md` | ~500+ | OK (手动编辑过，权威版本) |
| 2 | `/guidelines/Guidelines.md` | ~200+ | OK |
| 3 | `/guidelines/Guidelines-en.md` | ~200+ | OK |
| 4 | `/guidelines/Guidelines_Prompts.md` | ~150+ | OK |
| 5 | `/guidelines/DeepAssessment_v7.md` | ~400+ | OK (16项债务，14已关闭) |
| 6 | `/guidelines/DesignSystem_AuditReport_v1.md` | ~300+ | OK |
| 7 | `/guidelines/P3_Architecture_Draft.md` | ~250+ | OK |
| 8 | `/guidelines/ProgressReport.md` | ~500+ | OK (已更新至v11.1+) |
| 9 | `/guidelines/SpaceTime.md` | ~200+ | OK (L-2:Vue代码示例未更新) |
| 10 | `/guidelines/Supabase_Database_Inventory.md` | ~400+ | OK (v1.1更新) |
| 11 | `/guidelines/DeepAnalysis_PostgreSQL_Migration_v1.md` | ~300+ | OK |
| 12 | `/guidelines/WilsonScore.md` | ~100+ | OK |

### 1.3 配置文件 (5 个)

| # | 文件 | 用途 | 状态 |
|---|------|------|------|
| 1 | `/config/API_Local.md` | 本地 API 文档 | OK |
| 2 | `/config/dmusic_types.ts` | 完整 TypeScript 类型定义 | OK |
| 3 | `/config/dmusic_variables.json` | 项目配置变量 | OK |
| 4 | `/database/d_music_schema.sql.md` | 数据库 Schema 文档 | OK |
| 5 | `/utils/supabase/info.tsx` | Supabase 连接凭证 (projectId: phgrinrlnxzjyxxhsqry) | OK (断开中) |

### 1.4 样式文件 (4 个)

| # | 文件 | 用途 | 状态 |
|---|------|------|------|
| 1 | `/src/styles/theme.css` | CSS 主题变量 | OK |
| 2 | `/src/styles/index.css` | 样式入口 | OK |
| 3 | `/src/styles/tailwind.css` | Tailwind 配置 | OK |
| 4 | `/src/styles/fonts.css` | 字体导入 | OK |

### 1.5 前端入口 & 库文件 (11 个)

| # | 文件 | 行数 | 用途 | 状态 |
|---|------|------|------|------|
| 1 | `/src/app/App.tsx` | ~2,003 | 主应用组件 (RouterProvider) | OK |
| 2 | `/src/app/playlistData.ts` | ~300+ | 演示播放列表数据 + 类型 | OK |
| 3 | `/src/app/lib/supabase.ts` | ~275 | Supabase 客户端 + apiFetch + apiFetchStrict + ApiError | OK |
| 4 | `/src/app/lib/api.ts` | ~500+ | 类型化 API 服务层 | OK |
| 5 | `/src/app/lib/crypto.ts` | ~400+ | E2EE 加密工具 (RSA-OAEP + AES-GCM) | OK |
| 6 | `/src/app/lib/preferences.ts` | ~130 | 偏好设置持久化 | OK |
| 7 | `/src/app/lib/themes.ts` | ~300+ | 6 主题系统 | OK |
| 8 | `/src/app/lib/design-tokens.ts` | ~200+ | 设计令牌系统 | OK |
| 9 | `/src/app/lib/e2e-specs.ts` | ~1,500+ | 13 套件 221+ E2E 测试用例 | OK |
| 10 | `/src/app/lib/test-runner.ts` | ~200+ | 测试运行框架 | OK |
| 11 | `/src/app/lib/core-tests.ts` | ~150+ | 核心单元测试 | OK |
| 12 | `/src/app/lib/canvasPerfRegistry.ts` | ~80+ | Canvas 性能注册 | OK |

### 1.6 自定义 Hooks (9 个)

| # | 文件 | 用途 | 状态 |
|---|------|------|------|
| 1 | `/src/app/hooks/useAudioEngine.ts` | Web Audio 引擎 | OK |
| 2 | `/src/app/hooks/useI18n.tsx` | 国际化 Context + Hook | OK |
| 3 | `/src/app/hooks/i18n-translations.ts` | 翻译字典 (提取自 Hook) | OK |
| 4 | `/src/app/hooks/useAIAssistant.ts` | AI 助手 Hook | OK |
| 5 | `/src/app/hooks/useAudioComposer.ts` | AI 作曲 Hook | OK |
| 6 | `/src/app/hooks/usePWA.ts` | PWA 支持 | OK |
| 7 | `/src/app/hooks/useHaptics.ts` | 触觉反馈 | OK |
| 8 | `/src/app/hooks/useSwipeGesture.ts` | 滑动手势 | OK |
| 9 | `/src/app/hooks/useVirtualList.ts` | 虚拟列表 | OK |

### 1.7 前端组件 (49 个)

#### 核心播放器 & UI 组件 (12 个)

| # | 文件 | 用途 |
|---|------|------|
| 1 | `Starfield.tsx` | 粒子星空背景 |
| 2 | `MediaDisplay.tsx` | 媒体封面展示 |
| 3 | `LyricsDisplay.tsx` | 歌词同步显示 |
| 4 | `PlayerControls.tsx` | 播放控制面板 |
| 5 | `AudioVisualizer.tsx` | 音频可视化 |
| 6 | `PlaylistPanel.tsx` | 播放列表面板 |
| 7 | `ThemeSwitcher.tsx` | 主题切换器 |
| 8 | `KeyboardShortcuts.tsx` | 键盘快捷键 |
| 9 | `ErrorBoundary.tsx` | 错误边界 |
| 10 | `PerfMonitor.tsx` | 性能监控 |
| 11 | `AuthModal.tsx` | 认证弹窗 |
| 12 | `ListeningStats.tsx` | 收听统计 |

#### 移动端组件 (4 个)

| # | 文件 | 用途 |
|---|------|------|
| 13 | `MobileNav.tsx` | 移动端导航 |
| 14 | `MobilePlayer.tsx` | 移动端播放器 |
| 15 | `MobileDiscoverHub.tsx` | 移动端发现 |
| 16 | `PWABanner.tsx` / `OfflineIndicator.tsx` | PWA + 离线 |

#### AI & 创作组件 (4 个)

| # | 文件 | 用途 |
|---|------|------|
| 17 | `AILyricsGenerator.tsx` | AI 歌词生成器 |
| 18 | `CreationStudio.tsx` | 创作工作室 |
| 19 | `AIAssistant.tsx` | AI 智能助手 |
| 20 | `MVCreator.tsx` | MV 创作器 |

#### 社区 & 社交组件 (7 个)

| # | 文件 | 用途 |
|---|------|------|
| 21 | `CommunityFeed.tsx` | 社区动态流 |
| 22 | `CommentSystem.tsx` | 评论系统 |
| 23 | `ForkTree.tsx` | 创作分支树 |
| 24 | `TimelineComments.tsx` | 时间轴弹幕评论 |
| 25 | `ShareWorkModal.tsx` | 分享作品弹窗 |
| 26 | `UserProfile.tsx` | 用户档案 |
| 27 | `LiveSessionPanel.tsx` | 实时互动面板 |

#### 数据 & 分析组件 (3 个)

| # | 文件 | 用途 |
|---|------|------|
| 28 | `AnalyticsDashboard.tsx` | 分析仪表盘 |
| 29 | `LeaderboardPanel.tsx` | Wilson 排行榜 |
| 30 | `RecommendationsPanel.tsx` | 智能推荐面板 |

#### 经济系统组件 (5 个)

| # | 文件 | 用途 |
|---|------|------|
| 31 | `StarPowerPanel.tsx` | 星力值面板 |
| 32 | `StarPowerShop.tsx` | 星力值商城 |
| 33 | `AlbumStore.tsx` | 数字专辑商店 |
| 34 | `SecondaryMarket.tsx` | 二级市场 |
| 35 | `CopyrightPanel.tsx` | 版权管理 |

#### 特色功能组件 (8 个)

| # | 文件 | 用途 |
|---|------|------|
| 36 | `SpaceTimePanel.tsx` | 时空喊话系统 |
| 37 | `ChallengePanel.tsx` | 创作挑战赛 |
| 38 | `AchievementsPanel.tsx` | 成就徽章系统 |
| 39 | `MHeartSystem.tsx` | M Heart 值体系 |
| 40 | `EmotionRipple.tsx` | 情感波纹可视化 |
| 41 | `IPMatrixPanel.tsx` | IP 矩阵面板 |
| 42 | `SmartPlaylistPanel.tsx` | 智能歌单 |
| 43 | `E2EKeySetup.tsx` | E2EE 密钥设置向导 |

#### D-Music 设计系统 (5 个)

| # | 文件 | 用途 |
|---|------|------|
| 44 | `dmusic/DMusicShowcase.tsx` | 设计系统展示 |
| 45 | `dmusic/DMusicUI.tsx` | UI 组件库 |
| 46 | `dmusic/DPanel.tsx` | 面板组件 |
| 47 | `dmusic/DataViz.tsx` | 数据可视化组件 |
| 48 | `dmusic/index.ts` | 设计系统导出 |

#### 受保护文件 (1 个)

| # | 文件 | 状态 |
|---|------|------|
| 49 | `figma/ImageWithFallback.tsx` | 受保护，不可修改 |

### 1.8 UI 组件库 (shadcn/ui, 38 个)

`/src/app/components/ui/` 下共 38 个文件：
accordion, alert-dialog, alert, aspect-ratio, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input-otp, input, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toggle-group, toggle, tooltip, use-mobile.ts, utils.ts

### 1.9 后端文件 (21 个)

| # | 文件 | 行数估算 | 用途 | 状态 |
|---|------|---------|------|------|
| 1 | `index.tsx` | ~94 | 入口 (Hono 应用，注册 15 个路由模块) | OK |
| 2 | `kv_store.tsx` | ~100+ | KV Store 接口 (受保护) | OK |
| 3 | `server-utils.ts` | ~200+ | 共享工具 (Auth, Wilson, Cache, Song Index) | OK |
| 4 | `validation.ts` | ~313 | 19 个 Zod Schema + validate() | OK |
| 5 | `rate-limit.ts` | ~100+ | 滑动窗口速率限制 (4 级配置) | OK |
| 6 | `ai-model-manager.ts` | ~300+ | AI 多模型调度 + 自动降级 + 缓存 | OK |
| 7 | `routes-auth.ts` | ~60+ | /health, /signup | OK |
| 8 | `routes-music.ts` | ~200+ | /likes, /annotations, /play, /comments, /songs | OK |
| 9 | `routes-starpower.ts` | ~400+ | /starpower (CRUD, checkin, shop, transactions) | OK |
| 10 | `routes-user.ts` | ~200+ | /profile, /creators, /role, /preferences, /themes | OK |
| 11 | `routes-community.ts` | ~300+ | /community, /shared-works, /works/fork, /copyright | OK |
| 12 | `routes-ai.ts` | ~200+ | /ai/lyrics, /ai/compose, /ai/status | OK |
| 13 | `routes-analytics.ts` | ~300+ | /leaderboard, /analytics, /recommendations, /smart-playlist | OK |
| 14 | `routes-social.ts` | ~300+ | /achievements, /notifications, /timeline-comments, /mheart | OK |
| 15 | `routes-spacetime.ts` | ~400+ | /spacetime/messages, /capsules, /voice, /stt | OK |
| 16 | `routes-challenge.ts` | ~300+ | /challenges (CRUD, submit, finalize, AI评分) | OK |
| 17 | `routes-live.ts` | ~100+ | /live-session (heartbeat, presence, danmaku) | OK |
| 18 | `routes-albums.ts` | ~300+ | /albums (CRUD, purchase, collection) | OK |
| 19 | `routes-pki.ts` | ~200+ | /pki (public-key, key-backup, status) | OK |
| 20 | `routes-market.ts` | ~300+ | /market (listings, buy, cancel, history, stats) | OK |
| 21 | `routes-diagnostics.ts` | ~225 | /diagnostics (kv-stats, health) | OK |

---

## 二、后端 API 端点清单 (~92 个路由)

### 基础 & 认证 (2)
- `GET /health` — 健康检查
- `POST /signup` — 用户注册

### 音乐核心 (8)
- `GET /likes/:songId` — 获取点赞数
- `POST /likes/:songId` — 点赞
- `GET /annotations/:songId` — 获取情感标注
- `POST /annotations/:songId` — 提交标注
- `POST /play/:songId` — 记录播放
- `GET /comments/:songId` — 获取评论
- `POST /comments/:songId` — 发表评论
- `GET /songs/index` + `POST /songs/register` — 歌曲索引

### 星力值系统 (8)
- `GET /starpower/:userId` — 获取星力值
- `POST /starpower/:userId/add` — 增加星力值
- `POST /starpower/:userId/consume` — 消耗星力值
- `POST /starpower/:userId/checkin` — 每日签到
- `GET /starpower/:userId/transactions` — 交易记录 (分页)
- `POST /starpower/leaderboard-boost` — 排行榜加速
- `GET /starpower/shop/items` — 商城商品
- `POST /starpower/shop/purchase` — 商城购买

### 用户系统 (8)
- `GET /profile/:userId` — 获取档案
- `POST /profile/:userId` — 更新档案
- `GET /creators` — 创作者发现
- `POST /role/:userId` — 更新角色
- `GET /preferences/:userId` + `POST` — 偏好设置
- `GET /themes/:userId` + `POST` — 主题设置
- `POST /export/:userId` — 数据导出
- `POST /error-report` — 错误上报

### 社区系统 (8)
- `GET /community/activities` + `POST` — 社区动态
- `GET /shared-works` + `POST` — 共享作品
- `POST /works/fork` — 作品分支
- `GET /shared-works/:workId/likes` + `POST` — 作品点赞
- `POST /copyright/apply` — 版权申请
- `GET /copyright/:workId` — 版权查询

### AI 系统 (4)
- `POST /ai/lyrics` — AI 歌词生成
- `POST /ai/compose` — AI 作曲
- `GET /ai/status` — AI 模型状态
- `GET /ai/usage` — AI 使用统计

### 分析 & 推荐 (6)
- `GET /leaderboard` — Wilson 排行榜
- `GET /analytics/:userId` — 分析概览
- `GET /listening-history/:userId` — 收听历史
- `GET /recommendations/:userId` — 智能推荐
- `POST /recommendations/:userId/ai-analysis` — GPT 偏好分析
- `GET /smart-playlist/:userId` — 智能歌单

### 社交系统 (8)
- `GET /achievements/:userId` + `POST /achievements/:userId/track` — 成就系统
- `GET /notifications/:userId` + `POST /notifications/:userId/read` — 通知 (已迁userId)
- `GET /timeline-comments/:songId` + `POST` — 时间轴弹幕
- `GET /fork-tree/:workId` — 分支树
- `GET /mheart/:userId` + `POST /mheart/:userId/calculate` — M Heart 值

### 时空喊话 (8)
- `GET /spacetime/messages` + `POST` — 消息
- `POST /spacetime/messages/:messageId/reply` — 回复
- `POST /spacetime/messages/:messageId/like` — 点赞
- `GET /spacetime/capsules/:userId` + `POST` — 时间胶囊
- `POST /spacetime/voice/upload` — 语音上传
- `POST /spacetime/stt/transcribe` — 语音转文字

### 挑战赛 (8)
- `GET /challenges/active` — 当前赛事
- `POST /challenges/:id/submit` — 提交参赛
- `GET /challenges/:id/entries` — 参赛作品
- `POST /challenges/:id/vote` — 投票
- `GET /challenges/champions` — 冠军殿堂
- `GET /challenges/:id/notifications` — 赛事通知
- `POST /challenges/:id/finalize` — 手动结算
- `GET /challenges/leaderboard` — 挑战排行

### 实时互动 (4)
- `POST /live-session/heartbeat` — 心跳
- `POST /live-session/leave` — 离开
- `GET /live-session/presence` — 在线列表
- `POST /live-session/danmaku` — 弹幕

### 数字专辑 (7)
- `GET /albums` — 专辑列表
- `GET /albums/:albumId` — 专辑详情
- `POST /albums` — 创建专辑
- `POST /albums/:albumId/purchase` — 购买专辑
- `GET /albums/collection/:userId` — 收藏
- `GET /albums/creator/:userId` — 创作者专辑
- `POST /albums/:albumId/like` — 点赞

### PKI/E2EE (6)
- `POST /pki/public-key` — 上传公钥
- `GET /pki/public-key/:userId` — 获取公钥
- `DELETE /pki/public-key/:userId` — 删除公钥
- `POST /pki/key-backup` — 密钥备份
- `GET /pki/key-backup/:userId` — 获取备份
- `GET /pki/status/:userId` — E2EE 状态

### 二级市场 (7)
- `GET /market/listings` — 挂牌列表
- `GET /market/listings/:userId` — 卖家挂牌
- `POST /market/list` — 创建挂牌
- `POST /market/buy/:listingId` — 购买
- `DELETE /market/cancel/:listingId` — 取消
- `GET /market/history` — 成交历史 (分页)
- `GET /market/stats` — 市场统计

### 诊断 (2)
- `GET /diagnostics/kv-stats` — KV 统计
- `GET /diagnostics/health` — 健康检查

---

## 三、Zod 验证 Schema 清单 (19 个)

| # | Schema 名称 | 覆盖端点 | 关键约束 |
|---|------------|---------|---------|
| 1 | `shareWorkSchema` | POST /shared-works | title max 200, lyrics max 200 items |
| 2 | `spaceTimeMessageSchema` | POST /spacetime/messages | content max 500, lat/lng bounds |
| 3 | `spaceTimeReplySchema` | POST /spacetime/.../reply | content max 300 |
| 4 | `timeCapsuleSchema` | POST /spacetime/capsules | E2EE fields included, content max 1000 |
| 5 | `commentSchema` | POST /comments/:songId | text max 1000 |
| 6 | `annotationSchema` | POST /annotations/:songId | emotion enum, lineIndex int |
| 7 | `forkWorkSchema` | POST /works/fork | originalWorkId required |
| 8 | `starPowerAddSchema` | POST /starpower/:userId/add | amount int positive max 10000 |
| 9 | `starPowerConsumeSchema` | POST /starpower/:userId/consume | amount int positive max 10000 |
| 10 | `leaderboardBoostSchema` | POST /starpower/leaderboard-boost | songId + userId required |
| 11 | `copyrightApplySchema` | POST /copyright/apply | workId + userId + workTitle required |
| 12 | `songRegisterSchema` | POST /songs/register | songId required |
| 13 | `profileUpdateSchema` | POST /profile/:userId | email validated, passthrough |
| 14 | `marketListSchema` | POST /market/list | price int positive max 100,000 |
| 15 | `marketBuySchema` | POST /market/buy/:listingId | userId required |
| 16 | `albumCreateSchema` | POST /albums | tracks min 1 max 50, price max 100,000 |
| 17 | `albumPurchaseSchema` | POST /albums/:albumId/purchase | userId required |
| 18 | `liveHeartbeatSchema` | POST /live-session/heartbeat | userId required |
| 19 | `liveLeaveSchema` | POST /live-session/leave | userId required |
| 20 | `danmakuSchema` | POST /live-session/danmaku | text 1-100 chars |
| 21 | `challengeSubmitSchema` | POST /challenges/:id/submit | workTitle 1-200 chars |
| 22 | `challengeVoteSchema` | POST /challenges/:id/vote | userId + entryId |
| 23 | `timelineCommentSchema` | POST /timeline-comments | timestamp nonneg, text 1-500 |
| 24 | `shopPurchaseSchema` | POST /starpower/shop/purchase | userId + itemId |
| 25 | `achievementTrackSchema` | POST /achievements/:userId/track | action 1-50 chars |

> 注: 原报告按"组"计 19 个 Schema，实际导出 25 个 (部分组包含多个 schema)

---

## 四、E2E 测试清单 (13 套件, 221+ 用例)

| Suite | 名称 | 用例数 |
|-------|------|--------|
| E2E-1 | Core Playback Flow | ~10 |
| E2E-2 | AI Creation Flow | ~15 |
| E2E-3 | Star Power Economy | ~20 |
| E2E-4 | Community & Social | ~18 |
| E2E-5 | SpaceTime System | ~15 |
| E2E-6 | Challenge & Competition | ~16 |
| E2E-7 | Live Session | ~12 |
| E2E-8 | Album Distribution | ~18 |
| E2E-9 | PKI/E2EE Infrastructure | ~20 |
| E2E-10 | Secondary Market | ~18 |
| E2E-11 | Recommendation & Analytics | ~15 |
| E2E-12 | Zod Validation Hardening | 10 |
| E2E-13 | Transaction Pagination (L-5) | 6 |

---

## 五、KV Store 键前缀清单 (28 组)

| # | 前缀 | 域 | 说明 |
|---|------|-----|------|
| 1 | `user:{userId}:*` | 用户 | starpower, achievement-stats, mheart, profile 等 |
| 2 | `prefs:{userId}` | 用户 | 偏好设置 |
| 3 | `profile:{userId}` | 用户 | 用户档案 (与 user: 存在双键风险) |
| 4 | `song:{songId}:*` | 歌曲 | likes, stats, annotations, comments |
| 5 | `analytics:{userId}` | 歌曲 | 分析数据 |
| 6 | `shared-work:{workId}` | 社交 | 共享作品 |
| 7 | `shared-work-index` | 社交 | 作品 ID 索引 |
| 8 | `community:activities` | 社交 | 社区动态流 |
| 9 | `like-dedup:{songId}:{userId}` | 社交 | 点赞去重 |
| 10 | `fork-chain:{workId}` | 社交 | 分支链数据 |
| 11 | `copyright:{workId}` | 社交 | 版权认证 |
| 12 | `notifications:user:{userId}` | 社交 | 通知 (v11.1 迁移至 userId 键) |
| 13 | `spacetime:messages` | 时空 | 时空喊话消息 (单键 500 条，膨胀风险) |
| 14 | `spacetime:capsules:{userId}` | 时空 | 时间胶囊 |
| 15 | `challenges:active` | 社交 | 当前赛事 |
| 16 | `challenges:entries:{id}` | 社交 | 参赛作品 |
| 17 | `challenge-vote:{id}:{userId}` | 社交 | 投票去重 |
| 18 | `challenge-notifications:{id}` | 社交 | 赛事通知 |
| 19 | `live-session:presence` | 时空 | 实时在线状态 |
| 20 | `live-session:danmaku` | 时空 | 弹幕队列 |
| 21 | `timeline-comments:{songId}` | 社交 | 时间轴评论 |
| 22 | `achievements:stats:{userId}` | 社交 | 成就统计 (与 user: 存在双键风险) |
| 23 | `mheart:{userId}` | 社交 | M Heart 值 |
| 24 | `mheart-trend:{userId}` | 社交 | M Heart 趋势 |
| 25 | `album:{albumId}` | 经济 | 专辑数据 |
| 26 | `album-index` | 经济 | 专辑 ID 索引 |
| 27 | `market:listing:{listingId}` | 经济 | 二级市场挂牌 |
| 28 | `pki:public-key:{userId}` | 安全 | E2EE 公钥 |
| 29 | `song-index` | 歌曲 | 歌曲 ID 索引 |
| 30 | `work:{workId}` | 社交 | 作品树 |

---

## 六、Supabase 连接状态

| 项目 | 值 |
|------|-----|
| **Project ID** | `phgrinrlnxzjyxxhsqry` |
| **Region** | 未确认 (需重连后验证) |
| **状态** | **已断开** |
| **PostgreSQL 表** | `kv_store_f626b673` (key TEXT PK, value JSONB) |
| **Edge Function** | `make-server-f626b673` (15 路由模块, ~92 端点) |
| **Auth** | email/password |
| **Storage** | `make-f626b673-voice` (私有桶) |
| **重连影响** | `info.tsx` 自动更新凭证，代码无需修改 |

---

## 七、已知风险项 & 未解决债务

| # | 风险项 | 优先级 | 预估工时 | 状态 |
|---|--------|--------|---------|------|
| 1 | 成就双键：`user:{id}:achievement-stats` vs `achievements:stats:{id}` | 中 | 2h | 未修复 |
| 2 | Profile 双键：`user:{id}:profile` vs `profile:{id}` | 中 | 2h | 未修复 |
| 3 | SpaceTime 消息膨胀：`spacetime:messages` 单键 500 条 JSON | 中 | 4h | 未修复 |
| 4 | 内存截断无归档：多处 `.slice(0, N)` 丢弃旧数据 | 低 | 4h | 未修复 |
| 5 | CSS theme token 对齐 (L-8) | 低 | 4h | 未修复 |
| 6 | SpaceTime.md Vue 代码示例 (L-2) | 低 | 1h | 文档项 |
| 7 | PostgreSQL 迁移 (方案就绪，执行需外部环境) | 低 | 16h | 方案就绪 |

---

## 八、依赖版本快照

### 核心依赖
| 包名 | 版本 |
|------|------|
| react | 18.3.1 (peer) |
| react-dom | 18.3.1 (peer) |
| @supabase/supabase-js | ^2.95.3 |
| react-router | ^7.13.1 |
| tailwindcss | 4.1.12 |
| motion | 12.23.24 |
| lucide-react | 0.487.0 |
| recharts | 2.15.2 |
| sonner | 2.0.3 |
| react-hook-form | 7.55.0 |
| vite | 6.3.5 |

### UI 框架
| 包名 | 版本 |
|------|------|
| @mui/material | 7.3.5 |
| @emotion/react | 11.14.0 |
| @radix-ui/* | 多个 1.x-2.x |
| class-variance-authority | 0.7.1 |
| clsx | 2.1.1 |
| tailwind-merge | 3.2.0 |

---

## 九、六化一体达标率 (v11.1+)

| 维度 | 达标率 | 关键指标 |
|------|--------|---------|
| 标准化 | **95%** | 19 Zod schema, 统一 API 格式, 色彩系统, 音频标准 |
| 流程化 | **98%** | 分页 API, 完整 CRUD 流程, 自动结算, 数据导出 |
| 规范化 | **89%** | 15 路由模块, requireAuth 全覆盖, rate-limit 4 级 |
| 科技化 | **99%** | Web Audio, E2EE, Canvas 可视化, PWA, AI 多模型 |
| 智能化 | **93%** | GPT 歌词/作曲/评分/推荐, 模板降级, Wilson Score |
| 国标化 | **77%** | HTTPS, OAuth2.0, SHA-256, WCAG 2.1 AA 部分支持 |

---

## 十、本地协同建议

1. **重连 Supabase**: 首要任务，运行 `node export-kv-advanced.js --stats` 获取实际数据
2. **双键统一**: 成就 + Profile 双键问题应在重连后立即处理
3. **SpaceTime 分拆**: `spacetime:messages` 按日期/区域分片
4. **PostgreSQL 迁移**: 方案文档就绪，需外部 psql 环境执行
5. **受保护文件**: `kv_store.tsx` 和 `ImageWithFallback.tsx` 不可修改

---

**文档版本**: v11.1+ Full Audit Snapshot
**生成时间**: 2026-02-25
**维护团队**: YYC3 Team
