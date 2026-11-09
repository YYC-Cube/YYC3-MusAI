# @yyc3/music-growth

> 星力面板、星力商城、排行榜、成就与 IP 矩阵。

| 属性 | 值 |
| --- | --- |
| 版本 | 2.0.0 |
| 定位 | 成长体系组件 |
| 许可证 | MIT |
| 仓库 | https://github.com/YYC-Cube/YYC3-MusAI |

## 安装

```bash
pnpm add @yyc3/music-growth react
```

## 快速开始

```tsx
import { StarPowerPanel, LeaderboardPanel, AchievementsPanel } from '@yyc3/music-growth'

export function Growth({ open, close, user, sp, setSp }: any) {
  return (
    <>
      <StarPowerPanel isOpen={open} onClose={close} user={user} starPower={sp} onStarPowerUpdate={setSp} />
      <LeaderboardPanel isOpen={open} onClose={close} user={user} />
      <AchievementsPanel isOpen={open} onClose={close} user={user} />
    </>
  )
}
```

## 导出清单

- StarPowerPanel
- StarPowerShop
- LeaderboardPanel
- AchievementsPanel
- IPMatrixPanel

## 关键 API

| 名称 | 说明 |
| --- | --- |
| `StarPowerPanel` | isOpen、onClose、user、starPower、onStarPowerUpdate、onOpenShop |
| `IPMatrixPanel` | isOpen、onClose、user、profile、starPower、onOpenCreationStudio |
| `AchievementsPanel` | 成就进度与解锁状态，数据源为 music-data 的 ACHIEVEMENTS |

## 说明

成长体系依赖统一的用户与星力模型；成就定义集中在 `@yyc3/music-data`，避免多处漂移。

## 兼容性

- React 19+（组件包 peer 依赖）
- TypeScript 5.6+ / Node.js 20.19+
- 现代浏览器（Chrome/Edge/Safari/Firefox 最近两个大版本）

## 开发与验证

```bash
pnpm --filter @yyc3/music-growth build
pnpm --filter @yyc3/music-growth typecheck
pnpm --filter @yyc3/music-growth lint
pnpm test:coverage
```

## 许可证

MIT © 2026 YanYuCloudCube™（YYC³）

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来 — Words Initiate Quadrants, Language Serves as Core for Future<br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
