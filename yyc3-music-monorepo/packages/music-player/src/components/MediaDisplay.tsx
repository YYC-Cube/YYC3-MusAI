import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ImageWithFallback } from '@yyc3/music-ui';
import { AudioVisualizer } from './AudioVisualizer';
import type { Emotion } from '@yyc3/music-hooks';
const dMusicGold = '/assets/dmusic-gold.png';
import { useI18n } from '@yyc3/music-hooks';

interface MediaDisplayProps {
  mode: 'audio' | 'video';
  isPlaying: boolean;
  albumArtUrl: string;
  frequencyData: Uint8Array;
  emotion: Emotion;
  audioEnergy: number;
  songTitle: string;
  artist: string;
  videoUrl?: string;
}

const EMOTION_GLOW: Record<Emotion, string> = {
  happy: 'rgba(255,215,0,0.4)',
  sad: 'rgba(100,149,237,0.4)',
  energetic: 'rgba(255,69,0,0.4)',
  calm: 'rgba(0,206,209,0.4)',
  neutral: 'rgba(102,126,234,0.4)',
};

export const MediaDisplay: React.FC<MediaDisplayProps> = ({
  mode,
  isPlaying,
  albumArtUrl,
  frequencyData,
  emotion,
  audioEnergy,
  songTitle,
  artist,
  videoUrl,
}) => {
  const [visualizerSize, setVisualizerSize] = useState(384);
  const { t } = useI18n();

  useEffect(() => {
    const updateSize = () => {
      const isMobile = window.innerWidth < 768;
      setVisualizerSize(isMobile ? 200 : 380);
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const albumSize = visualizerSize * 0.62;
  const glowColor = EMOTION_GLOW[emotion] || EMOTION_GLOW.neutral;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Blurred album art background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <ImageWithFallback
          src={albumArtUrl}
          alt=""
          className="w-full h-full object-cover scale-125 blur-[80px] opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0E2F]/60 via-[#0A0E2F]/40 to-[#0A0E2F]/80" />
      </div>

      {mode === 'audio' ? (
        <div className="relative flex flex-col items-center gap-2 md:gap-6">
          {/* Visualizer + Album Art Container */}
          <div
            className="relative"
            style={{ width: visualizerSize, height: visualizerSize }}
          >
            {/* Circular Spectrum Visualizer */}
            <div className="absolute inset-0 flex items-center justify-center">
              <AudioVisualizer
                frequencyData={frequencyData}
                emotion={emotion}
                isPlaying={isPlaying}
                size={visualizerSize}
                mode="circular"
              />
            </div>

            {/* Outer orbit rings */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              animate={{ rotate: 360 }}
              transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
            >
              <div
                className="rounded-full"
                style={{
                  width: albumSize + 65,
                  height: albumSize + 65,
                  border: `1px solid rgba(255,255,255,${isPlaying ? 0.06 + audioEnergy * 0.08 : 0.04})`,
                }}
              />
              {/* Orbiting dot */}
              <div
                className="absolute rounded-full"
                style={{
                  width: 4,
                  height: 4,
                  background: glowColor,
                  boxShadow: `0 0 8px ${glowColor}`,
                  top: '50%',
                  left: '50%',
                  transform: `translate(-50%, -${(albumSize + 65) / 2}px)`,
                }}
              />
            </motion.div>
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              animate={{ rotate: -360 }}
              transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
            >
              <div
                className="rounded-full border border-white/[0.03]"
                style={{ width: albumSize + 95, height: albumSize + 95 }}
              />
            </motion.div>

            {/* Album Art (Vinyl) */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="rounded-full overflow-hidden relative"
                style={{
                  width: albumSize,
                  height: albumSize,
                  boxShadow: isPlaying
                    ? `0 0 ${25 + audioEnergy * 50}px ${glowColor}, 0 0 ${60 + audioEnergy * 80}px ${glowColor.replace('0.4', '0.15')}`
                    : `0 0 20px rgba(102,126,234,0.12)`,
                  transition: 'box-shadow 0.3s ease',
                }}
                animate={{
                  rotate: isPlaying ? 360 : 0,
                }}
                transition={{
                  duration: 18,
                  repeat: Infinity,
                  ease: 'linear',
                  repeatType: 'loop',
                }}
              >
                <ImageWithFallback
                  src={albumArtUrl}
                  alt="Album Art"
                  className="w-full h-full object-cover"
                />
                {/* Vinyl grooves */}
                <div className="absolute inset-0">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/10 to-transparent" />
                  {/* Concentric rings */}
                  {[0.3, 0.5, 0.7, 0.85].map((r, i) => (
                    <div
                      key={i}
                      className="absolute rounded-full border border-black/[0.06]"
                      style={{
                        width: `${r * 100}%`,
                        height: `${r * 100}%`,
                        top: `${(1 - r) * 50}%`,
                        left: `${(1 - r) * 50}%`,
                      }}
                    />
                  ))}
                </div>
              </motion.div>

              {/* Center spindle */}
              <div
                className="absolute rounded-full bg-[#0A0E2F] border border-white/20"
                style={{
                  width: 16,
                  height: 16,
                  boxShadow: isPlaying ? `0 0 12px ${glowColor}` : 'none',
                  transition: 'box-shadow 0.3s ease',
                }}
              />
            </div>
          </div>

          {/* Song info below album art (mobile) */}
          <div className="text-center md:hidden">
            <h3 className="text-white font-semibold text-lg leading-tight">{songTitle}</h3>
            <p className="text-white/50 text-sm mt-1">{artist}</p>
          </div>
        </div>
      ) : (
        <div className="relative w-full max-w-3xl aspect-video bg-black/40 rounded-2xl overflow-hidden backdrop-blur-sm border border-white/10 shadow-2xl">
          {videoUrl ? (
            <video
              src={videoUrl}
              className="w-full h-full object-contain"
              controls
              autoPlay={isPlaying}
              loop
              playsInline
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
                <svg className="w-8 h-8 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <p className="text-white/40 text-sm">{t('media.videoMode')}</p>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/20 to-blue-900/20 mix-blend-overlay pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-16 opacity-50">
            <AudioVisualizer
              frequencyData={frequencyData}
              emotion={emotion}
              isPlaying={isPlaying}
              size={160}
              mode="bars"
            />
          </div>
        </div>
      )}

      {/* Emotion-reactive background glow */}
      <motion.div
        className="absolute inset-0 -z-10 pointer-events-none"
        animate={{
          opacity: isPlaying ? 0.12 + audioEnergy * 0.2 : 0.04,
        }}
        transition={{ duration: 0.3 }}
      >
        <div
          className={`w-full h-full blur-[120px] transition-colors duration-1000 ${
            emotion === 'happy'
              ? 'bg-yellow-500/50'
              : emotion === 'sad'
              ? 'bg-blue-600/50'
              : emotion === 'energetic'
              ? 'bg-red-500/50'
              : emotion === 'calm'
              ? 'bg-cyan-500/50'
              : 'bg-purple-800/50'
          }`}
        />
      </motion.div>
    </div>
  );
};
