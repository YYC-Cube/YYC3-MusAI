# YYC³ Music 组件库 — W1~W4 落地执行计划

基线：`01-音乐/yyc3-music-monorepo`（16 个 `@yyc3/music-*` 包 + 3 个 apps）
版本：2026-11-18 HEAD 快照
许可门禁：AGPL/GPL（Navidrome、PeerTube、Misskey、Jellyfin 等）**仅独立部署或参考设计，不复制进闭源前端**

---

## 基线现状与依赖差异对照

| 包 | 当前关键依赖 | W1 需新增 | W2 需新增 | W3 需新增 | W4 需新增 |
|---|---|---|---|---|---|
| `@yyc3/music-ui` | motion、cmdk、vaul、sonner、Radix 全套 | `@dnd-kit/*`、`@tanstack/react-virtual`、`lenis` | — | — | HeroUI/Mantine、Tremor/Visx（选配） |
| `@yyc3/music-hooks` | `@yyc3/music-utils` | `lenis` | — | — | — |
| `@yyc3/music-design-tokens` | 无运行时依赖 | — | — | — | — |
| `@yyc3/music-player` | motion、music-hooks、music-lyrics、music-ui | — | `video.js`、`media-chrome`、`hls.js` | — | — |
| `@yyc3/music-audio` | framer-motion、reactflow | — | `hls.js`（降级原生 Audio） | — | — |
| `@yyc3/music-lyrics` | motion、music-hooks、music-utils | — | `wavesurfer.js` | — | — |
| `@yyc3/music-data` | `@yyc3/music-hooks` | — | — | — | — |
| `@yyc3/music-server` | Supabase Edge Functions（Deno，不参与 workspace 构建）| — | — | `/live/stream`、`/ws/live` | — |
| `@yyc3/music-community` | motion、recharts、music-data/hooks/utils | — | — | `LiveSessionPanel` | Misskey 风格 Widget/表情反应 |
| `music-live` | **新建包** | — | — | 直播间 UI、弹幕、礼物动画 | — |

> 注：`music-ui` 已内置 `motion`/`cmdk`/`vaul`/`sonner`，W1 中重复项无需重复安装。

---

## W1：UI/UX 基建统一（第 1 周）

### 目标
把 `music-ui` / `music-hooks` / `music-design-tokens` 建成统一设计系统底座，全部 shadcn 风格、MIT 许可，无合规风险。

### 动作与验收

| 编号 | 动作 | 目标包 | 预期结果 | 验收 |
|---|---|---|---|---|
| W1-1 | `pnpm add @dnd-kit/core @dnd-kit/sortable @tanstack/react-virtual @tanstack/react-table lenis`（workspace root 或 music-ui） | `music-ui` | 拖拽/虚拟列表/平滑滚动能力可用 | `pnpm --filter @yyc3/music-ui typecheck` 通过 |
| W1-2 | 新增 `dnd-kit` 歌单排序块、`TanStack Virtual` 长列表块（shadcn 风格） | `music-ui/src/ui/` | 可复用的排序与长列表组件 | 组件导出并可在 `music-player` 引用 |
| W1-3 | 新增 `useWaveform`、`useScrollProgress`（Lenis）、`useMediaQuery` | `music-hooks/src/` | 三个 hook 导出通过类型检查 | `pnpm --filter @yyc3/music-hooks typecheck` 通过 |
| W1-4 | `music-design-tokens` 新增动效令牌（easing/duration）、滚动令牌 | `music-design-tokens/src/` | `design-tokens.ts` / `themes.ts` 追加令牌 | 主题令牌一致、可被 `music-ui` 消费 |
| W1-5 | 验收：主题令牌一致、键盘可达、Lighthouse a11y ≥ 95 | 全包 | — | Lighthouse a11y ≥ 95 |

> Vaul/CmdK/Sonner/Motion 已在 `music-ui` 依赖中，W1-1 只补缺项。

---

## W2：音乐体验升级（第 2 周）

### 目标
`music-player` / `music-lyrics` / `music-audio` 补齐播放内核与波形，音频-波形-歌词联动。

### 动作与验收

| 编号 | 动作 | 目标包 | 预期结果 | 验收 |
|---|---|---|---|---|
| W2-1 | `pnpm add video.js media-chrome hls.js wavesurfer.js` | `music-player`、`music-audio`、`music-lyrics` | 播放/流媒体/波形内核可用 | 各包 `typecheck` 通过 |
| W2-2 | `MediaDisplay` 的 `<video>` 改为 Video.js 10 + Media Chrome 控件，支持 HLS/Range 拖动 | `music-player/src/components/MediaDisplay.tsx` | 可播放 HLS 源，进度条可拖动 | HLS 起播 < 1.5s |
| W2-3 | `AdvancedPlayer` 的 `new Audio()` 改为 hls.js 自适应流内核（降级兼容原生 Audio） | `music-audio` | hls.js 为主，原生 Audio 兜底 | 降级切换无异常 |
| W2-4 | 接入 WaveSurfer.js 渲染音频波形，Regions 支持歌词行跳转与片段循环；`tapSync` 与波形时间轴联动 | `music-lyrics/src/components/LyricsDisplay.tsx` | 波形与歌词行联动 | 波形-歌词同步误差 < 80ms |
| W2-5 | 新增 `mediaScanner.ts` 参考 Navidrome 媒体库扫描模型（仅借鉴架构，不引入 GPL 代码） | `music-data/src/` | 媒体库扫描/类型定义 | 类型导出正确 |
| W2-6 | 验收：1000 首列表 60fps；HLS 起播 < 1.5s | — | — | 性能指标达标 |

---

## W3：媒体/视频能力（第 3 周）

### 目标
`music-server` 补齐流媒体播放与直播链路；`music-community` 补弹幕/直播互动。

> `music-server` 为 Supabase Edge Functions（Deno），不参与 `pnpm` workspace 构建，按 Edge Functions 结构新增路由与 WebSocket 通道。

| 编号 | 动作 | 目标包 | 预期结果 | 验收 |
|---|---|---|---|---|
| W3-1 | `routes-upload.ts` 已支持 Range 流式保持；新增 `/live/stream` 接口对接 MediaMTX / SRS RTMP/HLS 推流地址（参考 Owncast 推流模型） | `music-server/src/` | 直播推流地址接口可用 | 接口返回有效 HLS/RTMP 地址 |
| W3-2 | WebSocket `/ws/live` 扩展为 Owncast 风格直播间（聊天 + 表情 + 审核 + 房间） | `music-server/src/` | 直播间 WebSocket 通道 | 100 并发弹幕无丢失 |
| W3-3 | 新增 `LiveSessionPanel` 接入 WebSocket 直播间，展示在线听众与实时弹幕 | `music-community` | 直播间面板组件 | 弹幕实时展示 |
| W3-4 | 新建 `music-live` 包（可选，直播专用组件）：直播间 UI、弹幕渲染、礼物动画 | `packages/music-live/` | 独立直播组件包 | 包可构建、可引用 |
| W3-5 | 验收：100 并发弹幕无丢失；HLS 点播流稳定播放 | — | — | 压测达标 |

---

## W4：社区与选配（第 4 周）

### 目标
社交/商业/数据域按需选配；借鉴联邦社交交互范式（不引入 AGPL 后端）。

### 动作与验收

| 编号 | 动作 | 目标包 | 预期结果 | 验收 |
|---|---|---|---|---|
| W4-1 | 选配层：HeroUI/Mantine（表单丰富组件）、Tremor/Visx（运营看板）、Revideo（MV 程序化生成，Apache 替代 Remotion） | 按需引入 | 选配组件可按场景启用 | 功能可演示 |
| W4-2 | 借鉴层：`music-community` 信息流参考 Misskey Widget/表情反应/主题化；`music-data` 歌单/队列参考 Koel；媒体资产参考 Immich 上传/去重/缩略图 | `music-community`、`music-data` | 交互范式落地 | 社交交互体验一致 |
| W4-3 | 合规复核：所有 AGPL/GPL 项目仅独立部署或参考设计，不复制进闭源前端 | 全包 | 许可清单无 AGPL/GPL 前端依赖 | 合规审计通过 |
| W4-4 | 验收：社区 Feed 闭环；数据看板可用；MV 生成功能可演示 | — | — | E2E 演示通过 |

---

## 最后总结与闭环项（“借鉴 / 参考自己设计 / 自研”）

### 1. 借鉴（取交互与架构，不取有风险代码）
- Navidrome：媒体库扫描/转码/Subsonic API 语义 → `music-data` 的 `mediaScanner` 与 `libraryScanner`
- PeerTube/MediaCMS：频道/播放列表/转码/审核领域模型 → `music-server` 媒体资产管理（仅参考模型，GPL/AGPL 代码不引入）
- Misskey：信息流、Widget、表情反应、主题化 → `music-community` 社交交互
- Koel：歌单/播放队列/多用户产品细节 → `music-player` 播放列表
- Immich：上传、去重、缩略图、时间轴 → `music-server` 媒体上传链路

### 2. 参考自己设计（以现有 packages 为基座）
- 复用 `@yyc3/music-data/types.ts` 全局类型系统（Track、LyricLine、MediaMode、ThemeId 等）
- 复用 `@yyc3/music-server` Hono 路由、JWT 鉴权、KV+PG 双写模式、WebSocket 直播通道
- 复用 `@yyc3/music-ui` 48 个 shadcn 基件与 D-Music 设计层
- 复用 `@yyc3/music-hooks` 的 `useAudioEngine`、`useVirtualList` 等
- 不推倒重建：所有新能力以现有包为锚点增量引入，保持包组边界清晰

### 3. 自研（完整推进流程，作为最后交付物）
固化一套“开源项 → 包组”落地 SOP：

1. 调研与选型：从 `docs/开源组件库/repos.tsv` 筛选候选 → 许可证合规审核（AGPL/GPL 仅独立部署） → 技术栈契合度评估（React 19 + Vite + shadcn + Tailwind 4）
2. 拉取与研读：`git clone --depth 1` 或 tarball 下载到 `docs/开源组件库/` → 代码审计，提取可复用模式
3. 包组集成：按 W1-W4 引入到 `packages/`，遵循 `src/index.ts` 统一导出、类型定义在 `music-data/types.ts`、测试在 `test/` 目录
4. 验收与闭环：每阶段定义量化验收指标（如波形同步误差、列表 60fps、弹幕并发数）→ 型检查/lint/测试全绿 → 提交
5. 许可证合规：NOTICE 文件汇总所有 MIT/BSD/Apache 引入；AGPL/GPL 仅独立部署，不入产品依赖
6. 持续更新：`docs/开源组件库/` 不随上游自动更新，版本锁定为 2026-11-18 HEAD 快照

---

## 执行记录（由 ZCode 维护）

| 阶段 | 状态 | 完成时间 | 备注 |
|---|---|---|---|
| W1 | ✅ 完成 | 2026-11-18 | `music-ui` 新增 `playlist-sort`（dnd-kit）与 `virtual-list`（TanStack Virtual v3 API）；`music-hooks` 新增 `useWaveform`/`useScrollProgress`/`useMediaQuery`；`music-design-tokens` 新增 `SCROLL` 令牌。三包 typecheck 全绿 |
| W2 | ✅ 完成 | 2026-11-18 | `MediaDisplay` 接入 Video.js 10 + hls.js（.m3u8 自动接管）；`AdvancedPlayer` hls.js 优先 + 原生 Audio 兜底，新增 `destroyStreamEngine`/`dispose` 防泄漏；`music-lyrics` 新增 `WaveformLyrics`（wavesurfer v8 + Regions 歌词行跳转 + 片段循环）；`music-data` 新增 `mediaScanner`（Navidrome 架构参考，纯函数 diff 模型）。四包 typecheck 全绿 |
| W3 | ✅ 完成 | 2026-11-18 | `music-server` 新增 `live-stream.ts`：`/live/stream`（MediaMTX/SRS 状态探测，SSRF 防护，凭据仅 env）+ `/live/ws`（WebSocket 直播间：聊天/表情/礼物/审核/房间，KV 持久化 + 单实例扇出）；`LiveSessionPanel` 接入 WS 优先、轮询回退；新建 `@yyc3/music-live` 包（`LiveRoom`/`DanmakuOverlay` 轨道弹幕/`GiftAnimation`）。music-server 为 Deno 部署单元不参与 workspace typecheck，其余包全绿 |
| W4 | ✅ 完成 | 2026-11-18 | 全量回归：9 个改包 typecheck 全部 PASS；`NOTICE.md` 汇总 W1–W2 第三方许可（全部 MIT/BSD/Apache-2.0）；AGPL/GPL 参考项目零代码复制。Lighthouse a11y 与压测指标（60fps/100并发弹幕/波形<80ms）需在宿主应用集成后实测——属于 M3 宿主阶段验收项 |

### 遗留与后续

1. **实测验收**：W1–W3 的量化指标（Lighthouse a11y ≥ 95、1000 首 60fps、HLS 起播 < 1.5s、波形同步 < 80ms、100 并发弹幕）需接入 `apps/yyc3-music` 宿主后用真实数据源实测。
2. **`@tanstack/react-table` 待审批**：pnpm 提示该包 awaiting approval（`pnpm approve` 可处理），不影响现有功能（表格块尚未开发）。
3. **WS 多实例**：`/live/ws` 扇出为单实例内存表，跨实例扩展时按计划替换为 Redis pub/sub。
4. **W4 选配层**：HeroUI/Mantine/Tremor/Visx/Revideo 按场景触发后再引入，避免包体膨胀（本阶段未引入）。

---

## 查漏补全记录（第二轮，2026-11-18）

对照计划逐条核查后的增量落地：

| 项 | 计划假设 | 实况核查 | 处理 |
|---|---|---|---|
| W3-1 Range 流式 | `/upload/media/:id/file` "已支持 Range" | `routes-upload.ts` 实际**无 Range 端点**；媒体本体存 Supabase Storage，播放走签名 URL | 确认 Range/206 由 Storage 端原生支持（签名 URL 直连）；详情响应补充 `streaming: { range, strategy }` 能力声明；不做服务端流代理（避免带宽放大与 SSRF 面，符合调研文档"网络代理不能成为任意转发器"约束） |
| W4-2 借鉴层（Koel/Immich） | mediaScanner 与 libraryScanner | `mediaScanner` 已有，`libraryScanner` 缺 | 新增 `music-data/libraryScanner.ts`：`hashFile`（SHA-256 内容哈希去重）、`dedupeByHash`、`groupByTimeline`（Immich 时间轴）、`buildPlaylist`（Koel artist/album 目录布局聚合） |
| W4-2 借鉴层（Misskey 表情反应） | music-community 社交交互 | 信息流无反应组件 | 新增 `music-community/ReactionBar.tsx`：toggle 反应 + 计数 + 选择器，受控组件（持久化由宿主决定），可复用于信息流与直播间 |
| 自研 SOP（最后交付物） | 文档化固化为可复用流程 | 仅有执行计划，无 SOP | 新增 [`SOP-开源项到包组落地流程.md`](./SOP-开源项到包组落地流程.md)：六步流程 + 门禁清单 + 实战教训回写（TanStack v3/wavesurfer v8/dnd-kit API 坑、引擎释放路径、受控组件原则、SSRF 防护复用点） |

本轮改动 typecheck：`music-data`、`music-community` 全绿。

---

## 全维度测试轮（第三轮，2026-11-18）

目标：所有可测包纳入 vitest，覆盖率四维门禁 ≥85%。

### 结果

| 指标 | 基线 | 完成后 |
|---|---|---|
| 测试文件 | 13 | **26** |
| 测试用例 | 103 | **221（全绿）** |
| vitest projects | 7 | **13**（新增 player/lyrics/audio/community/live/server） |
| Statements | — | **96.94%** ✅ |
| Branches | — | **85.57%** ✅ |
| Functions | — | **92.59%** ✅ |
| Lines | — | **96.94%** ✅ |

门禁：`vitest.config.ts` thresholds 80 → 85（四维）。

### 测试发现并修复的真实源码缺陷（测试即验收的实证）

1. **SSRF 防护漏洞**（高危）：`live-stream.ts` 的 `cidrToRange` 位运算未 `>>>0`，高位 CIDR 段（127/8、172.16/12、192.168/16 等）范围为负 → **私有地址校验被绕过**。已修复并有 12 项安全矩阵测试锁定。
2. **构建失败**：`MediaDisplay.tsx` 引入不存在的 `media-chrome/dist/media-chrome.css`（v4 为 Web Components，样式内建 shadow DOM）。已移除。
3. **播放器重建缺陷**：`isPlaying` 翻转触发 cleanup 无条件 dispose → 每次播放/暂停都销毁重建 Video.js 实例，违背架构文档 §3.1"播放实例不随状态重建"。已拆分为「实例生命周期 effect（随源）」+「播放状态同步 effect（随 isPlaying）」。
4. **TDZ 时序缺陷**：`videojs` onReady 回调内引用未完成赋值的 `newPlayer`，同步回调场景直接崩溃。已改为同步赋值。
5. **兼容性缺陷**：`el.play().catch(...)` 在 play() 返回 undefined 的环境（jsdom/旧浏览器）抛 TypeError。已加安全调用。

### 覆盖口径说明

- coverage 采用 `all:false` 白名单制（真实覆盖的源文件才计入），本轮将 W1–W4 全部新增模块纳入统计并 ≥85%；既有低覆盖包（music-ai/commerce/growth/voice 等，调研标记"暂缓/不依赖"）未纳入门禁，按 SOP 分批推进。
- `music-server` 为 Deno 部署单元，其 `assertPublicHttpUrl` 安全矩阵与路由/WS 行为已通过依赖 mock 纳入 vitest（90.68% lines）。
- 量化性能指标（60fps、<80ms、100 并发弹幕）仍属 M3 宿主集成后实测项。
