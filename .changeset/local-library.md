---
'@yyc3/music-data': minor
---

新增本地曲库数据层 `localLibrary`：收藏（`getFavoriteIds` / `isFavorite` / `toggleFavorite`）、歌单（`getSavedPlaylists` / `savePlaylist` / `deletePlaylist`）与播放队列快照（`getSavedQueue` / `saveQueue`），全部经由 `localApiFetch` 落本地缓存，收藏去重幂等、同名歌单按稳定 id 覆盖、损坏数据按空库处理。
