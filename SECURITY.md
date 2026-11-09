---
file: SECURITY.md
title: 安全策略与漏洞报告流程
description: YYC³ MusAI 支持的版本、漏洞报告渠道、响应时限与安全基线
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-09
updated: 2026-11-09
status: stable
tags: [security, vulnerability, policy]
category: policy
language: zh-CN
audience: developers,security
complexity: intermediate
---

# 安全策略

## 支持的版本

| 版本 | 安全更新 |
| --- | --- |
| 11.x | ✅ |
| < 11.0 | ❌ |

## 报告漏洞

请**不要**通过公开 Issue 报告安全问题。请发送邮件至 [admin@0379.email](mailto:admin@0379.email)，标题以 `[SECURITY]` 开头，并包含：

- 受影响包名与版本
- 复现步骤或最小复现仓库
- 影响描述（读取/写入/权限提升/拒绝服务等）
- 可选的修复建议

## 响应时限

| 阶段 | 目标 |
| --- | --- |
| 确认收到 | 3 个工作日内 |
| 初步评估与定级 | 7 个工作日内 |
| 修复与披露 | 按 CVSS 等级：Critical ≤ 7 天，High ≤ 14 天，其余 ≤ 30 天 |

## 安全基线

- 依赖审计：CI 以官方 registry 执行 `pnpm audit --audit-level=high`，高危即阻断合并。
- 依赖更新：Dependabot 每周检查 npm 与 GitHub Actions。
- 密钥管理：`.npmrc`、`.env*` 不入库；E2E 私钥仅存本地 IndexedDB 并以 WebCrypto 保护。
- 数据链路：写操作经 Supabase RLS 与显式授权校验，禁止客户端直连高权限接口。
- 传输：生产环境强制 HTTPS，安全头（CSP、HSTS、X-Content-Type-Options）由部署层配置。

## 已知范围外

- 第三方浏览器扩展注入
- 用户自行修改的本地构建产物
- 未按文档启用 RLS 的自建 Supabase 实例
