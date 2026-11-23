# @yyc3/music-testing

> 自研 TestSuite 运行器与单元/集成/E2E 三档测试定义（150+ 用例）。

| 属性 | 值 |
| --- | --- |
| 定位 | 测试套件与运行器 |
| 许可证 | MIT |
| 仓库 | https://github.com/YYC-Cube/YYC3-MusAI |

## 安装

```bash
pnpm add -D @yyc3/music-testing
```

## 快速开始

```tsx
import { createSuite, assertEqual, printResults } from '@yyc3/music-testing'

const suite = createSuite('math')
suite.test('adds', () => {
  assertEqual(1 + 1, 2)
})

printResults([suite.run()])
```

## 导出清单

- createSuite、assert、assertEqual、assertDeepEqual、assertThrows、assertTruthy、assertContains、assertInRange、printResults
- core-tests、full-test-suite（预置套件定义）
- TestResult、TestSuiteResult 类型

## 关键 API

| 名称 | 说明 |
| --- | --- |
| `createSuite(name)` | 返回 { test(name, fn), run() } |
| `assertEqual(actual, expected)` | 轻量断言，失败抛出 AssertionError 信息 |
| `printResults(suites)` | 控制台汇总通过/失败/耗时 |

## 说明（双轨模型，W7-P2-2 收敛）

本包采用「场景库 + 单一执行通道」双轨模型：

- `src/`＝**验收场景库**：TestSuite 定义数据即用例（core-tests / full-test-suite / e2e-specs，150+ 场景），供浏览器内与无框架环境冒烟验证；作为纯定义数据已豁免根 vitest 覆盖率计量
- `test/`＝**唯一执行通道**：全部经根 Vitest 运行（含 runner/断言器/场景抽样的单元测试），覆盖率门禁 85% 只计此处实现代码
- `legacy/`＝**历史夹具隔离区**：仅存档不再执行

新增验收场景请写入 `src/`（数据），并同步在 `test/` 落一个 Vitest 用例保证可执行性。

## 兼容性

- React 18+（与各组件包 peer 依赖一致）
- TypeScript 5.6+ / Node.js 20.19+
- 现代浏览器（Chrome/Edge/Safari/Firefox 最近两个大版本）

## 开发与验证

```bash
pnpm --filter @yyc3/music-testing build
pnpm --filter @yyc3/music-testing typecheck
pnpm --filter @yyc3/music-testing lint
pnpm test:coverage
```

## 许可证

MIT © 2026 YanYuCloudCube™（YYC³）

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来 — Words Initiate Quadrants, Language Serves as Core for Future<br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
