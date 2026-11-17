# Changelog — @yyc3/m98-server

All notable changes to this project will be documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/); adhere to SemVer.

## [1.0.0] — 2026-11-17

### Added

- 包落地（卷 13 / M2）：自 M98 音乐宇宙 `api_service` 直迁（src 14 / tests 3 / scripts 5 + .env.example + Dockerfile，共 24 文件）
- `@yyc3/m98-*` 双产品线命名空间首个服务端包，PRIVATE 不发布
- 无库冒烟测试门禁（`pnpm test`：JWT 认证流程，排除需真库的 pgApi.test.js）
- 静态清单语法门禁（`pnpm build`：19 文件 `node --check` 链）

### Security

- 迁移排除清单严格执行：**源目录真实 `.env` 未迁入**（凭据零入库），仅带 `.env.example`；package-lock / node_modules / .DS_Store 均排除

### Notes

- 沿用源项目 Jest+Supertest 体系（workspace 根 vitest 不适用于 JS 服务包）
- sqlite3 降为 optionalDependencies（仅 pg-import 脚本使用，避免 native 构建阻塞 workspace 安装）
