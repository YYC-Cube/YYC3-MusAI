---
'@yyc3/music-utils': minor
---

新增本地模式数据契约（`isLocalMode` / `setLocalMode` / `localApiFetch` / `getLocalStats` / `clearLocalData`）：以 `yyc3:music:local:` 统一前缀持久化缓存，GET 读缓存（未命中或 JSON 损坏返回 null），写入请求落盘并返回稳定 `id`，DELETE 幂等返回 `{ success: true }`，中止时抛 `AbortError`，非浏览器环境退回内存 Map。

`apiFetch` 增加降级：本地模式开启时不发网络请求；远程失败（非中止）时若该 path 有本地缓存则返回缓存值，否则维持 null。`apiFetchStrict` 不参与降级，失败照旧抛 `ApiError`。
