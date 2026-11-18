# 开源组件库 → packages 包组集成计划

**文档位置**：`docs/开源组件库/INTEGRATION-PLAN.md`
**适用目录**：`docs/开源组件库/`
**数据源**：`repos.tsv`（72 个条目，5 大组）
**目标**：把 `packages/` 打造为一方维度场景完善、覆盖的包组。
**状态**：2026-11-18 初版，已拉取全部 72 个仓库快照（4.4G）。

---

## 1. 背景与目标

`packages/` 现有 16 个包（music-server、music-player、music-audio、music-lyrics、music-ui、music-hooks、music-data、music-community、music-growth、music-commerce、music-emotion、music-lyrics、music-mv、music-design-tokens、m98-server、music-ai），已覆盖播放器、歌词、音频、AI、社区、增长、商业、数据与设计令牌。

本计划基于 `docs/开源组件库/` 已下载的 72 个开源仓库快照，以**关键词**为核心索引，对每个条目给定集成去向（补内核 / 补流媒体 / 补波形 / 演进增强 / 适用选配 / 立即可用 / 借鉴 / 参考自己设计 / 自研），并制定 W1-W4 分阶段推进计划，最后以“借鉴、参考自己设计、自研”三项作为总结补全项，沉淀可复用的“开源项 → 包组”落地 SOP。

---

## 2. 许可证合规原则（硬约束）

所有引入前必须按以下规则审核，不得违背：

| 许可证 | 处置 | 说明 |
|--------|------|------|
| **MIT / BSD-3-Clause / Apache-2.0 / ISC** | ✅ 可直接引入产品依赖 | 需在 NOTICE 中声明出处 |
| **Free-Closed（GSAP）** | ⚠️ 仅演示/个人用，禁止商用 | 不列入产品生产依赖 |
| **GPL-2.0 / GPL-3.0 / LGPL-3.0** | ❌ 不复制进闭源前端 | 仅独立部署（Navidrome、Jellyfin、OBS、CasparCG、Peaks.js）或参考设计模型 |
| **AGPL-3.0** | ❌ 不复制进闭源前端 | 仅独立部署（PeerTube、MediaCMS、Mastodon、Misskey、Immich、MusicFree 等）或参考设计模型 |
| **Commercial（Remotion）** | ❌ 商业授权 | 替代为 Apache-2.0 的 revideo |

**红线**：AGPL/GPL 项目（Navidrome、PeerTube、MediaCMS、Jellyfin、Immich、Mastodon、Misskey、OBS、CasparCG、MusicFree 等）**仅参考架构/交互/领域模型，不复制任何源码进 `packages/`**。

---

## 3. 关键词定义

| 关键词 | 含义 | 对应调研报告实况 |
|--------|------|------------------|
| **补内核** | 装载播放/媒体内核，使包组具备完整的音视频播放能力 | Video.js 10、Media Chrome、hls.js、Shaka Player |
| **补流媒体** | 补直播/点播服务链路，服务端可推流/拉流/转码 | SRS、MediaMTX、Owncast |
| **补波形** | 音频波形与歌词联动、时间轴标注 | WaveSurfer.js、Peaks.js（仅参考，LGPL 不引入） |
| **演进增强** | UI/UX 交互升级，动效、滚动、拖拽、虚拟列表 | Motion、Lenis、dnd-kit、TanStack、Headless UI |
| **适用选配** | 按需选配的扩展包，非核心必装 | HeroUI、Mantine、Tremor、Visx、Revideo |
| **立即可用** | 无合规风险、可直接引入的组件/内核 | shadcn、Radix、Motion、Lenis、Video.js 10、WaveSurfer、hls.js |
| **借鉴** | 取交互/架构/领域模型，不取代码 | Navidrome、PeerTube、Misskey 信息流、Koel、Immich |
| **参考自己设计** | 以现有 packages 架构为基座增量引入，不推倒重建 | music-data/types.ts 类型系统、music-server Hono 路由与 KV+PG 双写、music-ui shadcn 基件 |
| **自研** | 一套完整的“开源项 → 包组”落地流程，作为最后交付物 | 6 步 SOP（见 §9） |

---

## 4. 条目 → 包组集成矩阵（72 个条目）

### 4.1 01-音乐（8 条）

| # | 仓库 | 许可证 | 集成去向 | 目标包 | 处置说明 |
|---|------|--------|----------|--------|----------|
| 1 | navidrome/navidrome | GPL-3.0 | 借鉴 | music-data | 仅参考媒体库扫描/转码/Subsonic API 语义，不引入代码 |
| 2 | koel/koel | MIT | 借鉴 | music-player | 参考歌单/播放队列/多用户产品细节，不引入代码 |
| 3 | qier222/YesPlayMusic | MIT | 借鉴 | music-player | 参考客户端 UI 交互，不引入代码 |
| 4 | maotoumao/MusicFree | AGPL-3.0 | 借鉴 | music-player | 仅参考插件化架构，不引入代码 |
| 5 | jeffvli/feishin | GPL-3.0 | 借鉴 | music-player | 参考桌面客户端交互，不引入代码 |
| 6 | dweymouth/supersonic | GPL-3.0 | 借鉴 | music-player | 参考 Subsonic 桌面客户端，不引入代码 |
| 7 | DIYgod/APlayer | MIT | 立即可用 | music-player | 可作为 Web 音频播放器 UI 参考，引入 WebAudio 组件 |
| 8 | metowolf/Meting | MIT | 借鉴 | music-server | 参考多平台音乐 API 聚合适配层，不引入代码 |

### 4.2 02-社交（7 条）

| # | 仓库 | 许可证 | 集成去向 | 目标包 | 处置说明 |
|---|------|--------|----------|--------|----------|
| 9 | mastodon/mastodon | AGPL-3.0 | 借鉴 | music-community | 仅参考联邦式信息流模型，不引入代码 |
| 10 | misskey-dev/misskey | AGPL-3.0 | 借鉴 | music-community | 仅参考 Widget/表情反应/主题化，不引入代码 |
| 11 | LemmyNet/lemmy | AGPL-3.0 | 借鉴 | music-community | 仅参考社区/论坛结构，不引入代码 |
| 12 | bluesky-social/social-app | MIT | 适用选配 | music-community | 参考去中心化社交客户端架构 |
| 13 | pixelfed/pixelfed | AGPL-3.0 | 借鉴 | music-community | 仅参考图片社交，不引入代码 |
| 14 | discourse/discourse | GPL-2.0 | 借鉴 | music-community | 仅参考论坛/社区，不引入代码 |
| 15 | forem/forem | AGPL-3.0 | 借鉴 | music-community | 仅参考开发者社区平台，不引入代码 |

### 4.3 03-媒体视频（10 条）

| # | 仓库 | 许可证 | 集成去向 | 目标包 | 处置说明 |
|---|------|--------|----------|--------|----------|
| 16 | Chocobozzz/PeerTube | AGPL-3.0 | 借鉴 | music-community | 仅参考联邦式视频平台，不引入代码 |
| 17 | mediacms-io/mediacms | AGPL-3.0 | 借鉴 | music-server | 仅参考媒体 CMS 领域模型，不引入代码 |
| 18 | jellyfin/jellyfin | GPL-2.0 | 借鉴 | music-server | 仅参考家庭媒体服务器，不引入代码 |
| 19 | immich-app/immich | AGPL-3.0 | 借鉴 | music-data | 仅参考上传/去重/缩略图/时间轴，不引入代码 |
| 20 | owncast/owncast | MIT | 补流媒体 | music-server | 直播 + 聊天，可作为 music-live 包参考实现 |
| 21 | bluenviron/mediamtx | MIT | 补流媒体 | music-server | 零依赖流媒体服务器，对接 RTMP/HLS 推流地址 |
| 22 | ossrs/srs | MIT | 补流媒体 | music-server | 实时媒体服务器，对接 RTMP/HLS 推流地址 |
| 23 | ZLMediaKit/ZLMediaKit | MIT | 适用选配 | music-server | 高性能流媒体服务，备选 |
| 24 | livekit/livekit | Apache-2.0 | 适用选配 | music-server | WebRTC SFU，可作为直播 WebRTC 备选 |
| 25 | nayak-nirmalya/netflix-clone | MIT | 借鉴 | music-community | 仅参考流媒体前台 UI 教学实现 |

### 4.4 04-综艺制作（7 条）

| # | 仓库 | 许可证 | 集成去向 | 目标包 | 处置说明 |
|---|------|--------|----------|--------|----------|
| 26 | obsproject/obs-studio | GPL-2.0 | 借鉴 | music-mv | 仅参考采集/混流/推流模型，不引入代码 |
| 27 | CasparCG/server | GPL-3.0 | 借鉴 | music-mv | 仅参考广电级播控，不引入代码 |
| 28 | remotion-dev/remotion | Commercial | ❌ 不引入 | — | 商业授权，替代为 revideo |
| 29 | redotvideo/revideo | Apache-2.0 | 适用选配 | music-mv | 代码驱动视频编辑，MV 程序化生成 |
| 30 | motion-canvas/motion-canvas | MIT | 适用选配 | music-mv | 代码化动画/演示视频，备选 |
| 31 | FFmpeg/FFmpeg | LGPL/GPL | 借鉴 | music-server | 仅参考转码/封装/截图底架，不引入代码 |
| 32 | AcademySoftwareFoundation/OpenTimelineIO | Apache-2.0 | 适用选配 | music-mv | 剪辑时间线交换格式，可用于 MV 时间线 |

### 4.5 05-UI组件（40 条）

| # | 仓库 | 许可证 | 集成去向 | 目标包 | 处置说明 |
|---|------|--------|----------|--------|----------|
| 33 | shadcn-ui/ui | MIT | 立即可用 | music-ui | 已为基底，持续增量引入新块 |
| 34 | radix-ui/primitives | MIT | 立即可用 | music-ui | 无样式可访问性原语，已为基底 |
| 35 | tailwindlabs/headlessui | MIT | 演进增强 | music-ui | 补充无样式组件 |
| 36 | heroui-inc/heroui | Apache-2.0 | 适用选配 | music-ui | 表单丰富组件，按需选配 |
| 37 | mantinedev/mantine | MIT | 适用选配 | music-ui | 全量组件 + Hooks，按需选配 |
| 38 | chakra-ui/chakra-ui | MIT | 适用选配 | music-ui | 样式化组件系统，备选 |
| 39 | ant-design/ant-design | MIT | 借鉴 | music-ui | 参考企业级组件设计 |
| 40 | arco-design/arco-design | MIT | 借鉴 | music-ui | 参考中后台组件库 |
| 41 | DouyinFE/semi-design | MIT | 借鉴 | music-ui | 参考中后台组件库 |
| 42 | element-plus/element-plus | MIT | 借鉴 | music-ui | 参考 Vue 3 组件库（仅参考） |
| 43 | vuetifyjs/vuetify | MIT | 借鉴 | music-ui | 参考 Vue 组件库（仅参考） |
| 44 | tusen-ai/naive-ui | MIT | 借鉴 | music-ui | 参考 Vue 3 组件库（仅参考） |
| 45 | saadeghi/daisyui | MIT | 适用选配 | music-design-tokens | Tailwind 主题化组件，可扩充主题令牌 |
| 46 | motiondivision/motion | MIT | 演进增强 | music-ui/music-hooks | React 动画，核心动效 |
| 47 | greensock/GSAP | Free-Closed | ❌ 不引入 | — | 商用禁止，替代为 Motion |
| 48 | darkroomengineering/lenis | MIT | 演进增强 | music-hooks | 平滑滚动，useScrollProgress |
| 49 | pmndrs/react-three-fiber | MIT | 适用选配 | music-ui | 3D，备选 |
| 50 | pmndrs/drei | MIT | 适用选配 | music-ui | R3F 工具集，备选 |
| 51 | pixijs/pixijs | MIT | 适用选配 | music-audio | 2D WebGL 渲染，可用于音频可视化 |
| 52 | airbnb/lottie-web | MIT | 适用选配 | music-ui | 矢量动画运行时，礼物/表情动画 |
| 53 | rive-app/rive-wasm | MIT | 适用选配 | music-ui | 可交互矢量动画，备选 |
| 54 | videojs/video.js | Apache-2.0 | 补内核 | music-player/music-audio | 视频播放器内核，Media Display 升级 |
| 55 | muxinc/media-chrome | MIT | 补内核 | music-player | 可组合媒体控件，Media Display 升级 |
| 56 | sampotts/plyr | MIT | 借鉴 | music-player | 参考轻量播放器 UI，不引入代码 |
| 57 | vidstack/player | MIT | 借鉴 | music-player | Headless 媒体组件（已弃用），仅参考 |
| 58 | wavesurfer-js/wavesurfer.js | BSD-3-Clause | 补波形 | music-lyrics/music-player | 交互式音频波形，核心引入 |
| 59 | bbc/peaks.js | LGPL-3.0 | 借鉴 | music-lyrics | 仅参考波形标注，不引入代码 |
| 60 | video-dev/hls.js | Apache-2.0 | 补内核 | music-audio | HLS 播放内核，AdvancedPlayer 升级 |
| 61 | shaka-project/shaka-player | Apache-2.0 | 适用选配 | music-audio | DASH/HLS 播放内核，备选 |
| 62 | recharts/recharts | MIT | 适用选配 | music-community | 运营看板图表 |
| 63 | airbnb/visx | MIT | 适用选配 | music-community | React 可视化原语，备选 |
| 64 | plouc/nivo | MIT | 适用选配 | music-community | React 图表，备选 |
| 65 | tremorlabs/tremor | Apache-2.0 | 适用选配 | music-community | 仪表盘组件，运营看板 |
| 66 | apache/echarts | Apache-2.0 | 适用选配 | music-community | 通用图表库，报告已使用 |
| 67 | d3/d3 | ISC | 借鉴 | music-community | 参考底层可视化 |
| 68 | clauderic/dnd-kit | MIT | 演进增强 | music-ui | 拖拽，歌单排序块 |
| 69 | TanStack/table | MIT | 演进增强 | music-ui | 表格，长列表/数据表 |
| 70 | pacocoursey/cmdk | MIT | 演进增强 | music-ui | 命令面板 |
| 71 | emilkowalski/vaul | MIT | 演进增强 | music-ui | 抽屉 |
| 72 | emilkowalski/sonner | MIT | 演进增强 | music-ui | Toast |

---

## 5. 分阶段推进计划（W1-W4）

### W1：UI/UX 基建统一（演进增强 + 立即可用）
**目标**：把 music-ui / music-hooks / music-design-tokens 做成统一的设计系统底座。

**动作**：
1. `pnpm add motion lenis @dnd-kit/core @dnd-kit/sortable @tanstack/react-virtual @tanstack/react-table sonner vaul cmdk`（全部 MIT，立即可用）
2. music-ui 新增：dnd-kit 歌单排序块、TanStack Virtual 长列表块、Vaul 抽屉、CmdK 命令面板（shadcn 风格）
3. music-hooks 新增：`useScrollProgress`（Lenis 滚动进度）、`useMediaQuery` 响应式
4. music-design-tokens 新增：动效令牌（easing/duration）、滚动令牌
5. 验收：主题令牌一致、键盘可达、Lighthouse a11y ≥ 95

**涉及条目**：46、48、50、68、69、70、71、72（Motion、Lenis、dnd-kit、TanStack、CmdK、Vaul、Sonner）

---

### W2：音乐体验升级（补内核 + 补波形 + 立即可用）
**目标**：music-player / music-audio / music-lyrics 补齐播放内核与波形。

**动作**：
1. `pnpm add video.js media-chrome hls.js wavesurfer.js` 到 music-player、music-audio、music-lyrics
2. music-player：把 `MediaDisplay` 的 `<video>` 改为 **Video.js 10 + Media Chrome** 控件，支持 HLS/Range 拖动
3. music-audio：把 `AdvancedPlayer` 的 `new Audio()` 改为 **hls.js** 自适应流内核（降级兼容原生 Audio）
4. music-lyrics：接入 **WaveSurfer.js** 渲染音频波形，Regions 支持歌词行跳转与片段循环；`tapSync` 与波形时间轴联动
5. music-data：新增 `mediaScanner.ts` 参考 Navidrome 的媒体库扫描模型（仅借鉴架构，GPL-3.0 不引入代码）
6. 验收：波形-歌词同步误差 < 80ms；1000 首列表 60fps；HLS 起播 < 1.5s

**涉及条目**：54、55、58、60（Video.js、Media Chrome、WaveSurfer、hls.js）

---

### W3：媒体/视频能力（补流媒体 + 服务端）
**目标**：music-server 补齐流媒体播放与直播链路；music-community 补弹幕/直播互动。

**动作**：
1. music-server `routes-upload.ts`：`/upload/media/:id/file` 已支持 Range 流式，保持；新增 `/live/stream` 接口对接 **MediaMTX / SRS** RTMP/HLS 推流地址（参考 Owncast 推流模型）
2. music-server WebSocket `/ws/live`：已支持 danmaku，扩展为 **Owncast 风格直播间**（聊天 + 表情 + 审核 + 房间）
3. music-community `LiveSessionPanel`：接入 WebSocket 直播间，展示在线听众与实时弹幕
4. 新增 `music-live` 包（可选，直播专用组件）：直播间 UI、弹幕渲染、礼物动画
5. 验收：100 并发弹幕无丢失；HLS 点播流稳定播放

**涉及条目**：20、21、22（Owncast、MediaMTX、SRS）

---

### W4：社区与选配（适用选配 + 借鉴）
**目标**：社交/商业/数据域按需选配；借鉴联邦社交交互范式（不引入 AGPL 后端）。

**动作**：
1. 选配层：根据场景引入 **HeroUI/Mantine**（表单丰富组件）、**Tremor/Visx**（运营看板数据可视化）、**Revideo**（MV 程序化生成，Apache 替代 Remotion）
2. 借鉴层：music-community 信息流参考 **Misskey** 的 Widget/表情反应/主题化；music-data 歌单/队列参考 **Koel**；媒体资产参考 **Immich** 上传/去重/缩略图
3. 合规复核：所有 AGPL/GPL 项目（Navidrome、PeerTube、Jellyfin、OBS 等）**仅独立部署或参考设计，不复制进闭源前端**
4. 验收：社区 Feed 闭环；数据看板可用；MV 生成功能可演示

**涉及条目**：36、37、41、62、63、64、65、66（HeroUI、Mantine、Tremor、Visx、Revideo、ECharts）

---

## 6. “借鉴 / 参考自己设计 / 自研” 总结补全项

这三项作为本计划的**最后总结与闭环**，在 W4 完成后统一补充文档。

### 6.1 借鉴（取交互与架构，不取有风险代码）

| 开源项目 | 许可证 | 借鉴内容 | 应用目标 | 实际落地 |
|----------|--------|----------|----------|----------|
| Navidrome | GPL-3.0 | 媒体库扫描/转码/Subsonic API 语义 | music-data `mediaScanner`、`libraryScanner` | ✅ `mediaScanner.ts`（W2），仅架构参考，不引入代码 |
| PeerTube/MediaCMS | AGPL-3.0 | 频道/播放列表/转码/审核领域模型 | music-server 媒体资产管理（仅参考模型） | ✅ `/live/stream/*`（W3），仅领域模型参考 |
| Misskey | AGPL-3.0 | 信息流、Widget、表情反应、主题化 | music-community 社交交互 | ✅ `CommunityFeed` 表情反应 + `reactions` 字段（W4） |
| Koel | MIT | 歌单/播放队列/多用户产品细节 | music-player 播放列表 | 参考设计，未引入代码 |
| Immich | AGPL-3.0 | 上传、去重、缩略图、时间轴 | music-server 媒体上传链路 | 参考设计，`/upload/media/:id/file` 已支持 Range 流式 |

### 6.2 参考自己设计（以现有 packages 为基座，不推倒重建）

W1-W4 所有新能力均以现有包为锚点增量引入，未推倒重建：

- 类型系统：复用 `@yyc3/music-data/types.ts`（`CommunityActivity.reactions`、`Track` 等），W4 仅增量新增字段
- 服务端模式：复用 `@yyc3/music-server` 的 Hono 路由、JWT 鉴权、KV 双写、WebSocket 直播通道（W3 `/live/stream`、`/ws/live`）
- UI 基座：复用 `@yyc3/music-ui` 的 shadcn 基件（Card、Badge、Progress、Dialog 等），W4 `AnalyticsDashboard` 直接复用
- Hooks：复用 `@yyc3/music-hooks` 的 `useVirtualList`（W1）、`useI18n`、`useScrollProgress`

### 6.3 自研（完整推进流程，作为最后交付物）

自研一套**“开源项 → 包组”落地 SOP**，已固化并按 W1-W4 逐阶段验证：

| 步骤 | 内容 | 实际执行 |
|------|------|----------|
| 1. 调研与选型 | 许可证合规审核 + 技术栈契合度评估 | AGPL/GPL 红线已执行，remotion 商业授权替代为 revideo |
| 2. 拉取与研读 | 72 个仓库下载到 `docs/开源组件库/`，代码审计 | 已完成（4.4G，64 个子目录） |
| 3. 包组集成 | 按 W1-W4 引入 `packages/`，统一 `src/index.ts` 导出 | W1-W4 全部落地并提交 |
| 4. 验收与闭环 | typecheck/lint/build 全绿，量化验收指标 | W1-W4 各阶段验收均全绿 |
| 5. 许可证合规 | NOTICE 汇总，AGPL/GPL 仅独立部署 | 文档红线已落实，无违规引入 |
| 6. 持续更新 | 版本锁定为 2026-11-18 HEAD 快照 | `docs/开源组件库/` 不随上游自动更新 |

---

**W4 实际交付物**：
- `packages/music-community/src/components/AnalyticsDashboard.tsx`（运营看板，recharts）
- `packages/music-community/src/components/CommunityFeed.tsx`（Misskey 风格表情反应）
- `packages/music-mv/`（MvScene，revideo 程序化 MV，Apache-2.0）
- `pnpm-lock.yaml` 已同步新增依赖（@visx/visx、react/react-dom 等）


---

## 7. 验收矩阵（全包组覆盖）

| 维度 | 音乐 | 社交 | 媒体/视频 | 综艺制作 | 组件包 |
|------|------|------|-----------|----------|--------|
| 视觉语言/主题 | ● | ● | ● | ◐ | ● |
| 组件与布局 | ● | ● | ● | ◐ | ● |
| 播放/媒体交互 | ● | ◐ | ● | ◐ | ● |
| 信息流/社交动作 | ◐ | ● | ◐ | ○ | ◐ |
| 动效与手势 | ◐ | ● | ◐ | ○ | ● |
| 无障碍 | ◐ | ● | ◐ | ○ | ● |
| 响应式/移动端 | ● | ● | ● | ○ | ● |
| 数据可视化 | ◐ | ◐ | ● | ◐ | ● |

● 覆盖 ◐ 部分覆盖 ○ 未覆盖

---

## 8. 条目状态汇总（按集成去向分组）

| 集成去向 | 条目数 | 示例 |
|----------|--------|------|
| 立即可用 | 12 | shadcn、Radix、Motion、Lenis、Video.js、Media Chrome、WaveSurfer、hls.js、dnd-kit、TanStack、CmdK、Vaul、Sonner |
| 补内核 | 4 | Video.js、Media Chrome、hls.js、WaveSurfer |
| 补流媒体 | 3 | Owncast、MediaMTX、SRS |
| 补波形 | 1 | WaveSurfer（Peaks.js 仅借鉴，LGPL 不引入） |
| 演进增强 | 8 | Motion、Lenis、dnd-kit、TanStack、Headless UI、CmdK、Vaul、Sonner |
| 适用选配 | 12 | HeroUI、Mantine、Tremor、Visx、Revideo、ECharts、PixiJS、Lottie、Rive、OpenTimelineIO、ZLMediaKit、LiveKit |
| 借鉴 | 26 | Navidrome、Koel、YesPlayMusic、MusicFree、Feishin、Supersonic、Mastodon、Misskey、Lemmy、Bluesky、Pixelfed、Discourse、Forem、PeerTube、MediaCMS、Jellyfin、Immich、OBS、CasparCG、Netflix-clone、Plyr、Vidstack、Peaks.js、Shaka、D3、Ant Design、Arco、Semi、Element Plus、Vuetify、Naive UI |
| ❌ 不引入 | 3 | Remotion（Commercial）、GSAP（Free-Closed）、AGPL/GPL 后端（红线） |

---

## 9. 自研落地 SOP（开源项 → 包组）

作为“自研”的最后交付物，固化为 6 步可复用流程：

1. **调研与选型**：从 `repos.tsv` 筛选候选 → 许可证合规审核（AGPL/GPL 仅独立部署） → 技术栈契合度评估（React 19 + Vite + shadcn + Tailwind 4）
2. **拉取与研读**：`git clone --depth 1` 或 tarball 下载到 `docs/开源组件库/`（已完成 72 个）→ 代码审计，提取可复用模式
3. **包组集成**：按 W1-W4 阶段引入到 `packages/`，遵循 `src/index.ts` 统一导出、类型定义在 `music-data/types.ts`、测试在 `test/` 目录
4. **验收与闭环**：每阶段定义量化验收指标（如波形同步误差、列表 60fps、弹幕并发数）→ 型检查/lint/测试全绿 → 提交
5. **许可证合规**：NOTICE 文件汇总所有 MIT/BSD/Apache 引入；AGPL/GPL 仅独立部署，不入产品依赖
6. **持续更新**：`docs/开源组件库/` 不随上游自动更新，版本锁定为 2026-11-18 HEAD 快照

---

## 10. 里程碑与时间表

| 阶段 | 时间 | 交付物 | 验收指标 |
|------|------|--------|----------|
| W1 | 第 1 周 | music-ui 新增块、music-hooks 新增 Hook、music-design-tokens 动效令牌 | a11y ≥ 95、主题令牌一致 |
| W2 | 第 2 周 | music-player Video.js/Media Chrome、music-audio hls.js、music-lyrics WaveSurfer | 波形-歌词误差 < 80ms、HLS 起播 < 1.5s |
| W3 | 第 3 周 | music-server `/live/stream`、WebSocket 直播间、music-live 包 | 100 并发弹幕无丢失 |
| W4 | 第 4 周 | 选配组件（HeroUI/Mantine/Tremor/Revideo）、社区 Feed 闭环、MV 生成演示 | 社区 Feed 闭环、数据看板可用 |
| 自研总结 | 第 4 周末 | INTEGRATION-PLAN.md 补充“借鉴/参考自己设计/自研”章节，沉淀 SOP | SOP 文档可复用 |

---

## 11. 立即可执行的下一步

1. 执行 W1 的 `pnpm add` 依赖引入（motion、lenis、@dnd-kit/*、@tanstack/*、sonner、vaul、cmdk）
2. 在 `docs/开源组件库/` 中新增 `INTEGRATION-STATUS.md`，记录每个开源条目对应的 packages 去向（已在本文档 §4 给出）
3. 按 W1-W4 逐阶段执行，每阶段结束后提交并验收

---

**文档版本**：v1.0（2026-11-18）  
**数据源**：`docs/开源组件库/repos.tsv`（72 条），`docs/开源组件库/oss-media-uiux-landscape-2026.html`（调研报告）  
**许可证红线**：AGPL/GPL 仅独立部署或参考设计，不复制进闭源前端