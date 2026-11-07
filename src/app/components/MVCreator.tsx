import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Camera, Maximize2, Play, Pause,
  Layers, Minus, Plus,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useI18n } from '../hooks/useI18n';
import type { Track } from '../playlistData';

// ==========================================
// MV Creator — Canvas-based Music Visualization
// ==========================================
// Renders animated visual themes synchronized to audio
// energy and emotion, with lyrics overlay.

type MVTheme = 'starfield' | 'neonPulse' | 'aurora' | 'inkWash' | 'cyberCity';

interface MVCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track;
  isPlaying: boolean;
  audioEnergy: number;
  frequencyData: Uint8Array;
  currentTime: number;
  emotion: string;
  customLyrics?: string[] | null;
  onHaptic?: (pattern: string) => void;
}

const MV_THEMES: Array<{
  id: MVTheme;
  labelZh: string;
  labelEn: string;
  emoji: string;
  colors: [string, string, string];
}> = [
  { id: 'starfield', labelZh: '星空漫游', labelEn: 'Starfield', emoji: '🌌', colors: ['#667eea', '#764ba2', '#fff'] },
  { id: 'neonPulse', labelZh: '霓虹脉冲', labelEn: 'Neon Pulse', emoji: '💜', colors: ['#ff006e', '#8338ec', '#3a86ff'] },
  { id: 'aurora', labelZh: '极光幻境', labelEn: 'Aurora', emoji: '🌈', colors: ['#00f5d4', '#7209b7', '#f72585'] },
  { id: 'inkWash', labelZh: '水墨流韵', labelEn: 'Ink Wash', emoji: '🏔️', colors: ['#1a1a2e', '#e0e0e0', '#555'] },
  { id: 'cyberCity', labelZh: '赛博都市', labelEn: 'Cyber City', emoji: '🌃', colors: ['#0ff', '#f0f', '#ff0'] },
];

// Particle system for various themes
interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
}

function createParticle(w: number, h: number, theme: MVTheme): Particle {
  const colors = MV_THEMES.find(t => t.id === theme)?.colors || ['#fff', '#aaa', '#666'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  switch (theme) {
    case 'starfield':
      return {
        x: Math.random() * w, y: Math.random() * h, z: Math.random() * 3 + 0.5,
        vx: 0, vy: Math.random() * 0.3 + 0.1,
        size: Math.random() * 2.5 + 0.5,
        alpha: Math.random() * 0.8 + 0.2, color,
        life: 0, maxLife: 300 + Math.random() * 200,
      };
    case 'neonPulse':
      return {
        x: w / 2 + (Math.random() - 0.5) * w * 0.8,
        y: h / 2 + (Math.random() - 0.5) * h * 0.8,
        z: 1,
        vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
        size: Math.random() * 4 + 1,
        alpha: Math.random() * 0.6 + 0.2, color,
        life: 0, maxLife: 150 + Math.random() * 100,
      };
    case 'aurora':
      return {
        x: Math.random() * w, y: h * 0.2 + Math.random() * h * 0.3,
        z: 1, vx: Math.random() * 0.5 + 0.2, vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 40 + 20,
        alpha: Math.random() * 0.15 + 0.05, color,
        life: 0, maxLife: 400 + Math.random() * 200,
      };
    case 'inkWash':
      return {
        x: Math.random() * w, y: Math.random() * h,
        z: 1, vx: (Math.random() - 0.5) * 0.5, vy: -Math.random() * 0.8 - 0.2,
        size: Math.random() * 30 + 5,
        alpha: Math.random() * 0.08 + 0.02, color,
        life: 0, maxLife: 300 + Math.random() * 200,
      };
    case 'cyberCity':
    default:
      return {
        x: Math.random() * w, y: Math.random() * h,
        z: 1, vx: 0, vy: Math.random() * 2 + 1,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.7 + 0.3, color,
        life: 0, maxLife: 200 + Math.random() * 100,
      };
  }
}

export const MVCreator: React.FC<MVCreatorProps> = ({
  isOpen,
  onClose,
  track,
  isPlaying,
  audioEnergy,
  frequencyData,
  currentTime,
  emotion,
  customLyrics,
  onHaptic,
}) => {
  const { lang } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const timeRef = useRef(0);

  const [mvTheme, setMvTheme] = useState<MVTheme>('starfield');
  const [showLyrics, setShowLyrics] = useState(true);
  const [intensity, setIntensity] = useState(0.7);

  // Build effective lyrics: use customLyrics (from "Create MV from this work") or track lyrics
  const effectiveLyrics = customLyrics && customLyrics.length > 0
    ? customLyrics.map((text, i) => ({
        time: i * (track.duration > 0 ? track.duration / customLyrics.length : 10),
        text,
      }))
    : track.lyrics;

  // Current lyric line
  const currentLyric = [...effectiveLyrics].reverse().find(l => l.time <= currentTime);
  const nextLyric = effectiveLyrics.find(l => l.time > currentTime);

  // ========== Canvas Rendering Loop ==========
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    timeRef.current += 1;
    const t = timeRef.current;
    const energy = audioEnergy * intensity;
    const themeColors = MV_THEMES.find(th => th.id === mvTheme)?.colors || ['#fff', '#aaa', '#666'];

    // ---- Background ----
    switch (mvTheme) {
      case 'starfield': {
        ctx.fillStyle = '#050816';
        ctx.fillRect(0, 0, w, h);
        // Deep space glow
        const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.5);
        g.addColorStop(0, `rgba(102, 126, 234, ${0.03 + energy * 0.05})`);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        break;
      }
      case 'neonPulse': {
        ctx.fillStyle = `rgba(10, 5, 30, ${0.15 + (1 - energy) * 0.1})`;
        ctx.fillRect(0, 0, w, h);
        // Pulsating center
        const ng = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, 150 + energy * 200);
        ng.addColorStop(0, `rgba(131, 56, 236, ${0.1 + energy * 0.15})`);
        ng.addColorStop(0.5, `rgba(255, 0, 110, ${0.05 + energy * 0.08})`);
        ng.addColorStop(1, 'transparent');
        ctx.fillStyle = ng;
        ctx.fillRect(0, 0, w, h);
        break;
      }
      case 'aurora': {
        ctx.fillStyle = 'rgba(5, 5, 20, 0.08)';
        ctx.fillRect(0, 0, w, h);
        break;
      }
      case 'inkWash': {
        ctx.fillStyle = `rgba(15, 15, 25, ${0.05 + (1 - energy) * 0.03})`;
        ctx.fillRect(0, 0, w, h);
        // Mountain silhouette
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 3) {
          const y = h - 80 - Math.sin(x * 0.008 + 1) * 60 - Math.sin(x * 0.015) * 30 - Math.cos(x * 0.003 + 2) * 40;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.fillStyle = 'rgba(30, 30, 50, 0.06)';
        ctx.fill();
        break;
      }
      case 'cyberCity': {
        ctx.fillStyle = 'rgba(5, 0, 15, 0.12)';
        ctx.fillRect(0, 0, w, h);
        // Grid floor
        ctx.strokeStyle = `rgba(0, 255, 255, ${0.04 + energy * 0.06})`;
        ctx.lineWidth = 0.5;
        const gridY = h * 0.7;
        for (let i = 0; i < 20; i++) {
          const y = gridY + i * 12;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        for (let i = 0; i < 15; i++) {
          const x = w / 2 + (i - 7) * (40 + i * 5);
          ctx.beginPath();
          ctx.moveTo(w / 2, gridY);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        break;
      }
    }

    // ---- Particles ----
    // Add new particles
    const targetCount = Math.floor(50 + energy * 80 * intensity);
    while (particlesRef.current.length < targetCount) {
      particlesRef.current.push(createParticle(w, h, mvTheme));
    }

    // Update and draw particles
    const alive: Particle[] = [];
    for (const p of particlesRef.current) {
      p.life += 1;
      if (p.life > p.maxLife) continue;

      p.x += p.vx + (mvTheme === 'starfield' ? Math.sin(t * 0.01 + p.y * 0.01) * 0.2 : 0);
      p.y += p.vy * (1 + energy * 0.5);

      // Wrap around
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10;
      if (p.y > h + 10) p.y = -10;

      const fadeIn = Math.min(p.life / 20, 1);
      const fadeOut = Math.max(1 - (p.life - p.maxLife + 30) / 30, 0);
      const alpha = p.alpha * fadeIn * fadeOut * (0.5 + energy * 0.5);

      ctx.beginPath();
      if (mvTheme === 'aurora') {
        // Soft ellipses for aurora
        ctx.ellipse(p.x, p.y, p.size * (1 + energy), p.size * 0.3, 0, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
        ctx.fill();
      } else if (mvTheme === 'inkWash') {
        // Soft circles for ink
        const ig = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        ig.addColorStop(0, `rgba(200, 200, 210, ${alpha})`);
        ig.addColorStop(1, 'transparent');
        ctx.fillStyle = ig;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (mvTheme === 'cyberCity') {
        // Vertical rain lines
        ctx.strokeStyle = `${p.color}${Math.floor(alpha * 200).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = p.size * 0.5;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x, p.y - 8 - energy * 12);
        ctx.stroke();
      } else {
        ctx.arc(p.x, p.y, p.size * (mvTheme === 'neonPulse' ? (1 + energy * 0.5) : 1), 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
        ctx.fill();

        // Glow for neon
        if (mvTheme === 'neonPulse' && p.size > 2) {
          const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
          glow.addColorStop(0, `${p.color}${Math.floor(alpha * 80).toString(16).padStart(2, '0')}`);
          glow.addColorStop(1, 'transparent');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      alive.push(p);
    }
    particlesRef.current = alive;

    // ---- Frequency Spectrum ----
    if (frequencyData.length > 0 && isPlaying) {
      const barCount = Math.min(64, frequencyData.length);
      const barWidth = w / barCount;
      const maxBarH = h * 0.25;

      ctx.save();
      if (mvTheme === 'inkWash') {
        ctx.globalAlpha = 0.15;
      }

      for (let i = 0; i < barCount; i++) {
        const value = frequencyData[Math.floor(i * frequencyData.length / barCount)] / 255;
        const barH = value * maxBarH * intensity;
        const x = i * barWidth;

        const barGrad = ctx.createLinearGradient(x, h, x, h - barH);

        if (mvTheme === 'neonPulse') {
          barGrad.addColorStop(0, `rgba(255, 0, 110, ${0.3 + value * 0.4})`);
          barGrad.addColorStop(1, `rgba(131, 56, 236, ${0.1 + value * 0.2})`);
        } else if (mvTheme === 'aurora') {
          barGrad.addColorStop(0, `rgba(0, 245, 212, ${0.2 + value * 0.3})`);
          barGrad.addColorStop(1, `rgba(114, 9, 183, ${0.1 + value * 0.15})`);
        } else if (mvTheme === 'cyberCity') {
          barGrad.addColorStop(0, `rgba(0, 255, 255, ${0.3 + value * 0.5})`);
          barGrad.addColorStop(1, `rgba(255, 0, 255, ${0.1 + value * 0.2})`);
        } else if (mvTheme === 'inkWash') {
          barGrad.addColorStop(0, `rgba(180, 180, 190, ${0.3 + value * 0.4})`);
          barGrad.addColorStop(1, 'transparent');
        } else {
          barGrad.addColorStop(0, `rgba(102, 126, 234, ${0.2 + value * 0.4})`);
          barGrad.addColorStop(1, `rgba(118, 75, 162, ${0.05 + value * 0.1})`);
        }

        ctx.fillStyle = barGrad;
        ctx.fillRect(x, h - barH, barWidth - 1, barH);
      }
      ctx.restore();
    }

    // ---- Center Ring (energy reactive) ----
    if (mvTheme !== 'inkWash') {
      const ringRadius = 60 + energy * 40;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `${themeColors[0]}${Math.floor((0.1 + energy * 0.2) * 255).toString(16).padStart(2, '0')}`;
      ctx.lineWidth = 1.5 + energy * 2;
      ctx.stroke();

      // Second ring
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, ringRadius * 1.3 + Math.sin(t * 0.03) * 10, 0, Math.PI * 2);
      ctx.strokeStyle = `${themeColors[1]}${Math.floor((0.05 + energy * 0.1) * 255).toString(16).padStart(2, '0')}`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // ---- Lyrics Overlay ----
    if (showLyrics && currentLyric) {
      ctx.save();
      ctx.textAlign = 'center';

      // Main lyric
      ctx.font = `700 ${mvTheme === 'inkWash' ? '20' : '22'}px system-ui, -apple-system, sans-serif`;
      const lyricY = h * 0.78;

      // Text shadow/glow
      if (mvTheme !== 'inkWash') {
        ctx.shadowColor = themeColors[0];
        ctx.shadowBlur = 15 + energy * 20;
      }
      ctx.fillStyle = `rgba(255, 255, 255, ${0.8 + energy * 0.2})`;

      // Word wrap for long lyrics
      const maxWidth = w * 0.85;
      const text = currentLyric.text;
      if (ctx.measureText(text).width > maxWidth) {
        const words = text.split(' ');
        let line = '';
        let lineY = lyricY;
        for (const word of words) {
          const test = line ? `${line} ${word}` : word;
          if (ctx.measureText(test).width > maxWidth) {
            ctx.fillText(line, w / 2, lineY);
            line = word;
            lineY += 30;
          } else {
            line = test;
          }
        }
        ctx.fillText(line, w / 2, lineY);
      } else {
        ctx.fillText(text, w / 2, lyricY);
      }

      // Translation
      ctx.shadowBlur = 0;
      if (currentLyric.translation) {
        ctx.font = '400 13px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillText(currentLyric.translation, w / 2, lyricY + 28);
      }

      ctx.restore();
    }

    // ---- Track Info Overlay ----
    ctx.save();
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '500 11px system-ui, -apple-system, sans-serif';
    ctx.fillText(track.title, 20, 28);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.font = '400 10px system-ui, -apple-system, sans-serif';
    ctx.fillText(track.artist, 20, 44);

    // Time
    ctx.textAlign = 'right';
    const mins = Math.floor(currentTime / 60);
    const secs = Math.floor(currentTime % 60);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.font = '400 10px monospace';
    ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, w - 20, 28);
    ctx.restore();

    // ---- Progress bar ----
    const progress = track.duration > 0 ? currentTime / track.duration : 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(0, h - 3, w, 3);
    const pGrad = ctx.createLinearGradient(0, 0, w * progress, 0);
    pGrad.addColorStop(0, themeColors[0]);
    pGrad.addColorStop(1, themeColors[1]);
    ctx.fillStyle = pGrad;
    ctx.fillRect(0, h - 3, w * progress, 3);

    animFrameRef.current = requestAnimationFrame(render);
  }, [mvTheme, audioEnergy, frequencyData, isPlaying, currentTime, showLyrics, intensity, track, currentLyric, emotion, effectiveLyrics]);

  // Start/stop animation loop
  useEffect(() => {
    if (isOpen) {
      // Reset particles when theme changes
      particlesRef.current = [];
      timeRef.current = 0;

      // Set canvas size
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * (window.devicePixelRatio > 1 ? 2 : 1);
        canvas.height = rect.height * (window.devicePixelRatio > 1 ? 2 : 1);
      }

      animFrameRef.current = requestAnimationFrame(render);
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isOpen, render]);

  // ========== Screenshot ==========
  const handleScreenshot = useCallback(() => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `d-music-mv-${track.title.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
    onHaptic?.('success');
  }, [track.title, onHaptic]);

  // ========== Fullscreen ==========
  const handleFullscreen = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      canvas.requestFullscreen?.().catch(() => {});
    }
    onHaptic?.('medium');
  }, [onHaptic]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[62] bg-black/80 backdrop-blur-xl"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            className="fixed z-[63] inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[90vw] md:max-w-3xl md:max-h-[88vh] bg-[#080C28]/98 backdrop-blur-2xl border border-white/10 rounded-2xl flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
                  <Layers className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm leading-tight flex items-center gap-1.5">
                    {lang === 'zh' ? 'MV 创作' : 'MV Creator'}
                    {customLyrics && customLyrics.length > 0 && (
                      <span className="text-[9px] font-normal px-1.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/25 text-cyan-300">
                        {lang === 'zh' ? '作品歌词' : 'Work Lyrics'}
                      </span>
                    )}
                  </h3>
                  <p className="text-white/30 text-[10px]">
                    {track.title} — {track.artist}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Status */}
                <div className={clsx(
                  'flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px]',
                  isPlaying ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/30'
                )}>
                  {isPlaying ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                  {isPlaying ? (lang === 'zh' ? '播放中' : 'Playing') : (lang === 'zh' ? '已暂停' : 'Paused')}
                </div>

                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 relative min-h-0 bg-black">
              <canvas
                ref={canvasRef}
                className="w-full h-full"
                style={{ display: 'block' }}
              />

              {/* Overlay controls */}
              <div className="absolute bottom-3 right-3 flex gap-1.5">
                <button
                  onClick={handleScreenshot}
                  className="p-2 rounded-lg bg-black/50 backdrop-blur-sm border border-white/10 text-white/50 hover:text-white hover:bg-black/70 transition-colors"
                  title={lang === 'zh' ? '截图' : 'Screenshot'}
                >
                  <Camera className="w-4 h-4" />
                </button>
                <button
                  onClick={handleFullscreen}
                  className="p-2 rounded-lg bg-black/50 backdrop-blur-sm border border-white/10 text-white/50 hover:text-white hover:bg-black/70 transition-colors"
                  title={lang === 'zh' ? '全屏' : 'Fullscreen'}
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="px-5 py-3 border-t border-white/[0.06] flex-shrink-0">
              <div className="flex items-center gap-4 flex-wrap">
                {/* Theme selector */}
                <div className="flex items-center gap-1.5">
                  {MV_THEMES.map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => {
                        setMvTheme(theme.id);
                        particlesRef.current = [];
                        onHaptic?.('selection');
                      }}
                      className={clsx(
                        'px-2.5 py-1.5 rounded-lg border text-[10px] transition-all flex items-center gap-1',
                        mvTheme === theme.id
                          ? 'bg-white/10 border-white/20 text-white'
                          : 'bg-white/[0.02] border-white/[0.06] text-white/30 hover:bg-white/[0.05] hover:text-white/50'
                      )}
                    >
                      <span>{theme.emoji}</span>
                      <span className="hidden sm:inline">{lang === 'zh' ? theme.labelZh : theme.labelEn}</span>
                    </button>
                  ))}
                </div>

                <div className="flex-1" />

                {/* Lyrics toggle */}
                <button
                  onClick={() => setShowLyrics(p => !p)}
                  className={clsx(
                    'px-2.5 py-1.5 rounded-lg border text-[10px] transition-all',
                    showLyrics
                      ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                      : 'bg-white/[0.02] border-white/[0.06] text-white/30'
                  )}
                >
                  {lang === 'zh' ? '歌词' : 'Lyrics'}
                </button>

                {/* Intensity */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIntensity(v => Math.max(0.2, v - 0.2))}
                    className="p-1 rounded text-white/30 hover:text-white/60 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all"
                      style={{ width: `${intensity * 100}%` }}
                    />
                  </div>
                  <button
                    onClick={() => setIntensity(v => Math.min(1, v + 0.2))}
                    className="p-1 rounded text-white/30 hover:text-white/60 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
