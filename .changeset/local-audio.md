---
'@yyc3/music-data': minor
---

新增本地音频持久化：`saveLocalAudio` / `getLocalAudio` / `deleteLocalAudio` / `listLocalAudioIds`，将导入文件与曲目元数据写入 IndexedDB，用于刷新后重建失效的 blob URL。

同时提供 `pruneLocalAudio(keepIds)` 回收不再被队列或歌单引用的文件，以及 `getAudioStorageUsage()` 查询源占用与配额；写入失败（配额不足或环境不支持）时返回 `false` 并给出告警。
