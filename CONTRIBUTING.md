---
file: CONTRIBUTING.md
title: 贡献指南
description: YYC³ MusAI 的开发环境、分支约定、提交规范、质量门禁与发布流程
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-09
updated: 2026-11-09
status: stable
tags: [contributing, workflow, quality-gate]
category: policy
language: zh-CN
audience: developers
complexity: intermediate
---

# 贡献指南

## 环境要求

| 工具 | 版本 |
| --- | --- |
| Node.js | ≥ 20.19（CI 使用 22） |
| pnpm | ≥ 10（仓库锁定 10.17.0） |
| Deno | v2.x（仅 `packages/music-server`） |

```bash
pnpm install
pnpm dev        # 启动 apps/d-music
```

## 仓库结构

```
apps/d-music        主应用（React 19 + Vite 7）
packages/music-ui    UI 基础组件库
packages/music-*     音乐域与通用能力包（共 15 个公开包）
packages/music-server  Supabase Edge Functions（Deno，私有）
docs/                十阶段文档架构与会话存档
```

## 分支与提交

- 分支：`main`（稳定）、`develop`（集成）、`feat/*`、`fix/*`。
- 提交信息遵循 Conventional Commits：`feat:`、`fix:`、`chore:`、`docs:`、`test:`、`refactor:`。
- 提交前必须通过本地门禁（见下）。

## 质量门禁（必须全绿）

```bash
pnpm lint                 # 0 error
pnpm typecheck            # 16/16
pnpm test:coverage        # 用例全通过，四项覆盖率 ≥80%
pnpm build                # 16/16
env -u CI pnpm e2e        # Playwright 冒烟
pnpm test:deno:coverage   # Deno 后端行覆盖 ≥80%
```

补充规则：

1. 新增源码必须同步新增用例，禁止降低覆盖率阈值。
2. 新增依赖必须通过 `pnpm audit --audit-level=high`（官方 registry）。
3. 新增公开包必须包含 README、`exports`、`publishConfig`、`files`。
4. 新增文档必须使用 YAML front matter，文件名与 H1 标题一致。
5. 组件不得直接发起网络请求，需经由 `music-utils` 的 API 层或 Provider 契约。

## 新增包或组件

1. 复制现有包的 `package.json` / `tsconfig.build.json` / `vite.config.ts` 结构。
2. 在 `vitest.config.ts` 的 `projects` 中注册测试项目。
3. 补充 README（安装、示例、导出、API、许可证）。
4. 运行 `pnpm --filter <pkg> build` 并确认 `npm pack --dry-run` 含 `dist` 与 `README.md`。

## 发布流程

1. 变更时执行 `pnpm changeset`，选择受影响的包与 semver 级别。
2. 合并到 `main` 后由 `.github/workflows/publish.yml` 校验并发布。
3. 发布后由流水线从 registry 安装并执行冒烟，失败即回滚版本。

## 文档与日志

- 会话存档目录：`docs/{项目名}-{导师}-{YYYYMMDD}/`。
- 必须维护 `02-执行日志与进度跟踪.md` 与 `04-时刻衔接与上下文同步.md`。
- 会话结束前更新 `03-总结文档与状态同步.md`。

## 行为准则

- 以代码为基：不读代码不提出方案，不猜测配置值。
- 不伪造结果：未验证项标注「未验证」，不以 mock 通过替代真实链路。
- 敏感信息不入库：密钥、令牌、连接串一律走环境变量。
