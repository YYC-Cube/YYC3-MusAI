/**
 * YYC³ music-live · 直播专用组件包（W3 补流媒体）
 *
 * 导出：
 *   LiveRoom   —— 直播间主组件（视频 + 弹幕 + 表情 + 礼物 + 在线人数）
 *   DanmakuBoard —— 弹幕看板
 *   GiftPanel   —— 礼物面板
 *   EmojiPanel  —— 表情面板
 *   ViewerCount —— 在线人数显示
 *   ModerationPanel —— 审核/管理面板（房主/管理员）
 *   LiveClient  —— WebSocket 客户端封装
 *   types —— 直播类型定义
 */

export { LiveRoom } from './LiveRoom';
export { DanmakuBoard } from './DanmakuBoard';
export { GiftPanel } from './GiftPanel';
export { EmojiPanel } from './EmojiPanel';
export { ViewerCount } from './ViewerCount';
export { ModerationPanel } from './ModerationPanel';
export { LiveClient } from './LiveClient';
export type {
  LiveMessage,
  LiveMessageType,
  LiveUser,
  GiftItem,
  GiftType,
  DEFAULT_GIFTS,
  DEFAULT_EMOJIS,
} from './types';