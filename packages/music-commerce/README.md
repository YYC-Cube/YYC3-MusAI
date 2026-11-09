# @yyc3/music-commerce

> 二级市场、专辑商店与版权面板。

| 属性 | 值 |
| --- | --- |
| 版本 | 2.0.0 |
| 定位 | 商业组件 |
| 许可证 | MIT |
| 仓库 | https://github.com/YYC-Cube/YYC3-MusAI |

## 安装

```bash
pnpm add @yyc3/music-commerce react
```

## 快速开始

```tsx
import { AlbumStore, SecondaryMarket, CopyrightPanel } from '@yyc3/music-commerce'

export function Commerce({ open, close, user, starPower, setStarPower }: any) {
  return (
    <>
      <AlbumStore isOpen={open} onClose={close} user={user} starPower={starPower} onStarPowerUpdate={setStarPower} />
      <SecondaryMarket isOpen={open} onClose={close} user={user} starPower={starPower} onStarPowerUpdate={setStarPower} />
      <CopyrightPanel isOpen={open} onClose={close} user={user} />
    </>
  )
}
```

## 导出清单

- SecondaryMarket
- AlbumStore
- CopyrightPanel

## 关键 API

| 名称 | 说明 |
| --- | --- |
| `AlbumStore` | isOpen、onClose、user、starPower、onStarPowerUpdate |
| `SecondaryMarket` | 同上，交易结果通过 onStarPowerUpdate 回流 |
| `CopyrightPanel` | isOpen、onClose、user |

## 说明

星力（StarPower）作为统一货币由宿主持有，组件只发起变更请求，不直接修改余额。

## 兼容性

- React 19+（组件包 peer 依赖）
- TypeScript 5.6+ / Node.js 20.19+
- 现代浏览器（Chrome/Edge/Safari/Firefox 最近两个大版本）

## 开发与验证

```bash
pnpm --filter @yyc3/music-commerce build
pnpm --filter @yyc3/music-commerce typecheck
pnpm --filter @yyc3/music-commerce lint
pnpm test:coverage
```

## 许可证

MIT © 2026 YanYuCloudCube™（YYC³）

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来 — Words Initiate Quadrants, Language Serves as Core for Future<br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
