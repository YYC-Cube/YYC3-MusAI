# Changelog — @yyc3/m98-admin

All notable changes to this project will be documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/); adhere to SemVer.

## [1.0.0] — 2026-11-17

### Added

- 应用落地（卷 13 / M4）：自 M98 音乐宇宙 `admin_panel`（m98-admin-panel 1.0.0）直迁 82 文件（Vue 3 + Vite 7 + TypeScript + Pinia）

### Changed

- **workspace 改造**：`scripts/sync-assets.js` 品牌资产源改为 monorepo 根 `assets/m98/public-brand`（与 m98-web 共享单源）
- **build 门禁调整**：`build = vite build`（原 `vue-tsc --noEmit && vite build`）；严格类型检查移入独立 `typecheck` 脚本——对齐卷 13 验收「Vue 栈免 typecheck 强制」

### Security

- 迁移排除：node_modules / dist 旧产物 / package-lock.json / .DS_Store（无真实 .env，仅 .env.example 迁入）
