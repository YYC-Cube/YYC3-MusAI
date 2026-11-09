# @yyc3/music-audio

> 高级播放器、WebAudio、音效资源管理、翻页交互、情感音效与交互文档组件。

| 属性 | 值 |
| --- | --- |
| 版本 | 2.0.0 |
| 定位 | 音效与文档交互组件 |
| 许可证 | MIT |
| 仓库 | https://github.com/YYC-Cube/YYC3-MusAI |

## 安装

```bash
pnpm add @yyc3/music-audio react
```

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

## 导出清单

- AdvancedPlayer、WebAudioPlayer、PlayerUI、SoundResourceManager、PageFlipInteraction
- EmotionAudioPlayer、EmotionDetector、SmartTip
- InteractiveCodeBlock、InteractiveMindMap

## 关键 API

| 名称 | 说明 |
| --- | --- |
| `SmartTip` | isVisible、message、emotion: neutral|encouraging|calm、position、duration |
| `EmotionAudioPlayer` | 按情绪播放音效，内部复用 AudioContext |
| `SoundResourceManager` | 音效资源预加载与缓存 |
| `InteractiveCodeBlock / InteractiveMindMap` | 文档型交互展示组件 |

## 说明

WebAudio 相关组件需在用户交互后初始化 AudioContext；测试环境需 mock `AudioContext` 或使用真实浏览器 E2E。

## 兼容性

- React 19+（组件包 peer 依赖）
- TypeScript 5.6+ / Node.js 20.19+
- 现代浏览器（Chrome/Edge/Safari/Firefox 最近两个大版本）

## 开发与验证

```bash
pnpm --filter @yyc3/music-audio build
pnpm --filter @yyc3/music-audio typecheck
pnpm --filter @yyc3/music-audio lint
pnpm test:coverage
```

## 许可证

MIT © 2026 YanYuCloudCube™（YYC³）

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来 — Words Initiate Quadrants, Language Serves as Core for Future<br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
