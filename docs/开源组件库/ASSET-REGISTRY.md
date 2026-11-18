# YYC³ 开源组件库 — 已集成包知识库资产条目

本文档登记所有已完成集成的开源包，作为知识库资产，供后续行业场景复用。

## 集成状态汇总

| 状态 | 条目数 |
|------|--------|
| 已集成（写入代码） | 17 |
| 引用参考（架构/交互模型，不引入代码） | 11 |
| 禁止引入（商业/AGPL/GPL，独立部署或参考设计） | 44 |
| 总计（repos.tsv） | 72 |

---

## §1 已集成包资产条目（17 项）

每项包含：资产ID、源开源项目、目标包、集成文件、许可证、合规处置、核心能力、适用场景。

### ASSET-001 · Video.js 播放内核
- 源项目：`videojs/video.js` (Apache-2.0)
- 目标包：`@yyc3/music-player`
- 集成文件：`packages/music-player/src/components/MediaDisplay.tsx`
- 集成方式：将原生 `<video>` 替换为 Video.js 10 播放器，支持 HLS/Range 拖动
- 核心能力：跨浏览器视频/音频播放、HLS 流媒体、深色主题控件、音频可视化、情绪光晕
- 适用场景：音乐播放器、媒体播放器、音视频内容展示

### ASSET-002 · Media Chrome 媒体控件
- 源项目：`muxinc/media-chrome` (MIT)
- 目标包：`@yyc3/music-player`
- 集成文件：`packages/music-player/src/components/MediaDisplay.tsx`
- 集成方式：Media Chrome 控件升级
- 核心能力：无框架媒体控件、可定制 UI、深色主题
- 适用场景：音视频播放控制界面

### ASSET-003 · hls.js 自适应流内核
- 源项目：`video-dev/hls.js` (Apache-2.0)
- 目标包：`@yyc3/music-audio`
- 集成文件：`packages/music-audio/src/AdvancedPlayer.js`
- 集成方式：`new Audio()` → hls.js 自适应流内核，普通文件降级原生 Audio
- 核心能力：HLS 自适应码率、多码率切换、降级兼容原生 Audio
- 适用场景：直播/点播音频流、自适应码率播放

### ASSET-004 · WaveSurfer.js 波形可视化
- 源项目：`wavesurfer-js/wavesurfer.js` (BSD-3-Clause)
- 目标包：`@yyc3/music-lyrics`
- 集成文件：`packages/music-lyrics/src/components/WaveformLyrics.tsx`
- 集成方式：新增 WaveformLyrics 组件，波形 + Regions 歌词跳转/片段循环
- 核心能力：音频波形渲染、Regions 区域标记、波形-歌词联动、片段循环
- 适用场景：歌词显示、音频编辑、波形可视化

### ASSET-005 · Motion 动效
- 源项目：`motiondivision/motion` (MIT)
- 目标包：`@yyc3/music-ui`, `@yyc3/music-hooks`
- 集成文件：`packages/music-ui/`, `packages/music-hooks/src/useScrollProgress.ts`
- 集成方式：W1 新增 motion 依赖，useScrollProgress 平滑滚动
- 核心能力：手势动画、布局动画、滚动进度、过渡动效
- 适用场景：UI 动效、页面过渡、滚动交互

### ASSET-006 · Lenis 平滑滚动
- 源项目：`darkroomengineering/lenis` (MIT)
- 目标包：`@yyc3/music-hooks`
- 集成文件：`packages/music-hooks/src/useScrollProgress.ts`
- 集成方式：useScrollProgress 平滑滚动 + 滚动进度 0-1
- 核心能力：惯性滚动、滚动进度监听、平滑过渡
- 适用场景：长列表滚动、单页滚动动效、进度条

### ASSET-007 · dnd-kit 歌单拖拽
- 源项目：`clauderic/dnd-kit` (MIT)
- 目标包：`@yyc3/music-ui`
- 集成文件：`packages/music-ui/src/ui/playlist-dnd.tsx`, `packages/music-ui/src/ui/playlist-sort.tsx`
- 集成方式：PlaylistSortableList、PlaylistItemView
- 核心能力：拖拽排序、键盘可达、触控支持、列表重排
- 适用场景：歌单管理、列表重排、拖拽交互

### ASSET-008 · TanStack Virtual 长列表
- 源项目：`TanStack/table` (MIT) / `TanStack/react-virtual`
- 目标包：`@yyc3/music-ui`
- 集成文件：`packages/music-ui/src/ui/virtual-list.tsx`
- 集成方式：VirtualTrackList、VirtualMusicList 窗口化渲染
- 核心能力：窗口化渲染、虚拟滚动、大数据量列表 60fps
- 适用场景：1000+ 首歌曲列表、长列表虚拟滚动

### ASSET-009 · CmdK 命令面板
- 源项目：`pacocoursey/cmdk` (MIT)
- 目标包：`@yyc3/music-ui`
- 集成文件：`packages/music-ui/src/ui/cmd-k-palette.tsx`
- 集成方式：CmdKPalette 组件，Cmd+K/Ctrl+K 全局触发
- 核心能力：命令搜索、分组展示、快捷键提示、全局快捷键
- 适用场景：全局搜索、命令面板、快捷操作入口

### ASSET-010 · Vaul 抽屉
- 源项目：`emilkowalski/vaul` (MIT) — 依赖 @radix-ui/react-drawer 不可获取，改用 @radix-ui/react-dialog 等效实现
- 目标包：`@yyc3/music-ui`
- 集成文件：`packages/music-ui/src/ui/vaul-drawer.tsx`
- 集成方式：DrawerPanel 组件，受控打开/关闭，多位置支持
- 核心能力：抽屉弹窗、受控状态、多边位置、动画过渡
- 适用场景：设置面板、详情弹窗、侧边抽屉

### ASSET-011 · Sonner Toast
- 源项目：`emilkowalski/sonner` (MIT)
- 目标包：`@yyc3/music-ui`
- 集成文件：`packages/music-ui/src/ui/` (shadcn 基件已集成)
- 集成方式：Toast 通知组件
- 核心能力： Toast 通知、提示消息、操作反馈
- 适用场景：操作反馈、系统通知、错误提示

### ASSET-012 · Recharts 运营看板
- 源项目：`recharts/recharts` (MIT)
- 目标包：`@yyc3/music-community`
- 集成文件：`packages/music-community/src/components/AnalyticsDashboard.tsx`
- 集成方式：四大指标卡 + 播放趋势/情绪分布/热门歌曲图表
- 核心能力：LineChart/PieChart/BarChart、指标大数字、趋势标签、歌曲明细表
- 适用场景：运营数据看板、音乐数据分析、管理后台

### ASSET-013 · Visx 数据可视化
- 源项目：`airbnb/visx` (MIT)
- 目标包：`@yyc3/music-community`
- 集成文件：`packages/music-community/src/components/VisxCharts.tsx`
- 集成方式：VisxCharts (Bar/Line/Pie/Area 四种图表)，原生 SVG 渲染
- 核心能力：BarChart/LineChart/PieChart/AreaChart、比例尺计算、SVG 路径渲染
- 适用场景：数据可视化、运营看板、图表展示

### ASSET-014 · Revideo 程序化 MV
- 源项目：`redotvideo/revideo` (Apache-2.0)
- 目标包：`@yyc3/music-mv`
- 集成文件：`packages/music-mv/src/MvScene.tsx`, `packages/music-mv/src/types.ts`, `packages/music-mv/src/index.ts`
- 集成方式：MvScene 场景组件，代码驱动视频编辑（替代 Remotion 商业授权）
- 核心能力：MV 场景描述、主题切换、歌词同步、进度条、封面展示
- 适用场景：MV 程序化生成、代码驱动视频、综艺制作

### ASSET-015 · mediaScanner 媒体库扫描
- 源项目：`navidrome/navidrome` (GPL-3.0，仅架构参考，不引入代码)
- 目标包：`@yyc3/music-data`
- 集成文件：`packages/music-data/src/mediaScanner.ts`, `packages/music-data/src/libraryScanner.ts`
- 集成方式：媒体资产扫描与专辑/艺术家聚合（hashFile/dedupeByHash/groupByTimeline/buildPlaylist）
- 核心能力：媒体文件扫描、去重、专辑/艺术家聚合、时间轴分组、播放列表构建
- 适用场景：音乐库扫描、媒体资产管理、专辑整理

### ASSET-016 · Misskey 表情反应
- 源项目：`misskey-dev/misskey` (AGPL-3.0，仅交互参考，不引入代码)
- 目标包：`@yyc3/music-community`
- 集成文件：`packages/music-community/src/components/CommunityFeed.tsx`, `packages/music-community/src/components/ReactionBar.tsx`
- 集成方式：CommunityActivity 新增 reactions 字段，ReactionBar 受控表情反应组件
- 核心能力：表情反应（❤️/🔥/😂/👏/🎵/✨）、计数显示、受控状态、乐观更新
- 适用场景：社交动态、表情反应、社区信息流

### ASSET-017 · LiveSessionPanel 直播间
- 源项目：`owncast/owncast` (MIT，推流模型参考)
- 目标包：`@yyc3/music-community`, `@yyc3/music-server`, `@yyc3/music-live`
- 集成文件：`packages/music-community/src/components/LiveSessionPanel.tsx`, `packages/music-live/src/*`, `packages/music-server/src/routes-livestream.ts`, `packages/music-server/src/index.ts`
- 集成方式：WebSocket 直播间协议（弹幕/表情/礼物/审核/房间/在线人数）、/live/stream 接口
- 核心能力：HLS 播放、弹幕看板、表情面板、礼物面板、在线人数、审核面板、自动重连心跳
- 适用场景：直播间、实时弹幕、在线活动、直播互动

---

## §2 引用参考包资产条目（11 项）

以下开源项目不引入代码，仅作为架构/交互/领域模型参考，已登记为知识库资产：

| 资产ID | 源项目 | 许可证 | 参考内容 | 应用目标 |
|--------|--------|--------|----------|----------|
| REF-001 | `koel/koel` (MIT) | 歌单/播放队列/多用户产品细节 | music-player 播放列表 |
| REF-002 | `immich-app/immich` (AGPL-3.0) | 上传、去重、缩略图、时间轴 | music-server 媒体上传链路 |
| REF-003 | `qier222/YesPlayMusic` (MIT) | 音乐播放器 UI/UX 设计 | 音乐播放器界面参考 |
| REF-004 | `DIYgod/APlayer` (MIT) | HTML5 音乐播放器 | 音频播放控件参考 |
| REF-005 | `metowolf/Meting` (MIT) | 音乐 API 聚合 | 音乐元数据聚合参考 |
| REF-006 | `bluesky-social/social-app` (MIT) | 社交信息流设计 | 社区 Feed 参考 |
| REF-007 | `chakra-ui/chakra-ui` (MIT) | 组件库设计模式 | UI 组件设计参考 |
| REF-008 | `ant-design/ant-design` (MIT) | 企业级组件库 | 后台组件设计参考 |
| REF-009 | `element-plus/element-plus` (MIT) | 后台管理组件 | 管理后台参考 |
| REF-010 | `daisyui/daisyui` (MIT) | Tailwind 组件库 | Tailwind 组件参考 |
| REF-011 | `pmndrs/react-three-fiber` / `drei` (MIT) | 3D 渲染 | 3D 场景参考 |

---

## §3 禁止引入包资产条目（44 项）

以下项目因许可证限制（AGPL/GPL/Commercial/Free-Closed）不引入产品代码，仅独立部署或参考设计：

**AGPL-3.0**：PeerTube、MediaCMS、Misskey、Mastodon、Lemmy、Pixelfed、Forem、Immich、MusicFree
**GPL-2.0/3.0**：Jellyfin、Navidrome、Supersonic、OBS Studio、CasparCG、Feishin、Peaks.js
**Commercial**：Remotion
**Free-Closed**：GSAP

> 合规原则：AGPL/GPL 项目仅作为架构参考或独立部署，不复制进闭源前端；商业授权项目（Remotion）替代为 Apache-2.0 的 revideo。

---

*生成时间：2026-11-19*  
*数据源：docs/开源组件库/repos.tsv (72 条目)、INTEGRATION-STATUS.md*
