# @yyc3/music-audio

YYC³ D-Music 播放引擎层 — HLS/流式播放引擎 · WebAudio 图 · 声音资源管理 · 翻页交互，及情感音频实验组件。

| 属性 | 值 |
| --- | --- |
| 定位 | 引擎层：无头播放能力（音效与文档交互组件） |
| 许可证 | MIT |

## 包定位（播放器三套并存裁决，W6-P1-4）

| 层 | 包 | 职责 |
| --- | --- | --- |
| **引擎层（本包）** | `@yyc3/music-audio` | 无头播放能力：流式引擎、WebAudio、资源管理 |
| **UI 展示层** | `@yyc3/music-player` | 播放器组件：MediaDisplay / PlayerControls / MobilePlayer / AudioVisualizer |
| ~~应用内旧实现~~ | `apps/m98-web` MusicPlayer | **已弃用**，新功能请用上述两包 |

需要「能播放」→ 用本包引擎；需要「播放器长什么样」→ 用 `@yyc3/music-player`。

## 能力清单（导出清单）

- `AdvancedPlayer`（.js）— hls.js 优先的流式播放引擎，原生 Audio 回退（Safari）；`destroyStreamEngine()` / `dispose()` 完整释放路径
- `WebAudioPlayer`（.js）— WebAudio 图播放
- `SoundResourceManager`（.js）— 声音资源生命周期管理
- `PageFlipInteraction`（.js）— 翻页交互音效
- 情感音频实验场：`EmotionAudioPlayer` / `EmotionDetector` / `PlayerUI` / `SmartTip` / `InteractiveCodeBlock` / `InteractiveMindMap`

## 关键 API

| 名称 | 说明 |
| --- | --- |
| `SmartTip` | isVisible、message、emotion: neutral\|encouraging\|calm、position、duration |
| `EmotionAudioPlayer` | 按情绪播放音效，内部复用 AudioContext |
| `SoundResourceManager` | 音效资源预加载与缓存 |
| `InteractiveCodeBlock / InteractiveMindMap` | 文档型交互展示组件 |

## 快速开始

```tsx
import { SmartTip, EmotionAudioPlayer } from '@yyc3/music-audio'

export function AudioDemo() {
  return (
    <>
      <SmartTip isVisible message="试试播放这首夜航" emotion="encouraging" position="bottom" />
      <EmotionAudioPlayer />
    </>
  )
}
```

## 已知分层债务（W7-P2-1 处理）

实验/教学组件（SmartTip、InteractiveCodeBlock、InteractiveMindMap、PlayerUI）与引擎同层平铺，W7 将收敛为 `engines/ + ui/` 分层并评估教学组件迁出。

## 对标来源（开源组件库目录）

- 03-媒体视频：hls.js（流式协议）、funkwhale/navidrome（流式服务架构参考，仅架构借鉴、无 GPL 代码）
- 01-音乐：feishin/supersonic（桌面播放器交互基线）、src-情感音效（情感音频素材）

## 安装与使用

```bash
pnpm add @yyc3/music-audio   # workspace 内：直接依赖 workspace:*
```

```js
import { AdvancedPlayer } from '@yyc3/music-audio';
```

## 说明

WebAudio 相关组件需在用户交互后初始化 AudioContext；测试环境需 mock `AudioContext` 或使用真实浏览器 E2E。

## 兼容性

- React 18+（组件包 peer 依赖）
- TypeScript 5.9+ / Node.js 18+（monorepo engines）
- 现代浏览器（Chrome/Edge/Safari/Firefox 最近两个大版本）

## 开发与验证

```bash
pnpm --filter @yyc3/music-audio build
pnpm --filter @yyc3/music-audio typecheck
pnpm --filter @yyc3/music-audio lint
pnpm test:coverage
```

## 许可证

MIT License（第三方依赖许可见根目录 NOTICE.md）
