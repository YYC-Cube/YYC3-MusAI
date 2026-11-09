# @yyc3/music-utils

> 本地/远端 API 适配、Supabase 客户端、端到端加密、偏好同步、Canvas 性能注册表与监控。

| 属性 | 值 |
| --- | --- |
| 版本 | 2.0.0 |
| 定位 | 基础工具层 |
| 许可证 | MIT |
| 仓库 | https://github.com/YYC-Cube/YYC3-MusAI |

## 安装

```bash
pnpm add @yyc3/music-utils
```

## 快速开始

```tsx
import { apiFetch, supabase, loadPrefs, savePref } from '@yyc3/music-utils'

const stats = await apiFetch<{ plays: number }>('/api/stats')
savePref('theme', 'aurora')
const prefs = loadPrefs()
const session = await supabase.auth.getSession()
```

## 导出清单

- supabase：API_BASE、LOCAL_MODE、apiFetch、apiFetchStrict、ApiError、supabase 客户端门面
- crypto：generateKeyPair、encryptMessage、decryptMessage、createKeyBackup 等 E2E 密钥 API
- preferences：loadPrefs、loadPref、savePref、savePrefs、pullPrefsFromKV
- canvasPerfRegistry：getCanvasPerf、setCanvasPerf
- monitoring.js：性能与错误采集

## 关键 API

| 名称 | 说明 |
| --- | --- |
| `apiFetch<T>(path, init?)` | 统一请求封装；未配置后端时进入 LOCAL_MODE 并使用本地实现 |
| `encryptMessage / decryptMessage` | 基于 WebCrypto 的端到端加解密，密钥本地持久化 |
| `savePref(key, value)` | 本地优先写入并按需同步到 Supabase KV |
| `getCanvasPerf / setCanvasPerf` | 跨组件共享 Canvas 帧率与耗时指标 |

## 说明

API_BASE 为空时自动进入 LOCAL_MODE，便于离线开发；生产环境通过环境变量注入后端地址。

## 兼容性

- React 19+（组件包 peer 依赖）
- TypeScript 5.6+ / Node.js 20.19+
- 现代浏览器（Chrome/Edge/Safari/Firefox 最近两个大版本）

## 开发与验证

```bash
pnpm --filter @yyc3/music-utils build
pnpm --filter @yyc3/music-utils typecheck
pnpm --filter @yyc3/music-utils lint
pnpm test:coverage
```

## 许可证

MIT © 2026 YanYuCloudCube™（YYC³）

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来 — Words Initiate Quadrants, Language Serves as Core for Future<br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
