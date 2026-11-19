# 开源组件库 · 本地研读副本

对应调研报告：[`reports/oss-media-uiux-landscape-2026`](../../reports/oss-media-uiux-landscape-2026/oss-media-uiux-landscape-2026.html)

## 目录

| 目录 | 领域 | 数量 |
|---|---|---|
| `01-音乐/` | 音乐服务、播放器、音频工具 | 8 |
| `02-社交/` | 联邦社交、社区、论坛 | 7 |
| `03-媒体视频/` | 视频平台、媒体资产、直播流媒体 | 10 |
| `04-综艺制作/` | 采集、播控、程序化视频、转码 | 7 |
| `05-UI组件/` | 设计系统、动效、播放器 UI、可视化 | 40 |

## 克隆口径

- 全部使用 `git clone --depth 1 --single-branch`（仅研读源码，不含历史）。
- 清单见 `repos.tsv`（分组 / 仓库 / 许可证 / 定位）。
- 重新拉取或补拉：

```bash
cd docs/开源组件库
awk -F'\t' 'NF>=4 && $1 !~ /^#/ {print $1, $2}' repos.tsv \
  | xargs -P 4 -n 2 bash clone-one.sh
```

- 结果日志：`_fetch.log`；已存在目录会自动 `SKIP`。

## 许可证提醒

- `AGPL-3.0`（PeerTube、Mastodon、Misskey、Immich、MediaCMS 等）**不可直接链接进闭源产品**。
- `GPL-2.0/3.0`（Jellyfin、OBS、Navidrome、Koel 服务端等）仅建议独立部署或参考实现。
- `Remotion` 为源码可见的商业授权，非 OSI 开源。
- `GSAP` 免费但闭源；`Vidstack` 已弃用（建议 Video.js 10）。
- 具体以各仓库 `LICENSE` 为准，引入前需法务复核。

## 版本

副本为拉取时 `HEAD` 快照（2026-11-18），不随上游自动更新。
