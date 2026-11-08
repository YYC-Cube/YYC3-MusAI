/**
 * @file useXiaoyuVoice.ts
 * @description 小语语音控制钩子，提供语音播放、情绪音效播放和语音合成功能
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-10
 * @updated 2026-03-10
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags xiaoyu,hook,voice,tts,audio,typescript
 * @depends react
 */

import { useState, useRef, useCallback } from 'react';
import { XiaoyuEmotionType } from '../types/Xiaoyu.types';

interface UseXiaoyuVoiceReturn {
  playVoice: (text: string, emotion: XiaoyuEmotionType) => Promise<void>;
  playEmotionSound: (emotion: XiaoyuEmotionType) => Promise<void>;
  playVoiceWithEmotion: (text: string, emotion: XiaoyuEmotionType) => Promise<void>;
  isPlaying: boolean;
  cleanup: () => void;
}

const useXiaoyuVoice = (): UseXiaoyuVoiceReturn => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playEmotionSound = useCallback(async (emotion: XiaoyuEmotionType) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const soundMap: Record<XiaoyuEmotionType, string> = {
      happy: '/assets/sounds/happy.wav',
      anxious: '/assets/sounds/anxious.wav',
      surprised: '/assets/sounds/surprised.wav',
      neutral: '/assets/sounds/click.wav'
    };
    const soundUrl = soundMap[emotion];

    const audio = new Audio(soundUrl);
    audio.volume = emotion === 'anxious' ? 0.4 : 0.7;
    
    setIsPlaying(true);
    await audio.play();

    audio.onended = () => {
      setIsPlaying(false);
    };
  }, []);

  const playVoice = useCallback(async (text: string, emotion: XiaoyuEmotionType) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const yaSoundMap: Record<XiaoyuEmotionType, string> = {
      happy: '/assets/sounds/ya-happy.wav',
      anxious: '/assets/sounds/ya-anxious.wav',
      surprised: '/assets/sounds/ya-surprised.wav',
      neutral: '/assets/sounds/ya-neutral.wav'
    };

    const yaSound = new Audio(yaSoundMap[emotion]);
    yaSound.volume = 0.5;
    
    setIsPlaying(true);
    await yaSound.play();

    yaSound.onended = () => {
      setIsPlaying(false);
    };
  }, []);

  const playVoiceWithEmotion = useCallback(async (text: string, emotion: XiaoyuEmotionType) => {
    await playEmotionSound(emotion);
    await playVoice(text, emotion);
  }, [playEmotionSound, playVoice]);

  const cleanup = useCallback(() => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  return {
    playVoice,
    playEmotionSound,
    playVoiceWithEmotion,
    isPlaying,
    cleanup
  };
};

export default useXiaoyuVoice;
