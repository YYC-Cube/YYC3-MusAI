# @yyc3/music-player

> 媒体展示、播放控制、移动端播放器与音频可视化四件套。

| 属性 | 值 |
| --- | --- |
| 版本 | 2.0.0 |
| 定位 | 播放器核心组件 |
| 许可证 | MIT |
| 仓库 | https://github.com/YYC-Cube/YYC3-MusAI |

## 安装

```bash
pnpm add @yyc3/music-player react
```

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

## 导出清单

- MediaDisplay
- PlayerControls
- MobilePlayer
- AudioVisualizer

## 关键 API

| 名称 | 说明 |
| --- | --- |
| `PlayerControls` | isPlaying、progress、duration、volume、mode、mValue、songTitle、artist 与 5 个回调 |
| `MediaDisplay` | mode、isPlaying、albumArtUrl、frequencyData、emotion、audioEnergy |
| `AudioVisualizer` | frequencyData、emotion、isPlaying、size、mode: 'circular' | 'bars' |
| `MobilePlayer` | 移动端全屏播放器，消费与 PlayerControls 相同的播放状态 |

## 说明

组件为纯展示层，播放状态由 `@yyc3/music-hooks` 的 `useAudioEngine` 提供；Canvas 可视化在无 `frequencyData` 时自动降级。

## 兼容性

- React 19+（组件包 peer 依赖）
- TypeScript 5.6+ / Node.js 20.19+
- 现代浏览器（Chrome/Edge/Safari/Firefox 最近两个大版本）

## 开发与验证

```bash
pnpm --filter @yyc3/music-player build
pnpm --filter @yyc3/music-player typecheck
pnpm --filter @yyc3/music-player lint
pnpm test:coverage
```

## 许可证

MIT © 2026 YanYuCloudCube™（YYC³）

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来 — Words Initiate Quadrants, Language Serves as Core for Future<br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
