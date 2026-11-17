# @yyc3/m98-admin

> **M98 音乐宇宙 · 管理后台**（Vue 3 + Vite 7 + TypeScript）
> YYC³ M98 双产品线管理端 · `@yyc3/m98-*` 命名空间 · PRIVATE 不发布

## 特性

- Vue 3 + Pinia（store/stores 双态并存，直迁原样保留）+ Vue Router
- TypeScript 严格工程（`vue-tsc --noEmit` 独立 typecheck 脚本）
- 品牌资产与 `@yyc3/m98-web` **共享单源** `monorepo 根 assets/m98/public-brand`（predev/prebuild 钩子同步）

## 快速开始

```bash
pnpm install --filter @yyc3/m98-admin
pnpm --filter @yyc3/m98-admin build      # sync-assets → vite build（571ms / 119 modules）
pnpm --filter @yyc3/m98-admin typecheck  # vue-tsc --noEmit（开发期强检，不进默认门禁）
pnpm --filter @yyc3/m98-admin dev        # Vite :3032
```

## 边界声明

- M98 双产品线应用，**禁止 import `@yyc3/music-*` 业务包**
- Vue 栈与 React 主线工具链隔离（独立 eslint/tsconfig 基座），经 turbo 按包声明任务
- 对接 `@yyc3/m98-server`（默认同源部署或 `:4000`）

## 变更

见 [CHANGELOG.md](./CHANGELOG.md)。
