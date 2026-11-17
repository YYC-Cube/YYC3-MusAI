# @yyc3/m98-web

> **M98 音乐宇宙 · 董小姐官方粉丝网站**（React 18 / CRA5）
> YYC³ M98 双产品线 Web 前端 · `@yyc3/m98-*` 命名空间 · PRIVATE 不发布

## 特性

- 艺人主页 / 音乐播放器 / 最新发布 / 社交互动（advanced + social + artist_profile 组件群）
- styled-components + framer-motion 动效
- **品牌资产单源**：`monorepo 根 assets/m98/public-brand` → prebuild 钩子（`scripts/sync-assets.js`）同步白名单条目到 CRA `public/`
- API 代理 `:4000` → `@yyc3/m98-server`

## 快速开始

```bash
pnpm install --filter @yyc3/m98-web
pnpm --filter @yyc3/m98-web build   # sync-assets → CRA build
pnpm --filter @yyc3/m98-web test    # CI 模式单次运行
pnpm --filter @yyc3/m98-web start   # 开发服务（CRA :3000）
```

## 边界声明

- M98 双产品线应用，**禁止 import `@yyc3/music-*` 业务包**
- 播放器组件（`src/components/music_player`）与 `@yyc3/music-player` **零同源**（JSX+CSS vs TSX+styled），经卷 13 / M5 裁决保持独立，不强行归并
- `assets/m98/public-brand` 为品牌与媒体资产唯一事实源（源自 M98 音乐宇宙根 public，145 文件）

## 变更

见 [CHANGELOG.md](./CHANGELOG.md)。
