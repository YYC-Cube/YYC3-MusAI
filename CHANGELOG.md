---
file: CHANGELOG.md
title: YYC³ MusAI 变更日志
description: 仓库级版本变更记录（包级变更由 changesets 生成）
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-09
updated: 2026-11-09
status: active
tags: [changelog, release]
category: general
language: zh-CN
audience: developers,stakeholders
complexity: simple
---

# 变更日志

遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与 [Semantic Versioning](https://semver.org/lang/zh-CN/)。包级变更由 changesets 生成，发布时同步到各包 CHANGELOG。

## [Unreleased]

### 安全

- 升级 vitest / @vitest/coverage-v8 至 4.1.12，消除 tinypool、@vitest/mocker 漏洞。
- 升级 react-syntax-highlighter 至 16.1.2，修复 prismjs 漏洞。
- 新增 `pnpm.overrides` 锁定 tinypool ≥2.2.0、glob ≥14.0.4、minimatch ≥11.0.5、prismjs ≥1.30.0。
- CI 安全扫描改为阻断式（官方 registry，`--audit-level=high`）。
- 新增 `.github/dependabot.yml`（npm 与 GitHub Actions 每周检查）。

### 文档

- 新增 15 个公开包 README（安装、快速开始、导出清单、关键 API、许可证）。
- 新增根 `LICENSE`、`SECURITY.md`、`CONTRIBUTING.md`、`CHANGELOG.md`。
- 新增会话文档体系 `docs/YYC3-MusAI-TraeCode-20261109/`（审核、规划、日志、总结、时刻衔接）。

### 测试

- 适配 Vitest 4 破坏性变更：`vi.fn()` 不再可作为构造函数、`restoreAllMocks` 不再清空 `vi.fn()` 记录。
- 95 文件 / 1,388 用例全通过；语句 96.21% / 分支 89.85% / 函数 94.90% / 行 97.69%。

## [11.2.0] - 2026-11-09

### 新增

- 全维度覆盖率门禁：全量源码（`all: true`）四项 ≥80%，Deno 后端独立计量。
- 新增 64 个 Vitest 测试文件与 5 个 Deno 测试文件。

### 修复

- PlayerUI 插值、VoiceContextManager 正则 `g` 标志、挑战 id 覆盖、上传 500、小语角色加载/拖拽、controller 依赖缺失、命令面板可访问性等 7 处真实缺陷。

### 变更

- 品牌统一为 YYC³ MusAI，测试与文档同步。

## [2.0.0] - 2026-11-08

### 变更

- 升级 React 19 / Vite 7 / TypeScript 5.9 基线。
- 仓库扁平化为单一 workspace（apps/packages 提升至根）。

## 版本对照

| 时间 | 版本 | 说明 |
| --- | --- | --- |
| 2026-11-09 | 11.2.0 | 覆盖率与质量门禁收口 |
| 2026-11-08 | 2.0.0 | React 19 / Vite 7 基线 |
