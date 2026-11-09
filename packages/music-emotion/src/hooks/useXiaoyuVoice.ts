/**
 * @file useXiaoyuVoice.ts
 * @description 小语语音控制钩子，提供语音播放、情绪音效播放和语音合成功能
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.1.0
 * @created 2026-03-10
 * @updated 2026-11-09
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopCurrentAudio = useCallback(() => {
    const audio = audioRef.current;
    audioRef.current = null;
    if (!audio) return;
    try {
      audio.pause();
      audio.src = '';
    } catch {
      // 已失效的音频元素直接丢弃
    }
  }, []);

  const playSource = useCallback(async (url: string, volume: number) => {
    stopCurrentAudio();

    const audio = new Audio(url);
    audio.volume = volume;
    audioRef.current = audio;
    setIsPlaying(true);

    try {
      await audio.play();
    } catch (error) {
      if (audioRef.current === audio) {
        audioRef.current = null;
        setIsPlaying(false);
      }
      throw error;
    }

    audio.onended = () => {
      if (audioRef.current === audio) {
        audioRef.current = null;
        setIsPlaying(false);
      }
    };
  }, [stopCurrentAudio]);

  const playEmotionSound = useCallback(async (emotion: XiaoyuEmotionType) => {
    const soundMap: Record<XiaoyuEmotionType, string> = {
      happy: '/assets/sounds/happy.wav',
      anxious: '/assets/sounds/anxious.wav',
      surprised: '/assets/sounds/surprised.wav',
      neutral: '/assets/sounds/click.wav'
    };
    await playSource(soundMap[emotion], emotion === 'anxious' ? 0.4 : 0.7);
  }, [playSource]);

  const playVoice = useCallback(async (_text: string, emotion: XiaoyuEmotionType) => {
    const yaSoundMap: Record<XiaoyuEmotionType, string> = {
      happy: '/assets/sounds/ya-happy.wav',
      anxious: '/assets/sounds/ya-anxious.wav',
      surprised: '/assets/sounds/ya-surprised.wav',
      neutral: '/assets/sounds/ya-neutral.wav'
    };
    await playSource(yaSoundMap[emotion], 0.5);
  }, [playSource]);

  const playVoiceWithEmotion = useCallback(async (text: string, emotion: XiaoyuEmotionType) => {
    await playEmotionSound(emotion);
    await playVoice(text, emotion);
  }, [playEmotionSound, playVoice]);

  const cleanup = useCallback(() => {
    stopCurrentAudio();
    setIsPlaying(false);
  }, [stopCurrentAudio]);

  return {
    playVoice,
    playEmotionSound,
    playVoiceWithEmotion,
    isPlaying,
    cleanup
  };
};

export default useXiaoyuVoice;
