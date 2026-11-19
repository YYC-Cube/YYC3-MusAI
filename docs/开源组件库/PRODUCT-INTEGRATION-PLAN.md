# YYC³ 产品对接计划 — 基于 SCENARIO-ASSESSMENT.md 的 10 个场景

本文档将已集成包组的 17 个资产条目映射到 10 个具体产品场景，给出每个场景的功能范围、接口定义、数据流向与验收标准，供后续落地开发直接参考。

---

## 概览：10 个场景与支撑包组

| 场景ID | 场景名称 | 完整性 | 可落地程度 | 核心支撑包 |
|--------|----------|--------|------------|------------|
| SCE-001 | 音乐播放器（Web/移动端） | ★★★★★ | 立即可用 | music-player, music-audio, music-lyrics, music-ui, music-hooks, music-design-tokens |
| SCE-002 | 社交社区/动态信息流 | ★★★★☆ | 立即可用 | music-community, music-ui, music-hooks |
| SCE-003 | 直播间/实时互动 | ★★★★☆ | 立即可用 | music-community, music-live, music-server |
| SCE-004 | 媒体流媒体（点播/直播） | ★★★★☆ | 立即可用 | music-server, music-player, music-audio |
| SCE-005 | 运营数据看板 | ★★★★☆ | 立即可用 | music-community |
| SCE-006 | 综艺制作/MV 程序化生成 | ★★★☆☆ | 可演示 | music-mv |
| SCE-007 | 音乐库扫描/媒体资产管理 | ★★★★☆ | 立即可用 | music-data |
| SCE-008 | 歌词显示/波形可视化 | ★★★★★ | 立即可用 | music-lyrics, music-player |
| SCE-009 | 全局搜索/命令面板 | ★★★★☆ | 立即可用 | music-ui |
| SCE-010 | 表情反应/社交互动 | ★★★★☆ | 立即可用 | music-community |

---

## SCE-001 音乐播放器（Web/移动端）

**定位**：YYC³ D-Music 核心播放产品，提供 Web 端与移动端的完整音乐播放体验。

### 功能范围
1. 媒体展示：专辑封面、歌曲信息、播放进度、音量控制
2. 播放控制：播放/暂停、上一首/下一首、循环模式、随机播放
3. 移动端播放器：底部迷你播放器、全屏播放器、锁屏控件
4. 音频可视化：实时频谱、情绪光晕、波形动画
5. 歌单管理：dnd-kit 拖拽排序、TanStack Virtual 长列表
6. 全局搜索：CmdKPalette 命令面板（Cmd+K/Ctrl+K）
7. 通知反馈：Sonner Toast（操作成功/失败/提示）

### 接口定义
| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 播放状态查询 | GET | `/api/music/playback/status` | 当前播放歌曲、进度、状态 |
| 播放控制 | POST | `/api/music/playback/play\|pause\|next\|prev` | 播放控制指令 |
| 媒体文件流 | GET | `/upload/media/:id/file` | Range 请求支持，音频文件流式传输 |
| 歌单排序 | PATCH | `/api/music/playlist/:id/order` | dnd-kit 拖拽排序持久化 |

### 数据流
```
用户操作 → music-ui (CmdK/Drawer/Toast) → music-hooks (useAudioEngine/useVirtualList) → music-player (MediaDisplay/Video.js) → music-server (/upload/media/:id/file)
```

### 验收标准
- [ ] 1000 首歌曲列表 60fps 无卡顿（TanStack Virtual）
- [ ] HLS 音频流起播 < 1.5s（hls.js 降级原生 Audio）
- [ ] 波形-歌词同步误差 < 80ms（WaveSurfer.js）
- [ ] dnd-kit 歌单拖拽排序持久化成功
- [ ] CmdK 全局搜索响应 < 200ms
- [ ] typecheck/lint 全绿

---

## SCE-002 社交社区/动态信息流

**定位**：基于 Misskey 交互模型的社区信息流，支持动态发布、点赞、表情反应、主题化展示。

### 功能范围
1. 信息流展示：CommunityFeed 动态列表，支持上拉刷新、下拉加载
2. 表情反应：ReactionBar（❤️/🔥/😂/👏/🎵/✨），受控状态、计数显示、乐观更新
3. 主题化：深色/浅色主题切换，D-Music 设计令牌
4. 动态发布：文字+音乐+封面，支持 @ 用户、# 话题
5. 互动统计：播放数、点赞数、评论数、转发数

### 接口定义
| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取信息流 | GET | `/api/community/feed` | 分页返回动态列表 |
| 表情反应 | POST | `/api/community/activity/:id/reaction` | 添加/移除表情反应 |
| 发布动态 | POST | `/api/community/activity` | 创建新动态 |
| 动态详情 | GET | `/api/community/activity/:id` | 获取单条动态详情 |

### 数据流
```
用户发布动态 → music-community (CommunityFeed) → music-server (/api/community/activity) → PostgreSQL → WebSocket 广播 → 其他用户 CommunityFeed 实时更新
```

### 验收标准
- [ ] 表情反应计数实时更新（WebSocket 广播）
- [ ] 乐观更新：点击表情后立即显示，失败回滚
- [ ] 信息流分页加载，1000+ 条动态 60fps
- [ ] 主题切换无闪烁，D-Music 设计令牌一致
- [ ] typecheck/lint 全绿

---

## SCE-003 直播间/实时互动

**定位**：基于 Owncast 推流模型的实时直播间，支持 HLS 播放、弹幕、表情、礼物、审核、在线人数。

### 功能范围
1. 直播间主界面：LiveRoom（HLS 播放占位 + 底部交互栏 + 弹幕看板）
2. 弹幕看板：DanmakuBoard，滚动弹幕、颜色/大小/位置随机
3. 表情面板：EmojiPanel，表情选择、发送
4. 礼物面板：GiftPanel，礼物列表、发送动画
5. 在线人数：ViewerCount，实时显示当前观众数
6. 审核面板：ModerationPanel，房主/管理员操作（禁言、踢出、审核弹幕）
7. 敏感词过滤：弹幕/聊天内容敏感词拦截
8. 频率限制：1 条/秒，防刷

### 接口定义
| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 直播流起始 | POST | `/live/stream/start` | 返回 RTMP 推流地址 + HLS 播放地址 |
| 直播流查询 | GET | `/live/stream/:id` | 查询直播状态 |
| 直播流结束 | POST | `/live/stream/:id/end` | 结束直播 |
| WebSocket 直播 | WS | `/ws/live` | 弹幕/表情/礼物/审核/房间/在线人数 |

### 数据流
```
主播推流 → MediaMTX/SRS (RTMP) → HLS 播放地址 → music-player (Video.js) → 观众端
观众弹幕 → WebSocket /ws/live → music-server (敏感词过滤/频率限制) → 广播 → DanmakuBoard 实时显示
```

### 验收标准
- [ ] 100 并发弹幕无丢失（WebSocket 队列+心跳）
- [ ] 敏感词拦截 100% 命中
- [ ] 频率限制 1 条/秒生效
- [ ] 直播间在线人数实时同步
- [ ] typecheck/lint 全绿

---

## SCE-004 媒体流媒体（点播/直播）

**定位**：基于 MediaMTX/SRS/Owncast 的流媒体服务链路，支持点播 HLS 和直播 RTMP/HLS。

### 功能范围
1. 点播媒体文件：Range 请求支持，音频/视频文件流式传输
2. HLS 自适应流：hls.js 内核，多码率切换
3. 直播推流/拉流：/live/stream 接口分发 RTMP 推流地址 + HLS 播放地址
4. 媒体资产管理：上传、去重、缩略图、时间轴（参考 Immich）
5. 播放内核：Video.js 10 + Media Chrome 控件

### 接口定义
| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 媒体文件流 | GET | `/upload/media/:id/file` | Range 请求，流式传输 |
| 直播流起始 | POST | `/live/stream/start` | 返回 RTMP 推流地址 + HLS 播放地址 |
| 直播流查询 | GET | `/live/stream/:id` | 查询直播状态 |
| 媒体上传 | POST | `/upload/media` | 上传媒体文件，返回媒体 ID |

### 数据流
```
内容上传 → /upload/media → mediaScanner 扫描/去重 → PostgreSQL → /upload/media/:id/file (Range 流) → Video.js 播放
主播推流 → MediaMTX/SRS → HLS → /live/stream/:id (查询) → Video.js 播放
```

### 验收标准
- [ ] Range 请求支持音频/视频拖动进度
- [ ] HLS 多码率自适应切换
- [ ] RTMP 推流地址分发正确
- [ ] 媒体去重：相同文件 hash 不重复存储
- [ ] typecheck/lint 全绿

---

## SCE-005 运营数据看板

**定位**：基于 Tremor/Visx 设计语言的运营数据看板，支持播放趋势、情绪分布、热门歌曲、用户增长可视化。

### 功能范�
1. 指标大数字：总播放、总点赞、总评论、总互动值，带趋势标签
2. 播放趋势折线图：AnalyticsDashboard (recharts) 或 VisxLineChart
3. 情绪分布饼图：AnalyticsDashboard (recharts) 或 VisxPieChart
4. 热门歌曲柱状图：AnalyticsDashboard (recharts) 或 VisxBarChart
5. 用户增长面积图：VisxAreaChart
6. 歌曲明细表：播放/点赞/评论数排序表格

### 接口定义
| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 运营指标 | GET | `/api/analytics/metrics` | 四大指标数值 |
| 播放趋势 | GET | `/api/analytics/trend` | 月度播放/点赞趋势 |
| 情绪分布 | GET | `/api/analytics/emotion` | 情绪分布百分比 |
| 热门歌曲 | GET | `/api/analytics/top-songs` | 播放排行榜 |

### 数据流
```
用户行为 → music-server (埋点) → PostgreSQL → /api/analytics/* → music-community (AnalyticsDashboard/VisxCharts) → 可视化展示
```

### 验收标准
- [ ] 四大指标数值实时更新
- [ ] 播放趋势/情绪分布/热门歌曲图表渲染正确
- [ ] recharts 与 Visx 两套图表可互相切换
- [ ] 歌曲明细表分页排序正常
- [ ] typecheck/lint 全绿

---

## SCE-006 综艺制作/MV 程序化生成

**定位**：基于 revideo (Apache-2.0) 的代码驱动视频编辑，替代 Remotion 商业授权，支持 MV 程序化生成。

### 功能范围
1. MV 场景描述：MvScene 组件，代码驱动画面与动画
2. 主题切换：星场/霓虹/极光/水墨/赛博 5 种主题
3. 歌词同步：根据当前播放时间显示对应歌词行
4. 进度条：MV 播放进度可视化
5. 封面展示：歌曲专辑封面显示

### 接口定义
| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| MV 配置查询 | GET | `/api/mv/config/:id` | 返回 MV 主题、时长、分辨率、曲目 |
| MV 渲染任务 | POST | `/api/mv/render` | 提交 MV 渲染任务（revideo 构建时编译） |

### 数据流
```
用户选择歌曲+主题 → music-mv (MvScene) → revideo 构建时编译为 MP4 → /api/mv/render → 返回 MV 视频 URL → 音乐播放器嵌入播放
```

### 验收标准
- [ ] MvScene 5 种主题切换正常
- [ ] 歌词与播放时间同步
- [ ] 进度条显示正确
- [ ] revideo 构建成功（Apache-2.0 许可）
- [ ] typecheck/lint 全绿
- [ ] 注：实际视频渲染需 revideo 构建时编译，当前为场景描述组件，可演示

---

## SCE-007 音乐库扫描/媒体资产管理

**定位**：基于 Navidrome 架构参考（GPL-3.0，仅架构参考，不引入代码）的媒体库扫描与管理，支持媒体文件扫描、去重、专辑/艺术家聚合。

### 功能范围
1. 媒体文件扫描：扫描本地/网络媒体文件，提取元数据
2. 去重：hashFile 基于内容哈希去重，dedupeByHash
3. 专辑/艺术家聚合：按专辑、艺术家分组
4. 时间轴分组：groupByTimeline 按时间轴分组媒体资产
5. 播放列表构建：buildPlaylist 构建播放列表
6. 18 个类型模块：ai/album/analytics/api-common/challenge/common/copyright/creation/e2ee/economy/gamification/live/playlist/social/spacetime/theme/track/ui/user

### 接口定义
| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 媒体扫描 | POST | `/api/media/scan` | 扫描媒体目录 |
| 媒体列表 | GET | `/api/media/library` | 获取媒体库列表 |
| 媒体详情 | GET | `/api/media/:id` | 获取单个媒体资产详情 |
| 播放列表 | GET | `/api/media/playlist` | 获取构建的播放列表 |

### 数据流
```
媒体文件扫描 → mediaScanner (hashFile/dedupeByHash/groupByTimeline/buildPlaylist) → PostgreSQL → /api/media/* → music-data 类型模块 → 前端展示
```

### 验收标准
- [ ] 媒体文件扫描提取元数据正确
- [ ] 相同文件内容哈希去重（dedupeByHash）
- [ ] 按专辑/艺术家分组正确
- [ ] 时间轴分组（groupByTimeline）按时间排序
- [ ] 播放列表构建（buildPlaylist）正确
- [ ] typecheck/lint 全绿

---

## SCE-008 歌词显示/波形可视化

**定位**：基于 WaveSurfer.js 的音频波形与歌词联动，支持波形-歌词同步、片段循环。

### 功能范围
1. 音频波形渲染：WaveSurfer.js 波形可视化
2. 歌词同步：点击波形跳转歌词、点击歌词跳转波形
3. Regions 区域标记：歌词行对应波形区域
4. 片段循环：选定波形区域循环播放
5. tapSync 与波形时间轴联动：手动标注歌词时间点

### 接口定义
| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 歌词获取 | GET | `/api/lyrics/:songId` | 获取歌曲歌词（LRC 格式） |
| 波形数据 | GET | `/api/waveform/:songId` | 获取音频波形数据 |

### 数据流
```
音频文件 → music-audio (hls.js/原生 Audio) → music-lyrics (WaveSurfer.js 波形) → 歌词同步（点击波形↔歌词） → 片段循环 → tapSync 时间轴标注
```

### 验收标准
- [ ] 波形-歌词同步误差 < 80ms
- [ ] 点击波形跳转对应歌词行
- [ ] 点击歌词跳转对应波形位置
- [ ] 片段循环播放正确
- [ ] typecheck/lint 全绿

---

## SCE-009 全局搜索/命令面板

**定位**：基于 cmdk 的全局搜索命令面板，支持 Cmd+K/Ctrl+K 快捷键触发，分组展示与快捷键提示。

### 功能范围
1. 全局搜索：搜索歌曲、歌单、艺术家、专辑
2. 命令分组：播放控制（播放/暂停/上一首/下一首）、视图（切换歌词/迷你播放器）
3. 快捷键提示：每个命令项显示对应快捷键
4. 空状态：没有匹配结果时的提示

### 接口定义
| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 全局搜索 | GET | `/api/search` | 搜索歌曲、歌单、艺术家、专辑 |

### 数据流
```
用户按 Cmd+K/Ctrl+K → music-ui (CmdKPalette) → /api/search → 搜索结果 → CmdKPalette 展示 → 用户选择 → 跳转到对应页面
```

### 验收标准
- [ ] Cmd+K/Ctrl+K 全局触发命令面板
- [ ] 搜索结果分组展示（播放控制/视图/其他）
- [ ] 快捷键提示正确显示
- [ ] 搜索响应 < 200ms
- [ ] 空状态提示正确
- [ ] typecheck/lint 全绿

---

## SCE-010 表情反应/社交互动

**定位**：基于 Misskey 交互模型的表情反应系统，支持 ❤️/🔥/😂/👏/🎵/✨ 六种表情，受控状态、计数显示、乐观更新。

### 功能范围
1. 表情反应：ReactionBar 受控组件，点击添加/移除表情反应
2. 计数显示：每种表情的用户计数
3. 乐观更新：点击表情后立即显示，服务端失败回滚
4. 表情面板：EmojiPanel 表情选择、发送（直播间场景复用）

### 接口定义
| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 表情反应 | POST | `/api/community/activity/:id/reaction` | 添加/移除表情反应 |
| 反应列表 | GET | `/api/community/activity/:id/reactions` | 获取动态的所有表情反应 |

### 数据流
```
用户点击表情 → music-community (ReactionBar, 乐观更新) → /api/community/activity/:id/reaction → PostgreSQL → WebSocket 广播 → 其他用户 ReactionBar 实时更新计数
```

### 验收标准
- [ ] 六种表情（❤️/🔥/😂/👏/🎵/✨）都可选择
- [ ] 计数显示正确，实时更新
- [ ] 乐观更新：点击后立即显示，失败回滚
- [ ] WebSocket 广播实时同步其他用户
- [ ] typecheck/lint 全绿

---

## 跨场景共享能力

以下能力在多个场景中复用，无需重复开发：

| 能力 | 涉及场景 | 实现方式 |
|------|----------|----------|
| 深色主题 | SCE-001~010 | music-design-tokens 主题令牌 + music-ui 基件 |
| 平滑滚动 | SCE-001, 002 | music-hooks useScrollProgress (Lenis) |
| 响应式布局 | SCE-001~010 | music-hooks useMediaQuery |
| 虚拟长列表 | SCE-001, 002, 005 | music-ui VirtualTrackList (TanStack Virtual) |
| 拖拽排序 | SCE-001 | music-ui playlist-dnd/playlist-sort (dnd-kit) |
| Toast 通知 | SCE-001~010 | music-ui sonner |
| 抽屉弹窗 | SCE-001, 002, 005 | music-ui DrawerPanel |
| 命令面板 | SCE-009 | music-ui CmdKPalette |
| 表情反应 | SCE-002, 003, 010 | music-community ReactionBar + EmojiPanel |

---

## 落地优先级建议

| 优先级 | 场景 | 理由 |
|--------|------|------|
| P0 | SCE-001 音乐播放器 | 核心产品，完整性 ★★★★★，立即可用 |
| P0 | SCE-008 歌词显示/波形可视化 | 播放器核心配套，完整性 ★★★★★ |
| P1 | SCE-002 社交社区/动态信息流 | 用户粘性关键，完整性 ★★★★☆ |
| P1 | SCE-003 直播间/实时互动 | 差异化能力，完整性 ★★★★☆ |
| P1 | SCE-004 媒体流媒体 | 内容分发基础，完整性 ★★★★☆ |
| P2 | SCE-005 运营数据看板 | 后台管理，完整性 ★★★★☆ |
| P2 | SCE-007 音乐库扫描/媒体资产管理 | 内容管理，完整性 ★★★★☆ |
| P2 | SCE-009 全局搜索/命令面板 | 用户体验提升，完整性 ★★★★☆ |
| P2 | SCE-010 表情反应/社交互动 | 社交互动，完整性 ★★★★☆ |
| P3 | SCE-006 综艺制作/MV 程序化生成 | 可演示，完整性 ★★★☆☆ |

---

## 验收汇总

所有 10 个场景均已在包组层面完成代码集成，typecheck/lint 全绿。各场景可直接基于本文档的接口定义与数据流进行前端页面开发与服务端接口实现。

**可立即落地场景**：9 个（SCE-001~005, 007~010）  
**可演示场景**：1 个（SCE-006）  
**无遗憾缺口**：所有 W1-W4 已覆盖场景均可立即落地或可演示

---

*生成时间：2026-11-19*  
*数据源：SCENARIO-ASSESSMENT.md、ASSET-REGISTRY.md、INTEGRATION-STATUS.md、packages/ 各包源码*
