# D-Music Guidelines

一、D-Music 设计符合五标五高五化原则的 UI 组件库

### 1.1 组件库设计规范

```

设计要求：
1. 遵循 Material Design 3.0 设计规范
2. 支持深色/浅色主题切换
3. 响应式设计（移动端、平板、桌面）
4. 无障碍访问（WCAG 2.1 AA 级）
5. 动画流畅（60fps）
6. 触觉反馈支持（移动端）

组件清单：
- 按钮（主要、次要、幽灵、危险）
- 输入框（文本、密码、搜索）
- 卡片（音乐卡片、用户卡片、成就卡片）
- 列表（播放列表、排行榜、通知列表）
- 模态框（对话框、抽屉、底部面板）
- 导航（标签栏、侧边栏、面包屑）
- 反馈（加载、成功、错误、警告）
- 媒体（音频播放器、封面图、波形图）

设计输出：
- Figma 组件文件
- Design Token 文档（颜色、字体、间距、圆角）
- 组件使用指南
- 交互动效规范
```

### 1.2 面板组件设计

```
提示词：为 D-Music 设计功能面板组件

面板类型：
1. 播放列表面板
2. 用户资料面板
3. 社区动态面板
4. 数据分析面板
5. AI 歌词生成面板
6. 排行榜面板
7. 创作工坊面板
8. 时空喊话面板
9. 星力商城面板
10. 成就徽章面板
11. 挑战赛面板
12. 版权认证面板
13. IP 矩阵面板
14. 发现中心面板

设计要求：
- 统一的视觉风格
- 清晰的信息层级
- 流畅的过渡动画
- 移动端友好的交互
- 支持键盘快捷键

交互模式：
- 桌面端：侧边抽屉/模态框
- 移动端：全屏面板/底部抽屉
- 可拖拽调整大小（桌面端）
- 可最小化/最大化

设计输出：
- Figma 面板组件文件
- 交互流程图
- 状态转换图
- 响应式布局方案
```

### 1.3 数据可视化设计

```
提示词：为 D-Music 设计数据可视化组件

可视化类型：
1. 音频波形图
2. 频谱分析图
3. 播放进度条
4. 数据分析图表（折线图、柱状图、饼图）
5. 排行榜列表
6. 成就进度环
7. 星力增长曲线

设计要求：
- 实时更新（音频可视化）
- 流畅动画（60fps）
- 清晰的数据标签
- 支持数据导出
- 无障碍访问

技术实现：
- 使用 Canvas API（音频可视化）
- 使用 Recharts（数据图表）
- 使用 SVG（进度环）
- 使用 CSS 动画（过渡效果）

设计输出：
- Figma 可视化组件文件
- 动画规范文档
- 颜色方案（数据系列）
- 交互行为说明
```

### 1.4 主题系统设计

```
提示词：为 D-Music 设计完整的主题系统

主题类型：
1. 默认主题（浅色）
2. 深色主题
3. 星空主题（特殊）
4. 用户自定义主题

设计要求：
- 统一的 Design Token
- 支持主题切换
- 平滑的过渡动画
- 保持品牌一致性
- 无障碍对比度

Design Token 结构：
- 颜色系统（主色、辅色、语义色）
- 字体系统（字族、字重、字号）
- 间距系统（4px 基准）
- 圆角系统（4px、8px、12px、16px）
- 阴影系统（层级、深度）
- 动画系统（时长、缓动函数）

设计输出：
- Figma 主题文件
- Design Token JSON 文件
- 主题切换动画规范
- CSS 变量映射表
```

---

## 二、代码重构提示词

### 2.1 App.tsx 状态重构

```
提示词：重构 App.tsx 的面板状态管理

当前问题：
- 21+ 个独立的布尔状态变量
- Hook 数量逼近上限
- 重渲染范围过大
- 难以实现面板互斥逻辑

重构目标：
1. 使用 useReducer 替代多个 useState
2. 使用单一 activePanel 状态
3. 实现面板互斥逻辑
4. 减少 Hook 调用数量
5. 保持功能不变

重构方案：
```typescript
type PanelType =
  | 'playlist'
  | 'profile'
  | 'community'
  | 'analytics'
  | 'ai-lyrics'
  | 'leaderboard'
  | 'creation-studio'
  | 'space-time'
  | 'star-power'
  | 'achievements'
  | 'shop'
  | 'challenge'
  | null;

interface AppState {
  activePanel: PanelType;
  // 其他全局状态
}

type AppAction =
  | { type: 'OPEN_PANEL'; panel: PanelType }
  | { type: 'CLOSE_PANEL' }
  | { type: 'TOGGLE_PANEL'; panel: PanelType };

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'OPEN_PANEL':
      return { ...state, activePanel: action.panel };
    case 'CLOSE_PANEL':
      return { ...state, activePanel: null };
    case 'TOGGLE_PANEL':
      return {
        ...state,
        activePanel: state.activePanel === action.panel ? null : action.panel
      };
    default:
      return state;
  }
}

// 使用
const [state, dispatch] = useReducer(appReducer, { activePanel: null });

const showPlaylist = state.activePanel === 'playlist';
const showProfile = state.activePanel === 'profile';
```

重构步骤：
1. 定义 PanelType 类型
2. 定义 AppState 和 AppAction
3. 实现 appReducer
4. 替换所有 useState 为 useReducer
5. 更新所有面板显示逻辑
6. 测试所有面板切换功能

验证标准：
- 所有面板正常显示/隐藏
- 面板互斥逻辑正确
- Hook 数量减少
- 性能无明显下降
```

### 2.2 后端路由模块化

```
提示词：将后端路由拆分为多个模块文件

当前问题：
- 单文件 2,264 行
- 57+ 条路由集中在一个文件
- 难以维护和定位代码

重构目标：
1. 按功能域拆分路由模块
2. 每个模块独立文件
3. 在主文件中导入并挂载
4. 保持路由不变

拆分方案：
```
supabase/functions/server/
├── index.tsx                    # 主入口
├── routes/
│   ├── auth.tsx                 # 认证相关路由
│   ├── users.tsx                # 用户相关路由
│   ├── music.tsx                # 音乐相关路由
│   ├── starpower.tsx            # 星力相关路由
│   ├── community.tsx            # 社区相关路由
│   ├── ai.tsx                  # AI 相关路由
│   ├── challenges.tsx            # 挑战赛相关路由
│   ├── copyright.tsx            # 版权相关路由
│   ├── shop.tsx                # 商城相关路由
│   ├── achievements.tsx          # 成就相关路由
│   ├── notifications.tsx         # 通知相关路由
│   └── analytics.tsx            # 数据分析相关路由
└── middleware/
    ├── auth.tsx                # 认证中间件
    ├── ratelimit.tsx           # 速率限制中间件
    └── validation.tsx          # 数据验证中间件
```

示例模块（auth.tsx）：
```typescript
import { Hono } from 'hono';
import { authenticateRequest } from '../middleware/auth';

const authRouter = new Hono();

authRouter.post('/signup', async (c) => {
  // 注册逻辑
});

authRouter.post('/login', async (c) => {
  // 登录逻辑
});

authRouter.get('/logout', authenticateRequest, async (c) => {
  // 登出逻辑
});

export default authRouter;
```

主入口（index.tsx）：
```typescript
import { Hono } from 'hono';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import musicRouter from './routes/music';
// ... 其他路由

const app = new Hono();

// 挂载路由
app.route('/signup', authRouter);
app.route('/login', authRouter);
app.route('/users', usersRouter);
app.route('/music', musicRouter);
// ... 其他路由

export default app;
```

重构步骤：
1. 创建 routes/ 目录
2. 创建各功能域路由文件
3. 迁移路由代码到对应文件
4. 在主文件中导入并挂载
5. 测试所有路由功能

验证标准：
- 所有路由正常工作
- 代码结构清晰
- 易于维护和扩展
```

### 2.3 引入 React Router

```
提示词：为 D-Music 引入 React Router

当前问题：
- 无前端路由系统
- 无法通过 URL 访问特定功能
- 浏览器后退按钮行为不符预期
- SEO 完全不可用

��施目标：
1. 引入 react-router-dom
2. 定义路由结构
3. 实现路由守卫
4. 保持现有功能不变

路由结构：
```typescript
import { createBrowserRouter } from 'react-router-dom';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'leaderboard', element: <LeaderboardPanel /> },
      { path: 'challenge/:id', element: <ChallengeDetail /> },
      { path: 'album/:id', element: <AlbumDetail /> },
      { path: 'profile/:userId', element: <UserProfile /> },
      { path: 'settings', element: <SettingsPanel /> },
    ],
  },
]);
```

路由守卫：
```typescript
import { Navigate, Outlet } from 'react-router-dom';

function AuthGuard() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

// 使用
<Route
  path="/settings"
  element={
    <AuthGuard>
      <SettingsPanel />
    </AuthGuard>
  }
/>
```

实施步骤：
1. 安装 react-router-dom
2. 定义路由结构
3. 创建路由守卫
4. 更新 App.tsx 使用 Router
5. 更新所有导航链接
6. 测试路由功能

验证标准：
- 所有路由正常工作
- URL 参数正确传递
- 路由守卫正常工作
- 浏览器后退按钮正常
```

---

## 三、数据库迁移提示词

### 3.1 KV 键命名统一

```
提示词：统一 KV 键命名规范

当前问题：
- 星力商城使用 `starpower:{userId}` 而非 `user:{userId}:starpower`
- 交易记录键名不一致
- 通知系统使用用户名而非 ID

统一规范：
```
用户相关:
  user:{userId}:starpower          — 星力余额
  user:{userId}:profile            — 用户资料
  user:{userId}:transactions       — 交易记录
  user:{userId}:checkin            — 签到记录
  user:{userId}:inventory          — 商城库存
  user:{userId}:achievements       — 已解锁成就
  user:{userId}:notifications      — 通知列表（改为 userId）

歌曲相关:
  song:{songId}:stats              — 歌曲统计
  song:{songId}:likes              — 点赞数
  song:{songId}:comments           — 评论列表
  song:{songId}:annotations        — 情感标注

作品相关:
  work:{workId}                    — 独立作品
  work:index                       — 作品索引

系统相关:
  copyright:{workId}               — 版权证书
  challenge:active                 — 当前挑战赛
  challenge:{id}:entries           — 参赛作品
```

迁移步骤：
1. 创建迁移脚本
2. 读取所有旧键
3. 写入新键
4. 验证数据一致性
5. 删除旧键
6. 更新所有代码使用新键

迁移脚本示例：
```typescript
async function migrateKVKeys() {
  // 迁移星力商城键
  const allUsers = await kv.list({ prefix: 'starpower:' });

  for (const { key } of allUsers.keys) {
    const userId = key.replace('starpower:', '');
    const value = await kv.get(key);

    // 写入新键
    await kv.set(`user:${userId}:starpower`, value);

    // 删除旧键
    await kv.delete(key);
  }

  // 迁移通知键（用户名 -> userId）
  const allNotifications = await kv.list({ prefix: 'notifications:' });

  for (const { key } of allNotifications.keys) {
    const userName = key.replace('notifications:', '');
    const value = await kv.get(key);

    // 查找 userId
    const user = await findUserByUserName(userName);
    if (user) {
      // 写入新键
      await kv.set(`user:${user.id}:notifications`, value);

      // 删除旧键
      await kv.delete(key);
    }
  }
}
```

验证标准：
- 所有数据正确迁移
- 无数据丢失
- 新键命名统一
- 代码使用新键
```

### 3.2 PostgreSQL 15 迁移

```
提示词：将数据从 Supabase KV Store 迁移到 PostgreSQL 15

迁移目标：
1. 创建 PostgreSQL 15 数据库
2. 迁移所有 KV 数据到关系表
3. 更新所有 API 使用 PostgreSQL
4. 保持功能不变

数据库架构：
```sql
-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(100),
    avatar VARCHAR(500) DEFAULT '/images/default-avatar.png',
    bio TEXT,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')) DEFAULT 'other',
    birthday DATE,
    country VARCHAR(50),
    city VARCHAR(50),
    role VARCHAR(20) CHECK (role IN ('user', 'creator', 'admin')) DEFAULT 'user',
    status VARCHAR(20) CHECK (status IN ('active', 'inactive', 'banned')) DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(100),
    last_login_at TIMESTAMP,
    last_login_ip VARCHAR(45),
    login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 星力表
CREATE TABLE user_star_power (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_star_power INT DEFAULT 100,
    available_star_power INT DEFAULT 100,
    frozen_star_power INT DEFAULT 0,
    vip_level INT DEFAULT 1,
    vip_exp INT DEFAULT 0,
    mheart_value INT DEFAULT 0,
    mheart_level INT DEFAULT 1,
    daily_checkin_streak INT DEFAULT 0,
    last_checkin_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_user_star_power_user_id ON user_star_power(user_id);
```

迁移步骤：
1. 创建 PostgreSQL 15 数据库
2. 执行架构脚本
3. 编写数据迁移脚本
4. 迁移用户数据
5. 迁移星力数据
6. 迁移音乐数据
7. 迁移其他数据
8. 验证数据完整性
9. 更新 API 代码
10. 测试所有功能

迁移脚本示例：
```typescript
async function migrateUsers() {
  // 读取所有用户
  const allUsers = await kv.list({ prefix: 'user:' });

  for (const { key } of allUsers.keys) {
    const userId = key.replace('user:', '');
    const userData = await kv.get(key);

    // 插入到 PostgreSQL
    await query(
      `INSERT INTO users (id, username, email, nickname, avatar, bio, gender, birthday, country, city, role, status, email_verified, two_factor_enabled, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        userId,
        userData.username,
        userData.email,
        userData.nickname,
        userData.avatar,
        userData.bio,
        userData.gender,
        userData.birthday,
        userData.country,
        userData.city,
        userData.role,
        userData.status,
        userData.emailVerified,
        userData.twoFactorEnabled,
        userData.createdAt,
        userData.updatedAt
      ]
    );
  }
}
```

验证标准：
- 所有数据正确迁移
- 数据完整性验证通过
- API 功能正常
- 性能无明显下降
```

---

## 四、AI 集成提示词

### 4.1 AI 模型配置

```
提示词：配置 D-Music 的 AI 模型集成

模型选择：
1. OpenAI GPT-4o-mini（主模型）
2. 智谱 GLM-4（备用模型，中文优化）
3. Anthropic Claude 3.5 Sonnet（备用模型）
4. Ollama Llama 3（本地模型）

功能模块：
1. AI 歌词生成
2. AI 作曲助手
3. AI 助手对话
4. 语音转文字（Whisper）
5. 情感分析

配置文件：
```json
{
  "ai": {
    "enabled": true,
    "models": {
      "lyrics_generation": {
        "primary": "openai:gpt-4o-mini",
        "fallback": "zhipu:glm-4",
        "local": "ollama:llama3",
        "timeout": 30000,
        "maxRetries": 3,
        "temperature": 0.8,
        "maxTokens": 1000
      },
      "ai_assistant": {
        "primary": "openai:gpt-4o-mini",
        "fallback": "anthropic:claude-3-5-sonnet",
        "timeout": 30000,
        "maxRetries": 3,
        "temperature": 0.7,
        "maxTokens": 500
      },
      "stt": {
        "primary": "openai:whisper-small",
        "fallback": "openai:whisper-tiny",
        "timeout": 60000,
        "maxRetries": 2
      },
      "composition": {
        "primary": "openai:gpt-4o-mini",
        "fallback": "zhipu:glm-4",
        "timeout": 30000,
        "maxRetries": 3,
        "temperature": 0.9,
        "maxTokens": 800
      },
      "emotion_analysis": {
        "primary": "openai:gpt-4o-mini",
        "fallback": "zhipu:glm-4",
        "timeout": 20000,
        "maxRetries": 2,
        "temperature": 0.3,
        "maxTokens": 100
      }
    },
    "providers": {
      "openai": {
        "apiKey": "${OPENAI_API_KEY}",
        "baseURL": "https://api.openai.com/v1",
        "timeout": 30000,
        "maxRetries": 3
      },
      "zhipu": {
        "apiKey": "${ZHIPU_API_KEY}",
        "baseURL": "https://open.bigmodel.cn/api/paas/v4",
        "timeout": 30000,
        "maxRetries": 3
      },
      "anthropic": {
        "apiKey": "${ANTHROPIC_API_KEY}",
        "baseURL": "https://api.anthropic.com/v1",
        "timeout": 30000,
        "maxRetries": 3
      },
      "ollama": {
        "baseURL": "${OLLAMA_BASE_URL:http://localhost:11434}",
        "timeout": 60000,
        "maxRetries": 2
      }
    },
    "cache": {
      "enabled": true,
      "ttl": 3600,
      "maxSize": 1000
    },
    "rateLimit": {
      "enabled": true,
      "requestsPerMinute": 60,
      "requestsPerHour": 1000
    },
    "monitoring": {
      "enabled": true,
      "logRequests": true,
      "logResponses": false,
      "trackCosts": true
    }
  }
}
```

实施步骤：
1. 安装 OpenAI SDK
2. 创建 AI 模型管理器
3. 实现各功能模块
4. 添加缓存机制
5. 添加速率限制
6. 添加成本监控
7. 测试所有 AI 功能

验证标准：
- 所有 AI 功能正常工作
- 备用模型切换正常
- 缓存机制有效
- 速率限制正常
- 成本监控准确
```

### 4.2 AI 歌词生成

```
提示词：实现 AI 歌词生成功能

功能需求：
1. 根据主题生成歌词
2. 支持多种情绪
3. 支持关键词输入
4. 支持多语言
5. 支持多种风格

提示词工程：
```typescript
const systemPrompt = `你是一个专业的歌词创作助手。根据用户提供的主题、情绪、关键词和语言，创作出优美、有感染力的歌词。

要求：
1. 歌词要有层次感，包含主歌、副歌、桥段等结构
2. 语言要符合指定语言的表达习惯
3. 情感要饱满，能够引起共鸣
4. 每行歌词要简洁有力
5. 返回格式为JSON数组，每个元素是一行歌词

示例输出：
[
  "第一句歌词",
  "第二句歌词",
  "副歌第一句",
  "副歌第二句"
]`;

const userPrompt = `主题：${theme}
情绪：${mood}
关键词：${keywords.join(', ')}
语言：${language}
风格：${style || '流行'}

请根据以上信息创作歌词。`;
```

API 接口：
```typescript
POST /api/v1/ai/lyrics
Content-Type: application/json
Authorization: Bearer <token>

{
  "theme": "爱情",
  "mood": "甜蜜",
  "keywords": ["星空", "梦想", "永恒"],
  "language": "zh",
  "style": "流行"
}

Response:
{
  "success": true,
  "data": {
    "lyrics": [
      "第一句歌词",
      "第二句歌词",
      "副歌第一句",
      "副歌第二句"
    ],
    "modelUsed": "openai:gpt-4o-mini",
    "generationTime": 1234
  }
}
```

实施步骤：
1. 定义歌词生成接口
2. 实现后端 API
3. 实现前端组件
4. 添加缓存机制
5. 添加错误处理
6. 测试生成功能

验证标准：
- 歌词生成质量良好
- 支持多种语言
- 缓存机制有效
- 错误处理完善
```

### 4.3 语音转文字

```
提示词：实现语音转文字功能

功能需求：
1. 支持多种音频格式
2. 支持多语言识别
3. 实时转录
4. 时间戳标记
5. 高准确率

技术实现：
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function transcribeAudio(audioFile: File): Promise<string> {
  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    language: 'zh',
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
  });

  return transcription.text;
}
```

API 接口：
```typescript
POST /api/v1/ai/stt
Content-Type: multipart/form-data
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "text": "转录的文本内容",
    "segments": [
      {
        "start": 0.0,
        "end": 3.5,
        "text": "第一段文本"
      }
    ],
    "modelUsed": "openai:whisper-1",
    "transcriptionTime": 1234
  }
}
```

实施步骤：
1. 实现后端 API
2. 实现前端录音组件
3. 添加错误处理
4. 测试转录功能

验证标准：
- 转录准确率高
- 支持多种语言
- 时间戳正确
- 错误处理完善
```

---

## 五、安全加固提示词

### 5.1 API 认证加固

```
提示词：为所有 API 端点添加认证

当前问题：
- 57 个 API 端点中 50+ 个缺乏认证保护
- 敏感操作（购买、删除、更新）完全开放
- 无 RBAC（基于角色的访问控制）

加固方案：
1. 创建认证中间件
2. 为所有写入操作添加认证
3. 为敏感操作添加 RBAC
4. 使用 JWT 进行身份验证

认证中间件：
```typescript
import { verify } from 'jsonwebtoken';

export async function authenticateRequest(req: Request): Promise<User | null> {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = verify(token, process.env.JWT_SECRET!) as { userId: string };
    const user = await getUserById(decoded.userId);

    return user;
  } catch (error) {
    return null;
  }
}

// 使用
app.post('/api/v1/starpower/shop/purchase', async (req) => {
  const user = await authenticateRequest(req);

  if (!user) {
    return new Response(JSON.stringify({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '未授权' }
    }), { status: 401 });
  }

  // 处理购买逻辑
});
```

RBAC 授权：
```typescript
export function requireRole(allowedRoles: UserRole[]) {
  return async (req: Request, next: NextFunction) => {
    const user = req.user;

    if (!user || !allowedRoles.includes(user.role)) {
      return new Response(JSON.stringify({
        success: false,
        error: { code: 'FORBIDDEN', message: '权限不足' }
      }), { status: 403 });
    }

    next();
  };
}

// 使用
app.post('/api/v1/admin/users', requireAuth, requireRole(['admin']), async (req) => {
  // 只有管理员可以访问
});
```

加固步骤：
1. 创建认证中间件
2. 创建 RBAC 中间件
3. 为所有写入操作添加认证
4. 为敏感操作添加 RBAC
5. 测试所有端点

验证标准：
- 所有写入操作需要认证
- 敏感操作需要相应角色
- 未授权请求被正确拒绝
- 认证信息正确传递
```

### 5.2 数据验证

```
提示词：为所有 API 端点添加数据验证

当前问题：
- 基本的空值检查
- 无 schema 验证
- 容易受到注入攻击

验证方案：
1. 使用 Zod 进行 schema 验证
2. 定义所有输入 schema
3. 统一错误处理
4. 添加数据清洗

Schema 定义：
```typescript
import { z } from 'zod';

const CreateUserSchema = z.object({
  username: z.string()
    .min(3, '用户名至少 3 个字符')
    .max(50, '用户名最多 50 个字符')
    .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
  email: z.string()
    .email('邮箱格式不正确')
    .max(100, '邮箱最多 100 个字符'),
  password: z.string()
    .min(8, '密码至少 8 个字符')
    .regex(/[A-Z]/, '密码必须包含大写字母')
    .regex(/[a-z]/, '密码必须包含小写字母')
    .regex(/[0-9]/, '密码必须包含数字'),
});

const UpdateProfileSchema = z.object({
  nickname: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  birthday: z.coerce.date().optional(),
});

const PurchaseItemSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().min(1).max(10),
});
```

验证中间件：
```typescript
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return async (req: Request, next: NextFunction) => {
    try {
      const body = await req.json();
      const validated = schema.parse(body);

      // 将验证后的数据附加到请求
      req.validatedBody = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return new Response(JSON.stringify({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '数据验证失败',
            details: error.errors
          }
        }), { status: 400 });
      }

      throw error;
    }
  };
}

// 使用
app.post('/api/v1/users', validateBody(CreateUserSchema), async (req) => {
  const { username, email, password } = req.validatedBody;
  // 使用验证后的数据
});
```

实施步骤：
1. 安装 Zod
2. 定义所有输入 schema
3. 创建验证中间件
4. 为所有端点添加验证
5. 测试验证逻辑

验证标准：
- 所有输入经过验证
- 错误信息清晰
- 无注入攻击风险
- 数据清洗正确
```

### 5.3 速率限制

```
提示词：实现 API 速率限制

当前问题：
- 无速率限制
- 可被恶意刷票/刷星力
- 容易受到 DDoS 攻击

限制方案：
1. 基于用户的速率限制
2. 基于 IP 的速率限制
3. 基于端点的速率限制
4. 使用 Redis 存储

速率限制实现：
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

export async function rateLimitMiddleware(
  req: Request,
  identifier: string
): Promise<boolean> {
  const { success, remaining, reset } = await ratelimit.limit(identifier);

  if (!success) {
    throw new Error('请求过于频繁，请稍后再试');
  }

  // 添加速率限制头
  req.headers.set('X-RateLimit-Limit', '10');
  req.headers.set('X-RateLimit-Remaining', remaining.toString());
  req.headers.set('X-RateLimit-Reset', reset.toString());

  return true;
}

// 基于用户的限制
app.use(async (req, res, next) => {
  const user = await authenticateRequest(req);

  if (user) {
    await rateLimitMiddleware(req, `user:${user.id}`);
  } else {
    await rateLimitMiddleware(req, `ip:${getClientIP(req)}`);
  }

  next();
});

// 基于端点的限制
const purchaseLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 m'),
});

app.post('/api/v1/starpower/shop/purchase', async (req, res, next) => {
  const user = await authenticateRequest(req);

  if (user) {
    const { success } = await purchaseLimiter.limit(`user:${user.id}:purchase`);

    if (!success) {
      return new Response(JSON.stringify({
        success: false,
        error: { code: 'RATE_LIMIT_EXCEEDED', message: '购买过于频繁，请稍后再试' }
      }), { status: 429 });
    }
  }

  next();
});
```

实施步骤：
1. 安装速率限制库
2. 创建速率限制中间件
3. 为不同场景配置限制
4. 添加速率限制头
5. 测试限制逻辑

验证标准：
- 速率限制正常工作
- 限制头正确返回
- 不同场景限制正确
- 性能无明显下降
```

---

## 六、性能优化提示词

### 6.1 前端代码分割

```
提示词：实现前端代码分割

当前问题：
- 无代码分割
- 首次加载 3-5s
- 全量打包

优化目标：
1. 使用 React.lazy 懒加载
2. 使用 Suspense 加载状态
3. 按路由分割代码
4. 减少首屏加载体积

代码分割实现：
```typescript
import { lazy, Suspense } from 'react';

// 懒加载面板组件
const LeaderboardPanel = lazy(() => import('./panels/LeaderboardPanel'));
const AnalyticsPanel = lazy(() => import('./panels/AnalyticsPanel'));
const ChallengePanel = lazy(() => import('./panels/ChallengePanel'));
const CopyrightPanel = lazy(() => import('./panels/CopyrightPanel'));

// 懒加载页面组件
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const ChallengeDetailPage = lazy(() => import('./pages/ChallengeDetailPage'));
const AlbumDetailPage = lazy(() => import('./pages/AlbumDetailPage'));

// 加载状态组件
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner />
    </div>
  );
}

// 在 App.tsx 中使用
function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      {activePanel === 'leaderboard' && <LeaderboardPanel />}
      {activePanel === 'analytics' && <AnalyticsPanel />}
      {activePanel === 'challenge' && <ChallengePanel />}
      {activePanel === 'copyright' && <CopyrightPanel />}
    </Suspense>
  );
}

// 在路由中使用
function Router() {
  return (
    <Routes>
      <Route path="/leaderboard" element={
        <Suspense fallback={<LoadingFallback />}>
          <LeaderboardPage />
        </Suspense>
      } />
      <Route path="/challenge/:id" element={
        <Suspense fallback={<LoadingFallback />}>
          <ChallengeDetailPage />
        </Suspense>
      } />
      <Route path="/album/:id" element={
        <Suspense fallback={<LoadingFallback />}>
          <AlbumDetailPage />
        </Suspense>
      } />
    </Routes>
  );
}
```

Vite 配置：
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'charts-vendor': ['recharts'],
          'utils': ['date-fns', 'clsx', 'tailwind-merge'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
```

实施步骤：
1. 识别大型组件
2. 使用 React.lazy 懒加载
3. 添加 Suspense 加载状态
4. 配置 Vite 代码分割
5. 测试加载性能

验证标准：
- 首屏加载 <2s
- 代码正确分割
- 加载状态正常显示
- 功能无异常
```

### 6.2 后端查询优化

```
提示词：优化后端数据库查询

当前问题：
- 硬编码歌曲 ID
- 单一 KV 键存储所有作品
- 查询性能差

优化目标：
1. 使用索引优化查询
2. 实现分页查询
3. 使用连接查询替代多次查询
4. 添加查询缓存

查询优化示例：
```typescript
// ❌ 错误：全量查询
async function getAllMusics() {
  return query<Music>('SELECT * FROM musics');
}

// ✅ 正确：分页查询
async function getMusics(page: number, limit: number) {
  const offset = (page - 1) * limit;

  return query<Music>(
    `SELECT * FROM musics
     WHERE status = 'approved'
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
}

// ❌ 错误：N+1 查询
async function getMusicWithAuthor(musicId: string) {
  const music = await query<Music>(
    'SELECT * FROM musics WHERE id = $1',
    [musicId]
  );

  const author = await query<User>(
    'SELECT * FROM users WHERE id = $1',
    [music.creatorId]
  );

  return { ...music, author };
}

// ✅ 正确：连接查询
async function getMusicWithAuthor(musicId: string) {
  return query<Music & { author: User }>(
    `SELECT m.*, u.* as author
     FROM musics m
     JOIN users u ON m.creator_id = u.id
     WHERE m.id = $1`,
    [musicId]
  );
}

// ❌ 错误：无索引查询
async function searchMusics(keyword: string) {
  return query<Music>(
    `SELECT * FROM musics WHERE title LIKE '%${keyword}%'`
  );
}

// ✅ 正确：使用全文搜索
async function searchMusics(keyword: string) {
  return query<Music>(
    `SELECT * FROM musics
     WHERE to_tsvector('simple', title) @@ plainto_tsquery('simple', $1)
     ORDER BY ts_rank(to_tsvector('simple', title), plainto_tsquery('simple', $1)) DESC`,
    [keyword]
  );
}
```

缓存策略：
```typescript
class QueryCache {
  private cache: Map<string, { data: any; timestamp: number }>;
  private ttl: number = 300000; // 5 分钟

  async get<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data as T;
    }

    const data = await fetcher();
    this.cache.set(key, { data, timestamp: Date.now() });

    return data;
  }

  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

// 使用
const cache = new QueryCache();

async function getMusic(musicId: string) {
  return cache.get(`music:${musicId}`, async () => {
    return query<Music>('SELECT * FROM musics WHERE id = $1', [musicId]);
  });
}

async function updateMusic(musicId: string, updates: Partial<Music>) {
  await query(
    'UPDATE musics SET title = $1, artist = $2 WHERE id = $3',
    [updates.title, updates.artist, musicId]
  );

  // 使缓存失效
  cache.invalidate(`music:${musicId}`);
}
```

实施步骤：
1. 分析慢查询
2. 添加必要索引
3. 实现分页查询
4. 实现查询缓存
5. 测试查询性能

验证标准：
- 查询响应时间 <200ms
- 缓存命中率 >70%
- 分页正常工作
- 数据一致性正确
```

---

## 七、测试编写提示词

### 7.1 单元测试

```
提示词：为 D-Music 编写单元测试

测试框架：Vitest

测试覆盖目标：
- 工具函数：100%
- Hooks：80%
- 组件：60%
- API 层：70%

示例测试：
```typescript
import { describe, it, expect, vi } from 'vitest';
import { calculateStarPower } from '../lib/starpower';

describe('calculateStarPower', () => {
  it('应该正确计算基础星力', () => {
    const result = calculateStarPower({
      baseAmount: 10,
      vipMultiplier: 1.0
    });
    expect(result).toBe(10);
  });

  it('应该应用 VIP 加成', () => {
    const result = calculateStarPower({
      baseAmount: 10,
      vipMultiplier: 1.5
    });
    expect(result).toBe(15);
  });

  it('应该处理边界情况', () => {
    const result = calculateStarPower({
      baseAmount: 0,
      vipMultiplier: 1.0
    });
    expect(result).toBe(0);
  });

  it('应该拒绝负数输入', () => {
    expect(() => {
      calculateStarPower({
        baseAmount: -10,
        vipMultiplier: 1.0
      });
    }).toThrow('星力数量不能为负数');
  });
});
```

测试规范：
1. 每个测试只测试一个功能点
2. 使用描述性的测试名称
3. 测试正常情况和边界情况
4. 测试错误情况
5. 使用 mock 隔离依赖

实施步骤：
1. 安装 Vitest
2. 配置测试环境
3. 为工具函数编写测试
4. 为 Hooks 编写测试
5. 为组件编写测试
6. 运行测试并查看覆盖率

验证标准：
- 测试覆盖率 >70%
- 所有测试通过
- 测试运行快速
```

### 7.2 集成测试

```
提示词：为 D-Music 编写集成测试

测试框架：Vitest + Supabase Test

测试覆盖目标：
- API 端点：80%
- 数据库操作：70%
- AI 功能：60%

示例测试：
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../app';
import { setupTestDatabase, cleanupTestDatabase } from '../test-utils';

describe('POST /api/v1/users', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  it('应该创建新用户', async () => {
    const response = await app.request('/api/v1/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      })
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.username).toBe('testuser');
    expect(data.data.email).toBe('test@example.com');
    expect(data.data.id).toBeDefined();
  });

  it('应该拒绝无效邮箱', async () => {
    const response = await app.request('/api/v1/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123'
      })
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('INVALID_EMAIL');
  });

  it('应该拒绝重复用户名', async () => {
    // 先创建一个用户
    await app.request('/api/v1/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        email: 'test1@example.com',
        password: 'password123'
      })
    });

    // 尝试创建重复用户名
    const response = await app.request('/api/v1/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        email: 'test2@example.com',
        password: 'password123'
      })
    });

    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('USERNAME_EXISTS');
  });
});
```

实施步骤：
1. 配置测试数据库
2. 创建测试工具函数
3. 为 API 端点编写测试
4. 为数据库操作编写测试
5. 运行测试并查看覆盖率

验证标准：
- 测试覆盖率 >70%
- 所有测试通过
- 测试运行稳定
```

### 7.3 E2E 测试

```
提示词：为 D-Music 编写 E2E 测试

测试框架：Playwright

测试覆盖目标：
- 核心用户流程：100%
- 关键功能：80%

示例测试：
```typescript
import { test, expect } from '@playwright/test';

test.describe('用户注册和登录流程', () => {
  test('用户可以成功注册', async ({ page }) => {
    await page.goto('http://localhost:3250');

    // 打开注册模态框
    await page.click('[data-testid="signup-button"]');

    // 填写注册表单
    await page.fill('[data-testid="username-input"]', 'testuser');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');

    // 提交表单
    await page.click('[data-testid="submit-button"]');

    // 等待成功消息
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toHaveText('注册成功');
  });

  test('用户可以成功登录', async ({ page }) => {
    await page.goto('http://localhost:3250');

    // 打开登录模态框
    await page.click('[data-testid="login-button"]');

    // 填写登录表单
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');

    // 提交表单
    await page.click('[data-testid="submit-button"]');

    // 等待登录成功
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('登录后可以播放音乐', async ({ page }) => {
    // 先登录
    await page.goto('http://localhost:3250');
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

    // 播放音乐
    await page.click('[data-testid="track-1"]');

    // 验证播放状态
    await expect(page.locator('[data-testid="playing-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="current-track-title"]')).toHaveText('歌曲标题');
  });
});

test.describe('AI 歌词生成流程', () => {
  test('用户可以生成歌词', async ({ page }) => {
    await page.goto('http://localhost:3250');

    // 打开 AI 歌词生成面板
    await page.click('[data-testid="ai-lyrics-button"]');

    // 填写生成参数
    await page.fill('[data-testid="theme-input"]', '爱情');
    await page.fill('[data-testid="mood-input"]', '甜蜜');
    await page.fill('[data-testid="keywords-input"]', '星空,梦想,永恒');

    // 点击生成按钮
    await page.click('[data-testid="generate-button"]');

    // 等待生成结果
    await expect(page.locator('[data-testid="lyrics-result"]')).toBeVisible();

    // 验证生成的歌词
    const lyrics = await page.locator('[data-testid="lyrics-result"]').textContent();
    expect(lyrics.length).toBeGreaterThan(0);
  });
});
```

实施步骤：
1. 安装 Playwright
2. 配置测试环境
3. 为核心流程编写测试
4. 为关键功能编写测试
5. 运行测试并查看结果

验证标准：
- 所有 E2E 测试通过
- 测试运行稳定
- 覆盖核心流程
```

---

## 八、其他优化提示词

### 8.1 动态歌曲索引

```
提示词：实现动态歌曲索引，解决硬编码歌曲 ID 问题

当前问题（DeepAssessment_v7.md M-2）：
- 排行榜和数据分析端点中硬编码了 `['track-1', ..., 'track-6']`
- 用户通过 AI 创作生成的新歌曲（ID 格式 `ai-{timestamp}`）和本地上传的歌曲（ID 格式 `custom-{timestamp}`）永远不会出现在排行榜和数据分析中

修复目标：
1. 维护一个 KV 键 `system:all-song-ids` 动态追踪所有有数据的歌曲 ID
2. 排行榜和数据分析端点从该键读取歌曲 ID 列表
3. 新增歌曲时自动更新该键

实现方案：
```typescript
// 获取所有歌曲 ID
async function getAllSongIds(): Promise<string[]> {
  const cached = await kv.get('system:all-song-ids');
  if (cached) {
    return JSON.parse(cached);
  }
  return [];
}

// 添加歌曲 ID
async function addSongId(songId: string): Promise<void> {
  const allIds = await getAllSongIds();
  
  // 避免重复
  if (!allIds.includes(songId)) {
    allIds.push(songId);
    await kv.set('system:all-song-ids', JSON.stringify(allIds));
  }
}

// 在创建歌曲时调用
async function createSong(songData: SongData): Promise<Song> {
  const songId = `ai-${Date.now()}`;
  
  // 保存歌曲数据
  await kv.set(`song:${songId}`, JSON.stringify(songData));
  
  // 更新歌曲索引
  await addSongId(songId);
  
  return { id: songId, ...songData };
}

// 在排行榜端点使用
app.get('/api/v1/leaderboard', async (c) => {
  const allSongIds = await getAllSongIds();
  
  // 从所有歌曲中获取排行榜数据
  const songs = await Promise.all(
    allSongIds.map(async (songId) => {
      const song = await kv.get(`song:${songId}`);
      return JSON.parse(song);
    })
  );
  
  // 按播放数排序
  const rankedSongs = songs
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, 100);
  
  return c.json({ success: true, data: rankedSongs });
});
```

实施步骤：
1. 创建歌曲索引管理函数
2. 更新创建歌曲逻辑
3. 更新排行榜端点
4. 更新数据分析端点
5. 测试所有功能

验证标准：
- AI 生成的歌曲出现在排行榜
- 本地上传的歌曲出现在排行榜
- 排行榜数据正确
- 数据分析数据正确
```

### 8.2 共享作品存储重构

```
提示词：重构共享作品存储，解决单一 KV 键问题

当前问题（DeepAssessment_v7.md M-3）：
- `shared-works` 键存储了全部用户的所有共享创作作品（JSON 数组）
- `slice(0, 1000)` 截断上限
- 单个 KV 值可能非常大（1000 个作品 × 平均 1KB/作品 = ~1MB）
- 每次新增作品都需要反序列化 → 修改 → 序列化整个数组
- 并发写入可能丢失数据

重构目标：
1. 改为 `shared-work:{workId}` 独立键
2. 维护 `shared-work-index` 有序索引
3. 支持分页查询
4. 避免并发写入冲突

实现方案：
```typescript
// 添加共享作品
async function addSharedWork(work: Work): Promise<void> {
  const workId = work.id;
  
  // 保存独立作品
  await kv.set(`shared-work:${workId}`, JSON.stringify(work));
  
  // 更新索引
  const index = await getSharedWorkIndex();
  index.unshift(workId); // 新作品在前
  await kv.set('shared-work-index', JSON.stringify(index));
}

// 获取共享作品索引
async function getSharedWorkIndex(): Promise<string[]> {
  const cached = await kv.get('shared-work-index');
  if (cached) {
    return JSON.parse(cached);
  }
  return [];
}

// 分页获取共享作品
async function getSharedWorks(page: number = 1, limit: number = 20): Promise<Work[]> {
  const index = await getSharedWorkIndex();
  const start = (page - 1) * limit;
  const end = start + limit;
  const pageIds = index.slice(start, end);
  
  // 并行获取作品数据
  const works = await Promise.all(
    pageIds.map(async (workId) => {
      const work = await kv.get(`shared-work:${workId}`);
      return work ? JSON.parse(work) : null;
    })
  );
  
  return works.filter(Boolean);
}

// 在发布作品时调用
app.post('/api/v1/works/share', async (c) => {
  const user = await authenticateRequest(c);
  if (!user) {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED' } }, 401);
  }
  
  const { workId } = await c.req.json();
  const work = await kv.get(`work:${workId}`);
  
  if (!work) {
    return c.json({ success: false, error: { code: 'WORK_NOT_FOUND' } }, 404);
  }
  
  // 添加到共享作品
  await addSharedWork(work);
  
  return c.json({ success: true, data: { message: '作品已共享' } });
});
```

实施步骤：
1. 创建共享作品管理函数
2. 更新共享作品端点
3. 更新获取共享作品端点
4. 测试并发写入
5. 测试分页查询

验证标准：
- 并发写入不丢失数据
- 分页查询正常
- 性能明显提升
- 无数据丢失
```

### 8.3 Error Boundary 添加

```
提示词：为 D-Music 添加 Error Boundary

当前问题（DeepAssessment_v7.md L-7）：
- 无客户端错误边界（Error Boundary）
- 组件崩溃导致白屏
- 用户体验差

实施目标：
1. 添加全局 Error Boundary
2. 捕获组件错误
3. 显示友好的错误界面
4. 记录错误日志

实现方案：
```typescript
// src/app/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 记录错误日志
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    // 发送到错误追踪服务
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: true
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">出错了</h1>
            <p className="text-gray-400 mb-6">
              应用遇到了一些问题，请刷新页面重试
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg"
            >
              刷新页面
            </button>
            {this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-gray-500">
                  错误详情
                </summary>
                <pre className="mt-2 p-4 bg-gray-800 rounded text-sm overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 在 App.tsx 中使用
function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
```

实施步骤：
1. 创建 Error Boundary 组件
2. 在 App.tsx 中使用
3. 测试错误捕获
4. 优化错误界面

验证标准：
- 组件崩溃不导致白屏
- 显示友好的错误界面
- 错误日志正确记录
```

### 8.4 i18n 翻译键提取

```
提示词：提取 i18n 翻译键到独立文件

当前问题（DeepAssessment_v7.md L-6）：
- `useI18n` 翻译键内嵌于 Hook 文件，约 420+ 键
- 文件膨胀
- 难以维护和翻译

重构目标：
1. 提取翻译键到独立 JSON 文件
2. 按语言分组
3. 支持动态加载
4. 易于维护和翻译

实现方案：
```typescript
// src/app/i18n/zh-CN.json
{
  "common": {
    "loading": "加载中...",
    "save": "保存",
    "cancel": "取消",
    "confirm": "确认",
    "delete": "删除"
  },
  "auth": {
    "login": "登录",
    "logout": "退出",
    "signup": "注册",
    "username": "用户名",
    "password": "密码",
    "email": "邮箱"
  },
  "player": {
    "play": "播放",
    "pause": "暂停",
    "next": "下一首",
    "previous": "上一首",
    "shuffle": "随机播放",
    "repeat": "循环播放"
  },
  "panels": {
    "playlist": "播放列表",
    "profile": "个人资料",
    "community": "社区动态",
    "analytics": "数据分析",
    "ai_lyrics": "AI 歌词生成",
    "leaderboard": "排行榜",
    "creation_studio": "创作工坊",
    "space_time": "时空喊话",
    "star_power": "星力商城",
    "achievements": "成就徽章",
    "shop": "商城",
    "challenge": "挑战赛"
  }
}

// src/app/i18n/en-US.json
{
  "common": {
    "loading": "Loading...",
    "save": "Save",
    "cancel": "Cancel",
    "confirm": "Confirm",
    "delete": "Delete"
  },
  "auth": {
    "login": "Login",
    "logout": "Logout",
    "signup": "Sign Up",
    "username": "Username",
    "password": "Password",
    "email": "Email"
  }
  // ... 其他翻译
}

// src/app/hooks/useI18n.tsx
import { useState, useEffect } from 'react';
import zhCN from '../i18n/zh-CN.json';
import enUS from '../i18n/en-US.json';

const translations = {
  'zh-CN': zhCN,
  'en-US': enUS
};

export function useI18n() {
  const [language, setLanguage] = useState('zh-CN');

  const t = (key: string, params?: Record<string, string>): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    if (typeof value !== 'string') {
      return key;
    }
    
    // 替换参数
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        value = value.replace(`{${k}}`, v);
      });
    }
    
    return value;
  };

  const changeLanguage = (lang: 'zh-CN' | 'en-US') => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  useEffect(() => {
    const savedLang = localStorage.getItem('language') as 'zh-CN' | 'en-US';
    if (savedLang) {
      setLanguage(savedLang);
    }
  }, []);

  return { t, language, changeLanguage };
}
```

实施步骤：
1. 创建 i18n 目录
2. 提取翻译键到 JSON 文件
3. 重构 useI18n Hook
4. 更新所有使用翻译的组件
5. 测试多语言切换

验证标准：
- 翻译键正确提取
- 多语言切换正常
- 文件结构清晰
```

### 8.5 CORS 配置收紧

```
提示词：收紧 CORS 配置，提升安全性

当前问题（DeepAssessment_v7.md 安全评估）：
- CORS 配置为 `origin: "*"` 完全开放
- 安全风险高

修复目标：
1. 限定允许的前端域名
2. 支持开发环境
3. 配置正确的 CORS 头

实现方案：
```typescript
// supabase/functions/server/index.tsx
import { cors } from 'hono/cors';

// 获取允许的域名
const allowedOrigins = [
  'http://localhost:3250',           // 开发环境
  'http://127.0.0.1:3250',         // 本地开发
  'https://dmusic.yyc3.com',         // 生产环境
  'https://www.dmusic.yyc3.com'       // 生产环境 www
];

app.use('*', cors({
  origin: (origin) => {
    // 允许配置的域名
    if (!origin) return true; // 同源请求
    return allowedOrigins.includes(origin);
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 小时
}));
```

实施步骤：
1. 配置允许的域名列表
2. 更新 CORS 中间件
3. 测试跨域请求
4. 测试生产环境

验证标准：
- 开发环境正常访问
- 生产环境正常访问
- 未授权域名被拒绝
- CORS 头正确
```

### 8.6 速率限制实现

```
提示词：实现请求速率限制，防止恶意攻击

当前问题（DeepAssessment_v7.md L-4）：
- 无请求速率限制
- 可被恶意刷票/刷星力
- 安全风险高

实施目标：
1. 基于 IP 的速率限制
2. 基于用户的速率限制
3. 为不同端点配置不同限制
4. 使用 Redis 存储

实现方案：
```typescript
// supabase/functions/server/middleware/ratelimit.tsx
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

export async function rateLimitByIP(
  req: Request,
  limit: number = 10,
  window: string = '10 s'
): Promise<boolean> {
  const ip = getClientIP(req);
  const { success, remaining, reset } = await ratelimit.limit(ip);

  if (!success) {
    throw new Error(`请求过于频繁，请 ${reset} 秒后重试`);
  }

  return true;
}

export async function rateLimitByUser(
  req: Request,
  userId: string,
  limit: number = 10,
  window: string = '10 s'
): Promise<boolean> {
  const { success, remaining, reset } = await ratelimit.limit(`user:${userId}`);

  if (!success) {
    throw new Error(`请求过于频繁，请 ${reset} 秒后重试`);
  }

  return true;
}

// 在路由中使用
app.post('/api/v1/starpower/shop/purchase', async (c) => {
  const user = await authenticateRequest(c);
  
  if (user) {
    // 基于用户的速率限制
    await rateLimitByUser(c.req, user.id, 5, '1 m');
  } else {
    // 基于 IP 的速率限制
    await rateLimitByIP(c.req, 10, '1 m');
  }
  
  // 处理请求
});
```

实施步骤：
1. 安装速率限制库
2. 创建速率限制中间件
3. 为不同端点配置限制
4. 添加速率限制头
5. 测试限制逻辑

验证标准：
- 速率限制正常工作
- 限制头正确返回
- 不同场景限制正确
- 性能无明显下降
```

---

## 附录：快速参考

### A. 优先级矩阵

| 任务 | 优先级 | 预估耗时 | 负责方 |
|------|--------|----------|--------|
| 修复星力商城 KV Key Bug | 🔴 P0 | 1 小时 | 开发 |
| App.tsx 状态重构 | 🔴 P0 | 8 小时 | 开发 |
| 后端路由模块化 | 🔴 P0 | 6 小时 | 开发 |
| API 认证加固 | 🔴 P0 | 4 小时 | 开发 |
| KV 键命名统一 | 🟡 P1 | 2 小时 | 开发 |
| 引入 React Router | 🟡 P1 | 6 小时 | 开发 |
| 代码分割 | 🟡 P1 | 4 小时 | 开发 |
| 动态歌曲索引 | 🟡 P1 | 4 小时 | 开发 |
| 共享作品存储重构 | 🟡 P1 | 6 小时 | 开发 |
| CORS 配置收紧 | 🟡 P1 | 2 小时 | 开发 |
| 速率限制实现 | 🟡 P1 | 4 小时 | 开发 |
| PostgreSQL 15 迁移 | 🟡 P1 | 16 小时 | 开发 |
| AI 模型集成 | 🟡 P1 | 12 小时 | 开发 |
| Error Boundary 添加 | 🟢 P2 | 2 小时 | 开发 |
| i18n 翻译键提取 | 🟢 P2 | 4 小时 | 开发 |
| 单元测试编写 | 🟢 P2 | 24 小时 | 开发 |
| 集成测试编写 | 🟢 P2 | 20 小时 | 开发 |
| E2E 测试编写 | 🟢 P2 | 16 小时 | 开发 |
| 组件库设计 | 🟢 P2 | 20 小时 | Figma AI |
| 主题系统设计 | 🟢 P2 | 16 小时 | Figma AI |
| 数据可视化设计 | 🟢 P2 | 12 小时 | Figma AI |

### B. 工具清单

| 类别 | 工具 | 用途 |
|------|------|------|
| **设计** | Figma | UI/UX 设计 |
| **开发** | VS Code | 代码编辑 |
| **测试** | Vitest | 单元/集成测试 |
| **E2E** | Playwright | 端到端测试 |
| **构建** | Vite | 快速构建 |
| **类型** | TypeScript | 类型检查 |
| **规范** | ESLint, Prettier | 代码规范 |
| **数据库** | PostgreSQL 15 | 数据库 |
| **缓存** | Redis | 缓存 |
| **AI** | OpenAI SDK | AI 集成 |

---

---

## 九、已实现模块进度追踪

### §19.x — 歌词时间轴评论（弹幕式时间锚点评论系统）✅

**状态**: 已完成
**文件变更**:
- `NEW` `/src/app/components/TimelineComments.tsx` — 弹幕式时间锚点评论前端组件
- `MOD` `/supabase/functions/server/index.tsx` — 新增 3 个后端端点
- `MOD` `/src/app/App.tsx` — 集成 TimelineComments 到主内容区域

**功能特性**:
1. 弹幕式浮动评论，锚定到播放时间轴
2. 碰撞检测 + 5 通道分配算法，避免重叠遮挡
3. 半透明非侵入式渲染（opacity 0.85 + backdrop-blur）
4. 支持发送/点赞操作
5. 弹幕开关切换（Eye/EyeOff 图标）
6. 每首歌最多 200 条评论（后端截断）

**后端端点**:
- `GET /timeline-comments/:songId` — 获取歌曲时间轴评论
- `POST /timeline-comments/:songId` — 发送时间轴评论（需认证 + 速率限制）
- `POST /timeline-comments/:songId/like/:commentId` — 点赞评论

**KV 键**: `timeline-comments:{songId}`

---

### §20.x — 创作协作分支树（Fork Tree 可视化）✅

**状态**: 已完成
**文件变更**:
- `NEW` `/src/app/components/ForkTree.tsx` — 分支树可视化面板组件
- `MOD` `/supabase/functions/server/index.tsx` — 新增分支树聚合端点
- `MOD` `/src/app/App.tsx` — lazy import + PanelType 扩展 + header 按钮 + JSX 挂载

**功能特性**:
1. 递归 BFS 遍历构建完整的 fork tree（最大 50 节点）
2. 深度着色系统（purple → cyan → green → amber → rose 渐变）
3. 交互式节点展开，显示歌词预览
4. 根作品列表 → 树视图两级导航
5. 原创/改编标签区分
6. 节点数量 + 分支数统计

**后端端点**:
- `GET /works/fork-tree/:workId` — 递归聚合某作品的完整分支树

**KV 键**: 复用 `work:{workId}` + `work:{workId}:forks`

---

### §21.x — M❤️值动态成长体系（三维计算可视化）✅

**状态**: 已完成
**文件变更**:
- `NEW` `/src/app/components/MHeartSystem.tsx` — M❤️值成长体系面板组件
- `MOD` `/supabase/functions/server/index.tsx` — 新增 M❤️值计算端点
- `MOD` `/src/app/App.tsx` — lazy import + PanelType 扩展 + header 按钮 + JSX 挂载

**功能特性**:
1. **三维计算模型**:
   - 情感强度（45%）— 基于收听历史情感权重计算
   - 共鸣值（30%）— 基于点赞/标注/评论深度的对数计算
   - 稀缺度（25%）— 基于成就解锁率的反比系数
2. **五段位体系**: 新星 → 铜心 → 银心 → 金心 → 钻心
3. **可视化**:
   - 动画计分器（ease-out cubic 1.5s 过渡）
   - 雷达图（Radar Chart — 三维指标对比）
   - 饼图（Pie Chart — 情感分布）
   - 面积图（Area Chart — M❤️值成长趋势）
4. 段位进度条 + 下一段位差值提示
5. 数据自动存储到 KV + 30 点趋势追踪

**后端端点**:
- `GET /mheart/:userId` — 计算并返回 M❤️值 + 趋势数据

**KV 键**: `mheart:{userId}` (当前值) + `mheart-trend:{userId}` (趋势)

**计算公式**:
```
M❤️ = round(emotionIntensity × 0.45 × 100 + resonance × 0.30 × 100 + rarity × 0.25 × 100)
```

---

### App.tsx 集成清单（§19-21）

| 项目 | 改动类型 | 说明 |
|------|----------|------|
| `TimelineComments` | 直接 import | 非面板，作为主内容区叠加层渲染 |
| `ForkTree` | lazy import + Suspense | 面板式组件，fork-tree PanelType |
| `MHeartSystem` | lazy import + Suspense | 面板式组件，mheart PanelType |
| PanelType 扩展 | `'fork-tree' \| 'mheart'` | 新增 2 个面板类型 |
| Header 按钮 | GitBranch + Heart 图标 | 新增 2 个导航入口 |
| MobileNav | 新增 props | onOpenForkTree + onOpenMHeart |
| Hook 数量 | 不变 | 严格遵守 hook 数量不可变原则 |

---

### §22.x — 情感波纹可视化（Emotion Ripple Visualization）

**状态**: 已完成
**文件变更**:
- `NEW` `/src/app/components/EmotionRipple.tsx` — Canvas 实时情感波纹组件
- `MOD` `/src/app/App.tsx` — import + 集成到 MediaDisplay 区域

**功能特性**:
1. **Canvas 实时渲染**:
   - requestAnimationFrame 驱动的 60fps 动画循环
   - ResizeObserver 自适应画布尺寸
   - HiDPI (devicePixelRatio) 适配
2. **情感色彩映射**:
   - happy → 金色 (H:45)
   - energetic → 橙红 (H:15)
   - calm → 青色 (H:180)
   - sad → 蓝色 (H:225)
   - neutral → 紫色 (H:260)
   - HSL 插值实现电影级平滑色彩过渡（lerp factor: 0.03）
3. **音频能量驱动**:
   - 波纹生成频率与 audioEnergy 正相关（200ms~1200ms 间隔）
   - 波纹半径、速度、线宽随能量动态缩放
   - 高能量 (>0.6) 触发双重波纹
4. **深空主题视觉效果**:
   - 中心辐射环境光晕
   - 双层同心圆波纹（外环 + 内辉环）
   - 随扩散渐隐的 opacity 衰减曲线
   - pointer-events-none 非侵入式叠加
5. **性能优化**:
   - 最大 40 个并发波纹上限
   - alpha < 0.003 自动回收
   - 随机偏移提供有机感，避免机械重复

**技术实现**: 纯 Canvas 2D（无第三方库���赖），`z-[2]` 层级叠加在 MediaDisplay 之上

---

### 移动端 MobileNav 补强（§20/§21 入口）

**状态**: 已完成
**文件变更**:
- `MOD` `/src/app/components/MobileNav.tsx` — 新增 quick action row
- `MOD` `/src/app/App.tsx` — 传递 onOpenForkTree / onOpenMHeart props

**功能特性**:
1. 新增上方快捷操作行（Quick Action Row）
2. GitBranch 按钮 → 打开 fork-tree 面板
3. Heart 按钮 → 打开 mheart 面板（仅登录用户可见）
4. 紧凑圆角胶囊按钮设计，9px 字号，不干扰主导航
5. 符合 WCAG aria-label 无障碍标准

---

### 全链路编译验证清单

| 检查项 | 状态 | 说明 |
|--------|------|------|
| TimelineComments props 类型 | 通过 | songId/currentTime/duration/isPlaying/user/lang |
| ForkTree props 类型 | 通过 | isOpen/onClose/lang |
| MHeartSystem props 类型 | 通过 | isOpen/onClose/userId?/lang |
| EmotionRipple props 类型 | 通过 | emotion/audioEnergy/isPlaying |
| MobileNav 新 props | 通过 | onOpenForkTree?/onOpenMHeart? |
| 后端端点路由前缀 | 通过 | /make-server-f626b673/ 统一 |
| requireAuth / rateLimit | 通过 | POST timeline-comments 需认证 |
| Lazy import 格式 | 通过 | .then(m => ({ default: m.X })) |
| PanelType 联合类型 | 通过 | 含 fork-tree / mheart |
| Hook 数量不可变 | 通过 | 无新增 hook |
| recharts 依赖 | 通过 | MHeartSystem 使用（已安装） |

---

### App.tsx 集成清单（§19-23 完整）

| 项目 | 改动类型 | 说明 |
|------|----------|------|
| `TimelineComments` | 直接 import | 非面板，主内容区弹幕叠加层 |
| `EmotionRipple` | 直接 import | 非面板，MediaDisplay 波纹叠加层 + 节拍检测 |
| `ForkTree` | lazy import + Suspense | fork-tree PanelType |
| `MHeartSystem` | lazy import + Suspense | mheart PanelType |
| `ChallengePanel` | lazy import + Suspense | challenge PanelType（增强） |
| `MobileNav` | 新增 2 个回调 props | 移动端面板入口 |
| PanelType | `'fork-tree' \| 'mheart'` | 2 个新面板类型 |
| Header 桌面端 | GitBranch + Heart | 2 个导航图标 |
| Hook 数量 | 不变 | 严格遵守 |

---

### §23.x — 创作挑战赛排行榜增强 + 节拍检测 + 数据联动

**状态**: 已完成
**文件变更**:
- `MOD` `/src/app/components/ChallengePanel.tsx` — 新增冠军展示区 + 荣耀殿堂标签 + 领奖台可视化
- `MOD` `/src/app/components/EmotionRipple.tsx` — 新增 frequencyData prop + 低频节拍检测
- `MOD` `/src/app/components/MHeartSystem.tsx` — 新增收听统计联动摘要展示
- `MOD` `/supabase/functions/server/index.tsx` — 修复 KV 键前缀 + 新增 2 端点 + 增强 MHeart 计算

#### §23.1 — 创作挑战赛排行榜增强

**功能特性**:
1. **Top 3 领奖台可视化**: 排行榜顶部添加冠亚季三柱式领奖台（Crown/Medal/Award），冠军带呼吸光晕
2. **荣耀殿堂标签页** (`champions`): 展示历史挑战赛冠军记录，含主题名称/前三名/参赛者数/结算日期
3. **赛事结算端点** (`POST /challenges/:id/finalize`): 重算最终分数、按排名发放 SP 奖励（500/300/200）、存储冠军记录
4. **历史冠军查询端点** (`GET /challenges/champions`): 返回最近 20 期冠军记录

**后端端点**:
- `GET /challenges/champions` — 获取历史冠军列表
- `POST /challenges/:challengeId/finalize` — 结算赛事（requireAuth）

**KV 键**: `challenges:champions` (冠军列表，最多 20 条)

#### §23.2 — EmotionRipple 节拍检测增强

**功能特性**:
1. 新增 `frequencyData: Uint8Array` prop，接收音频引擎频率数据
2. 低频段分析（bins 0-5）：计算 bassEnergy 和 bassRise（帧间差值）
3. 节拍触发条件：`bassRise > 0.12 && bassEnergy > 0.35`
4. 节拍响应：生成 3 个同心脉冲波纹（高亮度 + 高速度 + 粗线宽）
5. 120ms 冷却时间防止过密触发
6. 与普通能量波纹共存，形成「节拍脉冲 + 环境涟漪」双层视觉效果

#### §23.3 — ListeningStats → MHeart 数据联动

**关键 BUG 修复**:
- MHeart 端点使用了错误的 KV 键 `listening-history:${userId}`
- 正确键为 `user:${userId}:listening-history`（与 listening-history POST 端点一致）
- 此修复使 M❤️值的情感强度计算能正确读取收听数据

**增强计算模型**:
1. **收听时长加权**: `durationFactor = min(2, 1 + log10(1 + listenDuration/60))`
   - 听完整首歌（>60s）比跳过的歌曲贡献更高的情感权重
2. **累计时长奖励**: 总收听 >1 小时给予最高 +2 的强度加成
3. **会话数提升共鸣**: 活跃用户（>10 次会话）获得 `log10(sessions) * 0.5` 共鸣值加成
4. **前端展示**: MHeartSystem 面板在段位进度条下方显示收听分钟数和会话数

**计算公式（更新）**:
```
emotionIntensity = min(10, avgWeight × (8 + durationBonus))
  where avgWeight = sum(emotionWeight × durationFactor) / sessions
  where durationBonus = min(2, totalListenSeconds / 3600)

resonance = min(10, log10(1 + likes×2 + annos×3) × 3 + sessionBonus)
  where sessionBonus = sessions > 10 ? log10(sessions) × 0.5 : 0

M❤️ = round(emotionIntensity × 45 + resonance × 30 + rarity × 25)
```

---

### §24.x — 赛事自动结算 + 高潮粒子爆发 + 移动端波纹集成

**状态**: 已完成
**文件变更**:
- `MOD` `/supabase/functions/server/index.tsx` — `/challenges/active` 增加自动结算逻辑 + 新增通知端点
- `MOD` `/src/app/components/ChallengePanel.tsx` — 自动结算通知 banner
- `MOD` `/src/app/components/EmotionRipple.tsx` — 高潮段落粒子系统 + 扩展辉光
- `MOD` `/src/app/components/MobilePlayer.tsx` — 内嵌 EmotionRipple Canvas
- `MOD` `/src/app/App.tsx` — 传递 frequencyData 至 MobilePlayer

#### §24.1 — 赛事结算自动触发

**触发机制**: 惰性结算（lazy finalization）
- 当任何用户调用 `GET /challenges/active` 时，若当前赛事已过期 (`endsAt < now`)
- 自动执行结算流程：重算最终分数 → SP 奖励发放 → 冠军记录存档 → 参赛者通知存储
- 然后创建新一期赛事
- 去重机制：通过 `challengeId` 校验防止重复结算

**通知系统**:
- KV 键: `challenge-notifications:{challengeId}` — 存储所有参赛者的结算通知
- 新端点: `GET /challenges/notifications/:userId` — 查询用户的赛事通知
- 前端: ChallengePanel 显示结算通知 banner（含冠军信息 + 跳转荣耀殿堂）

**返回数据扩展**:
```json
{ "challenge": {...}, "serverTime": 1740000000, "autoFinalizeResult": {
    "finalized": true,
    "previousChallenge": { "id": "...", "titleZh": "...", "titleEn": "..." },
    "winner": { "userName": "...", "workTitle": "...", "totalScore": 95.3 },
    "totalEntries": 12
  }
}
```

#### §24.2 — EmotionRipple 高潮段落模式

**检测逻辑**:
- 追踪 `highEnergyStartRef`: 当 `audioEnergy > 0.65` 时开始计时
- 持续超过 3 秒 → 进入高潮模式 (`isClimaxRef = true`)
- 退出条件: `audioEnergy < 0.4` 时解除高潮模式

**视觉效果**:
1. **粒子爆发**: 每帧生成 2-6 个发射粒子（从中心向外扩散）
   - 粒子有独立生命周期（60-100 帧）、随机方向、渐隐效果
   - 粒子数量上限 200，防止性能问题
2. **扩展辉光**: 半径扩大至 `max(w,h) * 0.5` 的双色径向渐变
3. **波纹上限提升**: 高潮模式下 maxRipples 从 40 提升至 60

#### §24.3 — MobilePlayer 情感波纹集成

**实现方式**:
- MobilePlayer 新增 `frequencyData?: Uint8Array` prop
- 在全屏播放器背景层内嵌 `<EmotionRipple>` Canvas（z-[1] opacity-60）
- 位于 ambient glow 之后、内容区域之前
- App.tsx 传递 `audio.frequencyData` 到 MobilePlayer
- 移动端用户在全屏播放时可看到情感波纹 + 节拍脉冲 + 高潮粒子爆发

---

### §25.x — 智能歌单 (Smart Playlist)

**状态**: 已完成
**文件变更**:
- `NEW` `/src/app/components/SmartPlaylistPanel.tsx` — 智能歌单面板
- `NEW` `/src/app/lib/canvasPerfRegistry.ts` — Canvas性能注册表（全局共享）
- `MOD` `/supabase/functions/server/index.tsx` — 新增 `GET /smart-playlist/:userId` 端点
- `MOD` `/src/app/App.tsx` — 集成 SmartPlaylistPanel + handleApplySmartQueue

#### §25.1 — 后端情感分析引擎

**分析维度**:
- 读取用户 `listening-history` KV 数据
- 统计各情感维度频率分布（happy/sad/energetic/calm/neutral）
- 计算平均完成率（avgCompletionRate）
- 基于当前情绪 + 历史偏好生成匹配分数

**匹配算法**:
```
matchScore = (emotionMatch / total) * 40 + completionAvg * 30 + min(listenCount * 5, 20) + random(10)
```

#### §25.2 — 前端智能歌单面板

**UI组件**:
- 心情分析：情感分布条形图 + 各维度百分比标签
- 推荐队列：按匹配度排序的曲目列表 + 匹配进度条 + 推荐理由
- 一键应用：重排播放列表顺序

#### §25.3 — PerfMonitor Canvas帧率监控

**架构设计**:
- `canvasPerfRegistry.ts` 作为全局性能数据总线（window单例）
- EmotionRipple 每帧写入：rippleCount / particleCount / drawTimeMs / canvasFps / isClimax
- PerfMonitor 每秒读取并展示 Canvas 专属性能指标
- 新增 Canvas 监控区域：Canvas FPS / Draw Time / Ripple数 / Particle数 / 高潮模式标识

---

### §26.x — 实时互动 (Live Session)

**状态**: 已完成
**文件变更**:
- `NEW` `/src/app/components/LiveSessionPanel.tsx` — 实时互动面板
- `MOD` `/supabase/functions/server/index.tsx` — 新增 5 个端点
- `MOD` `/src/app/App.tsx` — 集成 LiveSessionPanel
- `MOD` `/src/app/components/MobileNav.tsx` — 新增快捷入口

#### §26.1 — 后端实时互动系统

**端点清单**:
| 端点 | 方法 | 说明 |
|------|------|------|
| `/live-session/heartbeat` | POST | 存活心跳（15s间隔），更新用户在线状态 |
| `/live-session/leave` | POST | 离开会话 |
| `/live-session/presence` | GET | 获取在线听众列表（30s内有效） |
| `/live-session/danmaku` | POST | 发送实时弹幕（限速RATE_STANDARD） |
| `/live-session/danmaku` | GET | 获取最近60秒弹幕 |

**KV存储**:
- `live-session:presence` — 在线用户列表（自动过期清理）
- `live-session:danmaku` — 弹幕消息队列（保留最近200条）

#### §26.2 — 前端实时互动面板

**轮询策略（Polling-based）**:
- 心跳发送：每15秒
- 在线状态拉取：每10秒
- 弹幕消息拉取：每5秒

**UI功能**:
- 在线听众列表：头像 + 用户名 + 收听状态指示
- 实时弹幕流：彩色用户消息 + 时间戳 + 自动滚动
- 输入发送：100字符限制 + Enter发送
- 连接状态指示器：绿色脉冲点

#### §26.3 — 移动端 Quick Action Row

**新增按钮**:
- `Brain` 图标 → 智能歌单（仅登录用户可见）
- `Radio` 图标 → 实时互动（仅登录用户可见）

---

**文档版本**: 3.5
**最后更新**: 2026-02-24
**维护团队**: YYC³ Team
