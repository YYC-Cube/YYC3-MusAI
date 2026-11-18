# YYC³ yyc3-music-monorepo 拆分规范对照审核报告与极致拆分规划（W5–W8）

> **_YYC³_**（YanYuCloudCube™ · 注册商标）_言启象限 | 语枢未来_

| 项 | 值 |
| --- | --- |
| 审核对象 | `01-音乐/yyc3-music-monorepo`（18 包 + 3 应用，本次范围仅该 monorepo） |
| 审核依据 | `docs/YYC3-项目组件-拆分规范/`（拆分原则 · 分类讲解 · 独立单元 · 存放利用 · 管理指南 · 复用指南） |
| 对齐基准 | 开源组件库五分类目录（01-音乐 / 02-社交 / 03-媒体视频 / 04-综艺制作 / 05-UI组件） |
| 审核日期 | 2026-11-18 |
| 结论 | **整体架构合格（monorepo/分层/turbo/changesets/CI 齐备），组件级拆分不合格（单一职责、可复用两条原则多项违规），已执行 W5 整改，W6–W8 规划见 §6** |

---

## 1. 现状快照（审核证据基线）

- 18 个包（`packages/`）+ 3 个应用（`apps/`：yyc3-music、m98-web、m98-admin）
- 包内源码 196 文件 / 约 55,600 行；应用 yyc3-music 另有 23 文件 / 约 7,088 行
- 依赖方向健康：utils ← hooks ← data → ui ← 业务包（无环）
- 测试：32 个 `*.test.*` 集中于各包 `test/`；根 vitest 13 project、覆盖率门禁 85%
- 基建：turbo ✓、changesets ✓、CI（ci.yml）✓、NOTICE.md ✓；Storybook ✗、ESLint/Prettier 配置 ✗、包级 README 仅 2/18 ✗

### 超长文件 TOP（单一职责违规重灾区）

| 文件 | 行数 | 问题 |
| --- | --- | --- |
| `apps/yyc3-music/src/app/App.tsx` | 2047 | 26 个组件级定义混装（应用层，P1） |
| `packages/music-data/src/types.ts` | 2021 | 全部类型集中一处（**W5 已拆**） |
| `packages/music-community/src/components/SpaceTimePanel.tsx` | 1692 | 面板不拆子组件（P1） |
| `packages/music-community/src/components/UploadPanel.tsx` | 1410 | 同上（P1） |
| `packages/music-ai/src/components/CreationStudio.tsx` | 1285 | 同上（P1） |
| `packages/music-ui/src/dmusic/DMusicUI.tsx` | 1184 | 19 个导出组件塞一个文件（**W5 已拆**） |

---

## 2. 对照拆分规范逐条审核结论

| # | 规范条款（出处） | 结论 | 证据 |
| --- | --- | --- | --- |
| 1 | 单一职责：每个组件只负责一个功能（拆分原则 §三大核心原则） | ❌ 多项违规 | DMusicUI.tsx 19 组件/文件；types.ts 2021 行；6 个 1200+ 行文件 |
| 2 | 可复用性：识别重复元素提取为可复用组件（同上） | ❌ 违规 | `cn` 双实现逐字符相同（`music-ui/src/ui/utils.ts` ≡ `music-voice/src/utils/cn.ts`）；clsx 在 8 包重复声明；player 三套并存 |
| 3 | 层次化：原子→分子→有机体→模板→页面（拆分原则 / 分类讲解） | ⚠️ 部分 | music-ui 已分「shadcn 原子/分子层 + dmusic 设计层」，但 dmusic 层未按五层落文件；业务包只有 components/ 一层，分子/有机体不分 |
| 4 | 独立单元可自治：自包含、不依赖外部全局状态（独立单元 §概念） | ⚠️ 部分 | 组件多为受控设计（好）；但 music-ui/music-community 大量 inline style + 依赖宿主 app 编译 Tailwind（`@source` 扫包），包不可独立呈现（P2） |
| 5 | 组件属性定义：必需/可选/默认值/类型验证（拆分原则 §四步流程） | ⚠️ 部分 | TS 类型完整；但 props 文档（JSDoc/Storybook）缺失 |
| 6 | 组件文档生成：描述/API/示例/最佳实践（同上；存放利用 §文档） | ❌ 违规 | 18 包仅 2 个 README；无组件文档、无 Storybook |
| 7 | 包内分层 components/hooks/utils/types（存放利用 §Monorepo 架构） | ❌ 多数违规 | 仅 music-emotion / music-voice / music-ui 有分层；music-audio(11)、music-hooks(13)、music-data(5)、music-server(23)、music-testing(5) 全平铺 |
| 8 | 包命名 @yyc3/*、SemVer、changesets（存放利用 §包管理） | ✅ 合规 | 18 包均 @yyc3/*；1.0.0（music-testing 0.1.1）；.changeset/config.json 在位 |
| 9 | 可独立发布（main/types/exports + publishConfig） | ✅ 基本合规 | 全部包有 exports/publishConfig；例外：music-server、m98-server 无 exports（Deno/Express 特例，见 #11） |
| 10 | 可独立测试（每包测试套件） | ⚠️ 部分 | 14/18 包有测试；music-ai / music-commerce / music-growth / music-voice 零测试 |
| 11 | 工具链一致（turbo 增量构建） | ⚠️ 特例 | music-server 为 Deno/Supabase Edge 风格（`npm:hono`、入口 .tsx），游离于 pnpm/turbo 工具链外——架构特例需显式豁免并文档化，而非默认容忍 |
| 12 | 依赖管理：类型正确、版本收敛（存放利用 §依赖） | ⚠️ 部分 | clsx 版本三种写法（2.1.1 / ^2.1.1）；tailwind-merge 两处；music-utils 以 peerDep(optional) 声 react 可取 |

---

## 3. 问题分级与整改路线

### P0 — 破坏复用的结构性问题（W5，本次已执行）

| 编号 | 问题 | 整改 | 状态 |
| --- | --- | --- | --- |
| P0-1 | `cn` 双实现、clsx/tailwind-merge 重复声明 | 唯一实现沉淀 `music-utils/src/cn.ts` 并入 index 导出；`music-ui/src/ui/utils.ts`、`music-voice/src/utils/cn.ts` 改为 re-export 兼容层；music-ui 移除 tailwind-merge、music-voice 移除 clsx/tailwind-merge，均新增 `@yyc3/music-utils: workspace:*` | ✅ 已完成 |
| P0-2 | DMusicUI.tsx 19 组件/1184 行 | 拆为 `dmusic/ui/` 单组件文件 + `shared.ts`，DMusicUI.tsx 降级为纯 barrel，公开导出名集合不变（index.ts / DMusicShowcase.tsx 零改动） | ✅ 已完成（见 §4.2） |
| P0-3 | music-data/types.ts 2021 行 | 按领域拆为 `src/types/` 域文件 + barrel，导出名集合不变 | ✅ 已完成（见 §4.3） |
| P0-4 | pnpm 12 构建脚本审批悬置（install 报 ERR_PNPM_IGNORED_BUILDS） | `pnpm-workspace.yaml` 改用 pnpm 12 规范键 `allowBuilds`：原生构建必需项（sqlite3/@parcel/watcher/esbuild/@tailwindcss/oxide/turbo）= true；core-js*（募资提示）与 @scarf/scarf（上游遥测）= false 显式拒绝 | ✅ 已完成 |

### P1 — 违反单一职责的大型文件（W6）

| 编号 | 对象 | 动作 |
| --- | --- | --- |
| P1-1 | `SpaceTimePanel.tsx`(1692) / `UploadPanel.tsx`(1410) | 拆子组件文件（每个 ≤300 行），面板降为有机体组装层；受控 props 不变 |
| P1-2 | `CreationStudio.tsx`(1285) | 拆 步骤面板/表单块/预览器 三类子组件 |
| P1-3 | `apps/yyc3-music/src/app/App.tsx`(2047) | 26 个组件级定义外移 `src/app/components/`；lazy 路由表抽 `routes.lazy.ts`；内联 demo 数据移 `src/mocks/` |
| P1-4 | player 三套并存 | 定位声明写入两包 README：`music-audio`＝引擎层（Audio/HLS/资源）、`music-player`＝UI 展示层；`m98-web` 的 MusicPlayer 标记 deprecated 并指向 music-player |
| P1-5 | waveform/virtual-list 语义撞名 | `useWaveform`（自研采样）与 `WaveformLyrics`（wavesurfer）在 JSDoc 互相标注适用场景；`useVirtualList` 渐进渲染与 `VirtualList` 全虚拟化同理 |

### P2 — 结构收敛与发布就绪（W7–W8）

| 编号 | 对象 | 动作 |
| --- | --- | --- |
| P2-1 | 平铺包分层 | music-hooks → `hooks/`（按 媒体/交互/环境/i18n 分域）；music-audio → `engines/ + ui/`；music-server → `routes/ + services/`（入 turbo typecheck 或显式豁免） |
| P2-2 | music-testing 双轨收敛 | 自研套件（src/ 4704 行）保留为验收场景库，执行统一收敛到根 vitest；legacy/ 夹具隔离 |
| P2-3 | 零测试四包补齐 | music-ai / music-commerce / music-growth / music-voice 各补 1 个渲染冒烟测试 |
| P2-4 | 文档门 | 18 包 README 全覆盖（模板：特性/安装/快速开始/API/许可证）；关键组件 JSDoc |
| P2-5 | 样式自治 | 包自带样式策略评估（tailwind preset 包 or CSS 变量注入），解除「依赖宿主 @source 扫描」的隐性耦合 |
| P2-6 | 质量工具 | 根 ESLint flat config（@typescript-eslint + react-hooks）+ prettier；Storybook（或 Ladle 轻量替代）挂 music-ui |

---

## 4. W5 执行明细（2026-11-18）

### 4.1 P0-1 cn 沉淀

- 新增 `packages/music-utils/src/cn.ts`（唯一实现，clsx+tailwind-merge），`src/index.ts` 导出
- `music-ui/src/ui/utils.ts`、`music-voice/src/utils/cn.ts` → 单行 re-export，46 处相对导入零改动
- 依赖收敛：tailwind-merge 3 处声明 → 1 处；clsx 8 处声明 → music-utils + music-ui（dmusic 直接用 clsx 处保留）

### 4.2 P0-2 DMusicUI 拆分

- 新增 `dmusic/ui/` 20 文件：19 组件单文件（原子 8：DButton 72/DInput 108/DBadge 47/DTag 56/DSpinner 22/DBreadcrumb 58/DProgress 57/AchievementRing 74；分子 8：DCard 82/DMusicCard 63/DUserCard 42/DAchievementCard 55/DFeedback 61/DEmptyState 31/DList 26/DListItem 35；有机体 3：DModal 136/DTabBar 108/DToast 68）+ `shared.ts` 20 行
- `DMusicUI.tsx` 1184 → 43 行纯 barrel，导出名集合不变；`index.ts`/`DMusicShowcase.tsx`/`DataViz.tsx` 零改动
- 隐式耦合显性化：DInput→DButton 的 `ButtonSize`、DToast→DFeedback 的 `feedbackConfig/FeedbackType` 上提 shared.ts；其余变体常量留单组件文件
- 验证：typecheck PASS；vitest 3 文件 11 测试全过；逐行机械比对一致（唯一差异 shared.ts 3 处加 `export`）
- 遗留决策：dmusic 层实际用 `clsx` 直连而非 `cn`（twMerge 会改变类名输出语义，未随拆分迁移）——clsx→cn 统一迁移列为 W6 独立小项

### 4.3 P0-3 types 域拆分

- 新增 `music-data/src/types/` 19 域文件（共 1920 行）：common 23 名 / api-common 6 / track 14 / playlist 5 / user 8 / social 12 / creation 15 / economy 11 / album 18 / analytics 12 / gamification 10 / spacetime 10 / live 5 / e2ee 9 / challenge 6 / ai 18 / theme 3 / copyright 5 / ui 6
- `types.ts` 2021 → 266 行纯 barrel；**196/196 导出名集合与声明体字节级一致**；`index.ts`/`playlistData.ts`/`mediaScanner.ts`/`libraryScanner.ts` 零改动
- 跨域耦合显性化：`AuthUser` 被 11 域引用（留 user.ts，各域 type-only 导入）；`RepeatMode/MediaMode/AudioMode/ThemeId/Emotion/Lang` 全域共用归 common；`Track/LyricLine` 被 3 域引用。域间依赖单向无环：`各域 → user/track → common`
- 验证：typecheck PASS；vitest 3 文件 31 用例全过（playlistData 4 / mediaScanner 15 / libraryScanner 12）

### 4.4 pnpm 构建审批治理

见 P0-4。另：`pnpm approve` 提示 @tanstack/react-table 技能待批，与 W1 遗留一致，不阻塞构建。

### 4.5 P0 附带修复：music-live 构建脚手架缺口

全仓 build 复验暴露 W3 遗留问题：`music-live` 缺 `vite.config.ts`，`vite build` 退回网页模式找 `index.html` 报错（此前仅验过 typecheck，未跑过 build）。已补库模式配置（与 music-community 同款：ESM 产出、外部化裸导入）；顺带移除其未使用依赖 `clsx`（实际经 music-ui 用 `cn`）。

### 4.6 W5 验证结论（全仓门禁）

| 门禁 | 结果 |
| --- | --- |
| `pnpm typecheck`（turbo 全仓） | ✅ 18/18 PASS |
| `pnpm build`（turbo 全仓） | ✅ 20/20 PASS |
| `pnpm test`（vitest 全仓） | ✅ 26 文件 / 221 用例全过 |
| 导出面兼容 | ✅ DMusicUI 19 名、types 196 名集合逐一相等；`index.ts`/消费方零改动 |

预存在（非本次引入，记 P2）：m98-server / m98-web 的 turbo `outputs` 无产出警告（其构建产物目录非 `dist/`）；m98-web `react-scripts` 与 TS 5.9 peer 不匹配警告（CRA 老栈，建议迁移 vite）。

---

## 5. 五分类目录对齐矩阵（图示目录 → 包组）

> 原则：分类目录存放**参考项目**（研读/借鉴源），monorepo 产出**可复用包组**；每包 README 必须声明对标来源与许可边界（见 SOP 六步流程）。

| 图示分类 | 参考项目（本地） | 对应包 | 对齐状态 |
| --- | --- | --- | --- |
| **01-音乐**（15） | navidrome → `music-data/mediaScanner`（架构借鉴、无 GPL 代码）；koel → `libraryScanner/buildPlaylist`（目录布局约定）；feishin/supersonic/YesPlayMusic/MusicFree → 播放器交互基线；APlayer/Meting → 嵌入式播放参考；funkwhale/nuclear → 流媒体/多源参考；src-音源面板/src-音频组件/src-语音管理/src-情感音效 → music-audio / music-voice 素材 | music-audio · music-player · music-data · music-hooks | ✅ 已对齐（W1–W4） |
| **02-社交**（7） | misskey → `ReactionBar`（表情反应，Misskey 式）；mastodon → 时间线/可见性模型 → `CommunityFeed`；discourse/forem → 评论体系 → `CommentSystem/TimelineComments`；lemmy → Fork/线程树 → `ForkTree`；pixelfed → 媒体帖子参考；social-app → AT Protocol 参考客户端 | music-community · music-live | ✅ 已对齐（W2/W3） |
| **03-媒体视频**（11） | video.js 10 + hls.js → `MediaDisplay`（W2，见 05 类）；immich → `libraryScanner`（hash 去重/时间线分组，借鉴架构）；mediamtx/srs → `music-server/live-stream` 状态探针（W3）；owncast/PeerTube/mediacms → 直播/VOD 参考；jellyfin(-web) → 媒体库 UI 参考；livekit → 实时连麦演进项；netflix-clone → 首页编排参考 | music-server · music-player · music-data | ✅ 已对齐（W2–W3）；livekit 连麦为演进项 |
| **04-综艺制作**（7） | remotion/revideo → 程序化 MV 渲染（W4 选层 revideo 未安装，MVCreator 演进方向）；motion-canvas → 动效编排参考；FFmpeg → 转码服务演进项；OpenTimelineIO → 时间线 interchange 参考；obs-studio → 制作控制台交互参考 | music-ai（MVCreator/CreationStudio） | ⚠️ 参考阶段，演进项未落地（有意为之） |
| **05-UI组件**（40） | shadcn/ui + radix(primitives) → music-ui 46 基件 ✅；dnd-kit/TanStack Virtual/lenis/motion/cmdk/vaul/sonner → music-ui（W1 已装）✅；video.js/hls.js → music-player ✅；wavesurfer.js → WaveformLyrics ✅（peaks.js 备选未装）；recharts → DataViz ✅；tremor/visx/d3/nivo → DataViz 演进选件；ant-design/arco/mantine/heroui/chakra/element-plus/naive-ui/semi/vuetify/daisyui → W4 可选层（有意未装）；GSAP/lottie-web/rive/pixijs/R3F/drei → 动效/3D 演进层（未装）；media-chrome/plyr/shaka-player/player → 播放 UI 备选（video.js 已定基线） | music-ui · music-design-tokens | ✅ 主干对齐；演进/可选层显式挂起 |

**对齐缺口（唯一）**：04-综艺制作方向无生产级落地包——符合 W4「可选层不预装」决议，列入 §6 W8 演进而非本周期承诺。

---

## 6. 极致拆分规划 W6–W8（含验收门）

### W6 — 大组件拆解周

- P1-1/2/3 三个拆解任务并行；每任务验收门：
  - 单文件 ≤300 行；子组件文件名=组件名；面板/页面只留组装与受控状态
  - 公开导出名集合不变（barrel 兼容）；`turbo typecheck` PASS；受影响包 vitest PASS
  - 拆分前后快照对比：Storybook 未建前以 vitest 渲染冒烟兜底
- P1-4/5：README 定位声明 + JSDoc 互注（半天量级，先行）
- P1-6：dmusic 层 `clsx` 直连迁移为 `cn`（独立小项：twMerge 合并语义需逐组件比对类名输出）

### W7 — 分层收敛周

- P2-1 平铺包分域分层（music-hooks 先行，作为模板样板）
- P2-2 music-testing 收敛：自研套件降级为「验收场景数据」，执行路径唯一化到 vitest
- P2-3 四包补冒烟测试（覆盖门禁 85% 不放松）
- music-server 工具链裁决：维持 Deno 特例则加 `turbo.json` 显式排除 + README 豁免说明；或迁移 hono 至 pnpm 侧（推荐后者，Edge Functions 部署不受影响——hono 同构）

### W8 — 发布就绪周

- P2-4 文档门：18 README + 组件 JSDoc；发布前 changesets 走通 `changeset → version-packages → release` 干跑
- P2-5 样式自治方案定稿（推荐：`@yyc3/music-design-tokens` 导出 CSS 变量表 + 各包 `styles/` 内 keyframes/局部样式，宿主仅引 tokens）
- P2-6 ESLint flat config + Ladle（Storybook 轻量替代）试点 music-ui
- 量化验收（承接 W4 遗留，宿主联调阶段执行）：Lighthouse a11y ≥95、1000 曲目列表 60fps、HLS 起播 <1.5s、波形同步 <80ms、100 弹幕并发不丢帧

## 7. 风险与依赖

| 风险 | 缓解 |
| --- | --- |
| 拆分引发隐式耦合断裂（DMusicUI 组件间共享闭包变量） | 子代理已执行「共享位上提 shared.ts」策略；typecheck+vitest 双门禁 |
| 大组件拆分漂移（顺手改样式/逻辑） | 任务书明确「纯机械拆分」；review 以 diff 行为等价为准 |
| music-server 迁移 hono 影响 Edge 部署 | W7 裁决项，先出对比小样再动 |
| git 未提交代码占一半以上（28 个未跟踪路径） | 建议本 W5 完成后尽快提交一版 `refactor: W5 split` 基线（待用户确认） |

## 8. 验收清单（本报告闭环条件）

- [x] P0-1 cn 唯一实现 + 依赖收敛
- [x] P0-2 DMusicUI 拆分（typecheck PASS / 11 测试过 / 逐行比对一致）
- [x] P0-3 types 域拆分（typecheck PASS / 31 测试过 / 196 名字节级一致）
- [x] P0-4 pnpm allowBuilds 治理
- [x] 附带：music-live 补 vite 库配置 + 移除未用 clsx（build 20/20 复验通过）
- [x] 全仓 `pnpm build + typecheck + test` 复验（18/18 · 20/20 · 221 用例）
- [ ] W6–W8 排期确认（用户裁决）
- [ ] W5 基线 git 提交（待用户确认，涉及 28 个未跟踪路径）

---

<p align="center"><b>YYC³</b>（YanYuCloudCube™ · 注册商标）· 言启象限 | 语枢未来 · © 2026</p>
