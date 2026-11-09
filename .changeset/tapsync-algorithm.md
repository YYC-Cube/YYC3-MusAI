---
'@yyc3/music-lyrics': minor
---

新增打拍生成歌词时间轴算法：`normalizeTaps` 拍点清洗、`assignTimestamps` 行时间分配（支持 offset 与拍点补齐）、`serializeLrc` 序列化为可被 `parseLrc` 还原的 LRC 文本。
