# @yyc3/music-testing

## 1.0.1

### Patch Changes

- Updated dependencies [1d52925]
  - @yyc3/music-utils@2.1.0
  - @yyc3/music-hooks@2.0.1
  - @yyc3/music-data@2.0.1

## 1.0.0

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
  - @yyc3/music-data@2.0.0
  - @yyc3/music-design-tokens@2.0.0
  - @yyc3/music-hooks@2.0.0
  - @yyc3/music-utils@2.0.0

## 0.1.1

### Patch Changes

- Updated dependencies
  - @yyc3/music-hooks@1.0.0
  - @yyc3/music-utils@1.0.0
  - @yyc3/music-data@1.0.0
  - @yyc3/music-design-tokens@1.0.0
