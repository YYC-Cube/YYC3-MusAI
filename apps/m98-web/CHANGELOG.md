# Changelog — @yyc3/m98-web

All notable changes to this project will be documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/); adhere to SemVer.

## [1.0.0] — 2026-11-17

### Added

- 应用落地（卷 13 / M3）：自 M98 音乐宇宙 `web_app`（m98-fan-website 1.0.0）直迁 117 文件（CRA5 / React 18 / styled-components / framer-motion）

### Changed

- **workspace 改造**：`scripts/sync-assets.js` 品牌资产源由源布局根 `public/` 改为 monorepo 根 `assets/m98/public-brand`（单源共享，m98-admin 同源）
- `test` 脚本固定 CI 模式（`CI=true --watchAll=false`）

### Fixed

- 源项目遗留测试缺陷两处：`getByText(/董小姐/i)` 多元素匹配 → `getAllByText` + 主标题断言；补 `src/setupTests.js` 显式注册 jest-dom matchers（源项目缺失该文件）

### Security

- 迁移排除：node_modules / build 旧产物 / package-lock.json / .DS_Store（.env 无真实凭据文件，仅 .env.example 迁入）
