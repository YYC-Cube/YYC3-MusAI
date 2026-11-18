# SOP — 开源项 → 包组落地流程

> YYC³ Music 组件库自研流程，固化自 W1–W4（2026-11-18）实战。
> 适用范围：`yyc3-music-monorepo` 全部 `@yyc3/music-*` 包。
> 关联文档：[`EXECUTION-PLAN-W1W4.md`](./EXECUTION-PLAN-W1W4.md) · [`NOTICE.md`](./NOTICE.md)

## 流程总览

```
① 调研选型 → ② 拉取研读 → ③ 包组集成 → ④ 验收闭环 → ⑤ 许可合规 → ⑥ 持续更新
```

每一步都有明确的输入/产出/门禁；任何一步不满足门禁即回退，不带病前进。

---

## ① 调研与选型

**输入**：需求缺口（如"缺播放内核"）、`repos.tsv`（72 条候选清单）。

**动作**：
1. 按"关键词 ↔ 目标包"映射表定位候选（补内核 → music-player；补流媒体 → music-server…）。
2. 许可证预审：AGPL/GPL **只允许"借鉴交互/架构"或"独立部署"**，直接淘汰"复制代码"路线。
3. 技术栈契合度评估：React 18+ peer、ESM、TypeScript 类型完整度、包体积、维护活跃度。

**产出**：候选表（项目 / 许可 / 用途 / 边界 / 目标包）。

**门禁**：每项引入必须有明确的目标包与边界声明；"看起来有用"不构成引入理由。

## ② 拉取与研读

**动作**：
1. `git clone --depth 1 --single-branch` 拉到 `docs/开源组件库/`（版本锁定快照，不随上游自动更新）。
2. 代码审计只读三处：`package.json`（依赖面）、`src/index` 导出面、核心模块实现。
3. 提取"可复用模式"而非代码：架构语义（如 Navidrome 的 `path+mtime+size` 变更检测）、交互范式（如 Misskey 的 toggle 反应）、API 形状。

**产出**：模式笔记（进入对应包的组件头注释，注明"参考 X 的 Y 模型，未引入代码"）。

## ③ 包组集成

**顺序**：安装依赖 → 写组件/模块 → 挂导出 → typecheck。

**硬性约束**：
1. **类型先行**：先读依赖的 `.d.ts` 确认真实 API，不凭记忆写代码。
   - 实战教训：TanStack Virtual v3 用 `estimateSize`/`getVirtualItems()`（不是 v2 的 `estimateHeight`/`startIndex`）；wavesurfer v8 的 `timeupdate` 只回调 `currentTime`；dnd-kit 的 `useSortable` 返回 `transform`（需 `CSS.Transform.toString`，且必须装 `@dnd-kit/utilities`）。
2. **统一导出**：新模块挂到 `src/index.ts`；跨包类型只从 `music-data/types.ts` 引用，禁止包间反向依赖。
3. **增量锚点**：新能力挂现有包（如直播组件进 music-live 而非塞进 music-community），包边界不扩大既有职责。
4. **依赖声明**：依赖装入**使用它的包**（`pnpm add --filter <pkg>`），不在根 package.json 堆放。
5. **资源释放**：媒体/引擎类（Video.js、hls.js、wavesurfer、AudioContext）必须有对应的 destroy/dispose 路径，挂 `useEffect` cleanup 或包级 `dispose()`。
6. **受控组件**：交互组件只发回调、不私自持久化（如 ReactionBar 的计数由宿主持有），保持包的可移植性。

## ④ 验收与闭环

**每阶段量化指标先于代码定义**（本次：波形同步 < 80ms、1000 首 60fps、HLS 起播 < 1.5s、100 并发弹幕）。

**代码级门禁**（全部通过才算完成）：
- [ ] `pnpm --filter <pkg> typecheck` 全绿（所有改动包逐一跑，不用 turbo 缓存糊弄）
- [ ] 类型断言（`as any`）仅限上游类型缺陷处，且注明原因
- [ ] 引擎实例销毁路径存在且被 cleanup 调用
- [ ] 凭据零字面量：只从 `env` 读取（`Deno.env.get` / `import.meta.env`）

**实测指标**（接入宿主后测）：性能、并发、无障碍（Lighthouse a11y ≥ 95）——记入执行计划"遗留"节，不静默视为通过。

## ⑤ 许可合规

1. 每次引入第三方依赖，同批更新 `NOTICE.md`（依赖名 / 许可 / 目标包 / 用途）。
2. AGPL/GPL 参考项目在 NOTICE 中单列"仅借鉴、零代码复制"，注明借鉴了哪个模型、落到了哪个文件。
3. 服务端出站请求（如直播状态探测）：仅 http/https，校验 host，拒绝 localhost/环回/私有/保留地址（实现见 `music-server/src/live-stream.ts` 的 `assertPublicHttpUrl`，可复用）。
4. 媒体资产（歌曲/封面/字体）授权独立于代码许可，单独确认。

## ⑥ 持续更新

1. `docs/开源组件库/` 为 2026-11-18 HEAD 快照；升级 = 重新执行本 SOP ①–⑤，不是 `git pull` 了事。
2. 每次发布前复查：上游弃用公告（如 Vidstack→Video.js 10 的迁移教训）、许可证变更、包体变化。
3. 每轮实战后把新踩的坑回写本 SOP（③ 的"实战教训"清单），保持流程进化。

---

**最后更新**：2026-11-18 · YYC³ Team
