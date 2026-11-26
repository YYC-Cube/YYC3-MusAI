import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ImageWithFallback } from '@yyc3/music-ui';
import { AudioVisualizer } from './AudioVisualizer';
import type { Emotion } from '@yyc3/music-hooks';
import { useI18n } from '@yyc3/music-hooks';

// Video.js 10 + Media Chrome 播放器内核（W2）
// 注：media-chrome v4 为 Web Components，样式内建 shadow DOM，无独立 CSS 文件
// 终审 R7：video.js / hls.js 改为 video 模式按需动态加载——audio 模式（默认）
// 零加载，主 vendor chunk 瘦身（两者合计约占旧 vendor 源码 55%+）。

type VideoJsPlayer = any;

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

  // Video.js 10 播放器实例（仅 video 模式使用）
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<VideoJsPlayer | null>(null);

  // 实例生命周期：随源（videoUrl）创建/销毁，不随播放状态重建（架构文档 §3.1：播放实例不随视图/状态重建）
  useEffect(() => {
    if (mode !== 'video' || !videoRef.current) return;

    // 卸载后 videoRef.current 会被 React 置空——同步段先捕获 el 供 cleanup 使用
    const mountedEl = videoRef.current;

    // 竞态防护：动态 import 未完成即卸载时，丢弃迟到实例
    let disposed = false;

    (async () => {
      const el = mountedEl;
      if (!el) return;
      const isHls = typeof videoUrl === 'string' && videoUrl.endsWith('.m3u8');

      if (isHls) {
        const { default: Hls } = await import('hls.js');
        if (disposed) return;
        if (Hls.isSupported()) {
          // hls.js 接管 HLS 源，video.js 仅负责渲染与控制栏
          const hls = new Hls();
          hls.loadSource(videoUrl);
          hls.attachMedia(el);
          // jsdom / 旧浏览器 play() 可能返回 undefined，安全调用
          try {
            void Promise.resolve(el.play?.()).catch(() => {});
          } catch {
            /* 自动播放被策略阻止属预期，等待用户手势 */
          }
          (el as any).__hls = hls;
          return;
        }
      }

      // 非 HLS（或 MSE 不可用）：Video.js 原生播放
      const [{ default: videojs }] = await Promise.all([
        import('video.js'),
        import('video.js/dist/video-js.css'),
      ]);
      if (disposed || !videoRef.current) return;
      const newPlayer: any = videojs(videoRef.current, {
        fluid: true,
        controls: true,
        playsinline: true,
        preload: 'auto',
        controlBar: {
          volumePanel: true,
          progressControl: true,
          remainingTimeDisplay: false,
        },
      });
      // videojs 同步返回实例；不在 ready 回调内引用自身（避免 TDZ 时序缺陷）
      playerRef.current = newPlayer;
      // 深色主题色变量，与现有设计一致（主仓 §W2 合入；宿主元素缺失/无 style 时跳过，如测试 mock）
      const hostEl = newPlayer.el() as (HTMLElement | undefined | null);
      hostEl?.style?.setProperty?.('--vjs-color-accent', '#667eea');
      hostEl?.style?.setProperty?.('--vjs-control-color', 'rgba(255,255,255,0.8)');
      hostEl?.style?.setProperty?.('--vjs-control-hover-bg', 'rgba(255,255,255,0.15)');
      hostEl?.style?.setProperty?.('--vjs-control-active-bg', 'rgba(255,255,255,0.25)');
      hostEl?.style?.setProperty?.('--vjs-control-disabled-bg', 'rgba(255,255,255,0.05)');
      newPlayer.src({ src: videoUrl, type: 'video/mp4' });
      // 首次创建时按当前播放状态启动（闭包捕获创建时刻的 isPlaying）
      if (isPlaying) newPlayer.play();
    })().catch((err) => {
      console.error('[MediaDisplay] 播放内核动态加载失败:', err);
    });

    return () => {
      disposed = true;
      const el = mountedEl;
      if (el && (el as any).__hls) {
        (el as any).__hls.destroy();
        (el as any).__hls = null;
      }
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
    // isPlaying 刻意不入 deps：仅首次创建读取，状态后续由同步 effect 处理
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, videoUrl]);

  // 播放状态同步：仅 play/pause，不重建媒体元素
  useEffect(() => {
    if (mode !== 'video') return;
    const player = playerRef.current;
    if (!player) return;
    if (player.currentSrc() === videoUrl) {
      if (isPlaying) player.play();
      else player.pause();
    }
  }, [mode, isPlaying, videoUrl]);

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
              ref={videoRef}
              className="w-full h-full object-contain vjs-theme-sea"
              playsInline
              // src 由 Video.js / hls.js 在 useEffect 中设置，避免双重加载
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
