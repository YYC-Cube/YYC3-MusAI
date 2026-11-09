/**
 * @file XiaoyuCharacter.tsx
 * @description 小语角色动态组件，根据用户情绪切换动画，支持拖拽调整位置
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.1.0
 * @created 2026-03-10
 * @updated 2026-11-09
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags xiaoyu,component,emotion,ui,typescript,react
 * @depends react,lottie-react,styled-components,framer-motion
 */

import { motion } from 'framer-motion';
import Lottie from 'lottie-react';
import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { XiaoyuEmotionType } from '../../types/Xiaoyu.types';
import { getFallbackAnimation } from './xiaoyuAnimations';

export interface XiaoyuCharacterProps {
  /** 用户当前情绪，未知值回退为 neutral */
  userEmotion?: XiaoyuEmotionType;
  /** 直接注入 Lottie 动画数据（优先级最高，不发起网络请求） */
  animationData?: Record<string, unknown> | null;
  /** 自定义动画地址；支持相对路径，按 document.baseURI 解析 */
  animationSrc?: string;
}

const EMOTIONS: XiaoyuEmotionType[] = ['happy', 'anxious', 'surprised', 'neutral'];

/** 距离视口边缘的最小可见像素，避免角色被拖出屏幕 */
const EDGE_MARGIN = 8;

const XiaoyuWrapper = styled(motion.div)<{ $isDragging: boolean }>`
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
  cursor: move;
  touch-action: none;
  user-select: none;
  opacity: ${({ $isDragging }) => ($isDragging ? 0.8 : 1)};
  transition: opacity 0.2s ease;
  width: ${({ $isDragging }) => ($isDragging ? '140px' : '120px')};
  height: auto;
`;

interface DragStart {
  clientX: number;
  clientY: number;
  right: number;
  bottom: number;
  maxRight: number;
  maxBottom: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

const XiaoyuCharacter: React.FC<XiaoyuCharacterProps> = ({
  userEmotion = 'neutral',
  animationData,
  animationSrc
}) => {
  const emotion: XiaoyuEmotionType = EMOTIONS.includes(userEmotion) ? userEmotion : 'neutral';
  const [remoteData, setRemoteData] = useState<Record<string, unknown> | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ right: 20, bottom: 20 });
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<DragStart | null>(null);

  // 仅当显式传入 animationSrc 时才远程加载；内置兜底动画不依赖应用 public 目录或 `@/` 别名
  useEffect(() => {
    if (animationData || !animationSrc) {
      setRemoteData(null);
      return;
    }

    const controller = new AbortController();
    const load = async () => {
      try {
        const url = new URL(animationSrc, document.baseURI).toString();
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`动画加载失败: ${response.status}`);
        const data = await response.json();
        if (!controller.signal.aborted) setRemoteData(data);
      } catch {
        if (!controller.signal.aborted) setRemoteData(null);
      }
    };

    void load();
    return () => controller.abort();
  }, [animationData, animationSrc]);

  // 拖拽在 isDragging 期间绑定 window 监听，卸载或松开时由 effect 清理，避免闭包与泄漏
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (event: MouseEvent) => {
      const start = dragStartRef.current;
      if (!start) return;

      setPosition({
        right: clamp(start.right + (start.clientX - event.clientX), 0, start.maxRight),
        bottom: clamp(start.bottom + (start.clientY - event.clientY), EDGE_MARGIN, start.maxBottom)
      });
    };

    const handleMouseUp = () => {
      dragStartRef.current = null;
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    return () => {
      dragStartRef.current = null;
    };
  }, []);

  const handleMouseDown = (event: React.MouseEvent) => {
    if (event.button !== 0) return;
    const rect = wrapperRef.current?.getBoundingClientRect();
    const width = rect?.width || 120;
    const height = rect?.height || 120;

    dragStartRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      right: position.right,
      bottom: position.bottom,
      maxRight: Math.max(0, window.innerWidth - width - EDGE_MARGIN),
      maxBottom: Math.max(EDGE_MARGIN, window.innerHeight - height - EDGE_MARGIN)
    };
    setIsDragging(true);
    event.preventDefault();
  };

  const resolvedData = animationData ?? remoteData ?? getFallbackAnimation(emotion);

  return (
    <XiaoyuWrapper
      ref={wrapperRef}
      className="xiaoyu-character"
      data-emotion={emotion}
      data-fallback={animationData || remoteData ? 'false' : 'true'}
      style={{ right: `${position.right}px`, bottom: `${position.bottom}px` }}
      $isDragging={isDragging}
      onMouseDown={handleMouseDown}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Lottie
        animationData={resolvedData}
        loop={true}
        autoplay={true}
        style={{ width: '100%', height: 'auto' }}
      />
    </XiaoyuWrapper>
  );
};

export default XiaoyuCharacter;
