# YYC3-MusAI Monorepo

YYC³ MusAI 智能音乐平台 Monorepo — 由 YYC3-MusAI（v11.2）按 [YYC³ 拆分规划](../docs/YYC3-D-Music-拆分规划/YYC3-D-Music-拆分规划-00-文档架构总览.md) 拆分而来。

## 特性

- ✅ pnpm workspace + Turborepo 增量构建
- ✅ `@yyc3/music-*` 包体系，依赖单向、无循环
- ✅ TypeScript 全量覆盖（源码直出 JIT 包，阶段五接入 Vite 库模式构建）
- ✅ Changesets 语义化版本管理
- ✅ GitHub Actions CI（typecheck + build 门禁）

## 结构

```
├── apps/d-music                  # 主应用（Vite + React 18 + Tailwind 4）
└── packages/
    ├── music-ui                  # shadcn 基件 48 个 + D-Music 设计层（DButton/DataViz）
    ├── music-hooks               # 9 hooks（播放引擎/i18n/触感/PWA/手势/虚拟列表）
    ├── music-utils               # Supabase 客户端/API/加密/偏好/性能注册表/监控
    ├── music-data                # 全局类型系统 + 演示歌单数据
    ├── music-design-tokens       # 六主题设计与主题引擎
    └── music-testing             # 自研 TestSuite 测试套件（150+ 用例）
```

## 快速开始

```bash
pnpm install
pnpm dev            # 启动 apps/d-music（端口 3198）
pnpm typecheck      # 全工作区类型检查
pnpm build          # 全工作区构建
```

## 依赖方向

```
apps/d-music → hooks/data/design-tokens/testing/utils
music-data → music-hooks
music-hooks → music-utils
music-testing → utils/hooks/data/design-tokens
music-ui（独立，供跨项目复用）
```

> 注：apps/d-music 内 `src/app/hooks/`、`src/app/lib/`、`playlistData.ts` 为**转接层（shim）**，
> 保证迁移期与源版本行为逐字节一致，将在拆分阶段三统一移除并直连包导入。

## 许可证

MIT
