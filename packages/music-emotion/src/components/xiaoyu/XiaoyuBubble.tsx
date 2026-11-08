/**
 * @file XiaoyuBubble.tsx
 * @description 小语对话气泡组件，支持情绪化样式和动画效果
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-10
 * @updated 2026-03-10
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags xiaoyu,component,bubble,ui,typescript,react
 * @depends react,framer-motion,styled-components
 */

import React from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { XiaoyuEmotionType } from '../../types/Xiaoyu.types';

interface XiaoyuBubbleProps {
  text: string;
  emotion: XiaoyuEmotionType;
  isVisible: boolean;
  onClose?: () => void;
}

const getEmotionStyles = (emotion: XiaoyuEmotionType) => {
  const emotionStyles = {
    happy: {
      bgColor: '#FFE6F2',
      borderColor: '#FFB6C1',
      decoration: 'petal',
      shadow: '0 2px 8px rgba(255,153,204,0.3)'
    },
    anxious: {
      bgColor: '#E6F7FF',
      borderColor: '#91D5FF',
      decoration: 'droplet',
      shadow: '0 2px 8px rgba(145,213,255,0.3)'
    },
    neutral: {
      bgColor: '#F9F0FF',
      borderColor: '#D3ADF7',
      decoration: 'star',
      shadow: '0 2px 8px rgba(211,173,247,0.3)'
    },
    surprised: {
      bgColor: '#FFF0E6',
      borderColor: '#FFB08A',
      decoration: 'sparkle',
      shadow: '0 2px 8px rgba(255,176,138,0.3)'
    }
  };
  return emotionStyles[emotion] || emotionStyles.neutral;
};

const BubbleWrapper = styled(motion.div)<{ emotion: XiaoyuEmotionType }>`
  position: fixed;
  bottom: 180px;
  right: 150px;
  max-width: 300px;
  min-width: 150px;
  padding: 16px 20px;
  border-radius: 16px;
  border: 2px solid ${({ emotion }) => getEmotionStyles(emotion).borderColor};
  background: ${({ emotion }) => getEmotionStyles(emotion).bgColor};
  box-shadow: ${({ emotion }) => getEmotionStyles(emotion).shadow};
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  z-index: 9998;
  cursor: pointer;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    bottom: -10px;
    right: 20px;
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-top: 10px solid ${({ emotion }) => getEmotionStyles(emotion).borderColor};
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  border: none;
  background: rgba(255,255,255,0.5);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #666;
  
  &:hover {
    background: rgba(255,255,255,0.8);
  }
`;

const XiaoyuBubble: React.FC<XiaoyuBubbleProps> = ({
  text,
  emotion,
  isVisible,
  onClose
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <BubbleWrapper
          emotion={emotion}
          initial={{ opacity: 0, y: 10, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.8 }}
          transition={{ duration: 0.3 }}
        >
          {onClose && <CloseButton onClick={onClose}>×</CloseButton>}
          {text}
        </BubbleWrapper>
      )}
    </AnimatePresence>
  );
};

export default XiaoyuBubble;
