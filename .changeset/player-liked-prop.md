---
'@yyc3/music-player': patch
---

`PlayerControls` 与 `MobilePlayer` 新增可选 `liked` 属性：用于渲染收藏态与 `aria-pressed`，未传时按 `mValue > 0` 推断，保持向后兼容。
