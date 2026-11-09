# @yyc3/music-hooks

> 音频引擎、离线作曲、AI 助手、触感、i18n、PWA、手势与虚拟列表等可复用逻辑。

| 属性 | 值 |
| --- | --- |
| 版本 | 2.0.0 |
| 定位 | 交互逻辑层（9 Hooks） |
| 许可证 | MIT |
| 仓库 | https://github.com/YYC-Cube/YYC3-MusAI |

## 安装

```bash
pnpm add @yyc3/music-hooks react
```

## 快速开始

```tsx
import { useAudioEngine, useHaptics, usePWA, I18nProvider } from '@yyc3/music-hooks'

function Player() {
  const engine = useAudioEngine({ duration: 180, initialVolume: 0.8 })
  const haptics = useHaptics()
  const pwa = usePWA()

  return (
    <button onClick={() => { engine.togglePlayPause(); haptics.trigger('light') }}>
      {engine.isPlaying ? '暂停' : '播放'} · {pwa.isOnline ? '在线' : '离线'}
    </button>
  )
}
```

## 导出清单

- useAudioEngine / useAudioComposer（WebAudio 与 OfflineAudioContext 作曲）
- useAIAssistant（行为快照、提示与语音命令）
- useHaptics、useI18n + I18nProvider、i18n-translations
- usePWA、useSwipeGesture、useVirtualList

## 关键 API

| 名称 | 说明 |
| --- | --- |
| `useAudioEngine(config)` | 返回 isPlaying/currentTime/duration/volume/frequencyData/audioEnergy 与 play/pause/seek/setVolume/loadAudioFile；AudioContext 由 `@yyc3/music-utils` 全应用共享 |
| `useAudioComposer()` | compose(params) 离线渲染并返回 WAV Blob URL；含 progress / error 状态 |
| `useAIAssistant(config)` | 返回提示列表、会话洞察与语音命令执行入口 |
| `useHaptics()` | trigger(pattern)、vibrate(ms)、cancel()，不支持时自动降级为 no-op |
| `usePWA()` | isStandalone / isOnline / canInstall / installApp() 等 |

## 说明

所有 Hook 在无浏览器 API（SSR / Node）时降级为安全 no-op；音频相关 Hook 需在用户手势后启动。

## 兼容性

- React 19+（组件包 peer 依赖）
- TypeScript 5.6+ / Node.js 20.19+
- 现代浏览器（Chrome/Edge/Safari/Firefox 最近两个大版本）

## 开发与验证

```bash
pnpm --filter @yyc3/music-hooks build
pnpm --filter @yyc3/music-hooks typecheck
pnpm --filter @yyc3/music-hooks lint
pnpm test:coverage
```

## 许可证

MIT © 2026 YanYuCloudCube™（YYC³）

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来 — Words Initiate Quadrants, Language Serves as Core for Future<br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
