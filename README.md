# YYC³ D-Music 项目主文档

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元*
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

---

# D-Music

<div align="center">

![Version](https://img.shields.io/badge/version-v11.2-blue)
![Status](https://img.shields.io/badge/status-active-success)
![License](https://img.shields.io/badge/license-MIT-green)

**YYC³ AI Family - 智能音乐播放器**

> ⚠️ **产品基线 · src 冻结声明**（2026-11-07，卷 11 P2）
> 本仓库是 D-Music **v11.2 产品基线正身**：`src/` 前端源码已拆分至
> `yyc3-music-monorepo/`（16 包 + 1 应用，npm `@yyc3/music-*`）并**冻结为只读参照**。
> **后续前端修改只发生在 `yyc3-music-monorepo/`，禁止在本仓库 `src/` 演进**（防多副本漂移）。
> monorepo 已升级至 React 19.3.1 / Vite 7.3.7 / TypeScript 5.9.3，与本仓工具链对齐；
> 其历史已并入本仓（`mono/main`，7 个提交），全仓仅保留单一 `.git`。
> 本仓库继续承载：`supabase/`（后端源，已镜像至 monorepo `@yyc3/music-server`）、
> `public/` 品牌媒体源、docs 00-09 产品治理文档、data/ 数据库治理、.env 环境体系。

[快速开始](#快速开始) • [文档](#文档) • [贡献指南](#贡献指南) • [许可证](#许可证)

</div>

---

## 📋 目录

- [项目简介](#项目简介)
- [核心特性](#核心特性)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [环境配置](#环境配置)
- [开发指南](#开发指南)
- [文档体系](#文档体系)
- [部署指南](#部署指南)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

---

## 项目简介

YYC3-MusAI 是 YYC³ AI Family 项目中的智能音乐播放器，集成了先进的 AI 功能和现代化的用户体验。项目采用前后端分离架构，支持多种部署方式，提供完整的开发、测试、预发布和生产环境配置。

### 项目信息

| 项目 | 版本 | 状态 | 最后更新 |
|------|------|------|----------|
| YYC3-MusAI | v11.2 | 🟢 活跃 | 2026-02-26 |

### 项目统计

| 类别 | 数量 | 状态 |
|------|------|------|
| 后端路由模块 | 15 | ✅ 完整 |
| 前端组件 | 49 | ✅ 完整 |
| Zod Schema | 19 | ✅ 完整 |
| E2E 测试套件 | 13 | ✅ 完整 |
| 测试用例 | 150+ | ✅ 完整 |
| Hooks | 9 | ✅ 完整 |
| Guidelines 文档 | 13 | ✅ 完整 |
| TypeScript 类型 | 2,010 行 | ✅ 统一 |

---

## 核心特性

### 🎵 音乐播放
- 支持音频和视频播放
- 智能音频可视化
- 多种播放模式（音频/视频）
- 播放列表管理

### 🤖 AI 集成
- 智愈领航员 - 智能修复
- 洞见思想家 - 深度分析
- 预见先知 - 预测建议
- 知遇伯乐 - 智能推荐

### 🌐 社交功能
- 用户认证与授权
- 社区互动
- 挑战系统
- 排行榜

### 📊 数据分析
- 用户行为分析
- 音乐偏好分析
- 性能监控
- 实时统计

### 🔒 安全性
- JWT 认证
- RBAC 权限控制
- 数据加密
- 安全审计

---

## 技术栈

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19.3.1 | UI 框架 |
| TypeScript | 5.9.3 | 类型安全 |
| Vite | 7.3.7 | 构建工具 |
| Tailwind CSS | 4.3.5 | 样式框架 |
| Radix UI | 1.x | 无障碍原子组件 |
| Motion | 12.x | 动画库 |
| Recharts | 2.15.x | 数据可视化 |
| Supabase JS | 2.x | 后端服务 |
| Lucide React | 0.577.x | 图标库 |

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Supabase | latest | BaaS 平台 |
| PostgreSQL | 15+ | 关系型数据库 |
| Redis | 7+ | 缓存数据库 |
| Deno | latest | 运行时环境 |

### 开发工具

| 工具 | 版本 | 用途 |
|------|------|------|
| pnpm | 10.17.0 | 包管理器 |
| Node.js | 22.22.3 | 运行时 |
| Git | latest | 版本控制 |

---

## 项目结构

```
YYC3-MusAI/
├── src/                          # 源代码目录
│   ├── app/                       # 应用主目录
│   │   ├── components/              # React 组件
│   │   ├── lib/                   # 工具库
│   │   ├── hooks/                 # 自定义 Hooks
│   │   ├── types/                 # TypeScript 类型定义
│   │   └── App.tsx                # 主应用组件
│   ├── styles/                    # 样式文件
│   └── main.tsx                  # 应用入口
│
├── supabase/                     # Supabase 函数
│   └── functions/                # Edge Functions
│       └── server/               # 服务器端路由
│
├── public/                       # 静态资源
│   ├── mv/                      # 视频文件
│   └── assets/                  # 资源文件
│
├── data/                        # 数据库相关文件
│   ├── 00-规划与设计/           # 需求与设计文档
│   ├── 01-环境管理/             # 环境配置
│   ├── 02-数据库实例/           # 数据库配置
│   └── 03-Schema管理/           # Schema 管理
│
├── docs/                        # 项目文档 (787 文件)
│   ├── 00-YYC3-MusAI-项目总览索引/
│   ├── 01-YYC3-MusAI-启动规划阶段/
│   ├── 02-YYC3-MusAI-项目设计阶段/
│   ├── 03-YYC3-MusAI-开发实施阶段/
│   ├── 04-YYC3-MusAI-测试验证阶段/
│   ├── 05-YYC3-MusAI-部署上线阶段/
│   ├── 06-YYC3-MusAI-运维监控阶段/
│   ├── 07-YYC3-MusAI-迭代优化阶段/
│   ├── 08-YYC3-MusAI-项目管理/
│   ├── 09-YYC3-MusAI-演进与优化阶段/
│   └── YYC3-团队通用-标规文档/     # 团队强制规范（五维/标准/命名/标头标尾）
│
├── scripts/                     # 脚本工具（初始化 / 校验 / 数据播种）
├── config/                      # 配置文件
├── database/                    # 数据库脚本
├── supabase/                    # Supabase Edge Functions
├── .env                         # 环境变量（本地）
├── .env.example                 # 环境变量示例
├── .gitignore                   # Git 忽略规则
├── package.json                 # 项目配置
├── tsconfig.json                # TypeScript 配置
├── vite.config.ts               # Vite 配置
└── README.md                    # 项目文档
```

---

## 快速开始

### 前置要求

- Node.js >= 20.19.0
- pnpm >= 10.0.0
- Git

### 安装依赖

```bash
# 克隆项目
git clone <repository-url>
cd YYC3-MusAI

# 安装依赖
pnpm install
```

### 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入 Supabase 凭证
# VITE_SUPABASE_URL=https://your-project-id.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 启动开发服务器

```bash
# 启动开发服务器
pnpm dev

# 访问应用
open http://localhost:3198
```

### 构建生产版本

```bash
# 构建生产版本
pnpm build

# 预览生产构建
pnpm preview
```

---

## 环境配置

项目支持多环境配置，每个环境有独立的环境变量文件。

### 环境列表

| 环境 | 文件 | 用途 |
|------|------|------|
| 本地开发 | `.env` | 本地开发环境 |
| 开发环境 | `.env.development` | 团队开发环境 |
| 测试环境 | `.env.test` | 自动化测试环境 |
| 预发布 | `.env.staging` | 预发布环境 |
| 生产环境 | `.env.production` | 生产环境 |
| Docker | `.env.docker` | Docker 部署 |
| API 代理 | `.env.api-proxy.example` | API 代理配置 |

### 环境变量说明

#### Supabase 配置

```env
# Supabase 项目 URL
VITE_SUPABASE_URL=https://your-project-id.supabase.co

# Supabase 匿名密钥
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# 本地 API URL（可选）
DMUSIC_LOCAL_API=http://localhost:3000
```

#### 数据库配置

```env
# PostgreSQL
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=yyc3_lp
PG_USER=yyc3_lp
PG_PASSWORD=yyc3_lp

# MySQL
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=yyc3_lp
MYSQL_USER=yyc3_lp
MYSQL_PASSWORD=yyc3_lp

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_0379
```

#### 应用配置

```env
# 应用信息
APP_NAME=YYC3-Project
APP_VERSION=1.0.0
APP_PORT=3000
APP_HOST=0.0.0.0

# API 基础 URL
API_BASE_URL=http://localhost:3000
```

### 安全注意事项

⚠️ **重要提示**：

1. **永远不要提交 `.env` 文件到版本控制系统**
2. 使用 `.env.example` 作为模板
3. 生产环境使用强密码
4. 定期轮换密钥和令牌
5. 使用不同的密钥用于不同环境

---

## 开发指南

### 代码规范

项目遵循 YYC³ 代码规范：

- 使用 TypeScript 进行类型安全开发
- 遵循 ESLint 和 Prettier 配置
- 使用有意义的变量和函数命名
- 添加必要的注释和文档
- 编写单元测试和集成测试

### Git 工作流

```bash
# 创建功能分支
git checkout -b feature/your-feature-name

# 提交更改
git add .
git commit -m "feat: add your feature description"

# 推送到远程
git push origin feature/your-feature-name

# 创建 Pull Request
```

### 提交信息规范

遵循 Conventional Commits 规范：

- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建/工具链相关

### 测试

测试套件内置于应用运行时（`src/app/lib/core-tests.ts`、`full-test-suite.ts`、`e2e-specs.ts`），
通过应用内的测试面板触发，不依赖外部测试框架。

### 类型检查与构建校验

```bash
# TypeScript 类型检查
pnpm typecheck

# 生产构建
pnpm build

# 预览生产构建
pnpm preview
```

---

## 文档体系

项目包含完整的文档体系，共 760+ 文件，涵盖项目全生命周期。

### 文档结构

#### 00-YYC3-MusAI-项目总览索引
- 项目总览手册
- 文档架构导航
- 快速开始指南
- 核心概念词典
- 版本更新日志

#### 01-YYC3-MusAI-启动规划阶段
- 项目章程与愿景
- 项目范围说明书
- 项目里程碑计划
- 项目资源规划
- 干系人管理计划
- 业务需求分析
- 用户需求调研报告
- 产品需求文档(PRD)
- 需求优先级矩阵
- 技术可行性分析
- 经济可行性分析
- 市场可行性分析
- 操作可行性分析
- 项目初期风险评估
- 风险应对预案
- 项目预算与成本控制
- 项目成功标准定义

#### 02-YYC3-MusAI-项目设计阶段
- 系统架构总览图
- 九层功能架构设计
- 技术选型论证报告
- 微服务架构设计
- 网络拓扑图
- 高可用设计
- 详细设计（8 层架构）
  - 基础设施层
  - 数据存储层
  - 核心服务层
  - AI 智能层
  - 业务逻辑层
  - 应用表现层
  - 用户交互层
  - 扩展演进层
- 数据流程设计
- 数据库 ER 图
- 表结构设计
- 索引设计规范
- 数据字典
- 数据治理设计
- 数据流转图
- 接口规范总则
- 安全架构总览
- 网络安全设计
- 应用安全设计
- 数据安全设计
- 权限管理设计
- 审计日志设计
- 性能目标定义
- 性能架构设计
- 缓存策略设计
- 数据库性能设计
- 负载均衡设计
- 文档模板库

#### 03-YYC3-MusAI-开发实施阶段
- 开发环境配置
- 多环境配置规范
- 开发工具链说明
- 本地调试指南
- 开发规范
- 技术文档
- 枚举与常量定义
- 配置参数说明
- 依赖管理说明
- API 文档
- 接口清单
- 接口测试用例
- 接口变更记录

#### 04-YYC3-MusAI-测试验证阶段
- 测试策略与计划
- 单元测试规范
- 集成测试规范
- E2E 测试规范
- 性能测试规范
- 安全测试规范
- 测试数据管理
- 测试报告模板
- 缺陷管理流程
- 测试覆盖率要求

#### 05-YYC3-MusAI-部署上线阶段
- 部署架构设计
- 部署流程文档
- 环境配置指南
- 数据库迁移指南
- 回滚策略文档
- 监控配置指南
- 日志配置指南
- 性能优化指南
- 安全加固指南
- 上线检查清单

#### 06-YYC3-MusAI-运维监控阶段
- 监控体系设计
- 告警规则配置
- 日志管理规范
- 性能监控指南
- 错误追踪指南
- 容量规划指南
- 故障处理流程
- 灾难恢复预案
- 运维自动化
- 运维文档管理

#### 07-YYC3-MusAI-迭代优化阶段
- 迭代规划流程
- 需求优先级管理
- 功能迭代计划
- 性能优化计划
- 技术债务管理
- 代码重构计划
- 用户反馈管理
- 数据驱动决策
- A/B 测试指南
- 发布计划管理

#### 08-YYC3-MusAI-项目管理
- 项目管理流程
- 团队协作指南
- 代码审查流程
- 版本发布流程
- 变更管理流程
- 风险管理流程
- 质量保证流程
- 沟通协作工具
- 项目度量指标
- 项目报告模板

#### 09-YYC3-MusAI-演进与优化阶段
- AI 模型迭代规划
- 技术演进路线图
- 架构演进计划
- 功能演进计划
- 性能演进计划
- 安全演进计划
- 生态建设计划
- 创新探索计划
- 长期规划文档
- 愿景目标文档

### 核心文档

- [D-Music-Guidelines.md](docs/D-Music-Guidelines.md) - 开发指南
- [FullAudit_v11.1_Snapshot.md](docs/FullAudit_v11.1_Snapshot.md) - 完整审核快照
- [DeepAnalysis_PostgreSQL_Migration_v1.md](docs/DeepAnalysis_PostgreSQL_Migration_v1.md) - PostgreSQL 迁移方案
- [Supabase_Database_Inventory.md](docs/Supabase_Database_Inventory.md) - 数据库风险清单
- [YYC3-团队通用-标规文档](docs/YYC3-团队通用-标规文档/README.md) - 团队强制规范索引

---

## 部署指南

### Docker 部署

```bash
# 构建镜像
docker build -t d-music-b:latest .

# 运行容器
docker run -p 3198:3198 \
  -e VITE_SUPABASE_URL=https://your-project-id.supabase.co \
  -e VITE_SUPABASE_ANON_KEY=your-anon-key \
  d-music-b:latest
```

### Supabase 部署

```bash
# 安装 Supabase CLI
npm install -g supabase

# 链接到项目
supabase link --project-ref your-project-id

# 部署函数
supabase functions deploy

# 部署数据库迁移
supabase db push
```

### 生产部署

1. 配置生产环境变量（`.env.production`）
2. 构建生产版本：`pnpm build`
3. 部署到 CDN 或服务器
4. 配置域名和 SSL
5. 配置监控和告警
6. 执行上线检查清单

---

## 贡献指南

我们欢迎所有形式的贡献！

### 如何贡献

1. Fork 项目
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'feat: add amazing feature'`
4. 推送到分支：`git push origin feature/amazing-feature`
5. 创建 Pull Request

### 贡献类型

- 🐛 Bug 修复
- ✨ 新功能
- 📝 文档改进
- 🎨 代码格式调整
- ♻️ 代码重构
- ⚡ 性能优化
- ✅ 测试补充
- 🔒 安全修复

### 代码审查

所有 Pull Request 需要通过代码审查：

- 代码风格符合规范
- 测试覆盖率达标
- 文档完整准确
- 无安全漏洞
- 性能无明显下降

---

## 常见问题

### Q: 如何配置 Supabase？

A: 参考 [Supabase 官方文档](https://supabase.com/docs) 创建项目，获取 `project-id` 和 `anon-key`，然后配置到 `.env` 文件。

### Q: 如何添加新的视频文件？

A: 将视频文件放置在 `public/mv/` 目录下，然后在 `playlistData.ts` 中添加对应的 `videoUrl` 路径。

### Q: 如何运行测试？

A: 使用 `pnpm test` 运行所有测试，或 `pnpm test:e2e` 运行端到端测试。

### Q: 如何部署到生产环境？

A: 参考 [部署指南](#部署指南) 部分，配置生产环境变量，构建并部署。

---

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

---

## 联系方式

- **项目主页**: [https://github.com/YYC-Cube/YYC3-MusAI](https://github.com/YYC-Cube/YYC3-MusAI)
- **问题反馈**: [Issues](https://github.com/YYC-Cube/YYC3-MusAI/issues)
- **功能建议**: [Feature Requests](https://github.com/YYC-Cube/YYC3-MusAI/issues)
- **邮件**: <admin@0379.email>

---

## 致谢

感谢所有为 YYC3-MusAI 项目做出贡献的开发者！

---

<div align="center">

> 「***YanYuCloudCube***」
> 「***<admin@0379.email>***」
> 「***Words Initiate Quadrants, Language Serves as Core for Future***」
> 「***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***」

**Made with ❤️ by YanYuCloudCube Team**

</div>
