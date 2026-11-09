---
'@yyc3/music-hooks': patch
---

修复 `useVirtualList` 在列表变长时不补足初始窗口的问题：数据量增加且仍在 `initialCount` 内时，可见数量同步提升，新增条目不再被截断。
