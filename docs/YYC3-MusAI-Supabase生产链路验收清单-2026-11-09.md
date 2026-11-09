---
file: YYC3-MusAI-Supabase生产链路验收清单-2026-11-09.md
title: Supabase 生产链路验收清单与实测记录
description: 生产数据链路的凭据清单、四项健康检查、实测结论与恢复动作
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-09
updated: 2026-11-09
status: active
tags: [supabase, production, health-check, verification]
category: report
language: zh-CN
audience: developers,ops,managers
complexity: intermediate
---

# Supabase 生产链路验收清单与实测记录

> 关联计划：[全维度补全与生产就绪推进计划](./YYC3-MusAI-全维度补全与生产就绪推进计划-2026-11-09.md)（P0-1）
> 检查脚本：`scripts/check-supabase-health.mjs`（`pnpm check:supabase`）

## 一、凭据清单

| 变量 | 用途 | 来源 | 是否入库 |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | 项目 URL | `.env` / 部署平台环境变量 | 否 |
| `VITE_SUPABASE_ANON_KEY` | 客户端公开密钥（受 RLS 约束） | 同上 | 否 |
| `SUPABASE_SERVICE_ROLE_KEY` | 服务端管理密钥（仅 Edge Functions / CI 使用） | 部署平台 Secret | **绝不入库** |
| `SUPABASE_KV_TABLE` | KV 表名（默认 `kv_store_f626b673`） | 可选覆盖 | 否 |

红线：任何脚本、文档、示例不得内联真实密钥；本地 `.env` 已在 `.gitignore` 中。

## 二、四项健康检查

| # | 检查 | 端点 | 通过标准 |
| --- | --- | --- | --- |
| 1 | REST（PostgREST） | `GET /rest/v1/` | HTTP 200，返回 OpenAPI 描述 |
| 2 | Auth | `GET /auth/v1/health` | HTTP 200 |
| 3 | Storage | `GET /storage/v1/bucket` | 200 / 401 / 403（视为服务可达） |
| 4 | KV 表读取 | `GET /rest/v1/{kv_table}?select=key&limit=1` | HTTP 200 且结构可读 |

补充人工项（需真实业务凭据，暂未执行）：

| # | 检查 | 说明 |
| --- | --- | --- |
| 5 | 注册/登录 | `POST /auth/v1/signup` 与登录后 JWT 可用 |
| 6 | RLS 行为 | 匿名用户不能读取他人私有数据 |
| 7 | AI 降级 | 未配置模型密钥时 `/ai/*` 返回明确降级而非 500 |
| 8 | 上传链路 | Storage 签名上传 + 回读校验 |

## 三、实测结论（2026-11-09）

**结论：未通过 · 生产数据链路不可达（P0 阻断确认）**

证据链：

| 步骤 | 命令 | 结果 |
| --- | --- | --- |
| 无凭据保护 | `node scripts/check-supabase-health.mjs` | 输出「未配置，状态：未验证」，退出码 2（不伪造通过） |
| 真实凭据检查 | 加载 `.env` 后运行同脚本 | 4/4 项 `fetch failed` |
| DNS 复核 | `nslookup phgrinrlnxzjyxxhsqry.supabase.co` | **NXDOMAIN**（项目主机无法解析） |
| 对照组 | `nslookup supabase.co` / `curl https://api.github.com` | 正常解析 / HTTP 200（排除本机断网） |

判定：仓库记录的 Supabase 项目引用（`phgrinrlnxzjyxxhsqry`）对应的主机已不存在——通常意味着项目被删除、长时间暂停后释放，或项目引用已变更。**这不是代码缺陷，需要项目所有者恢复或提供新项目凭据。**

## 四、恢复动作（按顺序）

1. 项目所有者确认 Supabase 项目状态：
   - 若已删除：新建项目并记录新的 `project-ref`。
   - 若暂停：在控制台恢复项目。
2. 更新本地 `.env` 与部署平台环境变量（URL / anon key / service role key）。
3. 迁移数据库结构（`scripts/init-db.sh`、`scripts/init-postgres.sh`）并核对表清单。
4. 运行 `pnpm check:supabase`，要求 4/4 通过。
5. 执行人工项 5–8：注册登录、RLS 越权用例、AI 降级、上传回读。
6. 将结果回填本文件「实测结论」，并把状态改为「已通过」后，方可关闭 P0-1。

## 五、回归门禁

- 生产发布前必须运行 `pnpm check:supabase`，退出码必须为 0。
- CI 在缺少凭据时不得将该项标记为通过；未配置应显式标记 `skipped (unverified)`。
- 任何以 `fake-supabase` 通过的结果，只能作为单元/集成测试证据，不能替代生产验收。

## 六、当前遗留

| 项 | 状态 |
| --- | --- |
| 真实 Supabase 凭据 | ❌ 主机 NXDOMAIN，不可达 |
| `scripts/` 内历史脚本硬编码 anon key | ⚠️ 待迁移为环境变量（anon key 为公开密钥，风险中低） |
| Service Role Key 使用面 | ⚠️ 需确认仅存在于部署平台 Secret |
