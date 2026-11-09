# @yyc3/music-ui

> shadcn/ui + Radix UI 基件与 D-Music 设计层（DButton / DCard / 数据可视化等），六主题可切换。

| 属性 | 值 |
| --- | --- |
| 版本 | 2.0.0 |
| 定位 | UI 基础组件库 |
| 许可证 | MIT |
| 仓库 | https://github.com/YYC-Cube/YYC3-MusAI |

## 安装

```bash
pnpm add @yyc3/music-ui react react-dom
```

## 快速开始

```tsx
import { DButton, DCard, DBadge, StarPowerChart } from '@yyc3/music-ui'

export function Demo() {
  return (
    <DCard variant="glass" padding="md">
      <DBadge variant="accent" size="sm">Pro</DBadge>
      <DButton variant="primary" onClick={() => console.log('play')}>开始播放</DButton>
      <StarPowerChart data={[{ name: 'Mon', value: 12 }, { name: 'Tue', value: 18 }]} />
    </DCard>
  )
}
```

## 导出清单

- 48 个 shadcn/Radix 基件：accordion、alert、dialog、dropdown-menu、form、select、sheet、sidebar、table、tabs、tooltip 等
- D-Music 设计层：DButton、DInput、DCard、DMusicCard、DUserCard、DAchievementCard、DProgress、AchievementRing、DFeedback、DSpinner、DBadge、DTag、DEmptyState、DList、DModal、DTabBar、DToast、DBreadcrumb、DPanel、DMusicShowcase
- 数据可视化：StarPowerChart、EmotionPieChart、PlayStatsChart、AchievementGrid、SparklineChart、StatCard、RankingList、DataExportButton
- 工具：ImageWithFallback、ChartConfig（类型）

## 关键 API

| 名称 | 说明 |
| --- | --- |
| `DButton` | variant: 'primary' | 'secondary' | 'ghost' | 'danger'；透传原生 button 属性 |
| `DCard` | variant: 'default' | 'glass'；interactive、padding |
| `DBadge` | variant: 'accent' | 'emotion' 等；size: 'xs' | 'sm' | 'md' |
| `StarPowerChart` | data: Array<{ name: string; value: number }>，基于 Recharts |
| `ChartConfig` | 图表颜色与标签配置类型 |

## 说明

组件使用 Tailwind CSS 原子类，宿主应用需启用 Tailwind（推荐 v4）。主题令牌来自 `@yyc3/music-design-tokens`，暗色模式通过 `next-themes` 的 class 策略切换。

## 兼容性

- React 19+（组件包 peer 依赖）
- TypeScript 5.6+ / Node.js 20.19+
- 现代浏览器（Chrome/Edge/Safari/Firefox 最近两个大版本）

## 开发与验证

```bash
pnpm --filter @yyc3/music-ui build
pnpm --filter @yyc3/music-ui typecheck
pnpm --filter @yyc3/music-ui lint
pnpm test:coverage
```

## 许可证

MIT © 2026 YanYuCloudCube™（YYC³）

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来 — Words Initiate Quadrants, Language Serves as Core for Future<br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
