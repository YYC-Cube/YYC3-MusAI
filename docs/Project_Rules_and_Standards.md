# D-Music 项目规则与规范 v1.0

> **版本**: 1.0
> **更新日期**: 2026-02-25
> **适用对象**: YYC³ Team、Figma AI、开发团队、文档维护人员

---

## 📋 目录

- [一、文档体系概述](#一文档体系概述)
- [二、文档命名规范](#二文档命名规范)
- [三、文件夹结构规范](#三文件夹结构规范)
- [四、文档格式规范](#四文档格式规范)
- [五、版本管理规范](#五版本管理规范)
- [六、Git 工作流规范](#六git-工作流规范)
- [七、代码提交规范](#七代码提交规范)
- [八、文档审核规范](#八文档审核规范)
- [九、自动化工具使用](#九自动化工具使用)

---

## 一、文档体系概述

### 1.1 文档架构

YYC³-Music-player 采用**九层文档架构**，确保文档的完整性、一致性和可维护性。

```
docs/
├── 00-YYC3-MusAI-项目总览索引/          # 项目总览
├── 01-YYC3-MusAI-启动规划阶段/        # 启动规划
├── 02-YYC3-MusAI-项目设计阶段/        # 项目设计
├── 03-YYC3-MusAI-开发实施阶段/        # 开发实施
├── 04-YYC3-MusAI-测试验收阶段/        # 测试验收
├── 05-YYC3-MusAI-部署运维阶段/        # 部署运维
├── 06-YYC3-MusAI-项目管理阶段/        # 项目管理
├── 07-YYC3-MusAI-质量管理阶段/        # 质量管理
├── 08-YYC3-MusAI-风险管理阶段/        # 风险管理
├── 09-YYC3-MusAI-配置管理阶段/        # 配置管理
├── guidelines/                                  # 提交给 Figma AI 的文档
└── README.md                                   # 文档总索引
```

### 1.2 文档类型

| 类型 | 前缀 | 说明 | 示例 |
|------|--------|------|------|
| 项目总览 | `00-` | 项目立项、范围、权责 | `001-Music-player-项目总览索引-项目总览手册.md` |
| 启动规划 | `01-` | 项目章程、范围、里程碑 | `0101-Music-player-项目规划-项目章程与愿景.md` |
| 项目设计 | `02-` | 架构设计、技术选型 | `0201-Music-player-项目设计阶段-系统架构总览图.md` |
| 开发实施 | `03-` | 开发流程、代码规范 | `0301-Music-player-开发实施阶段-前端开发规范.md` |
| 测试验收 | `04-` | 测试计划、验收标准 | `0401-Music-player-测试验收阶段-测试计划.md` |
| 部署运维 | `05-` | 部署流程、运维手册 | `0501-Music-player-部署运维阶段-部署流程.md` |
| 项目管理 | `06-` | 项目管理、进度跟踪 | `0601-Music-player-项目管理阶段-项目跟踪.md` |
| 质量管理 | `07-` | 代码审查、质量标准 | `0701-Music-player-质量管理阶段-代码审查标准.md` |
| 风险管理 | `08-` | 风险识别、应对预案 | `0801-Music-player-风险管理阶段-风险应对预案.md` |
| 配置管理 | `09-` | 配置文件、环境变量 | `0901-Music-player-配置管理阶段-配置文件规范.md` |
| 技术文档 | `10-` | API 文档、技术规范 | `1001-Music-player-技术文档-API接口规范.md` |

### 1.3 文档生成工具

**工具**: `/Users/yanyu/YYC3-MusAI/docs/YYC3-Musid-Document.py`

**功能**:
- ✅ 自动生成符合 YYC³ 标准的文档
- ✅ 支持文档内容验证
- ✅ 支持自动更新功能
- ✅ 统一的文档格式和结构

**使用方法**:
```bash
cd /Users/yanyu/YYC3-MusAI
python3 docs/YYC3-Musid-Document.py --help
```

---

## 二、文档命名规范

### 2.1 命名格式

#### 标准格式

```
[阶段编号]-[项目名称]-[阶段名称]-[文档编号]-[文档名称].md
```

#### 格式说明

| 部分 | 格式 | 示例 | 说明 |
|------|--------|------|------|
| 阶段编号 | `00`-`99-` | `01-`, `02-`, `03-` | 表示文档所属阶段 |
| 项目名称 | `Music-player` | `Music-player` | 项目名称 |
| 阶段名称 | `项目总览索引`、`启动规划阶段` | 阶段名称 |
| 文档编号 | `001`-`999` | `001`, `002`, `003` | 文档序号 |
| 文档名称 | `项目总览手册` | 文档名称 | 具体文档标题 |

### 2.2 命名示例

#### 正确示例 ✅

```
001-Music-player-项目总览索引-项目总览手册.md
0101-Music-player-启动规划阶段-项目章程与愿景.md
0201-Music-player-项目设计阶段-系统架构总览图.md
0301-Music-player-开发实施阶段-前端开发规范.md
0401-Music-player-测试验收阶段-测试计划.md
```

#### 错误示例 ❌

```
项目总览手册.md                    # ❌ 缺少阶段编号和项目名称
Music-player-项目章程.md          # ❌ 缺少阶段编号
01-项目章程.md                  # ❌ 缺少项目名称
001-项目章程.md                # ❌ 缺少项目名称和阶段名称
```

### 2.3 特殊文档命名

#### Guidelines 文档

```
guidelines/
├── Guidelines.md                    # 核心提示词库
├── Supabase_Migration_Prompts.md  # Supabase 迁移指南
└── README.md                      # 提交给 Figma AI 的说明
```

#### 技术文档

```
docs/
├── DeepAssessment_v7.md            # 项目评估报告
├── DesignSystem_AuditReport_v1.md # 设计系统审计报告
├── Code_Integration_Guide.md        # 代码整合指南
└── ProgressReport.md               # 进度报告
```

---

## 三、文件夹结构规范

### 3.1 根目录结构

```
/Users/yanyu/YYC3-MusAI/
├── src/                              # 源代码
│   ├── app/                          # 应用代码
│   │   ├── components/                # 组件
│   │   ├── hooks/                    # Hooks
│   │   ├── lib/                      # 工具库
│   │   └── App.tsx                   # 主应用
├── config/                            # 配置文件
│   ├── dmusic_variables_v3.json      # 主配置
│   ├── dmusic_types_v3.ts          # 类型定义
│   └── API_Local.md                 # API 文档
├── database/                          # 数据库
│   ├── d_music_postgres.sql         # PostgreSQL Schema
│   └── d_music_schema.sql.md       # Schema 文档
├── docs/                             # 文档
│   ├── 00-YYC3-MusAI-项目总览索引/
│   ├── 01-YYC3-MusAI-启动规划阶段/
│   ├── 02-YYC3-MusAI-项目设计阶段/
│   ├── 03-YYC3-MusAI-开发实施阶段/
│   ├── 04-YYC3-MusAI-测试验收阶段/
│   ├── 05-YYC3-MusAI-部署运维阶段/
│   ├── 06-YYC3-MusAI-项目管理阶段/
│   ├── 07-YYC3-MusAI-质量管理阶段/
│   ├── 08-YYC3-MusAI-风险管理阶段/
│   ├── 09-YYC3-MusAI-配置管理阶段/
│   ├── guidelines/                      # Figma AI 文档
│   ├── DeepAssessment_v7.md
│   ├── DesignSystem_AuditReport_v1.md
│   └── README.md
├── scripts/                           # 脚本
│   ├── init-git.sh                    # Git 初始化
│   ├── export-kv-advanced.js          # KV 导出（增强版）
│   ├── export-kv-cli.js               # KV 导出（轻量版）
│   ├── migrate-from-supabase.js       # 数据迁移（Node.js）
│   └── migrate-from-supabase.sh       # 数据迁移（Bash）
├── guidelines/                        # 提交给 Figma AI 的文档
│   ├── Guidelines.md
│   ├── Supabase_Migration_Prompts.md
│   └── README.md
├── public/                            # 静态资源
│   └── assets/                       # 资源文件
├── supabase/                         # Supabase 代码（待迁移）
│   └── functions/
│       └── server/
│           ├── index.tsx
│           └── kv_store.tsx
├── package.json                       # 项目配置
├── vite.config.ts                     # Vite 配置
├── postcss.config.mjs                 # PostCSS 配置
├── .env.example                       # 环境变量示例
├── .gitignore                        # Git 忽略文件
├── README.md                         # 项目说明
└── YYC³团队标准化规范文档.md       # YYC³ 规范
```

### 3.2 docs/ 目录结构

```
docs/
├── 00-YYC3-MusAI-项目总览索引/
│   ├── 001-Music-player-项目总览索引-项目总览手册.md
│   ├── 002-Music-player-项目总览索引-文档架构导航.md
│   ├── 003-Music-player-项目总览索引-快速开始指南.md
│   ├── 004-Music-player-项目总览索引-核心概念词典.md
│   ├── 005-Music-player-项目总览索引-版本更新日志.md
│   ├── Music-player-RES-DOC-001.md
│   └── README.md
├── 01-YYC3-MusAI-启动规划阶段/
│   ├── 0101-Music-player-启动规划阶段-项目规划/
│   │   ├── 001-Music-player-启动规划阶段-项目章程与愿景.md
│   │   ├── 002-Music-player-启动规划阶段-项目范围说明书.md
│   │   ├── 003-Music-player-启动规划阶段-项目里程碑计划.md
│   │   ├── 004-Music-player-启动规划阶段-项目资源规划.md
│   │   ├── 005-Music-player-启动规划阶段-干系人管理计划.md
│   │   ├── Music-player-RES-DOC-001.md
│   │   └── README.md
│   ├── 0102-Music-player-启动规划阶段-需求规划/
│   │   ├── 001-Music-player-启动规划阶段-业务需求分析.md
│   │   ├── 002-Music-player-启动规划阶段-用户需求调研报告.md
│   │   ├── 003-Music-player-启动规划阶段-产品需求文档(PRD).md
│   │   ├── 004-Music-player-启动规划阶段-需求优先级矩阵.md
│   │   ├── Music-player-RES-DOC-001.md
│   │   └── README.md
│   ├── 0103-Music-player-启动规划阶段-可行性分析/
│   │   ├── 001-Music-player-启动规划阶段-技术可行性分析.md
│   │   ├── 002-Music-player-启动规划阶段-经济可行性分析.md
│   │   ├── 003-Music-player-启动规划阶段-市场可行性分析.md
│   │   ├── 004-Music-player-启动规划阶段-操作可行性分析.md
│   │   ├── Music-player-RES-DOC-001.md
│   │   └── README.md
│   ├── 0104-Music-player-启动规划阶段-风险管理/
│   │   ├── 001-Music-player-启动规划阶段-项目初期风险评估.md
│   │   ├── 002-Music-player-启动规划阶段-风险应对预案.md
│   │   ├── 003-Music-player-启动规划阶段-项目预算与成本控制.md
│   │   ├── 004-Music-player-启动规划阶段-项目成功标准定义.md
│   │   ├── Music-player-RES-DOC-001.md
│   │   └── README.md
│   └── README.md
├── 02-YYC3-MusAI-项目设计阶段/
│   ├── 0201-Music-player-项目设计阶段-系统架构总览图.md
│   ├── 0202-Music-player-项目设计阶段-详细设计/
│   │   ├── 0202-01-基础设施层/
│   │   ├── 0202-02-数据存储层/
│   │   ├── 0202-03-核心服务层/
│   │   ├── 0202-04-AI智能层/
│   │   ├── 0202-05-业务逻辑层/
│   │   ├── 0202-06-应用表现层/
│   │   ├── 0202-07-用户交互层/
│   │   ├── 0202-08-扩展演进层/
│   │   ├── Music-player-RES-DOC-001.md
│   │   └── README.md
│   ├── Music-player-RES-DOC-001.md
│   └── README.md
├── 03-YYC3-MusAI-开发实施阶段/
│   ├── 0301-Music-player-开发实施阶段-前端开发规范.md
│   ├── 0302-Music-player-开发实施阶段-后端开发规范.md
│   ├── 0303-Music-player-开发实施阶段-AI集成规范.md
│   ├── 0304-Music-player-开发实施阶段-测试规范.md
│   ├── Music-player-RES-DOC-001.md
│   └── README.md
├── 04-YYC3-MusAI-测试验收阶段/
│   ├── 0401-Music-player-测试验收阶段-测试计划.md
│   ├── 0402-Music-player-测试验收阶段-验收标准.md
│   ├── 0403-Music-player-测试验收阶段-测试报告.md
│   ├── Music-player-RES-DOC-001.md
│   └── README.md
├── 05-YYC3-MusAI-部署运维阶段/
│   ├── 0501-Music-player-部署运维阶段-部署流程.md
│   ├── 0502-Music-player-部署运维阶段-运维手册.md
│   ├── 0503-Music-player-部署运维阶段-监控告警.md
│   ├── Music-player-RES-DOC-001.md
│   └── README.md
├── 06-YYC3-MusAI-项目管理阶段/
│   ├── 0601-Music-player-项目管理阶段-项目跟踪.md
│   ├── 0602-Music-player-项目管理阶段-进度报告.md
│   ├── 0603-Music-player-项目管理阶段-会议记录.md
│   ├── Music-player-RES-DOC-001.md
│   └── README.md
├── 07-YYC3-MusAI-质量管理阶段/
│   ├── 0701-Music-player-质量管理阶段-代码审查标准.md
│   ├── 0702-Music-player-质量管理阶段-测试覆盖率.md
│   ├── 0703-Music-player-质量管理阶段-性能标准.md
│   ├── Music-player-RES-DOC-001.md
│   └── README.md
├── 08-YYC3-MusAI-风险管理阶段/
│   ├── 0801-Music-player-风险管理阶段-风险应对预案.md
│   ├── 0802-Music-player-风险管理阶段-问题跟踪.md
│   ├── 0803-Music-player-风险管理阶段-变更管理.md
│   ├── Music-player-RES-DOC-001.md
│   └── README.md
├── 09-YYC3-MusAI-配置管理阶段/
│   ├── 0901-Music-player-配置管理阶段-配置文件规范.md
│   ├── 0902-Music-player-配置管理阶段-环境变量规范.md
│   ├── 0903-Music-player-配置管理阶段-版本管理.md
│   ├── Music-player-RES-DOC-001.md
│   └── README.md
├── guidelines/
│   ├── Guidelines.md
│   ├── Supabase_Migration_Prompts.md
│   └── README.md
├── DeepAssessment_v7.md
├── DesignSystem_AuditReport_v1.md
├── Code_Integration_Guide.md
├── ProgressReport.md
└── README.md
```

### 3.3 guidelines/ 目录结构

```
guidelines/
├── Guidelines.md                      # 核心提示词库（v3.0）
│   ├── 一、Figma AI 设计提示词
│   ├── 二、代码重构提示词
│   ├── 三、数据库迁移提示词
│   ├── 四、AI 集成提示词
│   ├── 五、安全加固提示词
│   ├── 六、性能优化提示词
│   ├── 七、测试编写提示词
│   └── 八、其他优化提示词
├── Supabase_Migration_Prompts.md  # Supabase 迁移指南（v1.0）
│   ├── 一、迁移概述
│   ├── 二、当前 Supabase 架构分析
│   ├── 三、目标架构设计
│   ├── 四、API 端点迁移清单
│   ├── 五、KV 存储迁移方案
│   ├── 六、认证系统迁移
│   ├── 七、迁移实施步骤
│   ├── 八、测试验证方案
│   └── 九、迁移检查清单
└── README.md                          # 提交给 Figma AI 的说明（v1.0）
    ├── 提交文档清单
    ├── 核心任务
    ├── 关键说明
    ├── 审核标准
    └── 工作流程
```

---

## 四、文档格式规范

### 4.1 Markdown 格式

#### 标准头部

```markdown
---
@file: {FILE_NAME}
@description: YYC3-MusAI {DESCRIPTION}
@author: YanYuCloudCube Team
@version: {VERSION}
@created: {CREATE_DATE}
@updated: {UPDATE_DATE}
@status: {STATUS}
@tags: {TAGS}
---

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元*
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

---
```

#### 标准尾部

```markdown
---

<div align="center">

> 「***YanYuCloudCube***」
> 「***<admin@0379.email>***」
> 「***Words Initiate Quadrants, Language Serves as Core for Future***」
> 「***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***」

</div>
```

### 4.2 标题层级

```markdown
# 一级标题（H1）
## 二级标题（H2）
### 三级标题（H3）
#### 四级标题（H4）
##### 五级标题（H5）
###### 六级标题（H6）
```

### 4.3 列表格式

#### 无序列表

```markdown
- 项目总览
- 启动规划
- 项目设计
```

#### 有序列表

```markdown
1. 初始化 Git 仓库
2. 添加远程仓库
3. 拉取远程代码
4. 创建本地分支
```

#### 任务列表

```markdown
- [ ] 未完成任务
- [x] 已完成任务
```

### 4.4 代码块格式

#### 代码块

```markdown
```bash
npm install
npm run dev
```
```

#### 内联代码

```markdown
使用 `git add .` 添加文件到暂存区。
```

### 4.5 表格格式

```markdown
| 阶段 | 前缀 | 说明 | 示例 |
|------|--------|------|------|
| 项目总览 | `00-` | 项目立项、范围、权责 | `001-Music-player-项目总览索引-项目总览手册.md` |
```

### 4.6 引用格式

#### 内部链接

```markdown
参见 [项目总览手册](001-Music-player-项目总览索引-项目总览手册.md)
```

#### 外部链接

```markdown
更多信息请参考 [PostgreSQL 官方文档](https://www.postgresql.org/docs/)
```

#### 代码引用

```markdown
详见 [App.tsx](../src/app/App.tsx#L123-L145)
```

### 4.7 图片和媒体

#### 图片引用

```markdown
![架构图](./images/architecture.png)
```

#### 视频引用

```markdown
[![演示视频](./videos/demo.mp4)](./videos/demo.mp4)
```

---

## 五、版本管理规范

### 5.1 版本号格式

#### 语义化版本

```
v{MAJOR}.{MINOR}.{PATCH}
```

| 类型 | 说明 | 示例 |
|------|------|------|
| MAJOR | 主版本号，不兼容的 API 修改 | v1.0.0 → v2.0.0 |
| MINOR | 次版本号，向下兼容的功能性新增 | v1.0.0 → v1.1.0 |
| PATCH | 修订号，向下兼容的问题修正 | v1.0.0 → v1.0.1 |

### 5.2 文档版本

#### 版本字段

```markdown
@version: v1.0.0
@created: 2026-02-25
@updated: 2026-02-25
@status: published
```

#### 版本状态

| 状态 | 说明 | 使用场景 |
|------|------|----------|
| draft | 草稿 | 文档正在编写中 |
| review | 审核中 | 文档等待审核 |
| published | 已发布 | 文档已正式发布 |
| deprecated | 已废弃 | 文档已被新版本替代 |

### 5.3 更新日志

#### 更新日志格式

```markdown
## 版本更新日志

### v1.0.0 (2026-02-25)

#### 新增
- 初始化文档体系
- 创建项目规则文档
- 生成文档模板

#### 变更
- 更新文档命名规范
- 优化文件夹结构

#### 修复
- 修复文档格式问题
- 修正版本号格式

#### 废弃
- 无
```

---

## 六、Git 工作流规范

### 6.1 分支策略

#### 分支命名

```
{type}/{short-description}
```

| 类型 | 前缀 | 说明 | 示例 |
|------|--------|------|------|
| feature | `feature/` | 新功能开发 | `feature/user-authentication` |
| bugfix | `bugfix/` | Bug 修复 | `bugfix/login-error` |
| hotfix | `hotfix/` | 紧急修复 | `hotfix/critical-security-issue` |
| release | `release/` | 发布版本 | `release/v1.0.0` |
| docs | `docs/` | 文档更新 | `docs/update-readme` |

### 6.2 提交规范

#### 提交信息格式

```
{type}: {short-description}

{detailed-description}

Reviewed by: {reviewer}
```

#### 提交类型

| 类型 | 前缀 | 说明 | 示例 |
|------|--------|------|------|
| Feature | `Feature:` | 新功能 | `Feature: Add user authentication` |
| Fix | `Fix:` | Bug 修复 | `Fix: Resolve login timeout issue` |
| Refactor | `Refactor:` | 代码重构 | `Refactor: Optimize database queries` |
| Docs | `Docs:` | 文档更新 | `Docs: Update API documentation` |
| Style | `Style:` | 代码风格 | `Style: Format code with Prettier` |
| Test | `Test:` | 测试相关 | `Test: Add unit tests for auth module` |
| Chore | `Chore:` | 构建/工具 | `Chore: Update dependencies` |
| Merge | `Merge:` | 合并分支 | `Merge: Integrate local changes with Figma AI code` |

#### 提交示例

```bash
# 新功能
git commit -m "Feature: Add user authentication system"

# Bug 修复
git commit -m "Fix: Resolve login timeout issue"

# 代码重构
git commit -m "Refactor: Optimize database queries for better performance"

# 文档更新
git commit -m "Docs: Update API documentation for v1.0.0"

# 合并分支
git commit -m "Merge: Integrate local changes with Figma AI code

Reviewed by: YYC³ Team"
```

### 6.3 工作流程

#### 功能开发流程

```bash
# 1. 创建功能分支
git checkout -b feature/new-feature

# 2. 开发功能
# ... 编写代码 ...

# 3. 提交更改
git add .
git commit -m "Feature: Add new feature"

# 4. 推送到远程
git push origin feature/new-feature

# 5. 创建 Pull Request
# 在 GitHub 上操作
```

#### Bug 修复流程

```bash
# 1. 创建修复分支
git checkout -b bugfix/critical-issue

# 2. 修复 Bug
# ... 修复代码 ...

# 3. 提交更改
git add .
git commit -m "Fix: Resolve critical security issue"

# 4. 推送到远程
git push origin bugfix/critical-issue

# 5. 创建 Pull Request
# 在 GitHub 上操作
```

#### 发布流程

```bash
# 1. 创建发布分支
git checkout -b release/v1.0.0

# 2. 更新版本号
vim package.json

# 3. 提交更改
git add .
git commit -m "Release: v1.0.0"

# 4. 推送到远程
git push origin release/v1.0.0

# 5. 创建 Release
# 在 GitHub 上操作
```

---

## 七、代码提交规范

### 7.1 提交前检查

#### 提交前清单

- [ ] 代码已通过 lint 检查
- [ ] 代码已通过 type check
- [ ] 单元测试已通过
- [ ] 文档已更新
- [ ] 提交信息格式正确

### 7.2 代码审查标准

#### 审查清单

- [ ] 代码风格符合规范
- [ ] 类型定义完整
- [ ] 错误处理完善
- [ ] 日志记录清晰
- [ ] 性能优化合理
- [ ] 安全性考虑充分
- [ ] 测试覆盖率达标
- [ ] 文档更新完整

### 7.3 合并规范

#### 合并前检查

- [ ] 查看代码差异
- [ ] 解决所有冲突
- [ ] 运行测试验证
- [ ] 更新相关文档
- [ ] 通知相关人员

---

## 八、文档审核规范

### 8.1 审核流程

#### 审核步骤

1. **提交审核**
   - 作者提交文档到审核队列
   - 指定审核人员和截止日期

2. **内容审核**
   - 检查文档格式和结构
   - 验证内容准确性和完整性
   - 确认符合 YYC³ 标准

3. **技术审核**
   - 检查代码示例的正确性
   - 验证技术方案的可行性
   - 确认引用链接的有效性

4. **语言审核**
   - 检查语法和拼写
   - 确保表达清晰准确
   - 统一术语和用词

5. **审核反馈**
   - 提供详细的审核意见
   - 标注需要修改的地方
   - 给出修改建议和优先级

### 8.2 审核标准

#### 质量标准

| 维度 | 标准 | 说明 |
|------|--------|------|
| 完整性 | 内容完整，无遗漏 | 文档包含所有必要信息 |
| 准确性 | 信息准确，无误 | 技术参数、代码示例准确无误 |
| 清晰性 | 表达清晰，易懂 | 语言简洁，逻辑清晰 |
| 一致性 | 格式统一，规范 | 符合 YYC³ 文档规范 |
| 可读性 | 结构合理，易查 | 目录清晰，导航方便 |

### 8.3 审核结果

#### 审核状态

| 状态 | 说明 | 操作 |
|------|------|------|
| 通过 | 文档符合标准 | 直接发布 |
| 需修改 | 文档需要修改 | 返回作者修改 |
| 需重写 | 文档需要重写 | 返回作者重写 |
| 不通过 | 文档不符合标准 | 拒绝发布 |

---

## 九、自动化工具使用

### 9.1 文档生成工具

#### YYC3-Musid-Document.py

**功能**:
- ✅ 自动生成符合 YYC³ 标准的文档
- ✅ 支持文档内容验证
- ✅ 支持自动更新功能
- ✅ 统一的文档格式和结构

**使用方法**:
```bash
cd /Users/yanyu/YYC3-MusAI
python3 docs/YYC3-Musid-Document.py --help
```

**命令选项**:
```bash
# 生成所有文档
python3 docs/YYC3-Musid-Document.py --generate-all

# 生成特定文档
python3 docs/YYC3-Musid-Document.py --doc-id 001

# 验证文档
python3 docs/YYC3-Musid-Document.py --validate

# 更新文档
python3 docs/YYC3-Musid-Document.py --update
```

### 9.2 Git 初始化工具

#### init-git.sh

**功能**:
- ✅ 自动备份当前代码
- ✅ 初始化 Git 仓库
- ✅ 添加远程仓库
- ✅ 拉取远程代码
- ✅ 创建本地分支
- ✅ 查看代码差异
- ✅ 生成迁移报告

**使用方法**:
```bash
cd /Users/yanyu/YYC3-MusAI
./scripts/init-git.sh
```

### 9.3 数据迁移工具

#### export-kv-advanced.js

**功能**:
- ✅ 自动分页（突破 Supabase 1000 行限制）
- ✅ 前缀统计
- ✅ JSON 自动解析
- ✅ 完整参数支持：--stats / --user / --prefix / --pattern / --raw / --output
- ✅ 环境变量凭证（不硬编码 key）
- ✅ 可作为 ES Module 导入

**使用方法**:
```bash
# 获取 KV 数据统计
node scripts/export-kv-advanced.js --stats

# 导出所有 KV 数据
node scripts/export-kv-advanced.js

# 导出特定用户的 KV 数据
node scripts/export-kv-advanced.js --user user-123

# 导出特定前缀的 KV 数据
node scripts/export-kv-advanced.js --prefix song:
```

#### export-kv-cli.js

**功能**:
- ✅ 轻量级，支持分页和环境变量
- ✅ 简化参数：--user / --prefix
- ✅ 一键导出

**使用方法**:
```bash
# 导出所有数据
node scripts/export-kv-cli.js

# 导出特定用户
node scripts/export-kv-cli.js --user user-123

# 导出特定前缀
node scripts/export-kv-cli.js --prefix song:
```

#### migrate-from-supabase.js

**功能**:
- ✅ 使用 Supabase JS Client 导出数据
- ✅ 逐表导出，更灵活
- ✅ 包含数据验证和报告

**使用方法**:
```bash
# 安装依赖
npm install @supabase/supabase-js pg

# 配置环境变量
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export LOCAL_DB_PASSWORD="your_secure_password"

# 运行迁移脚本
node scripts/migrate-from-supabase.js
```

#### migrate-from-supabase.sh

**功能**:
- ✅ 使用 pg_dump 直接导出
- ✅ 完整的数据库结构 + 数据
- ✅ 包含备份和验证功能

**使用方法**:
```bash
# 配置环境变量
export SUPABASE_PROJECT_REF="your-project-ref"
export SUPABASE_DB_PASSWORD="your-password"
export LOCAL_DB_PASSWORD="your_secure_password"

# 运行迁移脚本
./scripts/migrate-from-supabase.sh
```

---

## 十、常见问题

### Q1: 如何创建新文档？

**A**: 使用 YYC3-Musid-Document.py 脚本

```bash
python3 docs/YYC3-Musid-Document.py --help
```

### Q2: 如何更新现有文档？

**A**: 使用 --update 参数

```bash
python3 docs/YYC3-Musid-Document.py --update --doc-id 001
```

### Q3: 如何验证文档格式？

**A**: 使用 --validate 参数

```bash
python3 docs/YYC3-Musid-Document.py --validate --doc-id 001
```

### Q4: 如何提交代码？

**A**: 遵循 Git 工作流规范

```bash
# 1. 创建功能分支
git checkout -b feature/new-feature

# 2. 开发功能
# ... 编写代码 ...

# 3. 提交更改
git add .
git commit -m "Feature: Add new feature"

# 4. 推送到远程
git push origin feature/new-feature

# 5. 创建 Pull Request
# 在 GitHub 上操作
```

### Q5: 如何合并代码？

**A**: 使用 init-git.sh 脚本

```bash
cd /Users/yanyu/YYC3-MusAI
./scripts/init-git.sh
```

### Q6: 如何导出 KV 数据？

**A**: 使用 export-kv-advanced.js 脚本

```bash
# 获取 KV 数据统计
node scripts/export-kv-advanced.js --stats

# 导出所有 KV 数据
node scripts/export-kv-advanced.js
```

### Q7: 如何迁移数据？

**A**: 使用 migrate-from-supabase.js 或 migrate-from-supabase.sh 脚本

```bash
# Node.js 版本
node scripts/migrate-from-supabase.js

# Bash 版本
./scripts/migrate-from-supabase.sh
```

---

## 十一、总结

### 11.1 核心原则

1. **标准化**：所有文档、代码、提交都遵循统一标准
2. **自动化**：使用工具减少手动操作，提高效率
3. **文档化**：完善的文档体系，确保知识传承
4. **版本化**：严格的版本管理，确保可追溯性
5. **审核制**：所有文档和代码都经过审核

### 11.2 关键要点

- ✅ 文档命名遵循统一格式
- ✅ 文件夹结构清晰合理
- ✅ 文档格式统一规范
- ✅ Git 工作流标准化
- ✅ 代码提交规范化
- ✅ 文档审核制度化
- ✅ 自动化工具充分使用

### 11.3 实施建议

1. **立即执行**：按照本规范执行
2. **持续改进**：根据实际情况调整规范
3. **工具支持**：完善自动化工具
4. **培训推广**：培训团队成员
5. **定期审查**：定期审查规范执行情况

---

## 附录

### A. 文档模板

详见 `/Users/yanyu/YYC3-MusAI/docs/YYC3-Musid-Document.py`

### B. 自动化脚本

| 脚本 | 路径 | 功能 |
|------|--------|------|
| Git 初始化 | `/scripts/init-git.sh` | Git 仓库初始化 |
| KV 导出（增强版） | `/scripts/export-kv-advanced.js` | KV 数据导出 |
| KV 导出（轻量版） | `/scripts/export-kv-cli.js` | KV 数据导出 |
| 数据迁移（Node.js） | `/scripts/migrate-from-supabase.js` | 数据迁移 |
| 数据迁移（Bash） | `/scripts/migrate-from-supabase.sh` | 数据迁移 |

### C. 参考文档

| 文档 | 路径 | 说明 |
|------|--------|------|
| YYC³ 规范 | `/YYC³团队标准化规范文档.md` | YYC³ 标准化规范 |
| Guidelines | `/guidelines/Guidelines.md` | 核心提示词库 |
| Supabase 迁移指南 | `/guidelines/Supabase_Migration_Prompts.md` | Supabase 迁移指南 |
| 代码整合指南 | `/docs/Code_Integration_Guide.md` | 代码整合指南 |

---

**文档结束**

> **重要**: 请严格按照本规范执行，确保项目文档、代码、提交的一致性和规范性。如有问题，请参考常见问题部分或联系 YYC³ Team。
