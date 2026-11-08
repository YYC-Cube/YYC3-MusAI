---
@file: Stage2-功能完善-严格执行提示词_v1.0.md
@description: YYC³ YYC3-MusAI 阶段 2 功能完善严格执行提示词
@author: YanYuCloudCube Team
@version: v1.0
@created: 2026-02-26
@updated: 2026-02-26
@status: active
@tags: [stage2, figma, optimization, strict-prompt]
---

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元*
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

---

# 阶段 2：功能完善 - 严格执行提示词

## 📋 执行原则

### 核心原则

| 原则 | 描述 | 执行要求 |
|------|------|----------|
| **Figma 对齐** | 所有 UI/UX 必须严格对齐 Figma 设计 | 逐像素匹配，逐交互验证 |
| **类型安全** | 所有代码必须通过 TypeScript 类型检查 | 零类型错误，严格类型定义 |
| **性能优先** | 所有功能必须满足性能指标 | 响应时间 < 100ms，首屏加载 < 2s |
| **安全第一** | 所有用户操作必须经过安全验证 | 输入验证、权限检查、错误处理 |
| **测试覆盖** | 所有功能必须有对应测试 | 单元测试 ≥ 80%，集成测试 100% |
| **代码质量** | 代码必须符合 YYC³ 编码规范 | ESLint 零警告，代码可读性高 |

### 执行流程

```
┌─────────────────────────────────────────────────────────────┐
│              阶段 2 执行流程                          │
├─────────────────────────────────────────────────────────────┤
│                                                     │
│  1. 任务分析                                       │
│     ├── 阅读 Figma 设计文档                           │
│     ├── 分析现有代码实现                             │
│     ├── 识别差距和优化点                           │
│     └── 制定详细执行计划                             │
│                                                     │
│  2. 代码实现                                       │
│     ├── 按照 Figma 设计实现 UI/UX                   │
│     ├── 遵循 TypeScript 类型安全                       │
│     ├── 实现性能优化措施                           │
│     ├── 添加安全验证机制                           │
│     └── 编写单元测试和集成测试                     │
│                                                     │
│  3. 质量验证                                       │
│     ├── 运行 TypeScript 类型检查                       │
│     ├── 运行 ESLint 代码检查                        │
│     ├── 执行单元测试和集成测试                     │
│     ├── 验证性能指标                               │
│     └── 进行安全扫描                               │
│                                                     │
│  4. Figma 对齐验证                                 │
│     ├── 逐像素比对 UI 设计                           │
│     ├── 逐交互验证用户体验                         │
│     ├── 验证响应式布局                             │
│     └── 确认动画和过渡效果                       │
│                                                     │
│  5. 文档更新                                       │
│     ├── 更新组件文档                               │
│     ├── 更新 API 文档                               │
│     ├── 记录技术债务                               │
│     └── 更新 Figma 交互记录                       │
│                                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 任务 2.1：视频播放功能测试与优化

### 📋 任务目标

验证并优化视频播放功能，确保与 Figma 设计完全对齐，提供流畅的用户体验。

### 🔍 Figma 设计要求

#### UI 设计规范

| 元素 | Figma 要求 | 实现要求 |
|------|------------|----------|
| **视频容器** | 圆角 12px，阴影 0-4px-16px rgba(0,0,0,0.1) | 使用 Tailwind `rounded-xl shadow-lg` |
| **播放控件** | 底部悬浮，高度 64px，背景 blur(20px) | 固定定位，backdrop-filter blur |
| **进度条** | 高度 4px，主色 #6366f1，已播放 #8b5cf6 | 自定义进度条组件 |
| **音量控制** | 悬浮显示，图标 24x24px | SVG 图标，hover 效果 |
| **全屏按钮** | 右上角，32x32px，白色半透明 | 绝对定位，点击全屏 |
| **加载状态** | 中心显示，旋转动画 1s | CSS 动画，loading 组件 |

#### 交互规范

| 交互 | Figma 要求 | 实现要求 |
|------|------------|----------|
| **播放/暂停** | 点击视频区域或控件，图标切换 | 状态管理，图标动画 |
| **进度拖动** | 实时更新时间，预览缩略图 | 事件监听，时间格式化 |
| **音量调节** | 滑块显示，范围 0-100 | input range，实时反馈 |
| **全屏切换** | 平滑过渡，保持播放状态 | Fullscreen API，状态保持 |
| **键盘控制** | Space 播放/暂停，方向键调整 | 全局键盘监听 |

### 🎯 实现要求

#### 功能要求

```typescript
// 视频播放器接口定义
interface VideoPlayerProps {
  src: string;              // 视频源 URL
  poster?: string;          // 封面图 URL
  autoplay?: boolean;       // 自动播放
  controls?: boolean;       // 显示控件
  loop?: boolean;          // 循环播放
  muted?: boolean;         // 静音
  className?: string;       // 自定义样式类
  onPlay?: () => void;    // 播放回调
  onPause?: () => void;   // 暂停回调
  onEnded?: () => void;   // 结束回调
  onError?: (error: Error) => void; // 错误回调
  onProgress?: (progress: number) => void; // 进度回调
  onTimeUpdate?: (currentTime: number) => void; // 时间更新
}
```

#### 性能要求

| 指标 | 目标值 | 测量方法 |
|------|----------|----------|
| **首帧加载时间** | < 1s | Performance API |
| **播放启动延迟** | < 100ms | 事件时间戳 |
| **内存占用** | < 50MB | Performance.memory |
| **CPU 占用** | < 10% | Performance API |
| **帧率** | ≥ 30fps | requestAnimationFrame |

#### 安全要求

```typescript
// 安全验证
interface VideoSecurity {
  validateUrl(url: string): boolean;  // URL 白名单验证
  sanitizeHtml(html: string): string; // HTML 净化
  checkCORS(url: string): boolean;  // CORS 检查
  limitSize(url: string): boolean;  // 文件大小限制
}
```

### ✅ 验收标准

#### 功能验收

- [ ] 视频可以正常播放、暂停、停止
- [ ] 进度条可以拖动，实时更新时间
- [ ] 音量可以调节，静音功能正常
- [ ] 全屏切换流畅，状态保持正确
- [ ] 键盘控制响应及时（Space、方向键）
- [ ] 视频加载失败有友好提示
- [ ] 支持多种视频格式（MP4、WebM、Ogg）

#### UI/UX 验收

- [ ] UI 设计与 Figma 完全一致（逐像素比对）
- [ ] 播放控件动画流畅，过渡自然
- [ ] 响应式布局在不同屏幕尺寸正常
- [ ] 加载状态清晰可见
- [ ] 错误提示友好明确
- [ ] 无障碍支持（ARIA 标签、键盘导航）

#### 性能验收

- [ ] 首帧加载时间 < 1s
- [ ] 播放启动延迟 < 100ms
- [ ] 内存占用 < 50MB
- [ ] CPU 占用 < 10%
- [ ] 帧率 ≥ 30fps

#### 代码质量验收

- [ ] TypeScript 类型检查零错误
- [ ] ESLint 检查零警告
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] 集成测试通过率 100%

### 📝 执行步骤

#### 步骤 1：分析现有实现

```bash
# 查看当前视频播放器实现
cat src/app/components/MediaDisplay.tsx

# 查看 Track 接口定义
cat src/app/playlistData.ts

# 查看视频路径配置
cat .env | grep VIDEO
```

#### 步骤 2：优化视频播放器组件

```typescript
// 创建优化后的视频播放器组件
// src/app/components/VideoPlayer.tsx

import React, { useRef, useState, useEffect } from 'react';
import type { VideoPlayerProps } from '../types';

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  autoplay = false,
  controls = true,
  loop = false,
  muted = false,
  className = '',
  onPlay,
  onPause,
  onEnded,
  onError,
  onProgress,
  onTimeUpdate
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 实现视频播放逻辑...
  // 严格对齐 Figma 设计规范

  return (
    <div className="video-container">
      {/* 视频元素 */}
      {/* 播放控件 */}
      {/* 进度条 */}
      {/* 音量控制 */}
      {/* 全屏按钮 */}
    </div>
  );
};
```

#### 步骤 3：更新 MediaDisplay 组件

```typescript
// 更新 MediaDisplay 组件以使用新的 VideoPlayer
// src/app/components/MediaDisplay.tsx

import { VideoPlayer } from './VideoPlayer';

export const MediaDisplay: React.FC<MediaDisplayProps> = ({ track }) => {
  return (
    <div className="media-display">
      {track.videoUrl ? (
        <VideoPlayer
          src={track.videoUrl}
          poster={track.coverUrl}
          onPlay={() => console.log('Playing')}
          onPause={() => console.log('Paused')}
          onError={(error) => console.error('Video error:', error)}
        />
      ) : (
        <AudioPlayer />
      )}
    </div>
  );
};
```

#### 步骤 4：编写测试

```typescript
// src/app/components/__tests__/VideoPlayer.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { VideoPlayer } from '../VideoPlayer';

describe('VideoPlayer', () => {
  it('should render video element', () => {
    render(<VideoPlayer src="test.mp4" />);
    expect(screen.getByRole('video')).toBeInTheDocument();
  });

  it('should play video on click', () => {
    render(<VideoPlayer src="test.mp4" />);
    const video = screen.getByRole('video');
    fireEvent.click(video);
    // 验证播放状态
  });

  // 更多测试用例...
});
```

#### 步骤 5：性能优化

```typescript
// 实现性能优化措施

// 1. 懒加载视频
const videoRef = useRef<HTMLVideoElement>(null);
const [isVisible, setIsVisible] = useState(false);

useEffect(() => {
  const observer = new IntersectionObserver(([entry]) => {
    setIsVisible(entry.isIntersecting);
  });
  observer.observe(videoRef.current);
  return () => observer.disconnect();
}, []);

// 2. 预加载策略
const preload = isVisible ? 'auto' : 'none';

// 3. 缓存策略
const cacheKey = `video-${src}`;
const cached = localStorage.getItem(cacheKey);
if (cached) {
  // 使用缓存
}
```

#### 步骤 6：Figma 对齐验证

```bash
# 1. 启动开发服务器
pnpm dev

# 2. 打开浏览器开发者工具
# - 检查元素样式
# - 测量尺寸和间距
# - 验证颜色和阴影

# 3. 逐项比对 Figma 设计
# - 视频容器圆角: 12px
# - 播放控件高度: 64px
# - 进度条高度: 4px
# - 颜色值: #6366f1, #8b5cf6

# 4. 测试交互效果
# - 播放/暂停切换
# - 进度拖动
# - 音量调节
# - 全屏切换
```

---

## 任务 2.2：用户认证流程完善与 Figma 对齐

### 📋 任务目标

优化用户认证流程，确保与 Figma 设计完全对齐，提供安全、流畅的登录注册体验。

### 🔍 Figma 设计要求

#### 登录页面设计

| 元素 | Figma 要求 | 实现要求 |
|------|------------|----------|
| **页面容器** | 居中布局，最大宽度 400px | Flexbox 居中，max-w-md |
| **Logo** | 顶部居中，64x64px | SVG Logo，品牌色 |
| **标题** | "欢迎回来"，24px，字重 600 | Tailwind text-2xl font-semibold |
| **表单容器** | 白色背景，圆角 16px，阴影 | bg-white rounded-2xl shadow-xl |
| **输入框** | 高度 48px，圆角 8px，边框 1px | h-12 rounded-lg border |
| **按钮** | 高度 48px，主色 #6366f1，圆角 8px | h-12 bg-indigo-600 rounded-lg |
| **链接** | 底部居中，12px，颜色 #6b7280 | text-sm text-gray-600 |

#### 注册页面设计

| 元素 | Figma 要求 | 实现要求 |
|------|------------|----------|
| **表单字段** | 用户名、邮箱、密码、确认密码 | 4 个输入框，标签清晰 |
| **密码验证** | 实时验证，显示强度指示器 | 正则验证，强度条 |
| **邮箱验证** | 格式验证，发送验证邮件 | Email 正则，Supabase Auth |
| **用户名验证** | 唯一性检查，3-20 字符 | 实时检查，长度限制 |
| **错误提示** | 红色文字，下方显示 | text-red-500，error 状态 |

#### 忘记密码页面设计

| 元素 | Figma 要求 | 实现要求 |
|------|------------|----------|
| **输入框** | 邮箱地址，同登录页样式 | 复用输入框组件 |
| **发送按钮** | "发送重置链接"，主色按钮 | 复用按钮组件 |
| **返回链接** | "返回登录"，灰色文字 | text-gray-600 hover:text-gray-900 |

### 🎯 实现要求

#### 认证流程

```typescript
// 认证状态管理
interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  user: User | null;
}

// 认证操作
interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: ProfileData) => Promise<void>;
}
```

#### 安全要求

```typescript
// 安全验证规则
interface SecurityRules {
  password: {
    minLength: 8;
    maxLength: 128;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumber: boolean;
    requireSpecial: boolean;
  };
  email: {
    format: RegExp;
    verifyDomain: boolean;
  };
  username: {
    minLength: 3;
    maxLength: 20;
    allowedChars: RegExp;
  };
}
```

### ✅ 验收标准

#### 功能验收

- [ ] 用户可以使用邮箱和密码登录
- [ ] 新用户可以注册账号
- [ ] 密码强度实时验证
- [ ] 邮箱格式验证正确
- [ ] 用户名唯一性检查
- [ ] 忘记密码可以重置
- [ ] 登录状态持久化
- [ ] 自动登录功能正常

#### UI/UX 验收

- [ ] 登录页面与 Figma 完全一致
- [ ] 注册页面与 Figma 完全一致
- [ ] 忘记密码页面与 Figma 完全一致
- [ ] 表单验证提示清晰友好
- [ ] 加载状态明确可见
- [ ] 错误提示具体可操作
- [ ] 响应式布局在移动端正常

#### 安全验收

- [ ] 密码加密存储
- [ ] 防止暴力破解（速率限制）
- [ ] CSRF 保护
- [ ] XSS 防护
- [ ] SQL 注入防护

#### 性能验收

- [ ] 登录响应时间 < 500ms
- [ ] 注册响应时间 < 1s
- [ ] 密码重置响应时间 < 1s
- [ ] 页面加载时间 < 2s

### 📝 执行步骤

#### 步骤 1：分析现有认证实现

```bash
# 查看认证相关组件
ls src/app/components/Auth*.tsx

# 查看 Supabase Auth 配置
cat src/app/lib/supabase.ts

# 查看认证路由
cat src/app/routes-auth.ts
```

#### 步骤 2：创建认证表单组件

```typescript
// src/app/components/AuthForms.tsx

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { LoginCredentials, RegisterData } from '../types';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // 登录成功，跳转
      window.location.href = '/';
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="auth-form">
      {/* 严格对齐 Figma 设计 */}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="邮箱地址"
        className="auth-input"
      />
      {/* 其他表单字段 */}
    </form>
  );
};
```

#### 步骤 3：实现密码强度验证

```typescript
// src/app/lib/passwordValidator.ts

export interface PasswordStrength {
  score: number;
  feedback: string;
  color: string;
}

export function validatePassword(password: string): PasswordStrength {
  let score = 0;
  const feedback: string[] = [];

  // 长度检查
  if (password.length >= 8) score += 1;
  else feedback.push('密码至少 8 位');

  // 大写字母
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('包含大写字母');

  // 小写字母
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('包含小写字母');

  // 数字
  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('包含数字');

  // 特殊字符
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else feedback.push('包含特殊字符');

  const color = score <= 2 ? 'red' : score <= 3 ? 'yellow' : 'green';

  return {
    score,
    feedback: feedback.join(', '),
    color
  };
}
```

#### 步骤 4：实现速率限制

```typescript
// src/app/lib/rateLimiter.ts

interface RateLimitStore {
  attempts: number;
  lastAttempt: number;
  lockedUntil: number | null;
}

const rateLimitStore = new Map<string, RateLimitStore>();

export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 60000
): { allowed: boolean; lockedUntil?: number } {
  const now = Date.now();
  const store = rateLimitStore.get(identifier) || {
    attempts: 0,
    lastAttempt: 0,
    lockedUntil: null
  };

  // 检查是否被锁定
  if (store.lockedUntil && store.lockedUntil > now) {
    return { allowed: false, lockedUntil: store.lockedUntil };
  }

  // 检查时间窗口
  if (now - store.lastAttempt > windowMs) {
    store.attempts = 0;
  }

  // 检查尝试次数
  if (store.attempts >= maxAttempts) {
    store.lockedUntil = now + 15 * 60 * 1000; // 锁定 15 分钟
    rateLimitStore.set(identifier, store);
    return { allowed: false, lockedUntil: store.lockedUntil };
  }

  // 更新存储
  store.attempts += 1;
  store.lastAttempt = now;
  rateLimitStore.set(identifier, store);

  return { allowed: true };
}
```

#### 步骤 5：编写测试

```typescript
// src/app/components/__tests__/AuthForms.test.tsx

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from '../AuthForms';
import { supabase } from '../../lib/supabase';

describe('Authentication Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display login form', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText('邮箱地址')).toBeInTheDocument();
    expect(screen.getByLabelText('密码')).toBeInTheDocument();
  });

  it('should validate email format', () => {
    render(<LoginForm />);
    const emailInput = screen.getByLabelText('邮箱地址');
    fireEvent.change(emailInput, { target: { value: 'invalid-email' }});
    // 验证错误提示
  });

  it('should login with valid credentials', async () => {
    render(<LoginForm />);
    // 模拟登录流程
  });

  // 更多测试用例...
});
```

---

## 任务 2.3：社交功能完善与 Figma 对齐

### 📋 任务目标

完善社交互动功能，确保与 Figma 设计完全对齐，提供丰富的用户社交体验。

### 🔍 Figma 设计要求

#### 用户个人资料页面

| 元素 | Figma 要求 | 实现要求 |
|------|------------|----------|
| **头像** | 圆形，120x120px，边框 4px | rounded-full border-4 |
| **用户名** | 24px，字重 600，主色 | text-2xl font-semibold text-indigo-600 |
| **简介** | 14px，灰色，最多 200 字符 | text-sm text-gray-600 line-clamp-3 |
| **统计数据** | 关注、粉丝、获赞数，卡片展示 | grid 布局，数字加粗 |
| **操作按钮** | 关注、私信、分享，图标按钮 | flex 布局，hover 效果 |

#### 关注列表页面

| 元素 | Figma 要求 | 实现要求 |
|------|------------|----------|
| **列表项** | 头像 48x48px，用户名 16px | flex 布局，gap-4 |
| **关注按钮** | 右侧，蓝色，圆角 8px | bg-blue-500 rounded-lg |
| **状态标签** | "互相关注"，灰色文字 | text-gray-500 text-xs |
| **加载更多** | 底部居中，灰色文字 | text-center text-gray-600 |

#### 点赞功能设计

| 元素 | Figma 要求 | 实现要求 |
|------|------------|----------|
| **点赞按钮** | 心形图标，未点赞灰色，已点赞红色 | SVG 图标，颜色切换 |
| **点赞数** | 按钮右侧，数字显示 | text-sm，动态更新 |
| **动画效果** | 点击时心跳动画，0.3s | CSS 动画，scale 变化 |
| **实时更新** | 多人同时点赞，数字同步 | WebSocket 实时更新 |

### 🎯 实现要求

#### 社交功能接口

```typescript
// 社交功能类型定义
interface SocialFeatures {
  // 关注功能
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  getFollowers: (userId: string) => Promise<User[]>;
  getFollowing: (userId: string) => Promise<User[]>;

  // 点赞功能
  likeTrack: (trackId: string) => Promise<void>;
  unlikeTrack: (trackId: string) => Promise<void>;
  getLikes: (trackId: string) => Promise<number>;

  // 评论功能
  addComment: (trackId: string, content: string) => Promise<void>;
  getComments: (trackId: string) => Promise<Comment[]>;
  deleteComment: (commentId: string) => Promise<void>;

  // 分享功能
  shareTrack: (trackId: string, platform: string) => Promise<void>;
  getShareCount: (trackId: string) => Promise<number>;
}
```

### ✅ 验收标准

#### 功能验收

- [ ] 用户可以关注其他用户
- [ ] 用户可以取消关注
- [ ] 可以查看关注列表和粉丝列表
- [ ] 用户可以点赞音乐
- [ ] 用户可以取消点赞
- [ ] 可以查看点赞数
- [ ] 用户可以发表评论
- [ ] 用户可以删除自己的评论
- [ ] 用户可以分享音乐
- [ ] 可以查看分享统计

#### UI/UX 验收

- [ ] 个人资料页面与 Figma 完全一致
- [ ] 关注列表页面与 Figma 完全一致
- [ ] 点赞按钮动画流畅
- [ ] 评论列表布局美观
- [ ] 分享功能交互友好
- [ ] 加载状态明确可见
- [ ] 空状态提示友好

#### 性能验收

- [ ] 关注操作响应时间 < 200ms
- [ ] 点赞操作响应时间 < 100ms
- [ ] 评论加载时间 < 500ms
- [ ] 列表滚动流畅（60fps）

### 📝 执行步骤

#### 步骤 1：分析现有社交功能

```bash
# 查看社交相关组件
ls src/app/components/Social*.tsx

# 查看社交路由
cat src/app/routes-social.ts

# 查看社交 API
cat src/app/routes-community.ts
```

#### 步骤 2：创建关注功能组件

```typescript
// src/app/components/FollowButton.tsx

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '../types';

interface FollowButtonProps {
  userId: string;
  isFollowing: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
}

export const FollowButton: React.FC<FollowButtonProps> = ({
  userId,
  isFollowing,
  onFollowChange
}) => {
  const [loading, setLoading] = useState(false);

  const handleFollow = async () => {
    setLoading(true);
    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('following_id', userId);
      } else {
        await supabase
          .from('follows')
          .insert({ following_id: userId });
      }
      onFollowChange?.(!isFollowing);
    } catch (error) {
      console.error('Follow error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleFollow}
      disabled={loading}
      className={`follow-button ${isFollowing ? 'following' : 'not-following'}`}
    >
      {loading ? '加载中...' : isFollowing ? '已关注' : '关注'}
    </button>
  );
};
```

#### 步骤 3：创建点赞功能组件

```typescript
// src/app/components/LikeButton.tsx

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface LikeButtonProps {
  trackId: string;
  likeCount: number;
  isLiked: boolean;
  onLikeChange?: (isLiked: boolean, count: number) => void;
}

export const LikeButton: React.FC<LikeButtonProps> = ({
  trackId,
  likeCount,
  isLiked,
  onLikeChange
}) => {
  const [loading, setLoading] = useState(false);
  const [liked, setLiked] = useState(isLiked);
  const [count, setCount] = useState(likeCount);

  const handleLike = async () => {
    setLoading(true);
    try {
      if (liked) {
        await supabase
          .from('likes')
          .delete()
          .eq('track_id', trackId);
        setCount(count - 1);
      } else {
        await supabase
          .from('likes')
          .insert({ track_id: trackId });
        setCount(count + 1);
      }
      setLiked(!liked);
      onLikeChange?.(!liked, liked ? count - 1 : count + 1);
    } catch (error) {
      console.error('Like error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={loading}
      className={`like-button ${liked ? 'liked' : 'not-liked'}`}
    >
      <HeartIcon filled={liked} />
      <span>{count}</span>
    </button>
  );
};
```

#### 步骤 4：创建评论功能组件

```typescript
// src/app/components/CommentSection.tsx

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Comment } from '../types';

interface CommentSectionProps {
  trackId: string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({ trackId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          track_id: trackId,
          content: newComment
        })
        .select()
        .single();

      if (error) throw error;

      setComments([...comments, data]);
      setNewComment('');
    } catch (error) {
      console.error('Comment error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="comment-section">
      <form onSubmit={handleSubmit} className="comment-form">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="发表评论..."
          className="comment-input"
        />
        <button type="submit" disabled={loading}>
          {loading ? '发送中...' : '发送'}
        </button>
      </form>
      <div className="comments-list">
        {comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </div>
    </div>
  );
};
```

---

## 任务 2.4：数据分析功能完善与 Figma 对齐

### 📋 任务目标

完善数据展示功能，确保与 Figma 设计完全对齐，提供清晰、直观的数据可视化。

### 🔍 Figma 设计要求

#### 数据仪表盘页面

| 元素 | Figma 要求 | 实现要求 |
|------|------------|----------|
| **统计卡片** | 4 列布局，圆角 12px，阴影 | grid-cols-4 rounded-xl shadow-lg |
| **图表容器** | 高度 300px，白色背景，圆角 | h-80 bg-white rounded-xl |
| **趋势线图** | 主色 #6366f1，平滑曲线 | Chart.js 或 Recharts |
| **饼图** | 多色配色，图例右侧 | Chart.js 或 Recharts |
| **数据表格** | 斑马纹，排序功能 | table-auto，sortable |
| **导出按钮** | 右上角，图标按钮 | absolute top-4 right-4 |

#### 用户行为分析页面

| 元素 | Figma 要求 | 实现要求 |
|------|------------|----------|
| **时间范围选择** | 7 天、30 天、90 天 | tab 切换 |
| **行为热力图** | 日历视图，颜色深浅 | 热力图组件 |
| **活跃时段** | 柱状图，24 小时 | Chart.js 柱状图 |
| **设备分布** | 饼图，移动/桌面 | Chart.js 饼图 |

### 🎯 实现要求

#### 数据分析接口

```typescript
// 数据分析类型定义
interface AnalyticsData {
  // 用户统计
  userStats: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    retentionRate: number;
  };

  // 音乐统计
  trackStats: {
    totalTracks: number;
    totalPlays: number;
    avgPlaysPerUser: number;
    topTracks: Track[];
  };

  // 社交统计
  socialStats: {
    totalFollows: number;
    totalLikes: number;
    totalComments: number;
    avgEngagement: number;
  };

  // 时间序列数据
  timeSeries: {
    date: string;
    users: number;
    plays: number;
    likes: number;
  }[];
}
```

### ✅ 验收标准

#### 功能验收

- [ ] 可以查看用户统计数据
- [ ] 可以查看音乐统计数据
- [ ] 可以查看社交统计数据
- [ ] 可以查看时间趋势数据
- [ ] 可以导出数据（CSV/Excel）
- [ ] 可以自定义时间范围
- [ ] 数据实时更新

#### UI/UX 验收

- [ ] 数据仪表盘与 Figma 完全一致
- [ ] 图表样式美观，配色合理
- [ ] 数据表格清晰易读
- [ ] 加载状态明确可见
- [ ] 空数据状态友好提示
- [ ] 响应式布局在移动端正常

#### 性能验收

- [ ] 数据加载时间 < 2s
- [ ] 图表渲染时间 < 500ms
- [ ] 表格滚动流畅（60fps）
- [ ] 数据导出时间 < 3s

### 📝 执行步骤

#### 步骤 1：分析现有数据展示

```bash
# 查看数据展示组件
ls src/app/components/Analytics*.tsx

# 查看数据路由
cat src/app/routes-diagnostics.ts
```

#### 步骤 2：创建统计卡片组件

```typescript
// src/app/components/StatCard.tsx

import React from 'react';

interface StatCardProps {
  title: string;
  value: number | string;
  change?: number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon,
  trend
}) => {
  return (
    <div className="stat-card">
      <div className="stat-header">
        {icon}
        <span className="stat-title">{title}</span>
      </div>
      <div className="stat-value">{value}</div>
      {change !== undefined && (
        <div className={`stat-change ${trend}`}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
          {Math.abs(change)}%
        </div>
      )}
    </div>
  );
};
```

#### 步骤 3：创建图表组件

```typescript
// src/app/components/LineChart.tsx

import React from 'react';
import { Line } from 'react-chartjs-2';

interface LineChartProps {
  data: number[];
  labels: string[];
  color?: string;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  labels,
  color = '#6366f1'
}) => {
  const chartData = {
    labels,
    datasets: [{
      label: '数据',
      data,
      borderColor: color,
      backgroundColor: `${color}20`,
      fill: true,
      tension: 0.4
    }]
  };

  return (
    <div className="chart-container">
      <Line data={chartData} options={chartOptions} />
    </div>
  );
};
```

---

## 任务 2.5：性能优化

### 📋 任务目标

优化应用性能，确保加载速度快、运行流畅，满足用户体验要求。

### 🎯 性能指标

| 指标 | 目标值 | 测量方法 |
|------|----------|----------|
| **首屏加载时间** | < 2s | Lighthouse |
| **首次内容绘制** | < 1s | Performance API |
| **可交互时间** | < 2.5s | Lighthouse |
| **Lighthouse 评分** | ≥ 90 | Lighthouse |
| **内存占用** | < 100MB | Performance.memory |
| **CPU 占用** | < 20% | Performance API |
| **网络请求** | < 50 个 | Network 面板 |

### ✅ 优化措施

#### 代码优化

```typescript
// 1. 组件懒加载
const LazyComponent = React.lazy(() => import('./HeavyComponent'));

// 2. 虚拟滚动
import { FixedSizeList } from 'react-window';

// 3. 防抖和节流
import { debounce, throttle } from 'lodash-es';

// 4. 图片优化
<img
  src={imageUrl}
  loading="lazy"
  decoding="async"
  width="800"
  height="600"
/>

// 5. 代码分割
const routes = [
  {
    path: '/analytics',
    component: () => import('./Analytics')
  }
];
```

#### 缓存策略

```typescript
// 1. React Query 缓存
import { QueryClient, QueryCache } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 分钟
      cacheTime: 10 * 60 * 1000, // 10 分钟
    }
  }
});

// 2. Service Worker 缓存
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// 3. LocalStorage 缓存
const cacheKey = `data-${endpoint}`;
const cached = localStorage.getItem(cacheKey);
if (cached && !isExpired(cached)) {
  return JSON.parse(cached);
}
```

### ✅ 验收标准

- [ ] Lighthouse 评分 ≥ 90
- [ ] 首屏加载时间 < 2s
- [ ] 首次内容绘制 < 1s
- [ ] 可交互时间 < 2.5s
- [ ] 内存占用 < 100MB
- [ ] CPU 占用 < 20%
- [ ] 网络请求数 < 50

---

## 任务 2.6：安全加固

### 📋 任务目标

完善安全机制，确保用户数据和系统安全。

### 🎯 安全措施

#### 输入验证

```typescript
// Zod schema 验证
import { z } from 'zod';

const userInputSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20),
  password: z.string().min(8).max(128)
    .regex(/[A-Z]/, '必须包含大写字母')
    .regex(/[a-z]/, '必须包含小写字母')
    .regex(/[0-9]/, '必须包含数字'),
  comment: z.string().max(500)
});

// 使用验证
const result = userInputSchema.safeParse(input);
if (!result.success) {
  console.error('Validation error:', result.error);
}
```

#### 权限控制

```typescript
// RLS (Row Level Security) 策略
-- 在 Supabase 中创建 RLS 策略
CREATE POLICY "Users can view own data"
ON users
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
ON users
FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can delete own data"
ON users
FOR DELETE
USING (auth.uid() = id);
```

#### XSS 防护

```typescript
// DOMPurify 净化 HTML
import DOMPurify from 'dompurify';

const cleanHtml = DOMPurify.sanitize(userInput);

// React 自动转义
<div>{userContent}</div>

// 避免使用 dangerouslySetInnerHTML
```

### ✅ 验收标准

- [ ] 所有用户输入经过验证
- [ ] 所有数据库查询使用参数化
- [ ] RLS 策略正确配置
- [ ] XSS 防护有效
- [ ] CSRF 保护有效
- [ ] SQL 注入防护有效
- [ ] 敏感数据加密存储

---

## 📊 阶段 2 执行计划

### 时间安排

| 任务 | 预计时间 | 优先级 | 依赖 |
|------|----------|--------|------|
| 2.1 视频播放功能 | 2 小时 | 🔴 高 | 无 |
| 2.2 用户认证流程 | 4 小时 | 🔴 高 | 无 |
| 2.3 社交功能 | 6 小时 | 🟡 中 | 2.2 |
| 2.4 数据分析功能 | 4 小时 | 🟡 中 | 2.3 |
| 2.5 性能优化 | 6 小时 | 🟡 中 | 2.4 |
| 2.6 安全加固 | 4 小时 | 🟡 中 | 2.5 |

**总计**: 26 小时（约 3-4 天）

### 里程碑

| 里程碑 | 完成标志 | 预期时间 |
|--------|----------|----------|
| **M1: 核心功能完成** | 视频、认证、社交功能完成 | 第 2 天 |
| **M2: 数据展示完成** | 数据分析功能完成 | 第 3 天 |
| **M3: 性能优化完成** | 性能指标达标 | 第 4 天 |
| **M4: 安全加固完成** | 安全测试通过 | 第 4 天 |

---

## 📝 执行检查清单

### 每个任务开始前

- [ ] 阅读 Figma 设计文档
- [ ] 分析现有代码实现
- [ ] 识别差距和优化点
- [ ] 制定详细执行计划

### 每个任务执行中

- [ ] 按照 Figma 设计实现 UI/UX
- [ ] 遵循 TypeScript 类型安全
- [ ] 实现性能优化措施
- [ ] 添加安全验证机制
- [ ] 编写单元测试和集成测试

### 每个任务完成后

- [ ] 运行 TypeScript 类型检查
- [ ] 运行 ESLint 代码检查
- [ ] 执行单元测试和集成测试
- [ ] 验证性能指标
- [ ] 进行安全扫描
- [ ] Figma 对齐验证
- [ ] 更新组件文档
- [ ] 更新 API 文档
- [ ] 记录技术债务
- [ ] 更新 Figma 交互记录

---

## 🚀 开始执行

现在您可以按照上述严格提示词开始执行阶段 2 的任务。

### 建议执行顺序

1. **任务 2.1** - 视频播放功能测试与优化
2. **任务 2.2** - 用户认证流程完善与 Figma 对齐
3. **任务 2.3** - 社交功能完善与 Figma 对齐
4. **任务 2.4** - 数据分析功能完善与 Figma 对齐
5. **任务 2.5** - 性能优化
6. **任务 2.6** - 安全加固

### 执行模式

**选项 A**: 逐个任务执行
- 每次完成一个任务
- 验收后再进入下一个
- 确保质量

**选项 B**: 并行执行
- 同时执行多个任务
- 提高效率
- 需要协调依赖

**选项 C**: 优先级执行
- 先完成高优先级任务
- 再完成中优先级任务
- 灵活调整

---

<div align="center">

> 「***YanYuCloudCube***」
> 「***<admin@0379.email>***」
> 「***Words Initiate Quadrants, Language Serves as Core for Future***」
> 「***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***」

**Made with ❤️ by YanYuCloudCube Team**

</div>
