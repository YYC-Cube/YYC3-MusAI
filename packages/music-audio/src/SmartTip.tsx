/**
 * @file src/SmartTip.tsx
 * @description 智能提示组件，支持情感化动画和虚化效果
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-10
 * @updated 2026-03-10
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags 智能提示,React,动画,情感化
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 智能提示组件属性
 */
interface SmartTipProps {
    isVisible: boolean;
    message: string;
    emotion?: 'neutral' | 'encouraging' | 'calm';
    position?: 'top' | 'bottom' | 'left' | 'right';
    duration?: number;
}

/**
 * 智能提示组件
 * 支持情感化动画和虚化效果
 */
const SmartTip: React.FC<SmartTipProps> = ({
    isVisible,
    message,
    emotion = 'neutral',
    position = 'bottom',
    duration = 0.5
}) => {
    /**
     * 根据情感状态获取动画参数
     */
    const getAnimationProps = () => {
        switch (emotion) {
            case 'encouraging':
                return {
                    initial: { opacity: 0, y: 20, scale: 0.9 },
                    animate: { opacity: 1, y: 0, scale: 1 },
                    exit: { opacity: 0, y: -20, scale: 0.9 },
                    transition: { duration, type: 'spring' as const }
                };
            case 'calm':
                return {
                    initial: { opacity: 0, filter: 'blur(10px)' },
                    animate: { opacity: 1, filter: 'blur(0px)' },
                    exit: { opacity: 0, filter: 'blur(10px)' },
                    transition: { duration: duration * 1.5 }
                };
            default:
                return {
                    initial: { opacity: 0 },
                    animate: { opacity: 1 },
                    exit: { opacity: 0 },
                    transition: { duration }
                };
        }
    };

    /**
     * 根据情感状态获取样式
     */
    const getEmotionStyle = () => {
        switch (emotion) {
            case 'encouraging':
                return {
                    background: 'linear-gradient(135deg, #e6ffed 0%, #b7eb8f 100%)',
                    color: '#1A3E5E',
                    borderColor: '#36B37E'
                };
            case 'calm':
                return {
                    background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
                    color: '#1A3E5E',
                    borderColor: '#4A90E2'
                };
            default:
                return {
                    background: '#F7F9FA',
                    color: '#1A3E5E',
                    borderColor: '#4A90E2'
                };
        }
    };

    /**
     * 根据情感状态获取表情符号
     */
    const getEmotionEmoji = () => {
        switch (emotion) {
            case 'encouraging':
                return '🌟';
            case 'calm':
                return '🌊';
            default:
                return '💡';
        }
    };

    /**
     * 获取位置样式
     */
    const getPositionStyle = () => {
        switch (position) {
            case 'top':
                return { bottom: '100%', marginBottom: '8px' };
            case 'bottom':
                return { top: '100%', marginTop: '8px' };
            case 'left':
                return { right: '100%', marginRight: '8px' };
            case 'right':
                return { left: '100%', marginLeft: '8px' };
            default:
                return { top: '100%', marginTop: '8px' };
        }
    };

    const animationProps = getAnimationProps();
    const emotionStyle = getEmotionStyle();
    const positionStyle = getPositionStyle();
    const emoji = getEmotionEmoji();

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="smart-tip"
                    style={{
                        ...emotionStyle,
                        ...positionStyle,
                        borderRadius: '16px',
                        padding: '16px',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                        position: 'absolute',
                        zIndex: 1000,
                        maxWidth: '300px',
                        border: `2px solid ${emotionStyle.borderColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                    {...animationProps}
                >
                    <span
                        className="tip-emoji"
                        style={{
                            fontSize: '20px',
                            flexShrink: 0
                        }}
                    >
                        {emoji}
                    </span>
                    <span
                        className="tip-message"
                        style={{
                            fontSize: '14px',
                            lineHeight: '1.5'
                        }}
                    >
                        {message}
                    </span>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SmartTip;