# NOTICE — 第三方依赖许可汇总

本 monorepo 在 W1–W4 阶段引入的第三方开源依赖及许可。所有依赖均为 MIT / BSD / Apache-2.0 宽松许可，可安全用于 MIT 前端产品。AGPL/GPL 项目（Navidrome、PeerTube、Misskey、Jellyfin、Funkwhale、Nuclear、MediaCMS、Owncast 等）**仅作独立部署或设计参考，未进入任何产品依赖**。

版本以 `pnpm-lock.yaml` 锁定为准（2026-11-18 快照）。

## W1 — UI/UX 基建

| 依赖 | 许可 | 引入包 | 用途 |
|---|---|---|---|
| `@dnd-kit/core` / `@dnd-kit/sortable` / `@dnd-kit/utilities` | MIT | `@yyc3/music-ui` | 歌单排序、跨容器拖拽 |
| `@tanstack/react-virtual` | MIT | `@yyc3/music-ui` | 长列表虚拟滚动 |
| `@tanstack/react-table` | MIT | `@yyc3/music-ui` | 表格（预留） |
| `lenis` | MIT | `@yyc3/music-ui`、`@yyc3/music-hooks` | 平滑滚动 |

*既有依赖：`motion`、`cmdk`、`vaul`、`sonner` 均为 MIT，已存在于 `music-ui`。*

## W2 — 播放内核与波形

| 依赖 | 许可 | 引入包 | 用途 |
|---|---|---|---|
| `video.js` | Apache-2.0 | `@yyc3/music-player` | Video.js 10 视频播放内核 |
| `media-chrome` | MIT | `@yyc3/music-player` | 媒体控件样式层 |
| `hls.js` | Apache-2.0 | `@yyc3/music-player`、`@yyc3/music-audio` | HLS 自适应流播放 |
| `wavesurfer.js` | BSD-3-Clause | `@yyc3/music-lyrics` | 音频波形渲染与 Region 交互 |

## W3 — 直播与流媒体

无新增第三方运行时依赖。`music-live` 仅复用 workspace 内部包与既有 MIT 依赖（`motion`、`lucide-react`、`clsx`）。

## 参考（未引入代码）的项目

以下 AGPL/GPL 项目仅用于交互与架构研读，位于仓库外 `docs/开源组件库/`，**未复制任何代码进本 monorepo**：

- Navidrome（GPL-3.0）— 媒体库扫描模型 → `music-data/src/mediaScanner.ts` 仅借鉴架构
- PeerTube / MediaCMS（AGPL-3.0）— 频道/播放列表领域模型参考
- Misskey（AGPL-3.0）— 信息流/表情反应交互参考
- Koel（MIT）— 歌单/队列产品细节参考
- Immich（AGPL-3.0）— 上传/去重/缩略图链路参考
- Owncast（MIT）— 直播推流/聊天模型参考 → `music-server/src/live-stream.ts` 仅借鉴模型

## 合规要点

1. 所有 `@yyc3/music-*` 包以 MIT 发布；`music-server` 为 private 部署单元。
2. 媒体资产（歌曲/封面/字体/音效）授权与代码许可相互独立，需单独确认。
3. 每次升级依赖需重新核验上游许可证变化并更新本文件。
