import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  Music,
  Video,
  Volume2,
  VolumeX,
  Volume1,
  Repeat,
  Shuffle,
  Keyboard,
  ListMusic,
  Users,
  Sparkles,
  Smile,
  Frown,
  Zap,
  Cloud,
  MessageCircle,
  Wand2,
  Trophy,
  BarChart3,
} from 'lucide-react';
import { clsx } from 'clsx';
import * as Slider from '@radix-ui/react-slider';
import type { Emotion } from '../hooks/useAudioEngine';
import type { LyricLine } from './LyricsDisplay';
import { useI18n } from '../hooks/useI18n';

interface PlayerControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  progress: number;
  onSeek: (value: number) => void;
  duration: number;
  mode: 'audio' | 'video';
  onToggleMode: () => void;
  mValue: number;
  onLike: () => void;
  volume: number;
  onVolumeChange: (value: number) => void;
  songTitle: string;
  artist: string;
  audioEnergy?: number;
  onPrev: () => void;
  onNext: () => void;
  onPlaylistToggle: () => void;
  onCommunityToggle?: () => void;
  onCommentsToggle?: () => void;
  onAILyricsToggle?: () => void;
  onLeaderboardToggle?: () => void;
  onAnalyticsToggle?: () => void;
  shuffleEnabled: boolean;
  onShuffleToggle: () => void;
  repeatMode: 'off' | 'all' | 'one';
  onRepeatCycle: () => void;
  audioMode: 'file' | 'demo';
  albumArt?: string;
  emotion?: Emotion;
  onEmotionFilter?: (emotion: Emotion | null) => void;
  activeEmotionFilter?: Emotion | null;
  lyrics?: LyricLine[];
}

const EMOTION_FILTER_CONFIG: Record<Emotion, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  happy: { icon: Smile, color: 'text-yellow-400', bg: 'bg-yellow-400', label: 'Happy' },
  sad: { icon: Frown, color: 'text-blue-400', bg: 'bg-blue-400', label: 'Sad' },
  energetic: { icon: Zap, color: 'text-red-400', bg: 'bg-red-400', label: 'Energetic' },
  calm: { icon: Cloud, color: 'text-cyan-400', bg: 'bg-cyan-400', label: 'Calm' },
  neutral: { icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-400', label: 'Neutral' },
};

const EMOTION_TIMELINE_COLORS: Record<string, string> = {
  happy: '#FFD700',
  sad: '#6495ED',
  energetic: '#FF4500',
  calm: '#00CED1',
  neutral: '#9370DB',
};

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  onPlayPause,
  progress,
  onSeek,
  duration,
  mode,
  onToggleMode,
  mValue,
  onLike,
  volume,
  onVolumeChange,
  songTitle,
  artist,
  audioEnergy = 0,
  onPrev,
  onNext,
  onPlaylistToggle,
  onCommunityToggle,
  onCommentsToggle,
  onAILyricsToggle,
  onLeaderboardToggle,
  onAnalyticsToggle,
  shuffleEnabled,
  onShuffleToggle,
  repeatMode,
  onRepeatCycle,
  audioMode,
  albumArt,
  emotion,
  onEmotionFilter,
  activeEmotionFilter,
  lyrics,
}) => {
  const { t } = useI18n();
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);
  const [showEmotionFilter, setShowEmotionFilter] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  const handleLike = () => {
    setIsLikeAnimating(true);
    onLike();
    setTimeout(() => setIsLikeAnimating(false), 600);
  };

  // Build emotion timeline data from lyrics
  const emotionTimeline = useMemo(() => {
    if (!lyrics || lyrics.length === 0 || duration <= 0) return [];
    return lyrics.map((line) => ({
      time: line.time,
      emotion: line.emotion || 'neutral',
    }));
  }, [lyrics, duration]);

  // Compute progress percentage
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div className="w-full bg-black/30 backdrop-blur-2xl border-t border-white/[0.08] relative z-50 hidden md:block" role="toolbar" aria-label="音乐播放控制 / Music player controls">
      {/* Star Track Progress Bar */}
      <div className="absolute top-0 left-0 w-full -translate-y-full z-10">
        {/* Emotion Timeline (below progress bar) */}
        {emotionTimeline.length > 0 && (
          <div className="h-[6px] w-full relative bg-transparent overflow-hidden">
            {emotionTimeline.map((point, i) => {
              const nextTime = i < emotionTimeline.length - 1 ? emotionTimeline[i + 1].time : duration;
              const left = (point.time / duration) * 100;
              const width = ((nextTime - point.time) / duration) * 100;
              const color = EMOTION_TIMELINE_COLORS[point.emotion] || EMOTION_TIMELINE_COLORS.neutral;
              return (
                <div
                  key={i}
                  className="absolute top-0 h-full transition-opacity duration-300"
                  style={{
                    left: `${left}%`,
                    width: `${Math.max(width, 0.5)}%`,
                    backgroundColor: color,
                    opacity: 0.15,
                  }}
                />
              );
            })}
            {/* Played section with full opacity */}
            {emotionTimeline.map((point, i) => {
              const nextTime = i < emotionTimeline.length - 1 ? emotionTimeline[i + 1].time : duration;
              const left = (point.time / duration) * 100;
              const right = (nextTime / duration) * 100;
              const clippedLeft = Math.max(left, 0);
              const clippedRight = Math.min(right, progressPercent);
              if (clippedRight <= clippedLeft) return null;
              const color = EMOTION_TIMELINE_COLORS[point.emotion] || EMOTION_TIMELINE_COLORS.neutral;
              return (
                <div
                  key={`played-${i}`}
                  className="absolute top-0 h-full"
                  style={{
                    left: `${clippedLeft}%`,
                    width: `${clippedRight - clippedLeft}%`,
                    backgroundColor: color,
                    opacity: 0.5,
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Main progress slider */}
        <div className="px-0 group">
          <Slider.Root
            className="relative flex items-center select-none touch-none w-full h-5 cursor-pointer"
            value={[progress]}
            max={duration}
            step={0.5}
            onValueChange={(val) => onSeek(val[0])}
            aria-label="播放进度 / Playback progress"
          >
            <Slider.Track className="bg-white/[0.06] relative grow rounded-none h-[3px] group-hover:h-[5px] transition-all duration-200">
              {/* Gradient progress fill */}
              <Slider.Range
                className="absolute rounded-none h-full"
                style={{
                  background: 'linear-gradient(90deg, #667eea, #764ba2, #f093fb)',
                }}
              />
              {/* Glow overlay */}
              <Slider.Range
                className="absolute rounded-none h-full blur-sm opacity-40"
                style={{
                  background: 'linear-gradient(90deg, #667eea, #764ba2, #f093fb)',
                }}
              />
            </Slider.Track>
            <Slider.Thumb
              className="block w-0 h-0 group-hover:w-4 group-hover:h-4 bg-white rounded-full transition-all duration-200 focus:outline-none focus:w-4 focus:h-4"
              style={{
                boxShadow: '0 0 12px rgba(255,255,255,0.6), 0 0 24px rgba(102,126,234,0.4)',
              }}
              aria-label={`${formatTime(progress)} / ${formatTime(duration)}`}
            />
          </Slider.Root>
        </div>
      </div>

      {/* Controls Container */}
      <div className="px-4 md:px-8 lg:px-12 py-3 md:py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto gap-4">
          {/* Left: Song Info + M-Heart */}
          <div className="flex items-center gap-3 min-w-0 w-1/3">
            {/* Song info (desktop) */}
            <div className="hidden md:flex items-center gap-3 min-w-0">
              {albumArt && (
                <motion.div
                  className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 shadow-lg relative"
                  animate={isPlaying ? { scale: [1, 1.03, 1] } : {}}
                  transition={isPlaying ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
                >
                  <img src={albumArt} alt="" className="w-full h-full object-cover" />
                  {isPlaying && (
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-purple-500/10" />
                  )}
                </motion.div>
              )}
              <div className="min-w-0">
                <span className="text-white font-semibold text-sm truncate block">{songTitle}</span>
                <div className="flex items-center gap-2">
                  <span className="text-white/40 text-xs truncate">{artist}</span>
                  {audioMode === 'file' ? (
                    <span className="text-[8px] uppercase tracking-wider text-emerald-400/70 bg-emerald-400/10 px-1.5 py-0.5 rounded-full border border-emerald-400/20 font-medium flex-shrink-0">
                      HD
                    </span>
                  ) : (
                    <span className="text-[8px] uppercase tracking-wider text-purple-400/70 bg-purple-400/10 px-1.5 py-0.5 rounded-full border border-purple-400/20 font-medium flex-shrink-0 flex items-center gap-0.5">
                      <Sparkles className="w-2 h-2" /> SYNTH
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* M-Heart Value */}
            <motion.button
              onClick={handleLike}
              whileTap={{ scale: 0.9 }}
              className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/[0.08] transition-colors relative overflow-hidden flex-shrink-0"
              aria-label={`M❤️值: ${mValue}, 点击喜欢 / Like`}
            >
              <motion.div
                animate={
                  isLikeAnimating
                    ? { scale: [1, 1.6, 1], rotate: [0, -15, 15, 0] }
                    : {}
                }
                transition={{ duration: 0.5 }}
              >
                <Heart
                  className={clsx(
                    'w-4 h-4 transition-colors',
                    mValue > 0 ? 'text-pink-500 fill-pink-500' : 'text-pink-400'
                  )}
                />
              </motion.div>
              <span className="text-pink-200 text-sm font-mono tabular-nums">
                M{mValue > 0 ? '\u2764\uFE0F' : '\u2661'} {mValue}
              </span>

              {/* Like particles */}
              <AnimatePresence>
                {isLikeAnimating && (
                  <>
                    {[...Array(8)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute rounded-full"
                        style={{
                          width: 3 + Math.random() * 3,
                          height: 3 + Math.random() * 3,
                          backgroundColor: i % 2 === 0 ? '#F472B6' : '#FFD700',
                        }}
                        initial={{ x: 14, y: 8, opacity: 1, scale: 1 }}
                        animate={{
                          x: 14 + (Math.random() - 0.5) * 50,
                          y: 8 - Math.random() * 30 - 10,
                          opacity: 0,
                          scale: 0,
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    ))}
                  </>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          {/* Center: Core Controls */}
          <div className="flex items-center gap-3 md:gap-5 justify-center w-1/3">
            {/* Shuffle */}
            <button
              onClick={onShuffleToggle}
              className={clsx(
                'transition-colors hidden md:block',
                shuffleEnabled ? 'text-blue-400' : 'text-white/30 hover:text-white/60'
              )}
              aria-label={`随机播放 / Shuffle: ${shuffleEnabled ? 'ON' : 'OFF'}`}
              aria-pressed={shuffleEnabled}
            >
              <Shuffle className="w-4 h-4" aria-hidden="true" />
            </button>

            {/* Prev */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="text-white/60 hover:text-white transition-colors"
              onClick={onPrev}
              aria-label="上一首 / Previous track"
            >
              <SkipBack className="w-5 h-5 md:w-6 md:h-6" aria-hidden="true" />
            </motion.button>

            {/* Play/Pause */}
            <motion.button
              onClick={onPlayPause}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white text-[#0A0E2F] flex items-center justify-center relative overflow-hidden"
              style={{
                boxShadow: isPlaying
                  ? `0 0 ${15 + audioEnergy * 30}px rgba(255,255,255,${0.2 + audioEnergy * 0.3}), 0 0 ${30 + audioEnergy * 40}px rgba(102,126,234,${audioEnergy * 0.2})`
                  : '0 0 15px rgba(255,255,255,0.15)',
              }}
              aria-label={isPlaying ? '暂停 / Pause' : '播放 / Play'}
              aria-pressed={isPlaying}
            >
              {/* Pulse ring when playing */}
              {isPlaying && (
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-white/20"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
              <AnimatePresence mode="wait">
                {isPlaying ? (
                  <motion.div
                    key="pause"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Pause className="w-5 h-5 md:w-6 md:h-6 fill-current" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="play"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Play className="w-5 h-5 md:w-6 md:h-6 fill-current ml-0.5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Next */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="text-white/60 hover:text-white transition-colors"
              onClick={onNext}
              aria-label="下一首 / Next track"
            >
              <SkipForward className="w-5 h-5 md:w-6 md:h-6" aria-hidden="true" />
            </motion.button>

            {/* Repeat */}
            <button
              onClick={onRepeatCycle}
              className={clsx(
                'transition-colors hidden md:block relative',
                repeatMode !== 'off' ? 'text-blue-400' : 'text-white/30 hover:text-white/60'
              )}
              aria-label={`循环模式 / Repeat: ${repeatMode}`}
            >
              <Repeat className="w-4 h-4" aria-hidden="true" />
              {repeatMode === 'one' && (
                <span className="absolute -top-1 -right-1 text-[8px] font-bold text-blue-400">1</span>
              )}
            </button>
          </div>

          {/* Right: Tools */}
          <div className="flex items-center justify-end gap-2 md:gap-3 w-1/3">
            {/* Time display */}
            <div className="hidden lg:flex text-xs text-white/30 font-mono tabular-nums gap-1">
              <span>{formatTime(progress)}</span>
              <span>/</span>
              <span>{formatTime(duration)}</span>
            </div>

            {/* Emotion Filter */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setShowEmotionFilter(!showEmotionFilter)}
                className={clsx(
                  'p-1.5 rounded-full transition-all',
                  activeEmotionFilter
                    ? `${EMOTION_FILTER_CONFIG[activeEmotionFilter].color} bg-white/10`
                    : 'text-white/30 hover:text-white/60'
                )}
                title="Emotion Filter"
              >
                {emotion && EMOTION_FILTER_CONFIG[emotion] ? (
                  React.createElement(EMOTION_FILTER_CONFIG[emotion].icon, { className: 'w-4 h-4' })
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </button>

              <AnimatePresence>
                {showEmotionFilter && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    className="absolute bottom-full right-0 mb-3 bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 p-3 shadow-2xl"
                  >
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2 px-1">{t('player.emotion')}</p>
                    <div className="flex gap-1.5">
                      {(Object.entries(EMOTION_FILTER_CONFIG) as [Emotion, (typeof EMOTION_FILTER_CONFIG)[Emotion]][]).map(
                        ([emo, config]) => {
                          const Icon = config.icon;
                          const isActive = activeEmotionFilter === emo;
                          return (
                            <button
                              key={emo}
                              onClick={() => {
                                onEmotionFilter?.(isActive ? null : emo);
                                setShowEmotionFilter(false);
                              }}
                              className={clsx(
                                'p-2 rounded-xl transition-all',
                                isActive
                                  ? `${config.color} bg-white/15 shadow-lg`
                                  : `text-white/40 hover:text-white/70 hover:bg-white/5`
                              )}
                              title={t(`player.${emo}` as any)}
                            >
                              <Icon className="w-5 h-5" />
                            </button>
                          );
                        }
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Audio/Video Toggle */}
            <div className="hidden md:flex bg-white/5 rounded-full p-0.5 border border-white/[0.08]">
              <button
                onClick={() => mode !== 'audio' && onToggleMode()}
                className={clsx(
                  'p-1.5 rounded-full transition-all duration-300',
                  mode === 'audio'
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-white/40 hover:text-white/70'
                )}
              >
                <Music className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => mode !== 'video' && onToggleMode()}
                className={clsx(
                  'p-1.5 rounded-full transition-all duration-300',
                  mode === 'video'
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-white/40 hover:text-white/70'
                )}
              >
                <Video className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Volume */}
            <div
              className="relative hidden md:flex items-center"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <button
                onClick={() => onVolumeChange(volume === 0 ? 0.7 : 0)}
                className="text-white/40 hover:text-white/80 transition-colors p-1"
              >
                <VolumeIcon className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {showVolumeSlider && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 80 }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden ml-1"
                  >
                    <Slider.Root
                      className="relative flex items-center select-none touch-none w-full h-4 cursor-pointer"
                      value={[volume]}
                      max={1}
                      step={0.01}
                      onValueChange={(val) => onVolumeChange(val[0])}
                    >
                      <Slider.Track className="bg-white/10 relative grow rounded-full h-[3px]">
                        <Slider.Range className="absolute bg-white/60 rounded-full h-full" />
                      </Slider.Track>
                      <Slider.Thumb className="block w-3 h-3 bg-white rounded-full shadow focus:outline-none hover:scale-110 transition-transform" />
                    </Slider.Root>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Community */}
            {onCommunityToggle && (
              <button
                onClick={onCommunityToggle}
                className="text-white/30 hover:text-white/60 transition-colors p-1 hidden lg:block"
                title={t('header.community')}
              >
                <Users className="w-4 h-4" />
              </button>
            )}

            {/* Playlist */}
            <button
              onClick={onPlaylistToggle}
              className="text-white/40 hover:text-white/70 transition-colors p-1"
              title={t('player.playlist')}
            >
              <ListMusic className="w-4 h-4" />
            </button>

            {/* Keyboard shortcuts */}
            <button
              onClick={() => setShowShortcuts(!showShortcuts)}
              className="text-white/20 hover:text-white/50 transition-colors hidden lg:block p-1"
              title={t('player.keyboardShortcuts')}
            >
              <Keyboard className="w-4 h-4" />
            </button>

            {/* Comments */}
            {onCommentsToggle && (
              <button
                onClick={onCommentsToggle}
                className="text-white/30 hover:text-white/60 transition-colors p-1 hidden lg:block"
                title={t('player.comments')}
              >
                <MessageCircle className="w-4 h-4" />
              </button>
            )}

            {/* AI Lyrics */}
            {onAILyricsToggle && (
              <button
                onClick={onAILyricsToggle}
                className="text-white/30 hover:text-white/60 transition-colors p-1 hidden lg:block"
                title={t('player.aiLyrics')}
              >
                <Wand2 className="w-4 h-4" />
              </button>
            )}

            {/* Leaderboard */}
            {onLeaderboardToggle && (
              <button
                onClick={onLeaderboardToggle}
                className="text-white/30 hover:text-white/60 transition-colors p-1 hidden lg:block"
                title={t('player.leaderboard')}
              >
                <Trophy className="w-4 h-4" />
              </button>
            )}

            {/* Analytics */}
            {onAnalyticsToggle && (
              <button
                onClick={onAnalyticsToggle}
                className="text-white/30 hover:text-white/60 transition-colors p-1 hidden lg:block"
                title={t('player.analytics')}
              >
                <BarChart3 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile: Time display */}
        <div className="flex justify-between md:hidden text-[11px] text-white/30 mt-1.5 font-mono tabular-nums px-1">
          <span>{formatTime(progress)}</span>
          <div className="flex items-center gap-2">
            {emotion && EMOTION_FILTER_CONFIG[emotion] && (
              <span className={clsx('flex items-center gap-0.5 text-[10px]', EMOTION_FILTER_CONFIG[emotion].color)}>
                {React.createElement(EMOTION_FILTER_CONFIG[emotion].icon, { className: 'w-3 h-3' })}
              </span>
            )}
          </div>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Shortcuts overlay */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full right-4 mb-3 bg-black/80 backdrop-blur-xl rounded-xl border border-white/10 p-4 shadow-2xl text-xs"
          >
            <h4 className="text-white/70 font-semibold mb-2 text-sm">{t('player.keyboardShortcuts')}</h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-white/50">
              <span>
                <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono">Space</kbd>{' '}
                {t('player.playPause')}
              </span>
              <span>
                <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono">&larr;</kbd>{' '}
                <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono">&rarr;</kbd>{' '}
                {t('player.seek')}
              </span>
              <span>
                <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono">&uarr;</kbd>{' '}
                <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono">&darr;</kbd>{' '}
                {t('player.volume')}
              </span>
              <span>
                <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono">M</kbd>{' '}
                {t('player.mute')}
              </span>
              <span>
                <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono">N</kbd>{' '}
                {t('player.next')}
              </span>
              <span>
                <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono">P</kbd>{' '}
                {t('player.previous')}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Close emotion filter on outside click */}
      {showEmotionFilter && (
        <div className="fixed inset-0 z-[-1]" onClick={() => setShowEmotionFilter(false)} />
      )}
    </div>
  );
};