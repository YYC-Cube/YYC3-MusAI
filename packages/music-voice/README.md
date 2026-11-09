# @yyc3/music-voice

> 多语言管理、语音识别、语音合成、命令解析与上下文五引擎 + 控制面板。

| 属性 | 值 |
| --- | --- |
| 版本 | 2.0.0 |
| 定位 | 语音交互系统 |
| 许可证 | MIT |
| 仓库 | https://github.com/YYC-Cube/YYC3-MusAI |

## 安装

```bash
pnpm add @yyc3/music-voice react
```

## 快速开始

```tsx
import { VoiceControlPanel } from '@yyc3/music-voice'
import { SpeechRecognitionEngine, VoiceCommandProcessor } from '@yyc3/music-voice'

const recognizer = new SpeechRecognitionEngine({ lang: 'zh-CN', continuous: true })
const commands = new VoiceCommandProcessor()

export function VoiceBar() {
  return <VoiceControlPanel />
}
```

## 导出清单

- MultilingualManager、SpeechRecognitionEngine、SpeechSynthesisEngine
- VoiceCommandProcessor、VoiceContextManager
- VoiceControlPanel

## 关键 API

| 名称 | 说明 |
| --- | --- |
| `SpeechRecognitionEngine` | `start(signal?: AbortSignal)`、`stop()`、`SpeechRecognitionConfig`；abort 时自动停止识别 |
| `SpeechSynthesisEngine` | SpeechSynthesisConfig（voice、rate、pitch、volume）与 speak/cancel |
| `VoiceCommandProcessor` | 意图模式匹配与命令分发 |
| `VoiceContextManager` | 多轮对话上下文与规则 |
| `VoiceControlPanel` | 零配置控制面板，内部装配五个引擎 |

## 说明

浏览器语音能力需 HTTPS 与用户授权；不支持时引擎会返回明确的降级状态而不是抛错。

## 兼容性

- React 19+（组件包 peer 依赖）
- TypeScript 5.6+ / Node.js 20.19+
- 现代浏览器（Chrome/Edge/Safari/Firefox 最近两个大版本）

## 开发与验证

```bash
pnpm --filter @yyc3/music-voice build
pnpm --filter @yyc3/music-voice typecheck
pnpm --filter @yyc3/music-voice lint
pnpm test:coverage
```

## 许可证

MIT © 2026 YanYuCloudCube™（YYC³）

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来 — Words Initiate Quadrants, Language Serves as Core for Future<br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
