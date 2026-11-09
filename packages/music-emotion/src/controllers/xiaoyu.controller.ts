/**
 * @file xiaoyu.controller.ts
 * @description 小语交互控制器，处理小语对话、语音生成、情绪反馈接口
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.1
 * @created 2026-03-10
 * @updated 2026-11-09
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags xiaoyu,controller,api,typescript
 */

import type { XiaoyuEmotionType } from '../types/Xiaoyu.types';

// 控制器只依赖最小的 HTTP 结构，避免绑定 express 等未安装的运行时依赖
export interface XiaoyuHttpRequest {
  body?: unknown;
  query?: unknown;
}

export interface XiaoyuHttpResponse {
  status(code: number): XiaoyuHttpResponse;
  json(payload: unknown): unknown;
  setHeader(name: string, value: string): unknown;
  send(payload: unknown): unknown;
}

export type XiaoyuNextFunction = (error?: unknown) => void;

export interface XiaoyuChatPayload {
  userText: string;
  userId: string;
  userEmotion: XiaoyuEmotionType;
}

export interface XiaoyuChatReply {
  xiaoyuText: string;
  emotion: XiaoyuEmotionType;
  needVoice: boolean;
}

export interface XiaoyuServiceLike {
  getChatReply(payload: XiaoyuChatPayload): Promise<XiaoyuChatReply>;
  generateVoice(text: string, emotion: XiaoyuEmotionType): Promise<{ audioBuffer: unknown }>;
  getEmotionHistory(userId: string, limit: number): Promise<unknown>;
}

export const XIAOYU_EMOTIONS: XiaoyuEmotionType[] = ['neutral', 'happy', 'anxious', 'surprised'];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const requiredString = (value: unknown, field: string, min: number, max: number): string => {
  if (typeof value !== 'string' || value.length < min || value.length > max) {
    throw new ValidationError(`${field} must be a string between ${min} and ${max} characters`);
  }
  return value;
};

const requiredUuid = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new ValidationError(`${field} must be a valid uuid`);
  }
  return value;
};

const requiredEmotion = (value: unknown, field: string): XiaoyuEmotionType => {
  if (typeof value !== 'string' || !XIAOYU_EMOTIONS.includes(value as XiaoyuEmotionType)) {
    throw new ValidationError(`${field} must be one of ${XIAOYU_EMOTIONS.join(', ')}`);
  }
  return value as XiaoyuEmotionType;
};

const optionalLimit = (value: unknown): number => {
  if (value === undefined || value === null || value === '') return 10;
  const limit = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new ValidationError('limit must be an integer between 1 and 100');
  }
  return limit;
};

export class XiaoyuController {
  constructor(private readonly xiaoyuService: XiaoyuServiceLike) {}

  public chat = async (
    req: XiaoyuHttpRequest,
    res: XiaoyuHttpResponse,
    next: XiaoyuNextFunction
  ) => {
    try {
      const body = asRecord(req.body);
      const userText = requiredString(body.userText, 'userText', 1, 200);
      const userId = requiredUuid(body.userId, 'userId');
      const userEmotion = requiredEmotion(body.userEmotion, 'userEmotion');

      const chatResult = await this.xiaoyuService.getChatReply({ userText, userId, userEmotion });

      res.status(200).json({
        success: true,
        data: {
          xiaoyuText: chatResult.xiaoyuText,
          emotion: chatResult.emotion,
          needVoice: chatResult.needVoice
        }
      });
    } catch (error) {
      next(error);
    }
  };

  public generateTTS = async (
    req: XiaoyuHttpRequest,
    res: XiaoyuHttpResponse,
    next: XiaoyuNextFunction
  ) => {
    try {
      const body = asRecord(req.body);
      const text = requiredString(body.text, 'text', 1, 150);
      const emotion = requiredEmotion(body.emotion, 'emotion');

      const ttsResult = await this.xiaoyuService.generateVoice(text, emotion);

      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Content-Disposition', `attachment; filename="xiaoyu-${emotion}.wav"`);
      res.send(ttsResult.audioBuffer);
    } catch (error) {
      next(error);
    }
  };

  public getEmotionHistory = async (
    req: XiaoyuHttpRequest,
    res: XiaoyuHttpResponse,
    next: XiaoyuNextFunction
  ) => {
    try {
      const query = asRecord(req.query);
      const userId = requiredUuid(query.userId, 'userId');
      const limit = optionalLimit(query.limit);

      const history = await this.xiaoyuService.getEmotionHistory(userId, limit);

      res.status(200).json({
        success: true,
        data: history
      });
    } catch (error) {
      next(error);
    }
  };
}
