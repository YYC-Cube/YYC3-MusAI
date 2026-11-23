# @yyc3/music-utils

> 本地/远端 API 适配、会话存储、端到端加密、偏好同步、Canvas 性能注册表与监控。

| 属性 | 值 |
| --- | --- |
| 定位 | 基础工具层 |
| 许可证 | MIT |
| 仓库 | https://github.com/YYC-Cube/YYC3-MusAI |

## 安装

```bash
pnpm add @yyc3/music-utils
```

## 快速开始

```tsx
import { apiFetch, getSession, loadPrefs, savePref } from '@yyc3/music-utils'

const stats = await apiFetch<{ plays: number }>('/api/stats')
savePref('theme', 'aurora')
const prefs = loadPrefs()
const session = getSession()
```

## 导出清单

- apiClient：API_BASE、LOCAL_MODE、apiFetch、apiFetchStrict、ApiError、isAbortError
- session：getSession、setSession、clearSession、getAccessToken
- crypto：generateKeyPair、encryptMessage、decryptMessage、createKeyBackup 等 E2E 密钥 API
- preferences：loadPrefs、loadPref、savePref、savePrefs、pullPrefsFromKV
- canvasPerfRegistry：getCanvasPerf、setCanvasPerf
- aiEndpoints：isLocalDeployment、getOllamaUrl、getOllamaChatUrl、getOllamaTagsUrl、getOllamaEndpointInfo
- monitoring.js：性能与错误采集

## 关键 API

| 名称 | 说明 |
| --- | --- |
| `apiFetch<T>(path, init?)` | 统一请求封装；支持 `signal` 取消，未配置后端时进入 LOCAL_MODE |
| `apiFetchStrict<T>(path, init?)` | 同上，失败抛出 `ApiError`；中止时抛出 `AbortError` |
| `getSession()` | 读取当前会话（localStorage 持久化，无环境退回内存） |
| `setSession(session)` | 登录成功后写入 `{ accessToken, user }` |
| `clearSession()` | 登出时清除会话 |
| `isAbortError(error)` | 判断请求是否被主动中止 |
| `getSharedAudioContext()` | 全应用共享 AudioContext（懒创建、自动重建） |
| `resumeSharedAudioContext()` | 在用户手势内 resume；被浏览器拒绝时保留 suspended |
| `disposeSharedAudioContext()` | 关闭并释放共享上下文，可重复调用 |
| `encryptMessage / decryptMessage` | 基于 WebCrypto 的端到端加解密，密钥本地持久化 |
| `savePref(key, value)` | 本地优先写入并按需同步到后端 KV |
| `getCanvasPerf / setCanvasPerf` | 跨组件共享 Canvas 帧率与耗时指标 |
| `getOllamaUrl(subPath, opts?)` | 解析 Ollama 端点：本地部署走同源代理（`VITE_OLLAMA_PROXY_PATH`），远端走直连（`VITE_OLLAMA_BASE_URL`） |

## 说明

API_BASE 为空时自动进入 LOCAL_MODE，便于离线开发；生产环境通过环境变量注入后端地址。

取消语义：`apiFetch`/`apiFetchStrict` 接受标准 `RequestInit.signal`；重试与 429 退避均可在等待期间被中止，中止不会重试，也不会打印告警。`aiApi`、`sttApi`、`voiceApi` 的写操作均支持传入 `signal`。

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
