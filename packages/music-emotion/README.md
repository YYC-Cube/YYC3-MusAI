# @yyc3/music-emotion

> 小语角色、气泡、情绪映射与语音播放 Hook。

| 属性 | 值 |
| --- | --- |
| 版本 | 2.0.0 |
| 定位 | 情感角色系统（小语） |
| 许可证 | MIT |
| 仓库 | https://github.com/YYC-Cube/YYC3-MusAI |

## 安装

```bash
pnpm add @yyc3/music-emotion react
```

## 快速开始

```tsx
import XiaoyuCharacter, { XiaoyuBubble, getEmotionUI } from '@yyc3/music-emotion'

export function Companion() {
  const ui = getEmotionUI('happy')
  return (
    <>
      <XiaoyuCharacter userEmotion="happy" />
      <XiaoyuBubble message={ui.label} />
    </>
  )
}
```

## 导出清单

- XiaoyuCharacter（默认导出）、XiaoyuBubble（默认导出）
- useXiaoyuVoice（默认导出）
- emotionUIMap、getEmotionUI、getEmotionColor
- XiaoyuEmotionType 等类型

## 关键 API

| 名称 | 说明 |
| --- | --- |
| `XiaoyuCharacter` | userEmotion、animationData、animationSrc；内置兜底动画，固定定位可拖拽（限制在视口内） |
| `useXiaoyuVoice()` | playEmotionSound、playVoice、playVoiceWithEmotion、isPlaying、cleanup |
| `getEmotionUI(emotion)` | 返回文案、颜色与动效配置 |

## 说明

`XiaoyuCharacter` 默认使用包内内置的 Lottie 动画，**不依赖**应用的 `public` 目录或 `@/` 别名；如需自定义：

```tsx
// 方式一：传入已解析的动画数据（推荐，无网络请求）
<XiaoyuCharacter userEmotion="happy" animationData={myLottieJson} />

// 方式二：传入地址，按 document.baseURI 解析，失败时回退内置动画
<XiaoyuCharacter userEmotion="happy" animationSrc="/assets/animations/xiaoyu-happy.json" />
```

语音音效仍位于宿主应用的 `/assets/sounds/*.wav`，需由宿主提供。

## 兼容性

- React 19+（组件包 peer 依赖）
- TypeScript 5.6+ / Node.js 20.19+
- 现代浏览器（Chrome/Edge/Safari/Firefox 最近两个大版本）

## 开发与验证

```bash
pnpm --filter @yyc3/music-emotion build
pnpm --filter @yyc3/music-emotion typecheck
pnpm --filter @yyc3/music-emotion lint
pnpm test:coverage
```

## 许可证

MIT © 2026 YanYuCloudCube™（YYC³）

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来 — Words Initiate Quadrants, Language Serves as Core for Future<br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
