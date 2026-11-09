# @yyc3/music-lyrics

> 逐行歌词展示、点击跳转与情感涟漪可视化。

| 属性 | 值 |
| --- | --- |
| 版本 | 2.0.0 |
| 定位 | 歌词组件 |
| 许可证 | MIT |
| 仓库 | https://github.com/YYC-Cube/YYC3-MusAI |

## 安装

```bash
pnpm add @yyc3/music-lyrics react
```

## 快速开始

```tsx
import { LyricsDisplay, EmotionRipple, parseLrc } from '@yyc3/music-lyrics'

const { lines, metadata } = parseLrc(`
[ti:夜航]
[ar:YYC³]
[00:01.00]第一句
[00:05.50]第二句
`)

export function Lyrics({ time }: { time: number }) {
  return (
    <>
      <LyricsDisplay currentTime={time} lyrics={lines} isPlaying onLineClick={(t) => console.log(t)} />
      <EmotionRipple emotion="calm" audioEnergy={0.6} isPlaying />
    </>
  )
}
```

## 导出清单

- LyricsDisplay
- EmotionRipple
- parseLrc（标准 LRC 解析）

## 关键 API

| 名称 | 说明 |
| --- | --- |
| `LyricsDisplay` | currentTime、lyrics、onLineClick、annotations、onAnnotate、isPlaying |
| `EmotionRipple` | emotion、audioEnergy(0–1)、isPlaying、frequencyData、className |
| `parseLrc(input, options?)` | 解析 `[mm:ss.xx]`、`[ti/ar/al/by/offset]` 与多时间标签；返回 `{ metadata, lines }`，时间单位秒 |

## 说明

歌词数据契约为 `LyricLine[]`（来自 `@yyc3/music-data`），时间单位与音频引擎一致（秒）。

## 兼容性

- React 19+（组件包 peer 依赖）
- TypeScript 5.6+ / Node.js 20.19+
- 现代浏览器（Chrome/Edge/Safari/Firefox 最近两个大版本）

## 开发与验证

```bash
pnpm --filter @yyc3/music-lyrics build
pnpm --filter @yyc3/music-lyrics typecheck
pnpm --filter @yyc3/music-lyrics lint
pnpm test:coverage
```

## 许可证

MIT © 2026 YanYuCloudCube™（YYC³）

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来 — Words Initiate Quadrants, Language Serves as Core for Future<br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
