# @yyc3/music-design-tokens

> 六主题（deep-space / aurora / ocean / light / midnight / custom）与配色、排版、间距、动效、可访问性令牌。

| 属性 | 值 |
| --- | --- |
| 版本 | 2.0.0 |
| 定位 | 设计令牌与主题引擎 |
| 许可证 | MIT |
| 仓库 | https://github.com/YYC-Cube/YYC3-MusAI |

## 安装

```bash
pnpm add @yyc3/music-design-tokens
```

## 快速开始

```tsx
import { applyTheme, getTheme, THEME_IDS } from '@yyc3/music-design-tokens'

applyTheme('aurora')            // 将 CSS 变量写入 :root
const t = getTheme('deep-space') // 读取主题定义
console.log(THEME_IDS, t.colors.primary)
```

## 导出清单

- 令牌：COLOR_ROLES、DATA_VIZ_COLORS、EMOTION_COLORS、TYPOGRAPHY、SPACING、RADIUS、SHADOWS、ANIMATION、BREAKPOINTS、Z_INDEX、COMPONENT_TOKENS、WCAG
- 主题：THEMES、THEME_IDS、ThemeId、ThemeDefinition、applyTheme、getTheme
- 自定义：CustomThemeConfig、loadCustomTheme、saveCustomTheme

## 关键 API

| 名称 | 说明 |
| --- | --- |
| `applyTheme(id: ThemeId)` | 把主题令牌写入 CSS 变量，组件无需感知主题细节 |
| `getTheme(id)` | 只读获取主题定义（不产生副作用） |
| `WCAG` | 对比度与触达尺寸基线常量，供 a11y 用例断言 |

## 说明

令牌以 CSS 变量为出口，组件只消费变量，便于运行时换肤与视觉回归。

## 兼容性

- React 19+（组件包 peer 依赖）
- TypeScript 5.6+ / Node.js 20.19+
- 现代浏览器（Chrome/Edge/Safari/Firefox 最近两个大版本）

## 开发与验证

```bash
pnpm --filter @yyc3/music-design-tokens build
pnpm --filter @yyc3/music-design-tokens typecheck
pnpm --filter @yyc3/music-design-tokens lint
pnpm test:coverage
```

## 许可证

MIT © 2026 YanYuCloudCube™（YYC³）

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来 — Words Initiate Quadrants, Language Serves as Core for Future<br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
