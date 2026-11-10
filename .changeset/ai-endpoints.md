---
'@yyc3/music-utils': minor
---

新增 Ollama 端点解析：`isLocalDeployment` / `getOllamaUrl` / `getOllamaChatUrl` / `getOllamaTagsUrl` / `getOllamaEndpointInfo`。

本地部署走同源代理（`VITE_OLLAMA_PROXY_PATH`），远端走直连（`VITE_OLLAMA_BASE_URL`），支持参数覆盖以便测试与 n1/n2 多实例切换；零第三方依赖。
