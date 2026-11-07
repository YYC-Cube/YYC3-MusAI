import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { Heart, Smile, Frown, Zap, Cloud, Sparkles } from 'lucide-react';
import type { Emotion } from '../hooks/useAudioEngine';
import { useI18n } from '../hooks/useI18n';

export interface LyricLine {
  time: number;
  text: string;
  translation?: string;
  emotion?: Emotion;
}

export interface EmotionAnnotation {
  [lineIndex: number]: {
    [emotion: string]: number;
  };
}

interface LyricsDisplayProps {
  currentTime: number;
  lyrics: LyricLine[];
  onLineClick?: (time: number) => void;
  annotations?: EmotionAnnotation;
  onAnnotate?: (lineIndex: number, emotion: Emotion) => void;
  isPlaying?: boolean;
}

const EMOTION_CONFIG: Record<Emotion, { icon: React.ElementType; color: string; label: string; particleColor: string }> = {
  happy: { icon: Smile, color: 'text-yellow-400', label: 'Happy', particleColor: '#FFD700' },
  sad: { icon: Frown, color: 'text-blue-400', label: 'Sad', particleColor: '#6495ED' },
  energetic: { icon: Zap, color: 'text-red-400', label: 'Energetic', particleColor: '#FF4500' },
  calm: { icon: Cloud, color: 'text-cyan-400', label: 'Calm', particleColor: '#00CED1' },
  neutral: { icon: Sparkles, color: 'text-purple-400', label: 'Neutral', particleColor: '#9370DB' },
};

// Floating emotion particle component
const EmotionParticle: React.FC<{ emotion: Emotion; index: number }> = ({ emotion, index }) => {
  const config = EMOTION_CONFIG[emotion];
  const isHappy = emotion === 'happy';
  const isSad = emotion === 'sad';
  const isEnergetic = emotion === 'energetic';

  const randomX = (Math.random() - 0.5) * 100;
  const randomDelay = index * 0.08;
  const randomDuration = 1.2 + Math.random() * 0.8;

  if (isSad) {
    // Blue ripple effect
    return (
      <motion.div
        className="absolute pointer-events-none"
        style={{ left: `${40 + Math.random() * 20}%`, top: '50%' }}
        initial={{ scale: 0, opacity: 0.6 }}
        animate={{ scale: 3, opacity: 0 }}
        transition={{ duration: 2, delay: randomDelay }}
      >
        <div
          className="w-4 h-4 rounded-full border"
          style={{ borderColor: config.particleColor }}
        />
      </motion.div>
    );
  }

  // Default: floating particles (gold stardust for happy, sparks for energetic)
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: `${30 + Math.random() * 40}%` }}
      initial={{
        y: 0,
        x: 0,
        opacity: 1,
        scale: isEnergetic ? 1.5 : 1,
      }}
      animate={{
        y: -60 - Math.random() * 80,
        x: randomX,
        opacity: 0,
        scale: 0,
      }}
      transition={{
        duration: randomDuration,
        delay: randomDelay,
        ease: 'easeOut',
      }}
    >
      <div
        className="rounded-full"
        style={{
          width: isHappy ? 6 : isEnergetic ? 4 : 3,
          height: isHappy ? 6 : isEnergetic ? 4 : 3,
          backgroundColor: config.particleColor,
          boxShadow: `0 0 ${isHappy ? 8 : 4}px ${config.particleColor}`,
        }}
      />
    </motion.div>
  );
};

export const LyricsDisplay: React.FC<LyricsDisplayProps> = ({
  currentTime,
  lyrics,
  onLineClick,
  annotations = {},
  onAnnotate,
  isPlaying,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const [annotatingLine, setAnnotatingLine] = useState<number | null>(null);
  const [particleBursts, setParticleBursts] = useState<{ id: string; emotion: Emotion }[]>([]);
  const prevActiveRef = useRef(-1);
  const { t } = useI18n();

  // Find current line index
  const activeIndex = lyrics.findLastIndex((line) => line.time <= currentTime);

  // Auto-scroll to active line
  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex]);

  // Emit emotion particles when active line changes
  useEffect(() => {
    if (activeIndex !== prevActiveRef.current && activeIndex >= 0 && isPlaying) {
      const currentEmotion = lyrics[activeIndex]?.emotion;
      if (currentEmotion && currentEmotion !== 'neutral') {
        const burstId = `burst-${Date.now()}-${activeIndex}`;
        setParticleBursts((prev) => [...prev.slice(-5), { id: burstId, emotion: currentEmotion }]);
        // Clean up after animation
        setTimeout(() => {
          setParticleBursts((prev) => prev.filter((b) => b.id !== burstId));
        }, 2500);
      }
      prevActiveRef.current = activeIndex;
    }
  }, [activeIndex, isPlaying, lyrics]);

  const handleAnnotate = useCallback(
    (lineIndex: number, emotion: Emotion) => {
      onAnnotate?.(lineIndex, emotion);
      setAnnotatingLine(null);
    },
    [onAnnotate]
  );

  const getTopEmotion = (lineIndex: number): Emotion | null => {
    const lineAnnotations = annotations[lineIndex];
    if (!lineAnnotations) return null;
    const entries = Object.entries(lineAnnotations);
    if (entries.length === 0) return null;
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][0] as Emotion;
  };

  return (
    <div className="relative w-full h-full">
      {/* Emotion particles overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        <AnimatePresence>
          {particleBursts.map((burst) => (
            <div key={burst.id} className="absolute inset-0">
              {Array.from({ length: 8 }).map((_, i) => (
                <EmotionParticle key={i} emotion={burst.emotion} index={i} />
              ))}
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* Lyrics scroll container */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-y-auto py-[40vh] relative"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
          scrollbarWidth: 'none',
        }}
      >
        <div className="flex flex-col items-start gap-6 md:gap-8 px-6 md:px-12 lg:px-16 max-w-4xl mx-auto">
          {lyrics.map((line, index) => {
            const isActive = index === activeIndex;
            const isPast = index < activeIndex;
            const isHovered = hoveredLine === index;
            const topEmotion = getTopEmotion(index);
            const lineEmotionConfig = topEmotion ? EMOTION_CONFIG[topEmotion] : null;
            const defaultEmotionConfig = line.emotion ? EMOTION_CONFIG[line.emotion] : null;
            const emotionColor = (lineEmotionConfig || defaultEmotionConfig)?.particleColor || '#667eea';

            return (
              <motion.div
                key={index}
                ref={isActive ? activeLineRef : null}
                initial={{ opacity: 0, y: 15 }}
                animate={{
                  opacity: isActive ? 1 : isPast ? 0.3 : 0.12,
                  y: 0,
                  scale: isActive ? 1.02 : 1,
                }}
                transition={{
                  duration: 0.5,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                className={clsx(
                  'cursor-pointer text-left w-full group relative',
                  isActive ? 'text-white' : 'text-white/60 hover:text-white/80'
                )}
                onClick={() => onLineClick?.(line.time)}
                onMouseEnter={() => setHoveredLine(index)}
                onMouseLeave={() => {
                  setHoveredLine(null);
                  if (annotatingLine === index) setAnnotatingLine(null);
                }}
              >
                {/* Lyrics text */}
                <div className="flex items-start gap-3">
                  {/* Emotion indicator dot */}
                  {(lineEmotionConfig || defaultEmotionConfig) && (
                    <motion.div
                      className="mt-2.5 w-2 h-2 rounded-full flex-shrink-0"
                      animate={{
                        scale: isActive ? [1, 1.8, 1] : 1,
                        opacity: isActive ? 1 : 0.4,
                      }}
                      transition={{
                        scale: { duration: 1.5, repeat: isActive ? Infinity : 0, ease: 'easeInOut' },
                      }}
                      style={{
                        backgroundColor: emotionColor,
                        boxShadow: isActive ? `0 0 8px ${emotionColor}` : 'none',
                      }}
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <h2
                      className={clsx(
                        'font-bold leading-tight transition-all duration-500',
                        isActive
                          ? 'text-2xl md:text-4xl lg:text-[2.8rem]'
                          : 'text-lg md:text-2xl lg:text-3xl'
                      )}
                      style={
                        isActive
                          ? {
                              textShadow: `0 0 20px ${emotionColor}80, 0 0 40px ${emotionColor}30`,
                            }
                          : undefined
                      }
                    >
                      {line.text}
                    </h2>

                    {/* Translation */}
                    {line.translation && (
                      <motion.p
                        className={clsx(
                          'mt-1.5 font-light transition-all duration-500',
                          isActive
                            ? 'text-sm md:text-lg text-blue-200/80'
                            : 'text-xs md:text-sm opacity-0 group-hover:opacity-60'
                        )}
                        animate={isActive ? { opacity: [0.5, 0.8, 0.5] } : {}}
                        transition={isActive ? { duration: 3, repeat: Infinity, ease: 'easeInOut' } : {}}
                      >
                        {line.translation}
                      </motion.p>
                    )}

                    {/* Annotation counts */}
                    {annotations[index] && Object.keys(annotations[index]).length > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {Object.entries(annotations[index])
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 3)
                          .map(([emo, count]) => {
                            const config = EMOTION_CONFIG[emo as Emotion];
                            if (!config) return null;
                            const Icon = config.icon;
                            return (
                              <span
                                key={emo}
                                className={clsx(
                                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 border border-white/10',
                                  config.color
                                )}
                              >
                                <Icon className="w-3 h-3" />
                                {count}
                              </span>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Hover annotation button */}
                <AnimatePresence>
                  {isHovered && onAnnotate && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="absolute -right-2 top-0 md:right-0"
                    >
                      {annotatingLine === index ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex gap-1 bg-black/60 backdrop-blur-lg rounded-full p-1 border border-white/10 shadow-xl"
                        >
                          {(
                            Object.entries(EMOTION_CONFIG) as [Emotion, (typeof EMOTION_CONFIG)[Emotion]][]
                          ).map(([emo, config]) => {
                            const Icon = config.icon;
                            return (
                              <button
                                key={emo}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAnnotate(index, emo);
                                }}
                                className={clsx(
                                  'p-1.5 rounded-full hover:bg-white/10 transition-colors',
                                  config.color
                                )}
                                title={t(`player.${emo}` as any)}
                              >
                                <Icon className="w-4 h-4" />
                              </button>
                            );
                          })}
                        </motion.div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAnnotatingLine(index);
                          }}
                          className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white/70 transition-all"
                          title={t('lyrics.addEmotionTag')}
                        >
                          <Heart className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Active line glow */}
                {isActive && (
                  <motion.div
                    layoutId="lyrics-active-glow"
                    className="absolute -inset-x-4 -inset-y-2 rounded-xl -z-10"
                    style={{
                      background: `linear-gradient(135deg, ${emotionColor}08, ${emotionColor}05, transparent)`,
                    }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </motion.div>
            );
          })}

          <div className="h-[30vh]" />
        </div>
      </div>
    </div>
  );
};