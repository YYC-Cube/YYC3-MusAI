/**
 * @file Xiaoyu.types.ts
 * @description 小语相关类型定义，包含情绪类型、状态类型和接口定义
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-10
 * @updated 2026-03-10
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags xiaoyu,types,typescript
 */

export type XiaoyuEmotionType = 'neutral' | 'happy' | 'anxious' | 'surprised';

export interface XiaoyuState {
  emotion: XiaoyuEmotionType;
  isSpeaking: boolean;
  isVisible: boolean;
  position: {
    x: string;
    y: string;
  };
}

export interface XiaoyuInteractionLog {
  id: string;
  userId: string;
  emotion: XiaoyuEmotionType;
  userText: string;
  xiaoyuText: string;
  timestamp: Date;
}

export interface XiaoyuChatRequest {
  userText: string;
  userId: string;
  userEmotion: XiaoyuEmotionType;
}

export interface XiaoyuChatResponse {
  xiaoyuText: string;
  emotion: XiaoyuEmotionType;
  needVoice: boolean;
  timestamp: Date;
}

export interface XiaoyuTTSRequest {
  text: string;
  emotion: XiaoyuEmotionType;
}

export interface XiaoyuTTSResponse {
  audioUrl: string;
  duration: number;
  emotion: XiaoyuEmotionType;
}
