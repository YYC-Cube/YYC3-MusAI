# @yyc3/music-live

YYC³ D-Music 直播组件包 — 直播间 UI / 弹幕看板 / 礼物 / 表情 / 在线人数 / 房务审核，对接 music-server `/ws/live`。

| 属性 | 值 |
| --- | --- |
| 定位 | 直播实时互动组件（W3 补流媒体；主仓顶层架构为正身，源仓 W3 旧三件套已退役） |
| 许可证 | MIT |
| 对标 | 03-媒体视频：owncast/PeerTube（直播间编排参考）、mediamtx/srs（推流服务，由 music-server 对接） |

## 组件清单

- `LiveRoom` — 直播间主组件（HLS 播放区 + 弹幕看板 + 表情/礼物 + 在线人数 + 审核面板）；可选 `renderPlayer(hlsUrl, live)` 槽位接管播放区（不传走内置 HLS 占位）
- `DanmakuBoard` — 弹幕看板（`danmaku` keyframes 内置，无宿主样式依赖）
- `GiftPanel` / `EmojiPanel` / `ViewerCount` / `ModerationPanel` — 礼物 / 表情 / 在线人数 / 房务审核面板
- `LiveClient` — WebSocket 客户端封装（断线队列重连、`token=` 鉴权参数）
- `types` — 直播消息/用户/礼物类型与 `DEFAULT_GIFTS`、`DEFAULT_EMOJIS`

## 端点契约（与 @yyc3/music-server 对齐）

- WS 互动通道：`/ws/live`（`?token=<JWT>`；`/live/ws` 为 Deno 入口兼容别名）
- 直播间生命周期：`POST /live/stream/start` → `GET /live/stream/:id`（含 hlsPlayUrl）→ `POST /live/stream/:id/end`
- 双运行时消息协议差异（Deno Edge vs Node）见 music-server README；对接时按运行时区分

## 快速开始

```tsx
import { LiveRoom } from '@yyc3/music-live';

<LiveRoom hlsUrl="https://cdn.example.com/live/room1/index.m3u8" roomId="room1" user={me} />
```

## 许可证

MIT License（第三方依赖许可见根目录 NOTICE.md）
