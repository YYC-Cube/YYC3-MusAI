# @yyc3/music-player

YYC³ D-Music 播放器 UI 展示层 — Video.js 10 播放器 · 控制条 · 移动端播放器 · 音频可视化。

| 属性 | 值 |
| --- | --- |
| 定位 | UI 展示层：播放器核心组件 |
| 许可证 | MIT |

## 包定位（播放器三套并存裁决，W6-P1-4）

| 层 | 包 | 职责 |
| --- | --- | --- |
| 引擎层 | `@yyc3/music-audio` | 无头播放能力：流式引擎、WebAudio、资源管理 |
| **UI 展示层（本包）** | `@yyc3/music-player` | 播放器组件与视觉呈现 |
| ~~应用内旧实现~~ | `apps/m98-web` MusicPlayer | **已弃用**，新功能请用上述两包 |

本包不含播放引擎：播放状态经 `@yyc3/music-hooks`（useAudioEngine 等）接入，流媒体能力由引擎层或 MediaDisplay 内置的 Video.js 提供。

## 组件清单（导出清单）

- `MediaDisplay` — Video.js 10 + hls.js 统一媒体显示（`.m3u8` 自动检测；Supabase Storage signed-url 直连，可 seeking 由 `streaming.range` 能力位判定）
- `PlayerControls` — 桌面控制条
- `MobilePlayer` — 移动端播放器
- `AudioVisualizer` — 音频可视化

## 关键 API

| 名称 | 说明 |
| --- | --- |
| `PlayerControls` | isPlaying、progress、duration、volume、mode、mValue、songTitle、artist 与 5 个回调 |
| `MediaDisplay` | mode、isPlaying、albumArtUrl、frequencyData、emotion、audioEnergy |
| `AudioVisualizer` | frequencyData、emotion、isPlaying、size、mode: 'circular' \| 'bars' |
| `MobilePlayer` | 移动端全屏播放器，消费与 PlayerControls 相同的播放状态 |

## 快速开始

```tsx
import { AudioVisualizer, PlayerControls } from '@yyc3/music-player'

export function Bar() {
  return (
    <PlayerControls
      isPlaying={false} progress={0} duration={180} volume={0.8}
      mode="cover" mValue={0} songTitle="夜航" artist="YYC³"
      onPlayPause={() => {}} onSeek={() => {}} onToggleMode={() => {}}
      onLike={() => {}} onVolumeChange={() => {}}
    />
  )
}
```

## 对标来源（开源组件库目录）

- 05-UI组件：video.js（**已定基线**）、hls.js；media-chrome / plyr / shaka-player 为备选未采用
- 03-媒体视频：jellyfin-web / netflix-clone（播放页编排参考）

## 安装与使用

```bash
pnpm add @yyc3/music-player   # workspace 内：直接依赖 workspace:*
```

```tsx
import { MediaDisplay, PlayerControls } from '@yyc3/music-player';
```

## 说明

组件为纯展示层，播放状态由 `@yyc3/music-hooks` 的 `useAudioEngine` 提供；Canvas 可视化在无 `frequencyData` 时自动降级。

## 兼容性

- React 18+（组件包 peer 依赖）
- TypeScript 5.9+ / Node.js 18+（monorepo engines）
- 现代浏览器（Chrome/Edge/Safari/Firefox 最近两个大版本）

## 开发与验证

```bash
pnpm --filter @yyc3/music-player build
pnpm --filter @yyc3/music-player typecheck
pnpm --filter @yyc3/music-player lint
pnpm test:coverage
```

## 许可证

MIT License（第三方依赖许可见根目录 NOTICE.md）
