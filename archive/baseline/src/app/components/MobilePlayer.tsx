import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import {
  Play, Pause, SkipBack, SkipForward, Heart, ChevronDown,
  Repeat, Shuffle, ListMusic, MessageCircle,
  Volume2, VolumeX, Volume1, Sparkles, Smile, Frown,
  Zap, Cloud, Wand2, Trophy, BarChart3, Mic,
} from 'lucide-react';
// @ts-ignore - namespace import for radix slider
import * as SliderPrimitive from '@radix-ui/react-slider';
import type { Emotion } from '../hooks/useAudioEngine';
import type { LyricLine } from './LyricsDisplay';
import { useI18n } from '../hooks/useI18n';
import { EmotionRipple } from './EmotionRipple';

interface MobilePlayerProps {
  isOpen: boolean;
  onClose: () => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  progress: number;
  duration: number;
  onSeek: (t: number) => void;
  volume: number;
  onVolumeChange: (v: number) => void;
  songTitle: string;
  artist: string;
  albumArt: string;
  audioEnergy: number;
  emotion: Emotion;
  mValue: number;
  onLike: () => void;
  onPrev: () => void;
  onNext: () => void;
  shuffleEnabled: boolean;
  onShuffleToggle: () => void;
  repeatMode: 'off' | 'all' | 'one';
  onRepeatCycle: () => void;
  audioMode: 'file' | 'demo';
  onPlaylistToggle: () => void;
  onCommentsToggle: () => void;
  onAILyricsToggle: () => void;
  onLeaderboardToggle: () => void;
  onAnalyticsToggle: () => void;
  onMicToggle?: () => void;
  isListening?: boolean;
  lyrics?: LyricLine[];
  currentLyricText?: string;
  currentLyricTranslation?: string;
  /** §24.x — Frequency data for EmotionRipple beat detection */
  frequencyData?: Uint8Array;
}

const EMOTION_COLORS: Record<string, string> = {
  happy: '#FFD700',
  sad: '#6495ED',
  energetic: '#FF4500',
  calm: '#00CED1',
  neutral: '#9370DB',
};

const EMOTION_ICONS: Record<string, React.ElementType> = {
  happy: Smile,
  sad: Frown,
  energetic: Zap,
  calm: Cloud,
  neutral: Sparkles,
};

export const MobilePlayer: React.FC<MobilePlayerProps> = ({
  isOpen,
  onClose,
  isPlaying,
  onPlayPause,
  progress,
  duration,
  onSeek,
  volume,
  onVolumeChange,
  songTitle,
  artist,
  albumArt,
  audioEnergy,
  emotion,
  mValue,
  onLike,
  onPrev,
  onNext,
  shuffleEnabled,
  onShuffleToggle,
  repeatMode,
  onRepeatCycle,
  audioMode,
  onPlaylistToggle,
  onCommentsToggle,
  onAILyricsToggle,
  onLeaderboardToggle,
  onAnalyticsToggle,
  onMicToggle,
  isListening,
  lyrics,
  currentLyricText,
  currentLyricTranslation,
  frequencyData,
}) => {
  const { lang } = useI18n();
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const volumeRef = useRef<HTMLDivElement>(null);
  const [dragY, setDragY] = useState(0);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const emoColor = EMOTION_COLORS[emotion] || EMOTION_COLORS.neutral;
  const EmoIcon = EMOTION_ICONS[emotion] || Sparkles;
  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  const handleLike = useCallback(() => {
    setIsLikeAnimating(true);
    onLike();
    setTimeout(() => setIsLikeAnimating(false), 600);
  }, [onLike]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="mobile-player"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed inset-0 z-[80] bg-[#0A0E2F] flex flex-col overflow-hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {/* Ambient background glow */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at 50% 30%, ${emoColor}40, transparent 70%)`,
            }}
          />

          {/* §24.x — Emotion Ripple Canvas overlay (behind content) */}
          <EmotionRipple
            emotion={emotion}
            audioEnergy={audioEnergy}
            isPlaying={isPlaying}
            frequencyData={frequencyData}
            className="z-[1] opacity-60"
          />

          {/* Top bar */}
          <div className="flex items-center justify-between px-5 pt-3 pb-2 relative z-10"
            style={{ paddingTop: 'max(env(safe-area-inset-top, 12px), 12px)' }}
          >
            <button
              onClick={onClose}
              className="p-2 -ml-2 rounded-full text-white/50 active:bg-white/10"
            >
              <ChevronDown className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-1.5">
              <EmoIcon className="w-4 h-4" style={{ color: emoColor }} />
              <span className="text-xs text-white/40">
                {audioMode === 'file' ? 'HD' : 'SYNTH'}
              </span>
            </div>

            <button
              onClick={() => setShowVolume(!showVolume)}
              className="p-2 -mr-2 rounded-full text-white/50 active:bg-white/10"
            >
              <VolumeIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Volume slider (conditional) */}
          <AnimatePresence>
            {showVolume && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 48, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-8 overflow-hidden relative z-10"
                ref={volumeRef}
              >
                <div className="flex items-center gap-3 h-12">
                  <VolumeX className="w-4 h-4 text-white/30 flex-shrink-0" />
                  <SliderPrimitive.Root
                    className="relative flex items-center select-none touch-none w-full h-10 cursor-pointer"
                    value={[volume]}
                    max={1}
                    step={0.01}
                    onValueChange={(val) => onVolumeChange(val[0])}
                  >
                    <SliderPrimitive.Track className="bg-white/10 relative grow rounded-full h-[4px]">
                      <SliderPrimitive.Range className="absolute bg-white/60 rounded-full h-full" />
                    </SliderPrimitive.Track>
                    <SliderPrimitive.Thumb className="block w-5 h-5 bg-white rounded-full shadow-lg focus:outline-none" />
                  </SliderPrimitive.Root>
                  <Volume2 className="w-4 h-4 text-white/30 flex-shrink-0" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Album Art */}
          <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10 min-h-0">
            <motion.div
              className="w-64 h-64 sm:w-72 sm:h-72 rounded-3xl overflow-hidden shadow-2xl relative"
              animate={isPlaying ? {
                scale: [1, 1.02, 1],
                boxShadow: [
                  `0 20px 60px ${emoColor}20`,
                  `0 25px 70px ${emoColor}35`,
                  `0 20px 60px ${emoColor}20`,
                ],
              } : { scale: 1 }}
              transition={isPlaying ? { duration: 3, repeat: Infinity, ease: 'easeInOut' } : {}}
            >
              <img src={albumArt} alt="" className="w-full h-full object-cover" />
              {isPlaying && (
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(135deg, ${emoColor}10, transparent 50%, ${emoColor}08)`,
                  }}
                />
              )}
            </motion.div>

            {/* Current lyric */}
            <div className="mt-6 text-center min-h-[60px] flex flex-col items-center justify-center px-4">
              <AnimatePresence mode="wait">
                {currentLyricText && (
                  <motion.div
                    key={currentLyricText}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                    className="text-center"
                  >
                    <p className="text-white/90 text-base font-medium leading-relaxed">
                      {currentLyricText}
                    </p>
                    {currentLyricTranslation && (
                      <p className="text-white/40 text-sm mt-1">{currentLyricTranslation}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Bottom controls section */}
          <div className="relative z-10 px-6 pb-4 space-y-4">
            {/* Song info + Like */}
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 mr-4">
                <h3 className="text-white font-bold text-lg truncate">{songTitle}</h3>
                <p className="text-white/40 text-sm truncate">{artist}</p>
              </div>
              <motion.button
                onClick={handleLike}
                whileTap={{ scale: 0.85 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 active:bg-white/10"
              >
                <motion.div
                  animate={isLikeAnimating ? { scale: [1, 1.5, 1] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  <Heart className={clsx('w-5 h-5', mValue > 0 ? 'text-pink-500 fill-pink-500' : 'text-pink-400')} />
                </motion.div>
                <span className="text-pink-200 text-sm font-mono tabular-nums">{mValue}</span>
              </motion.button>
            </div>

            {/* Progress slider */}
            <div>
              <SliderPrimitive.Root
                className="relative flex items-center select-none touch-none w-full h-8 cursor-pointer"
                value={[progress]}
                max={duration}
                step={0.5}
                onValueChange={(val) => onSeek(val[0])}
              >
                <SliderPrimitive.Track className="bg-white/10 relative grow rounded-full h-[4px]">
                  <SliderPrimitive.Range
                    className="absolute rounded-full h-full"
                    style={{ background: `linear-gradient(90deg, ${emoColor}80, ${emoColor})` }}
                  />
                </SliderPrimitive.Track>
                <SliderPrimitive.Thumb
                  className="block w-5 h-5 bg-white rounded-full shadow-lg focus:outline-none"
                  style={{ boxShadow: `0 0 10px ${emoColor}60` }}
                />
              </SliderPrimitive.Root>
              <div className="flex justify-between text-[11px] text-white/30 font-mono tabular-nums -mt-1 px-0.5">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Main controls */}
            <div className="flex items-center justify-between px-4">
              <button
                onClick={onShuffleToggle}
                className={clsx('p-2', shuffleEnabled ? 'text-purple-400' : 'text-white/30')}
              >
                <Shuffle className="w-5 h-5" />
              </button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onPrev}
                className="p-3 text-white/70 active:text-white"
              >
                <SkipBack className="w-7 h-7" />
              </motion.button>

              <motion.button
                onClick={onPlayPause}
                whileTap={{ scale: 0.92 }}
                className="w-16 h-16 rounded-full bg-white text-[#0A0E2F] flex items-center justify-center relative"
                style={{
                  boxShadow: isPlaying
                    ? `0 0 ${20 + audioEnergy * 30}px rgba(255,255,255,0.2), 0 0 40px ${emoColor}30`
                    : '0 0 20px rgba(255,255,255,0.1)',
                }}
              >
                {isPlaying && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-white/20"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
                {isPlaying ? (
                  <Pause className="w-7 h-7 fill-current" />
                ) : (
                  <Play className="w-7 h-7 fill-current ml-1" />
                )}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onNext}
                className="p-3 text-white/70 active:text-white"
              >
                <SkipForward className="w-7 h-7" />
              </motion.button>

              <button
                onClick={onRepeatCycle}
                className={clsx('p-2 relative', repeatMode !== 'off' ? 'text-purple-400' : 'text-white/30')}
              >
                <Repeat className="w-5 h-5" />
                {repeatMode === 'one' && (
                  <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold text-purple-400">1</span>
                )}
              </button>
            </div>

            {/* Quick access row — scrollable */}
            <div className="flex items-center gap-1 pt-2.5 pb-0.5 border-t border-white/[0.06] overflow-x-auto no-scrollbar px-1">
              {[
                { icon: ListMusic, action: onPlaylistToggle, labelZh: '列表', labelEn: 'List', stayOpen: false },
                { icon: MessageCircle, action: onCommentsToggle, labelZh: '评论', labelEn: 'Chat', stayOpen: false },
                { icon: Wand2, action: onAILyricsToggle, labelZh: '创作', labelEn: 'AI', stayOpen: false },
                { icon: Trophy, action: onLeaderboardToggle, labelZh: '排行', labelEn: 'Rank', stayOpen: false },
                { icon: BarChart3, action: onAnalyticsToggle, labelZh: '分析', labelEn: 'Data', stayOpen: false },
                ...(onMicToggle ? [{ icon: Mic, action: onMicToggle, labelZh: '语音', labelEn: 'Voice', stayOpen: true }] : []),
              ].map((item, i) => {
                const Icon = item.icon;
                const isMicActive = item.icon === Mic && isListening;
                return (
                  <button
                    key={i}
                    onClick={() => {
                      item.action();
                      if (!item.stayOpen) onClose();
                    }}
                    className={clsx(
                      'flex flex-col items-center gap-1 min-w-[48px] py-2 px-2.5 rounded-xl active:bg-white/5 transition-colors flex-shrink-0',
                      isMicActive ? 'text-purple-400' : 'text-white/30'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[10px] whitespace-nowrap">{lang === 'zh' ? item.labelZh : item.labelEn}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};