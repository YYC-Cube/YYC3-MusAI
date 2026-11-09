---
'@yyc3/music-data': minor
---

新增本地音频持久化：`saveLocalAudio` / `getLocalAudio` / `deleteLocalAudio` / `listLocalAudioIds`，将导入文件与曲目元数据写入 IndexedDB，用于刷新后重建失效的 blob URL。
