/**
 * @file emotionMap.ts
 * @description 情绪映射工具，提供情绪与UI参数、音效参数的映射关系
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-10
 * @updated 2026-03-10
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags emotion,mapping,utils,typescript
 */

import { XiaoyuEmotionType } from '../types/Xiaoyu.types';

export interface EmotionUIMapType {
  bubble: {
    bgColor: string;
    borderColor: string;
    decoration: string;
    shadow: string;
  };
  floatWindow: {
    bgColor: string;
    borderColor: string;
    shadow: string;
  };
  textColor: string;
  animationSpeed: number;
}

export const emotionUIMap: Record<XiaoyuEmotionType, EmotionUIMapType> = {
  happy: {
    bubble: {
      bgColor: '#FFE6F2',
      borderColor: '#FFB6C1',
      decoration: 'petal',
      shadow: '0 2px 8px rgba(255,153,204,0.3)'
    },
    floatWindow: {
      bgColor: 'rgba(255,230,242,0.9)',
      borderColor: '#FFB6C1',
      shadow: '0 4px 12px rgba(255,153,204,0.2)'
    },
    textColor: '#FF6B9E',
    animationSpeed: 1.2
  },
  anxious: {
    bubble: {
      bgColor: '#E6F7FF',
      borderColor: '#91D5FF',
      decoration: 'droplet',
      shadow: '0 2px 8px rgba(145,213,255,0.3)'
    },
    floatWindow: {
      bgColor: 'rgba(230,247,255,0.9)',
      borderColor: '#91D5FF',
      shadow: '0 4px 12px rgba(145,213,255,0.2)'
    },
    textColor: '#1890FF',
    animationSpeed: 0.8
  },
  neutral: {
    bubble: {
      bgColor: '#F9F0FF',
      borderColor: '#D3ADF7',
      decoration: 'star',
      shadow: '0 2px 8px rgba(211,173,247,0.3)'
    },
    floatWindow: {
      bgColor: 'rgba(249,240,255,0.9)',
      borderColor: '#D3ADF7',
      shadow: '0 4px 12px rgba(211,173,247,0.2)'
    },
    textColor: '#722ED1',
    animationSpeed: 1.0
  },
  surprised: {
    bubble: {
      bgColor: '#FFF0E6',
      borderColor: '#FFB08A',
      decoration: 'sparkle',
      shadow: '0 2px 8px rgba(255,176,138,0.3)'
    },
    floatWindow: {
      bgColor: 'rgba(255,240,230,0.9)',
      borderColor: '#FFB08A',
      shadow: '0 4px 12px rgba(255,176,138,0.2)'
    },
    textColor: '#FF8C42',
    animationSpeed: 1.1
  }
};

export const getEmotionUI = (emotion: XiaoyuEmotionType): EmotionUIMapType => {
  return emotionUIMap[emotion] || emotionUIMap.neutral;
};

export const getEmotionColor = (emotion: XiaoyuEmotionType): string => {
  const colorMap: Record<XiaoyuEmotionType, string> = {
    happy: '#FFE6F2',
    anxious: '#E6F7FF',
    neutral: '#F9F0FF',
    surprised: '#FFF0E6'
  };
  return colorMap[emotion] || colorMap.neutral;
};
