# @yyc3/music-server

YYC³ D-Music Supabase Edge Functions 后端 — 承接自正身 `YYC3-MusAI v11.2` 的 `supabase/functions/server/`（2026-11-07 衔接，卷 11 P1）。

## 定位

- **独立部署单元**：Deno 运行时（Supabase Edge Functions），与 workspace 的 Node/Vite 构建链**完全解耦**
- **不参与** turbo build / typecheck / vitest / npm publish（`private: true`，无 build script）
- 前端对接：`@yyc3/music-utils` 的 `supabase.ts` 中 `API_BASE = /functions/v1/make-server-f626b673`

## 文件清单（22）

入口与存储：`index.tsx`（路由注册入口）、`kv_store.tsx`（KV 存储封装）
路由模块 ×16：routes-ai / routes-albums / routes-analytics / routes-auth / routes-challenge / routes-community / routes-diagnostics / routes-live / routes-market / routes-music / routes-pki / routes-social / routes-spacetime / routes-starpower / routes-upload / routes-user
基础设施 ×4：ai-model-manager、rate-limit、server-utils、validation

## 部署

```bash
# 前置：supabase CLI 登录 + 项目 ref
pnpm --filter @yyc3/music-server deploy
# 或手动
supabase functions deploy make-server-f626b673 --project-ref <ref>
```

环境变量由 Supabase Dashboard → Edge Functions Secrets 管理（对应正身 `.env` 体系）。

## 演进规则（卷 11）

本包是后端的**唯一写入点**；正身 `supabase/` 目录已冻结为只读参照。修改后经 `deploy` 发布，不产生 npm 版本。
