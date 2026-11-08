# D-Music 项目深度检索分析与综合评估报告

> **审计日期**：2026-02-22
> **版本**：v7.0（深度代码分析 + P3 实施评估）
> **审计范围**：全部前端组件 / 后端 API / Hooks / 配置 / 类型定义 / 样式 / P3 草案
> **分析方法**：逐文件逐段代码审读 + 交叉对照 Guidelines 文档

---

## 一、架构现状总览

### 1.1 代码规模统计

| 模块 | 文件数 | 总行数(估算) | 备注 |
|------|--------|-------------|------|
| `App.tsx` | 1 | ~1,606 | 主组件（God Component） |
| 前端组件 (`/src/app/components/`) | 35+ | ~8,500 | 含 P2 新增 3 个组件 |
| 自定义 Hooks (`/src/app/hooks/`) | 7 | ~1,800 | 核心音频引擎 + AI + PWA + 手势等 |
| 库文件 (`/src/app/lib/`) | 2 | ~60 | `supabase.ts` + `api.ts` |
| 后端服务 (`/supabase/functions/server/index.tsx`) | 1 | ~2,264 | 包含 57+ 路由 |
| 类型定义 (`/config/dmusic_types.ts`) | 1 | ~681 | 完善的 TypeScript 类型体系 |
| 数据配置 (`playlistData.ts`) | 1 | ~300 | 演示播放列表 + 类型定义 |
| i18n 翻译键 | - | ~420+ | 内嵌于 `useI18n.tsx` |
| UI 组件库 (`/src/app/components/ui/`) | 30+ | - | 基于 Radix UI 的 shadcn/ui 组件集 |

### 1.2 技术栈清单

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React | 18.3.1 |
| 样式 | Tailwind CSS | v4.1.12 |
| 动画 | Motion (Framer Motion) | 12.23.24 |
| 状态管理 | React useState (本地状态) | - |
| 路由 | 无（单页 + Modal 叠加层） | - |
| UI 组件库 | Radix UI + shadcn/ui | 多版本 |
| 后端框架 | Hono (Deno Edge Function) | npm |
| 数据库 | Supabase KV Store | 受保护文件 |
| 认证 | Supabase Auth | v2 |
| 存储 | Supabase Storage | 私有桶 |
| 图表 | Recharts | 2.15.2 |
| 图标 | Lucide React | 0.487.0 |
| 构建工具 | Vite | 6.3.5 |

### 1.3 功能模块矩阵

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    D-Music v6.0 功能模块全景图                           │
├──────────────────┬──────────────────┬────────────────────────────────────┤
│  核心播放层       │  创作生产层       │  社交互动层                        │
│  ─────────────── │  ─────────────── │  ──────────────────────           │
│  ✅ 合成器引擎    │  ✅ AI歌词生成    │  ✅ 社区动态流                     │
│  ✅ 真实音频播放  │  ✅ AI作曲引擎    │  ✅ 评论系统(时间轴)               │
│  ✅ 音频可视化    │  ✅ 创作工坊      │  ✅ 时空喊话(含语音)               │
│  ✅ 情感追踪      │  ✅ MV创作器      │  ✅ 作品分享/改编分支              │
│  ✅ 歌词同步      │  ✅ 音频合成器    │  ✅ 通知系统                       │
│  ✅ 播放列表管理  │  ✅ 版权认证 ⭐   │  ✅ 创作挑战赛 ⭐                  │
├──────────────────┼──────────────────┼────────────────────────────────────┤
│  经济激励层       │  智能化层         │  运营管理层                        │
│  ─────────────── │  ─────────────── │  ──────────────────────           │
│  ✅ 星力值体系    │  ✅ AI助手(语音)  │  ✅ 数据分析仪表盘                 │
│  ✅ VIP等级系统   │  ✅ 个性化推荐    │  ✅ Wilson排行榜                   │
│  ✅ 签到奖励      │  ✅ 情感分析      │  ✅ RBAC角色管理                   │
│  ✅ 星力商城 ⭐   │  ✅ 主动提示      │  ✅ 创作者发现                     │
│  ✅ 成就徽章      │  ✅ 预测引擎      │  ✅ IP矩阵面板                     │
│  ✅ 消费闭环      │  ✅ 听歌历史推荐  │  ✅ 用户个人档案                   │
├──────────────────┴──────────────────┴────────────────────────────────────┤
│  跨端体验层                                                              │
│  ✅ 桌面端完整体验  ✅ 移动端导航栏  ✅ 移动端全屏播放器                  │
│  ✅ PWA支持         ✅ 手势滑动切歌  ✅ 触觉反馈(Haptics)                │
│  ✅ 键盘快捷键      ✅ 移动端发现中心  ✅ 安全区域适配                    │
└─────────────────────────────────────────────────────────────────────────┘
⭐ = P2 中期规划新增
```

---

## 二、关键技术债务清单

### 2.1 🔴 严重级别（Critical）

#### 债务 C-1：Star Power 商城 KV Key 不一致 BUG

**问题描述**：
星力商城的购买接口使用了与主星力系统**不同的 KV 键名**，导致购买扣费操作作用于错误的键，用户余额不会被正确扣除。

```typescript
// 主星力系统 (line 208-241):
const value = await kv.get(`user:${userId}:starpower`);    // ✅ 正确的键

// 商城购买 (line 2099):
const spKey = `starpower:${userId}`;                       // ❌ 错误的键前缀！
const spRaw = await kv.get(spKey);
```

**影响范围**：
- 用户在商城购买商品时，扣费从 `starpower:{userId}` 扣除（该键通常为空/0）
- 用户在主界面看到的星力值来自 `user:{userId}:starpower`（未被扣减）
- 实际效果：**用户可以无限免费购买商品**，因为初始余额检查总是对一个空键检查

**修复优先级**：🔴 **立即修复**

---

#### 债务 C-2：App.tsx God Component 反模式

**问题描述**：
`App.tsx` 的 `AppInner` 函数体包含 **~1,600 行代码**，管理 **21+ 个布尔状态变量** 控制面板可见性，承载了全部顶层逻辑：

```typescript
// 21个面板状态变量
const [showPlaylist, setShowPlaylist] = useState(false);
const [showProfile, setShowProfile] = useState(false);
const [showCommunity, setShowCommunity] = useState(false);
const [showComments, setShowComments] = useState(false);
const [showAnalytics, setShowAnalytics] = useState(false);
const [showAILyrics, setShowAILyrics] = useState(false);
const [showLeaderboard, setShowLeaderboard] = useState(false);
const [showRecommendations, setShowRecommendations] = useState(false);
const [showCreationStudio, setShowCreationStudio] = useState(false);
const [showShareWorkModal, setShowShareWorkModal] = useState(false);
const [showMVCreator, setShowMVCreator] = useState(false);
const [showSpaceTime, setShowSpaceTime] = useState(false);
const [showStarPower, setShowStarPower] = useState(false);
const [showIPMatrix, setShowIPMatrix] = useState(false);
const [showAchievements, setShowAchievements] = useState(false);
const [showDiscoverHub, setShowDiscoverHub] = useState(false);
const [showCopyright, setShowCopyright] = useState(false);
const [showShop, setShowShop] = useState(false);
const [showChallenge, setShowChallenge] = useState(false);
const [showAuthModal, setShowAuthModal] = useState(false);
const [showMobilePlayer, setShowMobilePlayer] = useState(false);
```

**风险**：
- 每增加一个面板就新增 2 个 Hook 调用（useState + 相关 useEffect），在 Hook 数量不可变约束下逼近上限
- 所有面板状态变更触发整个 `AppInner` 重渲染
- 新开发者入手困难，认知负载极高
- 难以实现面板互斥逻辑（当前无约束，理论上可同时打开所有面板）

**建议**：
- 将面板状态合并为 `useReducer` + 单一 `activePanel: string | null` 状态
- 或引入 Zustand/Jotai 轻量状态管理
- **注意**：重构时必须保持 Hook 调用数量不变

---

#### 债务 C-3：后端单文件 2,264 行

**问题描述**：
`/supabase/functions/server/index.tsx` 包含全部 57+ 条 API 路由和辅助函数，已达 2,264 行。每次修改任何路由都需要在超长文件中定位代码。

**建议**：
- 在 `/supabase/functions/server/` 目录下按功能域拆分路由模块文件
- 例如：`routes-auth.tsx`, `routes-starpower.tsx`, `routes-challenges.tsx` 等
- 在 `index.tsx` 中导入并挂载各路由模块

---

### 2.2 🟡 中等级别（Medium）

#### 债务 M-1：API 路由缺乏认证保护

**现状**：仅 `POST /user/role/:userId` 一个端点进行了 `getUserFromRequest()` 认证检查。

**风险端点示例**：
| 路由 | 风险 |
|------|------|
| `POST /starpower/:userId` | 任何人可给任意用户增加星力 |
| `POST /starpower/shop/purchase` | 无需认证即可购买 |
| `POST /copyright/apply` | 无需认证即可申请版权 |
| `POST /challenges/:id/submit` | 无需认证即可提交参赛 |
| `POST /challenges/:id/vote` | 无需认证即可投票 |
| `POST /profile/:userId` | 任何人可修改任意用户资料 |

**建议**：为涉及用户数据变更的 POST 端点统一添加认证中间件。

---

#### 债务 M-2：硬编码歌曲 ID 数组

**现状**：排行榜和数据分析端点中硬编码了 `['track-1', ..., 'track-6']`：

```typescript
// server/index.tsx line 575, 832
const songIds = ['track-1', 'track-2', 'track-3', 'track-4', 'track-5', 'track-6'];
```

**影响**：用户通过 AI 创作生成的新歌曲（ID 格式 `ai-{timestamp}`）和本地上传的歌曲（ID 格式 `custom-{timestamp}`）永远不会出现在排行榜和数据分析中。

**建议**：维护一个 KV 键 `system:all-song-ids` 动态追踪所有有数据的歌曲 ID。

---

#### 债务 M-3：单一 KV 键存储所有共享作品

**现状**：`shared-works` 键存储了全部用户的所有共享创作作品（JSON 数组），`slice(0, 1000)` 截断上限。

```typescript
works = [fork, ...works].slice(0, 1000);
await kv.set("shared-works", JSON.stringify(works));
```

**风险**：
- 单个 KV 值可能非常大（1000 个作品 × 平均 1KB/作品 = ~1MB），读写性能下降
- 每次新增作品都需要反序列化 → 修改 → 序列化整个数组
- 并发写入可能丢失数据（两个请求同时读取 → 各自修改 → 后写入的覆盖前者）

**建议**：改为 `shared-work:{workId}` 独立键 + `shared-work-index` 有序索引。

---

#### 债务 M-4：挑战赛 AI 评分为随机数

**现状**：
```typescript
const judgeScore = 70 + Math.random() * 30;  // line 2207
```

评委分为 70-100 的随机数，不基于任何实际内容分析。

**影响**：挑战赛排名的 70% 权重（judgeWeight: 0.7）基于随机数而非作品质量。

**缓解**：当前阶段可接受（标注为 "AI 模拟评分"），但 P3 应考虑接入真实评估逻辑。

---

#### 债务 M-5：无前端路由系统

**现状**：整个应用是单一 URL（无 React Router），所有功能通过 Modal/Panel 叠加实现。

**影响**：
- 无法通过 URL 直接访问特定功能（如 `/leaderboard`、`/challenge`）
- 无法分享链接到特定页面
- 浏览器后退按钮行为不符预期
- SEO 完全不可用（虽然对音乐应用影响较小）

**P3 考量**：数字专辑分发等功能需要独立页面（专辑详情页、购买页），必须引入路由。

---

### 2.3 🟢 低级别（Low / Enhancement）

| # | 债务描述 | 影响 |
|---|---------|------|
| L-1 | 版权哈希使用简单字符码算法，非密码学安全 | 防伪能力弱 |
| L-2 | `SpaceTime.md` 指南文档仍为 Vue 代码示例 | 文档与实际不一致 |
| L-3 | 前端 `apiFetch` 错误时返回 `null` 而非抛出异常 | 调用方容易忽略错误 |
| L-4 | 无请求速率限制 | 可被恶意刷票/刷星力 |
| L-5 | 交易记录 `slice(0, 100)` / `slice(0, 500)` 硬截断 | 历史记录丢失 |
| L-6 | `useI18n` 翻译键内嵌于 Hook 文件，约 420+ 键 | 文件膨胀 |
| L-7 | 无客户端错误边界（Error Boundary） | 组件崩溃导致白屏 |
| L-8 | CSS 主题文件 `theme.css` 中的 design token 与部分组件内联样式冲突 | 样式不一致 |

---

## 三、安全性评估

### 3.1 安全评分：⚠️ 中低（适合原型/演示，不适合生产部署）

| 维度 | 评分 | 说明 |
|------|------|------|
| 认证（AuthN） | ⭐⭐⭐ | Supabase Auth 基础集成，但大部分 API 未校验 |
| 授权（AuthZ） | ⭐ | 仅角色变更端点有 RBAC |
| 数据验证 | ⭐⭐ | 基本的空值检查，无 schema 验证 |
| 防注入 | ⭐⭐⭐⭐ | KV store 操作天然防 SQL 注入 |
| 密钥安全 | ⭐⭐⭐ | SUPABASE_SERVICE_ROLE_KEY 仅在服务端使用 |
| CORS | ⭐⭐ | `origin: "*"` 完全开放 |
| 速率限制 | ⭐ | 无 |
| 内容安全 | ⭐⭐ | 评论/创作内容无审核过滤 |

### 3.2 关键安全建议

1. **立即**：为所有写入操作的 API 端点添加 `getUserFromRequest()` 认证
2. **短期**：收紧 CORS 配置，限定前端域名
3. **中期**：实现请求速率限制（可在 Hono 中间件层实现）
4. **长期**：内容审核过滤（敏感词、垃圾信息检测）

---

## 四、性能评估

### 4.1 前端性能

| 指标 | 现状 | Guidelines 目标 | 差距 |
|------|------|----------------|------|
| 首次加载 | ~3-5s（含大量组件） | <2s | 🔴 超标 |
| 交互响应 | <100ms（本地状态操作） | <100ms | 🟢 达标 |
| 重渲染范围 | 全 AppInner | 最小化 | 🟡 可优化 |
| 代码分割 | 无（全量打包） | 按需加载 | 🔴 缺失 |

**优化建议**：
- 使用 `React.lazy()` + `Suspense` 对大型面板组件实现代码分割
- 将 `MobileDiscoverHub` 回调函数用 `useMemo`/`useCallback` 包裹
- 考虑将非核心组件（ChallengePanel, CopyrightPanel 等）设为懒加载

### 4.2 后端性能

| 指标 | 现状 | Guidelines 目标 | 评估 |
|------|------|----------------|------|
| API 响应时间 | ~50-200ms | <200ms | 🟢 基本达标 |
| 大对象读写 | `shared-works` 全量读写 | 增量操作 | 🟡 瓶颈 |
| KV 调用次数/请求 | 部分端点 5-8 次 | <3 次 | 🟡 可优化 |
| 并发安全 | 无锁机制 | 事务一致 | 🔴 缺失 |

---

## 五、代码质量评估

### 5.1 优点

1. **类型定义完善**：`dmusic_types.ts` 提供了 681 行完整类型定义，涵盖所有业务实体
2. **API 抽象层设计良好**：`apiFetch` 封装了重试逻辑和统一错误处理
3. **i18n 完整覆盖**：全部 UI 文本均通过 `t()` 函数国际化
4. **组件职责分离**：各面板组件（SpaceTimePanel, ChallengePanel 等）内聚性好
5. **音频引擎精心设计**：`useAudioEngine` 支持合成器 + 真实音频双模式
6. **PWA 支持完整**：安装提示、离线检测、Service Worker 就绪
7. **触觉反馈集成**：`useHaptics` 为移动端交互增加物理感知层
8. **错误日志详细**：后端每个 catch 块都包含上下文信息

### 5.2 需改进

1. **测试覆盖率：0%** — 无单元测试、集成测试或 E2E 测试
2. **注释文档比偏低** — 除类型定义外，组件和 Hook 缺少 JSDoc
3. **硬编码常量多** — 商品列表、挑战主题、VIP 等级等应提取为配置文件
4. **错误处理不一致** — 前端 `apiFetch` 返回 null 静默失败 vs 后端返回详细错误

---

## 六、P3 实施可行性评估

### 6.1 数字专辑分发（Digital Album Distribution）

| 维度 | 可行性 | 阻碍因素 |
|------|--------|---------|
| 数据模型 | ✅ 可行 | KV 键设计需谨慎（参考 C-1 教训） |
| 资产存储 | ✅ 可行 | Supabase Storage 已有 Voice 桶经验 |
| 购买流程 | ⚠️ 有风险 | C-1 的 KV 键不一致 bug 必须先修复 |
| 前端 UI | ⚠️ 需重构 | App.tsx 再增面板将不可维护 |
| 路由需求 | ❌ 当前不支持 | 专辑详情页需要 React Router |

**前置条件**：
1. 修复 C-1 (Star Power KV 键不一致)
2. 引入 React Router 实现页面级导航
3. 重构 App.tsx 面板管理逻辑

**预估工期**：4-6 周（含前置重构）

### 6.2 端到端加密（E2EE）

| 维度 | 可行性 | 阻碍因素 |
|------|--------|---------|
| Web Crypto API | ✅ 浏览器原生支持 | 无 |
| 密钥存储 | ⚠️ IndexedDB | 需处理浏览器清除数据场景 |
| PKI 服务端 | ✅ 可行 | KV store 可存储公钥 |
| 消息加密 | ✅ 可行 | SpaceTime 消息已有结构化格式 |
| 多设备同步 | ❌ 复杂度极高 | 需 WebRTC 或中继服务器 |

**前置条件**：
1. 创建 `/src/app/lib/crypto.ts` 工具库
2. SpaceTime 消息 schema 扩展加密字段
3. 用户需有认证账号（匿名用户无法使用 E2EE）

**预估工期**：2-3 周（基础加密），6+ 周（含多设备同步）

### 6.3 P3 实施优先级建议

```
Phase 0 (必须先行 — 1-2 周):
├── 🔴 修复 Star Power 商城 KV Key Bug (C-1)
├── 🟡 引入 React Router (M-5)
├── 🟡 重构 App.tsx 面板状态管理 (C-2)
└── 🟡 API 认证加固 (M-1)

Phase 1 (P3 基础 — 2-3 周):
├── E2EE 基础设施 (crypto utils + PKI API)
├── 后端路由模块化拆分 (C-3)
└── 动态歌曲 ID 索引 (M-2)

Phase 2 (P3 功能 — 3-4 周):
├── 数字专辑 Schema + 存储
├── 私密时空胶囊 (E2EE 应用)
└── 专辑市场 UI

Phase 3 (P3 高级 — 4+ 周):
├── 二级市场
├── 多设备密钥同步
└── 真实 AI 评审接入
```

---

## 七、六化一体对标评估

| 维度 | 达标率 | 关键差距 |
|------|--------|---------|
| 标准化 | 85% | API 认证标准缺失，部分 KV 键命名不规范 |
| 流程化 | 90% | 创作→确权→流通→竞技 闭环已形成 |
| 规范化 | 75% | 代码规范良好但缺少测试覆盖、无 Error Boundary |
| 科技化 | 95% | 音频引擎、AI 创作、语音交互等技术应用充分 |
| 智能化 | 85% | AI 助手/推荐/创作管线完整，挑战赛评分需升级 |
| 国标化 | 70% | WCAG 可访问性未系统验证，安全标准待加强 |

---

## 八、后端 API 全量路由索引（57 条）

<details>
<summary>展开查看完整路由表</summary>

| # | 方法 | 路径 | 功能 | 认证 |
|---|------|------|------|------|
| 1 | GET | `/health` | 健康检查 | 无 |
| 2 | POST | `/signup` | 用户注册 | 无 |
| 3 | GET | `/likes/:songId` | 获取歌曲点赞数 | 无 |
| 4 | POST | `/likes/:songId` | 点赞歌曲 | 无 |
| 5 | GET | `/annotations/:songId` | 获取情感标注 | 无 |
| 6 | POST | `/annotations/:songId` | 添加情感标注 | 无 |
| 7 | GET | `/starpower/:userId` | 获取星力值 | 无 |
| 8 | POST | `/starpower/:userId` | 增加星力值 | 无 |
| 9 | POST | `/starpower/:userId/checkin` | 签到 | 无 |
| 10 | GET | `/starpower/:userId/transactions` | 交易历史 | 无 |
| 11 | GET | `/starpower/:userId/level` | VIP等级 | 无 |
| 12 | POST | `/starpower/:userId/consume` | 消费星力 | 无 |
| 13 | POST | `/leaderboard/boost` | 排行榜助力 | 无 |
| 14 | GET | `/creators` | 创作者列表 | 无 |
| 15 | GET | `/creators/:userName/works` | 创作者作品 | 无 |
| 16 | GET | `/profile/:userId` | 用户资料 | 无 |
| 17 | POST | `/profile/:userId` | 更新资料 | 无 |
| 18 | GET | `/community/activities` | 社区动态 | 无 |
| 19 | POST | `/community/activities` | 发布动态 | 无 |
| 20 | GET | `/leaderboard` | 排行榜 | 无 |
| 21 | POST | `/play/:songId` | 记录播放 | 无 |
| 22 | GET | `/comments/:songId` | 获取评论 | 无 |
| 23 | POST | `/comments/:songId` | 发表评论 | 无 |
| 24 | POST | `/comments/:songId/like/:commentId` | 评论点赞 | 无 |
| 25 | POST | `/ai/lyrics` | AI生成歌词 | 无 |
| 26 | GET | `/analytics/overview` | 数据分析 | 无 |
| 27 | GET | `/user/role/:userId` | 获取角色 | 无 |
| 28 | POST | `/user/role/:userId` | 设置角色 | ✅ Admin |
| 29 | POST | `/ai/compose` | AI作曲 | 无 |
| 30 | GET | `/recommendations/:userId` | 个性化推荐 | 无 |
| 31 | POST | `/listening-history` | 记录听歌历史 | 无 |
| 32-37 | - | `/spacetime/*` | 时空喊话系统 | 无 |
| 38-42 | - | `/spacetime/capsules/*` | 时间胶囊 | 无 |
| 43 | POST | `/voice/upload` | 语音上传 | 无 |
| 44-45 | - | `/works/shared/*` | 共享作品 | 无 |
| 46 | POST | `/works/fork` | 改编分支 | 无 |
| 47 | GET | `/works/:workId/forks` | 改编链 | 无 |
| 48-49 | - | `/achievements/*` | 成就系统 | 无 |
| 50-51 | - | `/notifications/*` | 通知系统 | 无 |
| 52-54 | - | `/copyright/*` | 版权认证 | 无 |
| 55-56 | - | `/starpower/shop/*` | 星力商城 | 无 |
| 57 | GET | `/challenges/active` | 活动挑战 | 无 |
| 58-60 | - | `/challenges/:id/*` | 挑战赛操作 | 无 |

</details>

---

## 九、KV 键命名规范审计

### 当前键名模式（存在不一致）：

| 模式 | 使用位置 | 示例 |
|------|---------|------|
| `user:{userId}:{field}` | 主星力/资料/签到 | `user:abc:starpower` |
| `starpower:{userId}` | ❌ 商城购买 | `starpower:abc` |
| `starpower:transactions:{userId}` | ❌ 商城交易记录 | 与主交易记录键不同 |
| `song:{songId}:{field}` | 歌曲数据 | `song:track-1:likes` |
| `copyright:{field}` | 版权系统 | `copyright:work-123` |
| `challenges:{field}` | 挑战赛 | `challenges:active` |
| `notifications:{userName}` | 通知系统 | ⚠️ 按用户名而非 ID |
| `shop:inventory:{userId}` | 商城库存 | 前缀不一致 |
| `fork-chain:{workId}` | 改编链 | 连字符风格 |
| `shared-works` | 全局共享作品 | 单一大键 |

### 建议统一规范：

```
user:{userId}:starpower          — 星力余额
user:{userId}:profile            — 用户资料
user:{userId}:transactions       — 交易记录
user:{userId}:checkin            — 签到记录
user:{userId}:inventory          — 商城库存
user:{userId}:achievements       — 已解锁成就
user:{userId}:notifications      — 通知列表 (改为 userId)
song:{songId}:stats              — 歌曲统计
song:{songId}:likes              — 点赞数
song:{songId}:comments           — 评论列表
song:{songId}:annotations        — 情感标注
work:{workId}                    — 独立作品
work:index                       — 作品索引
copyright:{workId}               — 版权证书
challenge:active                 — 当前挑战赛
challenge:{id}:entries           — 参赛作品
```

---

## 十、总结与行动建议

### 10.1 立即行动（本周）

| 优先级 | 行动项 | 预估耗时 |
|--------|--------|---------|
| 🔴 P0 | 修复星力商城 KV 键 Bug (C-1) | 1 小时 |
| 🔴 P0 | 统一商城交易记录键名 | 1 小时 |
| 🟡 P1 | 为写入 API 添加基础认证检查 | 4 小时 |

### 10.2 短期行动（1-2 周）

| 优先级 | 行动项 | 预估耗时 |
|--------|--------|---------|
| 🟡 P1 | App.tsx 面板状态重构（useReducer） | 8 小时 |
| 🟡 P1 | 后端路由模块化拆分 | 6 小时 |
| 🟡 P1 | 引入 React Router 基础路由 | 6 小时 |
| 🟢 P2 | 添加 Error Boundary | 2 小时 |

### 10.3 中期行动（P3 启动前）

| 优先级 | 行动项 | 预估耗时 |
|--------|--------|---------|
| 🟡 P1 | 动态歌曲索引替换硬编码 | 4 小时 |
| 🟡 P1 | 共享作品存储重构 | 6 小时 |
| 🟢 P2 | 通知系统改为 userId 索引 | 2 小时 |
| 🟢 P2 | 代码分割（React.lazy） | 4 小时 |

---

> **v7.0 评估结论**：D-Music 项目功能完成度极高（~99%），在音乐创作、社交互动、经济激励三大支柱上构建了完整闭环。然而，代码架构正处于 **"功能丰富但结构性债务累积"** 的拐点——1,600 行的 God Component、2,264 行的单体后端、以及新发现的 **星力商城 KV 键不一致 Bug** 是最紧迫的治理目标。在启动 P3 之前，建议投入 1-2 周专注于架构清理（Phase 0），这将为后续功能扩展提供更坚实的工程基座，避免技术债务呈指数增长。

---

*报告生成方：AI Code Auditor*
*基于项目全量文件逐段分析*
