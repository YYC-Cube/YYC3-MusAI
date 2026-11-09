---
'@yyc3/music-player': minor
'@yyc3/music-hooks': minor
---

新增 `CoverFlow` 3D 封面流组件：拖拽与惯性切换、键盘导航、封面倒影/高光/地面光晕、封面回退与加载态，并支持受控（`selectedId` / `selectedIndex`）与非受控（`defaultSelectedIndex`）选中。

新增 `useResponsive` 响应式断点 hook：订阅视口变化，输出 `width/height` 与 `isMobile/isTablet/isDesktop`，断点可配置，SSR 有初始值兜底。
