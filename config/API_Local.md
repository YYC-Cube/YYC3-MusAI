# D-Music API 对接方案

> Supabase Edge Functions (Hono) + 本地 API 代理
> 更新日期：2026-02-21 v2.0

---

## 一、Supabase Edge Function 路由总览（45条）

> 基础路径: `https://{projectId}.supabase.co/functions/v1/make-server-f626b673`

### 1.1 核心播放器 & 互动

| # | 路由 | 方法 | 功能 |
|---|------|------|------|
| 1 | `/likes/{songId}` | GET | 获取歌曲点赞数 |
| 2 | `/likes/{songId}` | POST | 点赞歌曲 |
| 3 | `/annotations/{songId}` | GET | 获取歌词情感标注 |
| 4 | `/annotations/{songId}` | POST | 添加歌词情感标注 |
| 5 | `/play/{songId}` | POST | 记录播放事件 |
| 6 | `/comments/{songId}` | GET | 获取歌曲评论 |
| 7 | `/comments/{songId}` | POST | 发表评论 |
| 8 | `/comments/{songId}/{commentId}/like` | POST | 评论点赞 |

### 1.2 用户 & 认证

| # | 路由 | 方法 | 功能 |
|---|------|------|------|
| 9 | `/signup` | POST | 用户注册 |
| 10 | `/profile/{userId}` | GET | 获取用户资料 |
| 11 | `/profile/{userId}` | POST | 更新用户资料 |

### 1.3 星力值经济

| # | 路由 | 方法 | 功能 |
|---|------|------|------|
| 12 | `/starpower/{userId}` | GET | 获取星力值余额 |
| 13 | `/starpower/{userId}` | POST | 增加星力值 |
| 14 | `/starpower/{userId}/consume` | POST | 消耗星力值（通用） |

### 1.4 排行榜 & Wilson Score

| # | 路由 | 方法 | 功能 |
|---|------|------|------|
| 15 | `/leaderboard` | GET | 获取排行榜 |
| 16 | `/leaderboard/boost` | POST | 排行榜助推（100SP → +10 plays） |
| 17 | `/song/stats/{songId}` | GET | 获取歌曲统计 |

### 1.5 AI 创作管线

| # | 路由 | 方法 | 功能 |
|---|------|------|------|
| 18 | `/ai/lyrics` | POST | AI 歌词生成 |
| 19 | `/ai/compose` | POST | AI 作曲参数生成 |

### 1.6 推荐引擎

| # | 路由 | 方法 | 功能 |
|---|------|------|------|
| 20 | `/listening-history` | POST | 记录听歌历史 |
| 21 | `/recommendations/{userId}` | GET | 个性化推荐 |
| 22 | `/recommendations/{userId}/preferences` | GET | 用户偏好画像 |

### 1.7 社交分享 & IP矩阵

| # | 路由 | 方法 | 功能 |
|---|------|------|------|
| 23 | `/shared-works` | GET | 获取所有分享作品 |
| 24 | `/shared-works` | POST | 分享新作品 |
| 25 | `/shared-works/{workId}/like` | POST | 作品点赞 |
| 26 | `/shared-works/{workId}/play` | POST | 作品播放记录 |
| 27 | `/creators` | GET | 获取创作者列表 |
| 28 | `/creators/{userName}/works` | GET | 获取指定创作者的作品 |

### 1.8 时空喊话系统

| # | 路由 | 方法 | 功能 |
|---|------|------|------|
| 29 | `/spacetime/messages` | GET | 获取喊话消息列表 |
| 30 | `/spacetime/messages` | POST | 发送喊话消息 |
| 31 | `/spacetime/messages/{id}/like` | POST | 消息点赞 |
| 32 | `/spacetime/messages/{id}/replies` | GET | 获取消息回复 |
| 33 | `/spacetime/messages/{id}/replies` | POST | 发送消息回复 |
| 34 | `/spacetime/capsules` | GET | 获取时间胶囊 |
| 35 | `/spacetime/capsules` | POST | 创建时间胶囊 |
| 36 | `/spacetime/capsules/{id}/like` | POST | 胶囊点赞 |
| 37 | `/spacetime/messages/nearby` | GET | **附近消息（Haversine）** |

### 1.9 语音存储（Supabase Storage）

| # | 路由 | 方法 | 功能 |
|---|------|------|------|
| 38 | `/voice/upload` | POST | 上传语音至 Storage |
| 39 | `/voice/url` | GET | 获取语音 signedUrl |

### 1.10 模板解锁 & 用户 KV

| # | 路由 | 方法 | 功能 |
|---|------|------|------|
| 40 | `/user/{userId}/unlocked-themes` | GET | 获取已解锁主题 |
| 41 | `/user/{userId}/unlocked-themes` | POST | 解锁新主题 |

### 1.11 STT 语音转文字

| # | 路由 | 方法 | 功能 |
|---|------|------|------|
| 42 | `/stt/transcribe` | POST | 语音转文字（代理/降级） |

### 1.12 创作协作

| # | 路由 | 方法 | 功能 |
|---|------|------|------|
| 43 | `/works/fork` | POST | 改编（Fork）作品 |
| 44 | `/works/{workId}/forks` | GET | 获取改编分支链 |

### 1.13 成就徽章

| # | 路由 | 方法 | 功能 |
|---|------|------|------|
| 45 | `/achievements/{userId}` | GET | 获取用户成就 |
| 46 | `/achievements/{userId}/track` | POST | 追踪成就行为 |

---

## 二、接口详细说明（新增部分）

### 2.1 附近消息 `/spacetime/messages/nearby`

```
GET /spacetime/messages/nearby?lat=34.7528&lng=113.6542&radius=50

Response:
{
  "messages": [
    {
      "id": "msg_1",
      "userName": "User",
      "content": "...",
      "targetLocation": { "lat": 34.75, "lng": 113.65, "label": "34.750, 113.650" },
      "distance": 0.32,
      "emotion": "happy",
      "likes": 5,
      "createdAt": 1740100000000
    }
  ]
}
```

### 2.2 语音上传 `/voice/upload`

```
POST /voice/upload
Content-Type: application/json

Request:
{
  "userId": "user-id",
  "audioBase64": "data:audio/webm;base64,...",
  "mimeType": "audio/webm;codecs=opus"
}

Response:
{
  "success": true,
  "filePath": "user-id/1740100000-abc1.webm",
  "signedUrl": "https://xxx.supabase.co/storage/v1/object/sign/..."
}
```

### 2.3 改编作品 `/works/fork`

```
POST /works/fork
Content-Type: application/json

Request:
{
  "userId": "user-id",
  "userName": "creator",
  "originalWorkId": "work-123",
  "originalAuthor": "original-creator",
  "title": "Song Title (改编)",
  "theme": "happy",
  "lyrics": ["line1", "line2"]
}

Response:
{
  "success": true,
  "fork": {
    "workId": "fork-1740100000-abc123",
    "title": "Song Title (改编)",
    "forkedFrom": { "workId": "work-123", "author": "original-creator", "forkedAt": 1740100000000 }
  }
}
```

### 2.4 成就追踪 `/achievements/{userId}/track`

```
POST /achievements/{userId}/track
Content-Type: application/json

Request:
{
  "action": "create_work",    // create_work | receive_like | receive_fork | send_message | create_capsule | send_voice | send_location | daily_login
  "starPower": 500,           // optional: update peak star power
  "totalPlays": 1000          // optional: update total plays
}

Response:
{
  "success": true,
  "stats": { "totalWorks": 5, "streakDays": 3, ... }
}
```

---

## 三、本地 API 代理方案

> 纯本地方案，无第三方依赖

### 3.1 语音转文字 (STT)

```
POST /api/v1/stt/transcribe
Content-Type: application/json

Request:
{ "audio": "base64...", "language": "zh" }

Response:
{
  "success": true,
  "data": { "text": "识别的文字内容", "confidence": 0.95, "duration": 3.5 }
}
```

> Supabase 端点 `/stt/transcribe` 会尝试代理到本地 API（`DMUSIC_LOCAL_API` 环境变量），失败时返回 `{ fallback: 'client' }` 指示前端使用 Web Speech API。

---

## 四、Supabase Storage Buckets

| Bucket | 访问 | 用途 |
|--------|------|------|
| `make-f626b673-voice` | 私有（signedUrl） | 语音消息音频文件 |

---

## 五、KV 存储键规范

| 键模式 | 值类型 | 说明 |
|--------|--------|------|
| `spacetime:messages` | JSON Array | 喊话消息列表 |
| `spacetime:capsules` | JSON Array | 时间胶囊列表 |
| `spacetime:replies:{msgId}` | JSON Array | 消息回复列表 |
| `shared-works` | JSON Array | 分享作品列表 |
| `song:stats:{songId}` | JSON Object | 歌曲统计数据 |
| `song:likes:{songId}` | JSON Number | 歌曲点赞数 |
| `song:annotations:{songId}` | JSON Object | 歌词标注数据 |
| `song:comments:{songId}` | JSON Array | 歌曲评论列表 |
| `user:{userId}:starpower` | JSON Object | 星力值数据 |
| `user:{userId}:profile` | JSON Object | 用户资料 |
| `user:{userId}:listening-history` | JSON Array | 听歌历史 |
| `user:{userId}:unlocked-themes` | JSON Array | 已解锁主题 |
| `user:{userId}:achievements` | JSON Array | 已解锁成就ID |
| `user:{userId}:achievement-stats` | JSON Object | 成就统计数据 |
| `fork-chain:{workId}` | JSON Array | 改编分支链 |

---

## 六、前端对接

```typescript
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-f626b673`;

// 通用请求
const res = await fetch(`${API_BASE}/path`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${publicAnonKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ ... }),
});
```

---

## 七、端口分配（本地开发）

| 服务 | 端口 | 位置 |
|------|------|------|
| API Server | 3250 | 本地 |
| WebSocket | 3251 | 本地 |
| MySQL | 3306 | NAS |
| Redis | 6379 | 本地 |

---

<div align="center">

> YYC³ Team | D-Music API v2.0

</div>
