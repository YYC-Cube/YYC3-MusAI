# @yyc3/music-player

## 2.0.0

### Major Changes

- React 19 / Vite 7 基线升级（破坏性变更）

  - peerDependencies.react 由 `>=18.0.0` 收紧为 `>=19.0.0`，React 18 消费者需升级后使用
  - 构建与类型基线统一至 Vite 7.3.7 / TypeScript 5.9.3 / Tailwind CSS 4.3.5
  - `@yyc3/music-utils` 移除 `@supabase/supabase-js` 依赖，客户端改为本地模式（`VITE_API_BASE` 为空时不发起任何云端请求）
  - 组件层修正 React 19 类型兼容：recharts 2.x 的 JSX 类型断言、input-otp Context 类型标注
  - 仓库结构扁平化：`apps/d-music` 与 `packages/*` 直接位于仓库根，包名与导出路径不变
  - 全部包补全 `repository` / `homepage` / `bugs` 元数据，统一指向 YYC-Cube/YYC3-MusAI

### Patch Changes

- Updated dependencies
  - @yyc3/music-hooks@2.0.0
  - @yyc3/music-lyrics@2.0.0
  - @yyc3/music-ui@2.0.0

## 1.0.0

### Major Changes

- 首次正式发布（v1.0.0）：源自 YYC3-MusAI v11.2 单体拆分。原单文件应用按职责拆分为 15 包 + 1 应用的 monorepo，本次对 14 个可发布包统一切换为 Vite 库模式构建（ESM 产出 + d.ts 类型声明 + sourcemap），并通过 publishConfig 在发布时指向 dist 产物（workspace 内仍走 src JIT 直引）。music-testing 作为内部测试套件暂不随版发布。

### Patch Changes

- Updated dependencies
  - @yyc3/music-ui@1.0.0
  - @yyc3/music-hooks@1.0.0
  - @yyc3/music-lyrics@1.0.0
