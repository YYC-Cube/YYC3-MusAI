# @yyc3/music-data

> 全局类型系统（Track / User / Emotion / Props 等 60+ 类型）与演示歌单运行时数据。

| 属性 | 值 |
| --- | --- |
| 定位 | 数据层与全局类型 |
| 许可证 | MIT |
| 仓库 | https://github.com/YYC-Cube/YYC3-MusAI |

## 安装

```bash
pnpm add @yyc3/music-data
```

## 快速开始

```tsx
import type { Track, LyricLine, Emotion } from '@yyc3/music-data'
import { DEMO_PLAYLIST, ACHIEVEMENTS } from '@yyc3/music-data'

const track: Track = DEMO_PLAYLIST[0]
const lyrics: LyricLine[] = track.lyrics
const emotion: Emotion = 'calm'
console.log(ACHIEVEMENTS.length)
```

## 导出清单

- 类型：Track、LyricLine、Emotion、MediaMode、UserProfileData、AuthUser
- 组件 Props 类型：PlayerControlsProps、MediaDisplayProps、LyricsDisplayProps、CommunityFeedProps、AIAssistantProps、CreationStudioProps 等 40+
- 运行时数据：DEMO_PLAYLIST、ACHIEVEMENTS、dMusicLogo、dMusicGold、dMusicInstruments、dMusicRed、artistWarm、artistBlue
- 本地数据：localLibrary（收藏/歌单/队列）、localAudio（IndexedDB 音频）、libraryScanner（曲库扫描）

## 关键 API

| 名称 | 说明 |
| --- | --- |
| `DEMO_PLAYLIST` | 演示歌单（Track[]），用于本地开发与测试夹具 |
| `ACHIEVEMENTS` | 成就定义表（含阈值、星力奖励） |
| `Track / LyricLine` | 跨包共享的数据契约，所有音乐域包以此为类型基线 |
| `scanLibrary(entries)` | 文件清单 → 曲目元数据；扩展名过滤、路径与内容指纹去重、专辑归组、情绪/流派推断与分组统计 |
| `parseFileName(fileName)` | 从「艺术家 - 标题」形式的文件名拆出艺术家与标题，无分隔符时艺术家回落为「未知艺术家」 |

## 说明

本包无副作用（纯类型与常量），可安全被服务端与客户端同时引用。

## 兼容性

- React 19+（组件包 peer 依赖）
- TypeScript 5.6+ / Node.js 20.19+
- 现代浏览器（Chrome/Edge/Safari/Firefox 最近两个大版本）

## 开发与验证

```bash
pnpm --filter @yyc3/music-data build
pnpm --filter @yyc3/music-data typecheck
pnpm --filter @yyc3/music-data lint
pnpm test:coverage
```

## 许可证

MIT © 2026 YanYuCloudCube™（YYC³）

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来 — Words Initiate Quadrants, Language Serves as Core for Future<br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
