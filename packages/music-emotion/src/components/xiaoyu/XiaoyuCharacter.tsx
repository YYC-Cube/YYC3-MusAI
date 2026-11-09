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

const ANIMATION_PATHS: Record<XiaoyuEmotionType, string> = {
  happy: '/assets/animations/xiaoyu-happy.json',
  anxious: '/assets/animations/xiaoyu-anxious.json',
  surprised: '/assets/animations/xiaoyu-surprised.json',
  neutral: '/assets/animations/xiaoyu-neutral.json'
};

const XiaoyuCharacter: React.FC<XiaoyuCharacterProps> = ({ userEmotion = 'neutral' }) => {
  const [animData, setAnimData] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ right: 20, bottom: 20 });

  useEffect(() => {
    let cancelled = false;
    const loadAnim = async () => {
      try {
        // 动画资源随应用 public 目录发布，避免包内无法解析应用别名
        const response = await fetch(ANIMATION_PATHS[userEmotion] || ANIMATION_PATHS.neutral);
        const data = await response.json();
        if (!cancelled) setAnimData(data);
      } catch {
        if (!cancelled) setAnimData(null);
      }
    };
    loadAnim();
    return () => {
      cancelled = true;
    };
  }, [userEmotion]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const wrapper = document.querySelector('.xiaoyu-character') as HTMLElement | null;
    const initialRight = parseInt(wrapper?.style.right || '20', 10);
    const initialBottom = parseInt(wrapper?.style.bottom || '20', 10);

    const handleMouseMove = (moveE: MouseEvent) => {
      const deltaX = startX - moveE.clientX;
      const deltaY = startY - moveE.clientY;
      setPosition({
        right: initialRight + deltaX,
        bottom: initialBottom + deltaY
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
      style={{ right: `${position.right}px`, bottom: `${position.bottom}px` }}
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
