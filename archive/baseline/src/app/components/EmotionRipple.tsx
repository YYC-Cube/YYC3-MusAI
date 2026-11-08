import React, { useRef, useEffect, useCallback } from 'react';
import { setCanvasPerf } from '../lib/canvasPerfRegistry';

/**
 * §22.x — Emotion Ripple Visualization (情感波纹可视化)
 *
 * Canvas-based ripple effect that responds to:
 *   - Current emotion (color mapping)
 *   - Audio energy (ripple intensity & speed)
 *   - Playback state (active only when playing)
 *
 * Deep-space themed concentric ripples expand from center,
 * with emotion-driven color transitions and energy-scaled amplitude.
 * Non-intrusive — rendered as a pointer-events-none overlay.
 */

type Emotion = 'happy' | 'energetic' | 'calm' | 'sad' | 'neutral';

interface EmotionRippleProps {
  emotion: Emotion;
  audioEnergy: number; // 0-1
  isPlaying: boolean;
  /** Frequency data from audio engine for beat detection */
  frequencyData?: Uint8Array;
  /** Optional className for the wrapper div */
  className?: string;
}

// Emotion → color palette (HSL-based for smooth interpolation)
const EMOTION_PALETTES: Record<Emotion, { h: number; s: number; l: number; trail: string }> = {
  happy:     { h: 45,  s: 90, l: 60, trail: 'rgba(255,215,0,0.06)' },
  energetic: { h: 15,  s: 85, l: 55, trail: 'rgba(255,69,0,0.06)' },
  calm:      { h: 180, s: 70, l: 50, trail: 'rgba(0,206,209,0.05)' },
  sad:       { h: 225, s: 65, l: 55, trail: 'rgba(100,149,237,0.05)' },
  neutral:   { h: 260, s: 50, l: 55, trail: 'rgba(139,92,246,0.04)' },
};

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  hue: number;
  saturation: number;
  lightness: number;
  speed: number;
  lineWidth: number;
}

export const EmotionRipple: React.FC<EmotionRippleProps> = ({
  emotion,
  audioEnergy,
  isPlaying,
  frequencyData,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const ripplesRef = useRef<Ripple[]>([]);
  const lastSpawnRef = useRef(0);
  const targetPaletteRef = useRef(EMOTION_PALETTES.neutral);
  const currentPaletteRef = useRef({ h: 260, s: 50, l: 55 });
  // §23.x — Beat detection state
  const prevBassRef = useRef(0);
  const beatCooldownRef = useRef(0);
  // §24.x — Climax mode state (sustained high energy >3s)
  const highEnergyStartRef = useRef(0);
  const isClimaxRef = useRef(false);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; hue: number }[]>([]);

  // Smooth palette interpolation
  const lerpColor = useCallback(() => {
    const t = 0.03; // slow interpolation for cinematic feel
    const target = targetPaletteRef.current;
    const cur = currentPaletteRef.current;
    cur.h += (target.h - cur.h) * t;
    cur.s += (target.s - cur.s) * t;
    cur.l += (target.l - cur.l) * t;
  }, []);

  useEffect(() => {
    targetPaletteRef.current = EMOTION_PALETTES[emotion] || EMOTION_PALETTES.neutral;
  }, [emotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    const spawnRipple = (cx: number, cy: number, energy: number) => {
      const palette = currentPaletteRef.current;
      // Random position offset for organic feel
      const offsetX = (Math.random() - 0.5) * cx * 0.4;
      const offsetY = (Math.random() - 0.5) * cy * 0.4;

      ripplesRef.current.push({
        x: cx + offsetX,
        y: cy + offsetY,
        radius: 2 + Math.random() * 8,
        maxRadius: 80 + energy * 220 + Math.random() * 60,
        opacity: 0.15 + energy * 0.35,
        hue: palette.h + (Math.random() - 0.5) * 20,
        saturation: palette.s,
        lightness: palette.l,
        speed: 0.4 + energy * 1.2 + Math.random() * 0.3,
        lineWidth: 1 + energy * 2,
      });
    };

    const canvasFpsCountRef = { current: 0, lastTime: performance.now(), fps: 0 };

    const animate = () => {
      const drawStart = performance.now();
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const cx = w / 2;
      const cy = h / 2;

      // Semi-transparent clear for trail effect
      ctx.clearRect(0, 0, w, h);

      // Subtle ambient glow at center when playing
      if (isPlaying) {
        const palette = currentPaletteRef.current;
        const glowRadius = 30 + audioEnergy * 60;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
        grad.addColorStop(0, `hsla(${palette.h}, ${palette.s}%, ${palette.l}%, ${0.06 + audioEnergy * 0.08})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      // Smooth color transition
      lerpColor();

      // Spawn ripples based on energy
      const now = Date.now();
      if (isPlaying) {
        // Higher energy = more frequent spawns
        const spawnInterval = Math.max(200, 1200 - audioEnergy * 900);
        if (now - lastSpawnRef.current > spawnInterval) {
          lastSpawnRef.current = now;
          spawnRipple(cx, cy, audioEnergy);
          // Extra ripple at high energy
          if (audioEnergy > 0.6 && Math.random() > 0.4) {
            spawnRipple(cx, cy, audioEnergy * 0.7);
          }
        }

        // §23.x — Beat detection: analyze bass frequencies (bins 0-5)
        if (frequencyData && frequencyData.length > 5 && now > beatCooldownRef.current) {
          let bassSum = 0;
          for (let b = 0; b < 6; b++) bassSum += frequencyData[b];
          const bassEnergy = bassSum / (6 * 255);
          const bassRise = bassEnergy - prevBassRef.current;
          prevBassRef.current = bassEnergy;
          // Beat detected: sharp bass rise > threshold
          if (bassRise > 0.12 && bassEnergy > 0.35) {
            beatCooldownRef.current = now + 120; // 120ms cooldown between beats
            // Burst: spawn 3 concentric ripples from center
            for (let k = 0; k < 3; k++) {
              const palette = currentPaletteRef.current;
              ripplesRef.current.push({
                x: cx + (Math.random() - 0.5) * 20,
                y: cy + (Math.random() - 0.5) * 20,
                radius: 5 + k * 12,
                maxRadius: 150 + bassEnergy * 200 + k * 40,
                opacity: 0.4 + bassEnergy * 0.3 - k * 0.08,
                hue: palette.h + k * 8,
                saturation: palette.s + 10,
                lightness: palette.l + 10,
                speed: 1.5 + bassEnergy * 2 - k * 0.3,
                lineWidth: 2.5 + bassEnergy * 2 - k * 0.5,
              });
            }
          }
        }
      }

      // §24.x — Climax mode detection: sustained high energy >3s
      if (isPlaying) {
        if (audioEnergy > 0.65) {
          if (highEnergyStartRef.current === 0) highEnergyStartRef.current = now;
          if (now - highEnergyStartRef.current > 3000 && !isClimaxRef.current) {
            isClimaxRef.current = true;
          }
        } else {
          highEnergyStartRef.current = 0;
          if (isClimaxRef.current && audioEnergy < 0.4) {
            isClimaxRef.current = false;
          }
        }

        // Climax mode: spawn burst particles across full canvas
        if (isClimaxRef.current) {
          const palette = currentPaletteRef.current;
          const pCount = Math.floor(2 + audioEnergy * 4);
          for (let p = 0; p < pCount; p++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            particlesRef.current.push({
              x: cx + (Math.random() - 0.5) * w * 0.3,
              y: cy + (Math.random() - 0.5) * h * 0.3,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 1,
              maxLife: 60 + Math.random() * 40,
              size: 1 + Math.random() * 2.5,
              hue: palette.h + (Math.random() - 0.5) * 30,
            });
          }
          // Climax expanded glow
          const climaxGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.5);
          climaxGrad.addColorStop(0, `hsla(${palette.h}, ${palette.s + 20}%, ${palette.l + 10}%, ${0.04 + audioEnergy * 0.06})`);
          climaxGrad.addColorStop(0.5, `hsla(${palette.h + 20}, ${palette.s}%, ${palette.l}%, ${0.02 + audioEnergy * 0.03})`);
          climaxGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = climaxGrad;
          ctx.fillRect(0, 0, w, h);
        }
      } else {
        isClimaxRef.current = false;
        highEnergyStartRef.current = 0;
      }

      // Update & draw particles
      const particles = particlesRef.current;
      for (let p = particles.length - 1; p >= 0; p--) {
        const pt = particles[p];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life -= 1 / pt.maxLife;
        if (pt.life <= 0 || pt.x < -10 || pt.x > w + 10 || pt.y < -10 || pt.y > h + 10) {
          particles.splice(p, 1);
          continue;
        }
        const alpha = pt.life * 0.6;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size * pt.life, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${pt.hue}, 80%, 70%, ${alpha})`;
        ctx.fill();
      }
      if (particles.length > 200) particles.splice(0, particles.length - 200);

      // Update & draw ripples
      const ripples = ripplesRef.current;
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += r.speed;
        r.opacity *= 0.992;

        // Fade as approaching max radius
        const progress = r.radius / r.maxRadius;
        const fadeOut = Math.max(0, 1 - progress);
        const alpha = r.opacity * fadeOut;

        if (alpha < 0.003 || r.radius > r.maxRadius) {
          ripples.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${r.hue}, ${r.saturation}%, ${r.lightness}%, ${alpha})`;
        ctx.lineWidth = r.lineWidth * fadeOut;
        ctx.stroke();

        // Inner glow ring
        if (alpha > 0.05) {
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius * 0.85, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(${r.hue}, ${r.saturation}%, ${r.lightness + 15}%, ${alpha * 0.3})`;
          ctx.lineWidth = r.lineWidth * fadeOut * 0.5;
          ctx.stroke();
        }
      }

      // Limit total ripples for performance (higher limit during climax)
      const maxRipples = isClimaxRef.current ? 60 : 40;
      if (ripples.length > maxRipples) {
        ripples.splice(0, ripples.length - maxRipples);
      }

      // §25.x — Report canvas perf metrics to global registry
      canvasFpsCountRef.current++;
      const perfNow = performance.now();
      if (perfNow - canvasFpsCountRef.lastTime >= 1000) {
        canvasFpsCountRef.fps = canvasFpsCountRef.current;
        canvasFpsCountRef.current = 0;
        canvasFpsCountRef.lastTime = perfNow;
      }
      setCanvasPerf({
        rippleCount: ripples.length,
        particleCount: particles.length,
        drawTimeMs: Math.round((perfNow - drawStart) * 100) / 100,
        canvasFps: canvasFpsCountRef.fps,
        isClimax: isClimaxRef.current,
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
      resizeObserver.disconnect();
    };
  }, [isPlaying, audioEnergy, lerpColor]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none z-[2] ${className}`}
      aria-hidden="true"
    />
  );
};