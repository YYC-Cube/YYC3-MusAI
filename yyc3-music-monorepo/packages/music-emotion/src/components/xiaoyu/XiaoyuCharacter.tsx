/**
 * @file XiaoyuCharacter.tsx
 * @description 小语角色动态组件，根据用户情绪切换小语动画，支持拖拽调整位置
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-10
 * @updated 2026-03-10
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags xiaoyu,component,emotion,ui,typescript,react
 * @depends react,lottie-react,styled-components,framer-motion
 */

import { motion } from 'framer-motion';
import Lottie from 'lottie-react';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { XiaoyuEmotionType } from '../../types/Xiaoyu.types';

interface XiaoyuCharacterProps {
  userEmotion: XiaoyuEmotionType;
}

const XiaoyuWrapper = styled(motion.div)<{ isDragging: boolean }>`
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
  cursor: move;
  opacity: ${({ isDragging }) => (isDragging ? 0.8 : 1)};
  transition: opacity 0.2s ease;
  width: ${({ isDragging }) => (isDragging ? '140px' : '120px')};
  height: auto;
`;

const XiaoyuCharacter: React.FC<XiaoyuCharacterProps> = ({ userEmotion = 'neutral' }) => {
  const [animData, setAnimData] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 'right: 20px', y: 'bottom: 20px' });

  useEffect(() => {
    const loadAnim = async () => {
      switch (userEmotion) {
        case 'happy':
          setAnimData(await import('@/public/assets/animations/xiaoyu-happy.json'));
          break;
        case 'anxious':
          setAnimData(await import('@/public/assets/animations/xiaoyu-anxious.json'));
          break;
        case 'surprised':
          setAnimData(await import('@/public/assets/animations/xiaoyu-surprised.json'));
          break;
        default:
          setAnimData(await import('@/public/assets/animations/xiaoyu-neutral.json'));
      }
    };
    loadAnim();
  }, [userEmotion]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const wrapper = document.querySelector('.xiaoyu-character') as HTMLElement;
    const initialRight = parseInt(wrapper.style.right || '20');
    const initialBottom = parseInt(wrapper.style.bottom || '20');

    const handleMouseMove = (moveE: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = startX - moveE.clientX;
      const deltaY = startY - moveE.clientY;
      setPosition({
        x: `right: ${initialRight + deltaX}px`,
        y: `bottom: ${initialBottom + deltaY}px`
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  if (!animData) return null;

  return (
    <XiaoyuWrapper
      className="xiaoyu-character"
      style={{ ...position }}
      isDragging={isDragging}
      onMouseDown={handleMouseDown}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Lottie
        animationData={animData}
        loop={true}
        autoplay={true}
        style={{ width: '100%', height: 'auto' }}
      />
    </XiaoyuWrapper>
  );
};

export default XiaoyuCharacter;
