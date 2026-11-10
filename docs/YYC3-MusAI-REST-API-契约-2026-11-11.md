---
file: YYC3-MusAI-REST-API-契约-2026-11-11.md
title: YYC³ MusAI REST API 契约（P1-3）
description: 服务端 124 个端点的统一约定、鉴权、限流、错误码与请求校验清单
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-11
updated: 2026-11-11
status: active
tags: [api, contract, rest, hono, node20]
category: reference
language: zh-CN
audience: developers,frontend,backend
complexity: intermediate
---

# YYC³ MusAI REST API 契约

> 本文由 `packages/music-server/src/routes-*.ts` 源码扫描生成（方法/路径/鉴权/限流/校验均可回溯到代码），
> 作为 P1-3 交付物，供前端（`@yyc3/music-utils` 的 `apiFetch`）与服务端并行开发时对齐。

## 一、概览

| 项 | 值 |
| --- | --- |
| 运行时 | Node 20+，`node src/index.ts`（Hono + `@hono/node-server`） |
| 端口 | `PORT`（默认 8080），`HOST`（默认 `0.0.0.0`） |
| 路由前缀 | `/make-server-f626b673`（`ROUTE_PREFIX`） |
| 端点总数 | **124**（GET 64 / POST 56 / DELETE 3 / PUT 1） |
| 路由模块 | 16 个 `routes-*.ts` |
| 数据源 | 关系表 `musai.*`（读优先）+ KV `musai.kv_store`（回退） |
| 校验 | Zod（25 个共享 schema + 5 个上传域 schema） |

## 二、通用约定

### 2.1 请求

- **Base URL**：`{origin}/make-server-f626b673`
- **Content-Type**：`application/json; charset=utf-8`（分片上传同样为 JSON + base64 载荷）
- **鉴权**：`Authorization: Bearer <access_token>`；标注 ✅ 的端点由 `requireAuth` 中间件校验，
  未授权统一返回 **401** `{"error":"Unauthorized – valid access token required"}`
- **请求体**：由 Zod schema 校验，失败返回 **400** `{"error":"Validation failed: <path>: <message>; ..."}`

> 说明：鉴权列仅统计 `requireAuth` 中间件。部分端点通过 `getUserFromRequest` 内联校验
> （如 `POST /user/role/:userId` 要求 admin、`GET /export/:userId` 要求本人），或仅信任请求体中的 `userId`。

### 2.2 响应

成功响应直接返回领域对象（历史约定，不强制外层包裹）：

```json
{ "success": true, "album": { "id": "album-xxx" } }
```

列表类端点返回 `{ "<domain>": [...], "total": <number> }`。

### 2.3 错误码

| 状态码 | 语义 | 响应体 |
| --- | --- | --- |
| 200 | 成功 | 领域对象 |
| 400 | 参数/校验失败 | `{ "error": "..." }` |
| 401 | 未认证或 token 无效 | `{ "error": "Unauthorized ..." }` |
| 403 | 无权限（如非 admin） | `{ "error": "Unauthorized: admin only" }` |
| 404 | 资源不存在 | `{ "error": "<X> not found" }` |
| 409 | 状态冲突（如售罄/并发购买） | `{ "error": "...", "soldOut": true }` |
| 429 | 触发限流 | `{ "error": "Too many requests" }` + `Retry-After` |
| 500 | 服务端异常 | `{ "error": "...", "detail": "<原因>" }` |

### 2.4 限流档位

| 档位 | 额度 | 窗口 | 典型端点 |
| --- | --- | --- | --- |
| 标准 `STANDARD` | 30 次 | 1 分钟 | 评论、投稿、时空消息、弹幕 |
| 敏感 `SENSITIVE` | 20 次 | 1 分钟 | 点赞、投票、上传初始化、PKI 写入 |
| 星力 `STARPOWER` | 10 次 | 1 分钟 | 购买、消费、榜单加成 |
| 重型 `HEAVY` | 5 次 | 1 分钟 | AI 生成、STT |
| 认证 `AUTH` | 10 次 | 5 分钟 | 注册 |

客户端应对 429 做退避重试（`apiFetch` 已实现按 `Retry-After` 等待）。

### 2.5 数据源与一致性

- 关系表优先（`musai.users/albums/musics/media_files/pki_*`），未命中回退 KV；
- 写操作 **双写**：KV 为响应基线，关系表侧尽力同步（PG 不可用仅告警，不影响主流程）；
- `KV_DRIVER=pg|supabase` 控制 KV 后端，默认 `pg`；`DB_DISABLED=1` 可让关系表读返回空、写跳过（测试用）。

### 2.6 分页

现有列表端点多为 `limit` 上限截断（50 / 200 / 500），尚无统一 `offset` 游标；
新端点建议统一 `?limit=&cursor=`，并在响应返回 `nextCursor`。

## 三、端点清单

### 认证与健康检查（`routes-auth.ts`，2 个端点）

服务存活探测与新用户注册。

| 方法 | 路径 | 鉴权 | 限流 | 请求校验 |
| --- | --- | --- | --- | --- |
| GET | `/health` | — | — | — |
| POST | `/signup` | — | 认证 10/5min | — |

### 歌曲互动（`routes-music.ts`，10 个端点）

点赞、情绪注释、播放记录、评论、曲目索引。

| 方法 | 路径 | 鉴权 | 限流 | 请求校验 |
| --- | --- | --- | --- | --- |
| GET | `/likes/:songId` | — | — | — |
| POST | `/likes/:songId` | — | 敏感 20/min | — |
| GET | `/annotations/:songId` | — | — | — |
| POST | `/annotations/:songId` | — | 标准 30/min | `annotationSchema` |
| POST | `/play/:songId` | — | — | — |
| GET | `/comments/:songId` | — | — | — |
| POST | `/comments/:songId` | ✅ | 标准 30/min | `commentSchema` |
| POST | `/comments/:songId/like/:commentId` | — | — | — |
| GET | `/songs/index` | — | — | — |
| POST | `/songs/register` | — | — | `songRegisterSchema` |

### 用户中心（`routes-user.ts`，12 个端点）

资料、角色、偏好、主题解锁、数据导出、错误上报、创作者发现。

| 方法 | 路径 | 鉴权 | 限流 | 请求校验 |
| --- | --- | --- | --- | --- |
| GET | `/creators` | — | — | — |
| GET | `/creators/:userName/works` | — | — | — |
| GET | `/profile/:userId` | — | — | — |
| POST | `/profile/:userId` | ✅ | — | `profileUpdateSchema` |
| GET | `/user/role/:userId` | — | — | — |
| POST | `/user/role/:userId` | — | — | — |
| GET | `/user/:userId/unlocked-themes` | — | — | — |
| POST | `/user/:userId/unlocked-themes` | ✅ | — | — |
| GET | `/preferences/:userId` | — | — | — |
| POST | `/preferences/:userId` | ✅ | — | — |
| POST | `/error-report` | — | — | — |
| GET | `/export/:userId` | — | — | — |

### 数字专辑（`routes-albums.ts`，7 个端点）

专辑列表/详情/创建/购买/点赞与收藏。

| 方法 | 路径 | 鉴权 | 限流 | 请求校验 |
| --- | --- | --- | --- | --- |
| GET | `/albums` | — | — | — |
| GET | `/albums/:albumId` | — | — | — |
| POST | `/albums` | ✅ | — | `albumCreateSchema` |
| POST | `/albums/:albumId/purchase` | ✅ | 星力 10/min | `albumPurchaseSchema` |
| GET | `/albums/collection/:userId` | — | — | — |
| GET | `/albums/creator/:userId` | — | — | — |
| POST | `/albums/:albumId/like` | — | — | — |

### 星力体系（`routes-starpower.ts`，10 个端点）

星力读写、签到、交易流水、等级、消费、排行榜加成、商店与背包。

| 方法 | 路径 | 鉴权 | 限流 | 请求校验 |
| --- | --- | --- | --- | --- |
| GET | `/starpower/:userId` | — | — | — |
| POST | `/starpower/:userId` | ✅ | 星力 10/min | `starPowerAddSchema` |
| POST | `/starpower/:userId/checkin` | ✅ | 星力 10/min | — |
| GET | `/starpower/:userId/transactions` | — | — | — |
| GET | `/starpower/:userId/level` | — | — | — |
| POST | `/starpower/:userId/consume` | ✅ | 星力 10/min | `starPowerConsumeSchema` |
| POST | `/leaderboard/boost` | ✅ | 星力 10/min | `leaderboardBoostSchema` |
| GET | `/starpower/shop/items` | — | — | — |
| POST | `/starpower/shop/purchase` | ✅ | — | `shopPurchaseSchema` |
| GET | `/starpower/shop/inventory/:userId` | — | — | — |

### 二级市场（`routes-market.ts`，7 个端点）

挂单、购买、撤单、成交历史与市场统计。

| 方法 | 路径 | 鉴权 | 限流 | 请求校验 |
| --- | --- | --- | --- | --- |
| GET | `/market/listings` | — | — | — |
| GET | `/market/listings/:userId` | — | — | — |
| POST | `/market/list` | ✅ | 敏感 20/min | `marketListSchema` |
| POST | `/market/buy/:listingId` | ✅ | 星力 10/min | `marketBuySchema` |
| DELETE | `/market/cancel/:listingId` | — | 敏感 20/min | — |
| GET | `/market/history` | — | — | — |
| GET | `/market/stats` | — | — | — |

### 社区与版权（`routes-community.ts`，11 个端点）

动态、共享作品、分叉、版权申请与校验。

| 方法 | 路径 | 鉴权 | 限流 | 请求校验 |
| --- | --- | --- | --- | --- |
| GET | `/community/activities` | — | — | — |
| POST | `/community/activities` | ✅ | — | — |
| POST | `/shared-works` | ✅ | 标准 30/min | `shareWorkSchema` |
| GET | `/shared-works` | — | — | — |
| POST | `/shared-works/:workId/like` | — | 敏感 20/min | — |
| POST | `/works/fork` | ✅ | 标准 30/min | `forkWorkSchema` |
| GET | `/works/:workId/forks` | — | — | — |
| POST | `/copyright/apply` | ✅ | — | — |
| GET | `/copyright/:workId` | — | — | — |
| GET | `/copyright/user/:userId` | — | — | — |
| POST | `/copyright/verify` | — | — | — |

### 社交与成就（`routes-social.ts`，9 个端点）

成就、通知、时间轴评论、分叉树、M 心。

| 方法 | 路径 | 鉴权 | 限流 | 请求校验 |
| --- | --- | --- | --- | --- |
| GET | `/achievements/:userId` | — | — | — |
| POST | `/achievements/:userId/track` | ✅ | — | `achievementTrackSchema` |
| GET | `/notifications/:userId` | — | — | — |
| POST | `/notifications/:userId/read` | — | — | — |
| GET | `/timeline-comments/:songId` | — | — | — |
| POST | `/timeline-comments/:songId` | ✅ | 标准 30/min | — |
| POST | `/timeline-comments/:songId/like/:commentId` | — | 敏感 20/min | — |
| GET | `/works/fork-tree/:workId` | — | — | — |
| GET | `/mheart/:userId` | — | — | — |

### 时空与语音（`routes-spacetime.ts`，12 个端点）

时空消息/回信/胶囊、附近消息、语音上传与 STT。

| 方法 | 路径 | 鉴权 | 限流 | 请求校验 |
| --- | --- | --- | --- | --- |
| POST | `/spacetime/messages` | ✅ | 标准 30/min | `spaceTimeMessageSchema` |
| GET | `/spacetime/messages` | — | — | — |
| POST | `/spacetime/messages/:messageId/like` | — | 敏感 20/min | — |
| POST | `/spacetime/messages/:messageId/reply` | — | — | `spaceTimeReplySchema` |
| GET | `/spacetime/messages/:messageId/replies` | — | — | — |
| POST | `/spacetime/capsules` | ✅ | 标准 30/min | `timeCapsuleSchema` |
| GET | `/spacetime/capsules` | — | — | — |
| POST | `/spacetime/capsules/:capsuleId/like` | — | — | — |
| GET | `/spacetime/messages/nearby` | — | — | — |
| POST | `/voice/upload` | — | — | — |
| GET | `/voice/url` | — | — | — |
| POST | `/stt/transcribe` | — | — | — |

### 创作挑战（`routes-challenge.ts`，7 个端点）

挑战列表、投稿、投票、冠军、通知与结算。

| 方法 | 路径 | 鉴权 | 限流 | 请求校验 |
| --- | --- | --- | --- | --- |
| GET | `/challenges/active` | — | — | — |
| POST | `/challenges/:challengeId/submit` | ✅ | — | `challengeSubmitSchema` |
| GET | `/challenges/:challengeId/entries` | — | — | — |
| POST | `/challenges/:challengeId/vote` | ✅ | — | `challengeVoteSchema` |
| GET | `/challenges/champions` | — | — | — |
| GET | `/challenges/notifications/:userId` | — | — | — |
| POST | `/challenges/:challengeId/finalize` | ✅ | — | — |

### 直播会话（`routes-live.ts`，5 个端点）

心跳、离场、在线状态、弹幕。

| 方法 | 路径 | 鉴权 | 限流 | 请求校验 |
| --- | --- | --- | --- | --- |
| POST | `/live-session/heartbeat` | — | — | `liveHeartbeatSchema` |
| POST | `/live-session/leave` | — | — | `liveLeaveSchema` |
| GET | `/live-session/presence` | — | — | — |
| POST | `/live-session/danmaku` | — | 标准 30/min | `danmakuSchema` |
| GET | `/live-session/danmaku` | — | — | — |

### 媒体上传（`routes-upload.ts`，9 个端点）

单文件/分片上传、歌词编辑、媒体查询与删除。

| 方法 | 路径 | 鉴权 | 限流 | 请求校验 |
| --- | --- | --- | --- | --- |
| POST | `/upload/media` | — | 敏感 20/min | `mediaUploadSchema` |
| POST | `/upload/chunk/init` | — | 敏感 20/min | `chunkInitSchema` |
| POST | `/upload/chunk/:sessionId` | — | — | `chunkUploadSchema` |
| POST | `/upload/chunk/:sessionId/complete` | — | — | — |
| PUT | `/upload/media/:mediaId/lyrics` | — | 敏感 20/min | `saveLyricsSchema` |
| GET | `/upload/media/:mediaId/lyrics` | — | — | — |
| GET | `/upload/media/:mediaId` | — | — | — |
| GET | `/upload/media` | — | — | — |
| DELETE | `/upload/media/:mediaId` | — | 敏感 20/min | — |

### 端到端加密 PKI（`routes-pki.ts`，6 个端点）

公钥登记、密钥备份、轮换与状态查询。

| 方法 | 路径 | 鉴权 | 限流 | 请求校验 |
| --- | --- | --- | --- | --- |
| POST | `/pki/public-key` | — | 敏感 20/min | — |
| GET | `/pki/public-key/:userId` | — | — | — |
| DELETE | `/pki/public-key/:userId` | — | 敏感 20/min | — |
| POST | `/pki/key-backup` | — | 敏感 20/min | — |
| GET | `/pki/key-backup/:userId` | — | — | — |
| GET | `/pki/status/:userId` | — | — | — |

### AI 能力（`routes-ai.ts`，6 个端点）

歌词生成、作曲、模型状态与用量。

| 方法 | 路径 | 鉴权 | 限流 | 请求校验 |
| --- | --- | --- | --- | --- |
| POST | `/ai/lyrics` | — | 重型 5/min | — |
| POST | `/ai/compose` | — | 重型 5/min | — |
| GET | `/ai/status` | — | — | — |
| GET | `/ai/usage` | — | — | — |
| POST | `/stt/transcribe` | — | 重型 5/min | — |
| POST | `/stt/stream` | — | 重型 5/min | — |

### 数据分析（`routes-analytics.ts`，9 个端点）

排行榜、总览、收听历史/统计、推荐、智能歌单与缓存统计。

| 方法 | 路径 | 鉴权 | 限流 | 请求校验 |
| --- | --- | --- | --- | --- |
| GET | `/leaderboard` | — | — | — |
| GET | `/analytics/overview` | — | — | — |
| POST | `/listening-history` | — | — | — |
| GET | `/recommendations/:userId` | — | — | — |
| GET | `/listening-history/:userId` | — | — | — |
| GET | `/listening-stats/:userId` | — | — | — |
| GET | `/smart-playlist/:userId` | — | — | — |
| GET | `/cache/stats` | — | — | — |
| GET | `/recommendations/:userId/ai-analysis` | — | — | — |

### 诊断（`routes-diagnostics.ts`，2 个端点）

KV 统计与健康检查。

| 方法 | 路径 | 鉴权 | 限流 | 请求校验 |
| --- | --- | --- | --- | --- |
| GET | `/diagnostics/kv-stats` | — | — | — |
| GET | `/diagnostics/health` | — | — | — |

## 四、请求校验（Zod）

### 4.1 共享 schema（`src/validation.ts`）

| Schema | 关键字段 |
| --- | --- |
| `profileUpdateSchema` | `displayName?`(≤64)、`bio?`(≤500)、`email?`(email/空)、`avatar?`(url≤500)，`.passthrough()` 允许扩展字段 |
| `albumCreateSchema` | `creatorId`、`title`(必填)、`tracks[]`(1–50，含 `title`/`songId?`/`artist?`/`duration?`)、`price?`(≤100000)、`limitedEdition?`、`maxSupply?`、`tags?`(≤20) |
| `albumPurchaseSchema` | `userId` |
| `commentSchema` | `userId?`(默认 `anon`)、`userName`、`text`(≤1000)、`timestamp?` |
| `annotationSchema` | `lineIndex`(非负整数)、`emotion`(枚举) |
| `shareWorkSchema` | 作品标题/主题/歌词等共享字段 |
| `forkWorkSchema` | `userId`、`originalWorkId`、`title`、`theme?`、`lyrics?`(≤200 行) |
| `copyrightApplySchema` | `workId`、`userId`、`workTitle`、`description?`(≤2000) |
| `songRegisterSchema` | `songId` |
| `starPowerAddSchema` | `amount`(1–10000)、`reason` |
| `starPowerConsumeSchema` | `amount`(1–10000)、`purpose`、`targetId?` |
| `leaderboardBoostSchema` | `songId`、`userId`、`amount?`(默认 100)、`starPowerCost?` |
| `marketListSchema` | `userId`、`albumId`、`price`(1–100000) |
| `marketBuySchema` | `userId`、`userName?` |
| `shopPurchaseSchema` | 商品 id / 数量等 |
| `achievementTrackSchema` | 成就推进事件字段 |
| `spaceTimeMessageSchema` / `spaceTimeReplySchema` | 时空消息与回信内容 |
| `timeCapsuleSchema` | 胶囊标题/内容/解锁时间 |
| `challengeSubmitSchema` / `challengeVoteSchema` | 投稿与投票字段 |
| `liveHeartbeatSchema` / `liveLeaveSchema` / `danmakuSchema` | 直播会话与弹幕 |
| `timelineCommentSchema` | 时间轴评论 |

### 4.2 上传域本地 schema（`src/routes-upload.ts`）

| Schema | 用途 |
| --- | --- |
| `mediaUploadSchema` | 单文件上传：`userId`、`fileName`、`mimeType`、`fileBase64`、可选封面与元数据 |
| `chunkInitSchema` | 分片初始化：文件元信息与总分片数 |
| `chunkUploadSchema` | 分片上传：`index` + `chunkBase64` |
| `lyricsLineSchema` | 单行歌词（`time` + `text`），被 `saveLyricsSchema` 复用 |
| `saveLyricsSchema` | 歌词数组（`lyricsLineSchema[]`），保存时按时间排序 |

## 五、与前端契约的注意事项

1. **错误体不统一为 `{ error }`**：部分 409 会附带 `soldOut` 等业务字段，前端应保留原始 body（`ApiError.data`）。
2. **鉴权边界**：`/pki/*` 与上传类端点在文档层面标注“需登录”，但代码暂未挂 `requireAuth`（见 §6 待加固）；
   前端在未登录场景不应假设 401，需处理 200 + 空数据。
3. **双写窗口**：写操作先落 KV 再同步关系表，读取立即一致（KV 为基线）；关系表侧延迟不影响响应。
4. **限流**：`apiFetch` 已按 `Retry-After` 自动退避；`apiFetchStrict` 会抛 `ApiError`（含 `isRateLimited`）。
5. **路径前缀**：客户端 `API_BASE` 需含 `/make-server-f626b673`，否则 404。

## 六、已知问题与待加固

| 编号 | 问题 | 影响 | 建议 |
| --- | --- | --- | --- |
| A1 | `/stt/transcribe` 在 `routes-ai.ts` 与 `routes-spacetime.ts` 重复注册 | 后者永不生效（Hono 先注册优先） | 下线 spacetime 副本或改为 `/voice/stt` |
| A2 | `POST/DELETE /pki/public-key`、`POST /pki/key-backup` 未挂 `requireAuth`（该导入当前未使用） | 任意人可覆盖他人公钥/备份 | 下一轮补 `requireAuth` + 主体一致性校验 |
| A3 | 列表端点无统一分页（仅 `limit` 截断） | 大数据量无法翻页 | 新端点统一 `limit` + `cursor` |
| A4 | 错误体字段不统一（`error` / `detail` / 业务字段混用） | 前端需多分支 | 统一 `{ error, code?, detail?, ...business }` |

## 七、验收自检

- [x] 端点数量与源码一致：124（GET 64 / POST 56 / DELETE 3 / PUT 1）
- [x] 每个端点的方法、路径、鉴权、限流、校验均可回溯到 `src/routes-*.ts`
- [x] 限流档位与 `src/rate-limit.ts` 常量一致（30/20/10/5/10 次）
- [x] 前缀与 `ROUTE_PREFIX` 一致（`/make-server-f626b673`）
- [x] 已标注 4 项已知问题，其中 A2 为安全项

## 八、后续（P1-4 / P1-5）

1. **P1-4**：客户端 `packages/music-utils/src/supabase.ts` 下线，统一改走 `apiFetch` + 本文契约；
2. **P1-5**：部署 yyc3-45（PM2/systemd + 健康检查 `/health` + 回滚脚本），并补 API 冒烟用例覆盖 §3 全部端点。
