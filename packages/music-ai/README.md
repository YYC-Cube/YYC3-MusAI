# @yyc3/music-ai

> AI 助手、AI 歌词生成、创作工作室与 MV 生成器。

| 属性 | 值 |
| --- | --- |
| 版本 | 2.0.0 |
| 定位 | AI 创作组件 |
| 许可证 | MIT |
| 仓库 | https://github.com/YYC-Cube/YYC3-MusAI |

## 安装

```bash
pnpm add @yyc3/music-ai react
```

## 快速开始

```tsx
import { AILyricsGenerator, CreationStudio } from '@yyc3/music-ai'

export function Studio({ open, setOpen, playlist }: any) {
  return (
    <>
      <AILyricsGenerator isOpen={open} onClose={() => setOpen(false)} />
      <CreationStudio
        isOpen={open} onClose={() => setOpen(false)}
        playlist={playlist} currentTrackIndex={0}
        onCreateTrack={(lyrics, theme, audioBlobUrl) => console.log(theme, lyrics, audioBlobUrl)}
      />
    </>
  )
}
```

## 导出清单

- AIAssistant
- AILyricsGenerator
- CreationStudio
- MVCreator

## 关键 API

| 名称 | 说明 |
| --- | --- |
| `AIAssistant` | activeTips、onDismissTip、onExecuteAction、isListening、voiceFeedback、sessionInsight 等 |
| `AILyricsGenerator` | isOpen、onClose、onCreateTrack(lyrics, theme, audioBlobUrl?, compositionParams?) |
| `CreationStudio` | isOpen、onClose、playlist、currentTrackIndex、onShareWork、onOpenMV 等 |
| `MVCreator` | track、isPlaying、audioEnergy、frequencyData、currentTime、emotion 等 |

## 说明

AI 组件通过回调向上层暴露创作结果，不自带网络层；模型调用请由宿主注入 Provider（见路线图的 AIProvider 契约）。

## 兼容性

- React 19+（组件包 peer 依赖）
- TypeScript 5.6+ / Node.js 20.19+
- 现代浏览器（Chrome/Edge/Safari/Firefox 最近两个大版本）

## 开发与验证

```bash
pnpm --filter @yyc3/music-ai build
pnpm --filter @yyc3/music-ai typecheck
pnpm --filter @yyc3/music-ai lint
pnpm test:coverage
```

## 许可证

MIT © 2026 YanYuCloudCube™（YYC³）

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来 — Words Initiate Quadrants, Language Serves as Core for Future<br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
