/**
 * @file xiaoyu.controller.ts
 * @description 小语交互控制器，处理小语对话、语音生成、情绪反馈接口
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-10
 * @updated 2026-03-10
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags xiaoyu,controller,api,typescript,express
 * @depends express,joi
 */

import { Request, Response, NextFunction } from 'express';
import { XiaoyuService } from '../services/xiaoyu.service';
import { validator } from '../utils/validator';
import Joi from 'joi';
import { AppError } from '../exceptions/AppError';
import { XiaoyuChatRequest, XiaoyuTTSRequest } from '../types/Xiaoyu.types';

export class XiaoyuController {
  private xiaoyuService: XiaoyuService;

  constructor() {
    this.xiaoyuService = new XiaoyuService();
  }

  public chat = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const chatSchema = Joi.object({
        userText: Joi.string().min(1).max(200).required(),
        userId: Joi.string().uuid().required(),
        userEmotion: Joi.string().valid('neutral', 'happy', 'anxious', 'surprised').required()
      });
      const validatedData = validator(req.body, chatSchema);

      const chatResult = await this.xiaoyuService.getChatReply({
        userText: validatedData.userText,
        userId: validatedData.userId,
        userEmotion: validatedData.userEmotion
      });

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

  public generateTTS = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ttsSchema = Joi.object({
        text: Joi.string().min(1).max(150).required(),
        emotion: Joi.string().valid('neutral', 'happy', 'anxious', 'surprised').required()
      });
      const validatedData = validator(req.body, ttsSchema);

      const ttsResult = await this.xiaoyuService.generateVoice(
        validatedData.text,
        validatedData.emotion
      );

      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Content-Disposition', `attachment; filename="xiaoyu-${validatedData.emotion}.wav"`);
      res.send(ttsResult.audioBuffer);
    } catch (error) {
      next(error);
    }
  };

  public getEmotionHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const historySchema = Joi.object({
        userId: Joi.string().uuid().required(),
        limit: Joi.number().integer().min(1).max(100).default(10)
      });
      const validatedData = validator(req.query, historySchema);

      const history = await this.xiaoyuService.getEmotionHistory(
        validatedData.userId,
        validatedData.limit
      );

      res.status(200).json({
        success: true,
        data: history
      });
    } catch (error) {
      next(error);
    }
  };
}
