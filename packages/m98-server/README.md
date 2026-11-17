# @yyc3/m98-server

> **M98 音乐宇宙后端 API 服务**（Express + PostgreSQL）
> YYC³ M98 双产品线的服务端包 · `@yyc3/m98-*` 命名空间 · PRIVATE 不发布

## 特性

- **PostgreSQL 单库主链路**（`pg` Pool 惰性连接，schema=`m98`，默认 `localhost:5433/yyc3_music`）
- 认证：JWT（`jsonwebtoken`）+ 管理后台账密
- 安全中间件：helmet / cors 白名单 / express-rate-limit
- OpenAPI 文档：swagger-jsdoc + swagger-ui-express
- **无库冒烟测试**：`authRoutes.test.js` 纯 JWT 流程（不需要数据库）
- PG 集成测试与迁移/种子/校验脚本（`test:pg` / `pg:*` 系列，需本地 PG）

## 安装

```bash
# 在 monorepo 根
pnpm install --filter @yyc3/m98-server
```

## 快速开始

```bash
pnpm --filter @yyc3/m98-server build   # 19 文件语法门禁（node --check 静态清单）
pnpm --filter @yyc3/m98-server test    # 无库冒烟（JWT 认证流程）
pnpm --filter @yyc3/m98-server test:pg # PG 集成测试（需 test 库，先 test:pg:setup）
pnpm --filter @yyc3/m98-server dev     # 开发服务（默认 :4000）
```

## API 概览

| 路由 | 前缀 | 说明 |
| --- | --- | --- |
| authRoutes | `/api/auth` | 登录/令牌（管理后台） |
| pg/adminRoutes | `/api/admin` | 管理端 |
| pg/artistRoutes | `/api/artists` | 艺人 |
| pg/contentRoutes | `/api/content` | 内容 |
| pg/fanRoutes | `/api/fans` | 粉丝 |
| pg/musicRoutes | `/api/music` | 音乐 |
| health | `/health` | 健康检查 |

（实际前缀以 `src/server-postgres.js` 挂载为准）

## 边界声明

- 本包属 **M98 双产品线**，与 `@yyc3/music-*` 主线**并存不合并**；
- **禁止** import `@yyc3/music-*` 业务包（CI 依赖方向 lint 待 M5 落地）；
- 与 `@yyc3/music-server`（Supabase Deno）技术栈不同，互不替代。

## 数据库

- 默认 `PGHOST=localhost:5433`、`PGDATABASE=yyc3_music`、`PGSCHEMA=m98`（见 `src/db/postgres.js`）
- 配置经 `.env`（模板见 `.env.example`）；**真实凭据不入库**（源目录 `.env` 已排除，未迁入）

## 变更

见 [CHANGELOG.md](./CHANGELOG.md)。
