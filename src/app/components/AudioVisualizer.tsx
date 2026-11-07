import React, { useRef, useEffect } from 'react';
import type { Emotion } from '../hooks/useAudioEngine';

interface AudioVisualizerProps {
  frequencyData: Uint8Array;
  emotion: Emotion;
  isPlaying: boolean;
  size: number;
  mode?: 'circular' | 'bars';
}

const EMOTION_COLORS: Record<Emotion, { start: string; end: string }> = {
  happy: { start: '#FFD700', end: '#FFA500' },
  sad: { start: '#6495ED', end: '#4169E1' },
  energetic: { start: '#FF4500', end: '#FF1493' },
  calm: { start: '#00CED1', end: '#7B68EE' },
  neutral: { start: '#667eea', end: '#764ba2' },
};

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  frequencyData,
  emotion,
  isPlaying,
  size,
  mode = 'circular',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const smoothedRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const centerX = size / 2;
    const centerY = size / 2;
    const colors = EMOTION_COLORS[emotion];

    ctx.clearRect(0, 0, size, size);

    // Smooth frequency data
    const numBars = Math.min(frequencyData.length, mode === 'circular' ? 64 : 32);
    if (smoothedRef.current.length !== numBars) {
      smoothedRef.current = Array.from({ length: numBars }, (_, i) => frequencyData[i] || 0);
    }
    for (let i = 0; i < numBars; i++) {
      const target = frequencyData[i] || 0;
      smoothedRef.current[i] += (target - smoothedRef.current[i]) * 0.35;
    }

    if (mode === 'circular') {
      drawCircularVisualizer(ctx, centerX, centerY, size, colors, smoothedRef.current, numBars, isPlaying);
    } else {
      drawBarsVisualizer(ctx, size, colors, smoothedRef.current, numBars, isPlaying);
    }
  }, [frequencyData, emotion, isPlaying, size, mode]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="pointer-events-none"
    />
  );
};

function drawCircularVisualizer(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  colors: { start: string; end: string },
  smoothed: number[],
  numBars: number,
  isPlaying: boolean
) {
  const radius = size * 0.34;
  const maxBarHeight = size * 0.13;
  const angleStep = (Math.PI * 2) / numBars;

  // Outer glow ring
  if (isPlaying) {
    const avgEnergy = smoothed.reduce((s, v) => s + v, 0) / smoothed.length / 255;
    const glowRadius = radius + maxBarHeight * 0.6;
    const gradient = ctx.createRadialGradient(cx, cy, radius * 0.9, cx, cy, glowRadius);
    gradient.addColorStop(0, hexToRgba(colors.start, 0));
    gradient.addColorStop(0.5, hexToRgba(colors.start, avgEnergy * 0.2));
    gradient.addColorStop(1, hexToRgba(colors.end, 0));

    ctx.beginPath();
    ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  // Frequency bars
  for (let i = 0; i < numBars; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const value = smoothed[i] / 255;
    const barHeight = isPlaying ? value * maxBarHeight + 2 : 2;

    const innerR = radius + 4;
    const innerX = cx + Math.cos(angle) * innerR;
    const innerY = cy + Math.sin(angle) * innerR;

    const barWidth = Math.max(1.5, ((2 * Math.PI * radius) / numBars) * 0.55);
    const t = i / numBars;
    const color = lerpColor(colors.start, colors.end, t);
    const alpha = isPlaying ? 0.4 + value * 0.6 : 0.15;

    ctx.save();
    ctx.translate(innerX, innerY);
    ctx.rotate(angle + Math.PI / 2);

    if (value > 0.55 && isPlaying) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
    }

    // Rounded bar
    const br = barWidth / 2;
    ctx.fillStyle = hexToRgba(color, alpha);
    ctx.beginPath();
    ctx.moveTo(-br, 0);
    ctx.lineTo(-br, barHeight - br);
    ctx.quadraticCurveTo(-br, barHeight, 0, barHeight);
    ctx.quadraticCurveTo(br, barHeight, br, barHeight - br);
    ctx.lineTo(br, 0);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Inner ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
  ctx.strokeStyle = hexToRgba(colors.start, isPlaying ? 0.25 : 0.08);
  ctx.lineWidth = 1;
  ctx.stroke();

  // Outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius + maxBarHeight + 6, 0, Math.PI * 2);
  ctx.strokeStyle = hexToRgba(colors.end, isPlaying ? 0.08 : 0.04);
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

function drawBarsVisualizer(
  ctx: CanvasRenderingContext2D,
  size: number,
  colors: { start: string; end: string },
  smoothed: number[],
  numBars: number,
  isPlaying: boolean
) {
  const barWidth = size / numBars;
  const maxHeight = size * 0.8;

  for (let i = 0; i < numBars; i++) {
    const value = smoothed[i] / 255;
    const barHeight = isPlaying ? value * maxHeight + 2 : 2;
    const x = i * barWidth;
    const y = size - barHeight;

    const t = i / numBars;
    const color = lerpColor(colors.start, colors.end, t);
    const alpha = isPlaying ? 0.5 + value * 0.5 : 0.2;

    ctx.fillStyle = hexToRgba(color, alpha);
    ctx.fillRect(x + 1, y, barWidth - 2, barHeight);

    ctx.fillStyle = hexToRgba(color, alpha * 0.15);
    ctx.fillRect(x + 1, size, barWidth - 2, barHeight * 0.2);
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function lerpColor(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `#${rr.toString(16).padStart(2, '0')}${rg.toString(16).padStart(2, '0')}${rb.toString(16).padStart(2, '0')}`;
}
