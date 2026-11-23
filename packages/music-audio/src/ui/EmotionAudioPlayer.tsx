/**
 * @file src/EmotionAudioPlayer.tsx
 * @description 情感化音效播放器React组件，支持情感状态和音效播放
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-10
 * @updated 2026-03-10
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags 音效系统,React,情感化播放器
 */

import React, { useRef, useState, useEffect } from 'react';

/**
 * 情感化音效播放器组件属性
 */
interface EmotionAudioPlayerProps {
    url: string;
    emotion?: 'happy' | 'calm' | 'sad' | 'default';
    onPlay?: () => void;
    onPause?: () => void;
    onEnded?: () => void;
    showControls?: boolean;
    autoPlay?: boolean;
}

/**
 * 情感化音效播放器React组件
 * 支持情感状态和音效播放
 */
const EmotionAudioPlayer: React.FC<EmotionAudioPlayerProps> = ({
    url,
    emotion = 'default',
    onPlay,
    onPause,
    onEnded,
    showControls = true,
    autoPlay = false
}) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    /**
     * 情感配置
     * 根据情感类型调整音量
     */
    const emotionConfig = {
        happy: 0.6,
        calm: 0.3,
        sad: 0.3,
        default: 0.5
    };

    /**
     * 播放音效
     */
    const play = () => {
        if (audioRef.current) {
            audioRef.current.volume = emotionConfig[emotion] || 0.5;
            audioRef.current.play();
            setIsPlaying(true);
            onPlay?.();
        }
    };

    /**
     * 暂停音效
     */
    const pause = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
            onPause?.();
        }
    };

    /**
     * 切换播放/暂停
     */
    const togglePlay = () => {
        if (isPlaying) {
            pause();
        } else {
            play();
        }
    };

    /**
     * 处理音频播放结束
     */
    const handleEnded = () => {
        setIsPlaying(false);
        onEnded?.();
    };

    /**
     * 自动播放
     */
    useEffect(() => {
        if (autoPlay) {
            play();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- play 每次渲染都会重建且依赖父组件内联传入的 onPlay，补入依赖会导致 autoPlay 反复触发播放并可能形成渲染循环
    }, [autoPlay]);

    /**
     * 根据情感类型获取样式
     */
    const getEmotionStyle = () => {
        switch (emotion) {
            case 'happy':
                return {
                    background: 'linear-gradient(135deg, #e6ffed 0%, #b7eb8f 100%)',
                    color: '#1A3E5E'
                };
            case 'calm':
                return {
                    background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
                    color: '#1A3E5E'
                };
            case 'sad':
                return {
                    background: 'linear-gradient(135deg, #fff0f0 0%, #ffccc7 100%)',
                    color: '#1A3E5E'
                };
            default:
                return {
                    background: '#F7F9FA',
                    color: '#1A3E5E'
                };
        }
    };

    const style = getEmotionStyle();

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                borderRadius: '12px',
                background: style.background,
                color: style.color,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}
        >
            <audio
                ref={audioRef}
                src={url}
                preload="auto"
                onEnded={handleEnded}
            />
            
            {showControls && (
                <button
                    onClick={togglePlay}
                    style={{
                        padding: '10px 24px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#1A3E5E',
                        color: '#F7F9FA',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                    }}
                >
                    {isPlaying ? '⏸ 暂停' : '▶️ 播放'}
                </button>
            )}
            
            <div
                style={{
                    fontSize: '12px',
                    opacity: 0.7
                }}
            >
                情感: {emotion}
            </div>
        </div>
    );
};

export default EmotionAudioPlayer;