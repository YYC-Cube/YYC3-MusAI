# @yyc3/music-audio

## 1.0.0

### Major Changes

- 首次正式发布（v1.0.0）：源自 YYC3-MusAI v11.2 单体拆分。原单文件应用按职责拆分为 15 包 + 1 应用的 monorepo，本次对 14 个可发布包统一切换为 Vite 库模式构建（ESM 产出 + d.ts 类型声明 + sourcemap），并通过 publishConfig 在发布时指向 dist 产物（workspace 内仍走 src JIT 直引）。music-testing 作为内部测试套件暂不随版发布。
