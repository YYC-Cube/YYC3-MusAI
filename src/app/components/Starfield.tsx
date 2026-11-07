import React, { useRef, useEffect } from 'react';
import type { Emotion } from '../hooks/useAudioEngine';

interface StarfieldProps {
  emotion?: Emotion;
  isPlaying?: boolean;
  audioEnergy?: number;
  bassEnergy?: number;
}

const EMOTION_RGB: Record<string, [number, number, number]> = {
  happy: [255, 215, 0],
  sad: [100, 149, 237],
  energetic: [255, 69, 0],
  calm: [0, 206, 209],
  neutral: [140, 140, 255],
};

export const Starfield: React.FC<StarfieldProps> = ({
  emotion = 'neutral',
  isPlaying = false,
  audioEnergy = 0,
  bassEnergy = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const emotionRef = useRef(emotion);
  const prevEmotionRef = useRef(emotion);
  const isPlayingRef = useRef(isPlaying);
  const audioEnergyRef = useRef(audioEnergy);
  const bassEnergyRef = useRef(bassEnergy);
  const supernovaRef = useRef<{ x: number; y: number; t: number; color: [number, number, number] }[]>([]);
  const prevEnergyRef = useRef(0);

  useEffect(() => {
    // Detect emotion change → trigger supernova
    if (emotion !== emotionRef.current) {
      prevEmotionRef.current = emotionRef.current;
      emotionRef.current = emotion;
      if (isPlayingRef.current) {
        const canvas = canvasRef.current;
        if (canvas) {
          supernovaRef.current.push({
            x: canvas.width / (2 * (Math.min(window.devicePixelRatio || 1, 2))),
            y: canvas.height / (2 * (Math.min(window.devicePixelRatio || 1, 2))),
            t: 0,
            color: EMOTION_RGB[emotion] || EMOTION_RGB.neutral,
          });
        }
      }
    }
  }, [emotion]);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { audioEnergyRef.current = audioEnergy; }, [audioEnergy]);
  useEffect(() => {
    // High bass spike → supernova burst
    if (bassEnergy > 0.65 && prevEnergyRef.current < 0.4 && isPlayingRef.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        supernovaRef.current.push({
          x: Math.random() * (canvas.width / dpr),
          y: Math.random() * (canvas.height / dpr),
          t: 0,
          color: EMOTION_RGB[emotionRef.current] || EMOTION_RGB.neutral,
        });
      }
    }
    prevEnergyRef.current = bassEnergy;
    bassEnergyRef.current = bassEnergy;
  }, [bassEnergy]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Star particles
    class Star {
      x: number; y: number; baseSize: number;
      speedX: number; speedY: number;
      alpha: number; alphaDir: number;
      pulsePhase: number; layer: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.layer = Math.random(); // 0 = far, 1 = near
        this.baseSize = 0.3 + this.layer * 2.2;
        this.speedX = (Math.random() - 0.5) * 0.2 * (0.5 + this.layer);
        this.speedY = (Math.random() - 0.5) * 0.2 * (0.5 + this.layer);
        this.alpha = Math.random() * 0.7 + 0.15;
        this.alphaDir = (Math.random() - 0.5) * 0.012;
        this.pulsePhase = Math.random() * Math.PI * 2;
      }

      update(time: number): number {
        const energy = audioEnergyRef.current;
        const bass = bassEnergyRef.current;
        const playing = isPlayingRef.current;

        const speedMult = playing ? 1.2 + energy * 5 * this.layer : 0.25;
        this.x += this.speedX * speedMult;
        this.y += this.speedY * speedMult;

        const pulseMod = playing
          ? 1 + bass * 2.5 * Math.sin(time * 3.5 + this.pulsePhase) * this.layer
          : 1;

        this.alpha += this.alphaDir;
        if (this.alpha >= 0.95 || this.alpha <= 0.08) this.alphaDir *= -1;
        this.alpha = Math.max(0.08, Math.min(0.95, this.alpha));

        if (this.x < -10) this.x = width + 10;
        if (this.x > width + 10) this.x = -10;
        if (this.y < -10) this.y = height + 10;
        if (this.y > height + 10) this.y = -10;

        return this.baseSize * pulseMod;
      }

      draw(ctx: CanvasRenderingContext2D, size: number, rgb: [number, number, number]) {
        const a = this.alpha * (isPlayingRef.current ? 1 : 0.5);

        // Core
        ctx.beginPath();
        ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`;
        ctx.fill();

        // Outer glow for larger/nearer stars
        if (size > 1.2) {
          ctx.beginPath();
          ctx.arc(this.x, this.y, size * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a * 0.12})`;
          ctx.fill();
        }

        // Cross-hair sparkle for very bright stars
        if (size > 2 && a > 0.6 && isPlayingRef.current) {
          ctx.save();
          ctx.globalAlpha = a * 0.25;
          ctx.strokeStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(this.x - size * 4, this.y);
          ctx.lineTo(this.x + size * 4, this.y);
          ctx.moveTo(this.x, this.y - size * 4);
          ctx.lineTo(this.x, this.y + size * 4);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // Nebula
    class Nebula {
      x: number; y: number; radius: number;
      speedX: number; speedY: number; alpha: number;
      colorPhase: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.radius = 120 + Math.random() * 250;
        this.speedX = (Math.random() - 0.5) * 0.04;
        this.speedY = (Math.random() - 0.5) * 0.04;
        this.alpha = 0.008 + Math.random() * 0.025;
        this.colorPhase = Math.random() * Math.PI * 2;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x < -this.radius) this.x = width + this.radius;
        if (this.x > width + this.radius) this.x = -this.radius;
        if (this.y < -this.radius) this.y = height + this.radius;
        if (this.y > height + this.radius) this.y = -this.radius;
      }

      draw(ctx: CanvasRenderingContext2D, rgb: [number, number, number]) {
        const boost = isPlayingRef.current ? 1 + audioEnergyRef.current * 2.5 : 0.7;
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        gradient.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${this.alpha * boost})`);
        gradient.addColorStop(0.4, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${this.alpha * boost * 0.4})`);
        gradient.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    }

    const starCount = Math.min(Math.floor((width * height) / 4000), 400);
    const stars: Star[] = Array.from({ length: starCount }, () => new Star());
    const nebulae: Nebula[] = Array.from({ length: 6 }, () => new Nebula());

    // Smooth color interpolation
    let currentRgb: [number, number, number] = [...(EMOTION_RGB[emotion] || EMOTION_RGB.neutral)];
    let targetRgb: [number, number, number] = [...currentRgb];

    let time = 0;
    const animate = () => {
      time += 0.016;

      // Smooth color transition
      targetRgb = EMOTION_RGB[emotionRef.current] || EMOTION_RGB.neutral;
      const lerpSpeed = 0.02;
      currentRgb[0] += (targetRgb[0] - currentRgb[0]) * lerpSpeed;
      currentRgb[1] += (targetRgb[1] - currentRgb[1]) * lerpSpeed;
      currentRgb[2] += (targetRgb[2] - currentRgb[2]) * lerpSpeed;

      const rgb: [number, number, number] = [
        Math.round(currentRgb[0]),
        Math.round(currentRgb[1]),
        Math.round(currentRgb[2]),
      ];

      // Clear with trail effect
      ctx.fillStyle = `rgba(10, 14, 47, ${isPlayingRef.current ? 0.12 : 0.2})`;
      ctx.fillRect(0, 0, width, height);

      // Nebulae (background)
      nebulae.forEach((n) => {
        n.update();
        n.draw(ctx, rgb);
      });

      // Stars
      stars.forEach((star) => {
        const size = star.update(time);
        star.draw(ctx, size, rgb);
      });

      // Audio-reactive concentric pulse rings
      if (isPlayingRef.current && bassEnergyRef.current > 0.2) {
        const rings = 3;
        for (let i = 0; i < rings; i++) {
          const phase = (time * 1.5 + i * 0.7) % 3;
          const pulseRadius = phase * 200;
          const pulseAlpha = Math.max(0, (1 - phase / 3) * bassEnergyRef.current * 0.08);
          ctx.beginPath();
          ctx.arc(width / 2, height / 2, pulseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${pulseAlpha})`;
          ctx.lineWidth = 1 + bassEnergyRef.current * 2;
          ctx.stroke();
        }
      }

      // Supernova bursts
      const supernovae = supernovaRef.current;
      for (let i = supernovae.length - 1; i >= 0; i--) {
        const sn = supernovae[i];
        sn.t += 0.02;

        if (sn.t >= 1) {
          supernovae.splice(i, 1);
          continue;
        }

        const progress = sn.t;
        const radius = progress * Math.min(width, height) * 0.6;
        const alpha = Math.max(0, (1 - progress) * 0.3);

        // Expanding ring
        ctx.beginPath();
        ctx.arc(sn.x, sn.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${sn.color[0]}, ${sn.color[1]}, ${sn.color[2]}, ${alpha})`;
        ctx.lineWidth = 2 + (1 - progress) * 6;
        ctx.stroke();

        // Inner glow
        const glowGrad = ctx.createRadialGradient(sn.x, sn.y, 0, sn.x, sn.y, radius * 0.5);
        glowGrad.addColorStop(0, `rgba(${sn.color[0]}, ${sn.color[1]}, ${sn.color[2]}, ${alpha * 0.4})`);
        glowGrad.addColorStop(1, `rgba(${sn.color[0]}, ${sn.color[1]}, ${sn.color[2]}, 0)`);
        ctx.beginPath();
        ctx.arc(sn.x, sn.y, radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = glowGrad;
        ctx.fill();

        // Particle spray
        const particleCount = 12;
        for (let p = 0; p < particleCount; p++) {
          const angle = (p / particleCount) * Math.PI * 2 + progress * 2;
          const dist = radius * (0.6 + Math.sin(angle * 3 + progress * 5) * 0.3);
          const px = sn.x + Math.cos(angle) * dist;
          const py = sn.y + Math.sin(angle) * dist;
          const pSize = (1 - progress) * 3;
          ctx.beginPath();
          ctx.arc(px, py, pSize, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${sn.color[0]}, ${sn.color[1]}, ${sn.color[2]}, ${alpha * 0.8})`;
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
};