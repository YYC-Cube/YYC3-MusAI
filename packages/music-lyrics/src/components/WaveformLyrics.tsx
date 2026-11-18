"use client";

/**
 * §W2 补波形：WaveSurfer.js 波形 + 歌词联动
 *
 * 提供音频波形可视化与歌词同步高亮，Regions 支持：
 *  - 点击波形跳转到对应歌词行
 *  - 片段循环（Region 循环播放）
 *  - 歌词行点击跳转波形位置
 *
 * 依赖：wavesurfer.js (BSD-3-Clause，立即可用)
 *
 * @example
 *   import { WaveformLyrics } from '@yyc3/music-lyrics';
 *   <WaveformLyrics audioUrl="/audio/song.mp3" lyrics={lyrics} onSeek={onSeek} />
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import type { LyricLine } from './LyricsDisplay';

interface WaveformLyricsProps {
  /** 音频地址 */
  audioUrl: string;
  /** 歌词行（按 time 升序） */
  lyrics: LyricLine[];
  /** 播放状态 */
  isPlaying?: boolean;
  /** 当前播放时间（秒），由外部播放器同步 */
  currentTime?: number;
  /** 波形颜色 */
  waveColor?: string;
  /** 进度颜色 */
  progressColor?: string;
  /** 歌词高亮时回调：时间 */
  onSeek?: (time: number) => void;
  /** Region 循环开始/结束回调 */
  onRegionLoop?: (start: number, end: number) => void;
  /** 类名 */
  className?: string;
}

/**
 * WaveformLyrics 组件
 */
export const WaveformLyrics: React.FC<WaveformLyricsProps> = ({
  audioUrl,
  lyrics,
  isPlaying = false,
  currentTime,
  waveColor = 'rgb(100, 200, 255)',
  progressColor = 'rgb(255, 100, 100)',
  onSeek,
  onRegionLoop,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  // 歌词行索引映射（用于 Region）
  const lyricRegionsRef = useRef<Map<string, any>>(new Map());

  // ---------- 初始化 WaveSurfer ----------
  useEffect(() => {
    if (!containerRef.current) return;

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      url: audioUrl,
      waveColor,
      progressColor,
      cursorWidth: 1,
      cursorColor: 'rgba(255, 255, 255, 0.6)',
      barWidth: 2,
      barRadius: 2,
      barGap: 1,
      height: 64,
      fillParent: true,
      hideScrollbar: true,
      autoCenter: true,
      interact: true,
    });

    // 加载 Regions 插件
    const regionsPlugin = wavesurfer.registerPlugin(RegionsPlugin.create());

    wavesurferRef.current = wavesurfer;

    wavesurfer.on('ready', () => {
      setReady(true);
      // 为每首歌词行创建一个 Region（点击波形跳转）
      lyricRegionsRef.current.clear();
      lyrics.forEach((line, index) => {
        if (line.time == null) return;
        const region = regionsPlugin.addRegion({
          start: line.time,
          end: line.time + 0.5,
          content: line.text,
          color: 'rgba(255, 255, 255, 0.06)',
        });
        lyricRegionsRef.current.set(String(index), region);

        // 点击 Region 跳转歌词
        region.on('click', () => {
          onSeek?.(line.time);
        });
      });
    });

    // 时间更新同步（由外部 currentTime 驱动，也可监听 wavesurfer 的 timeupdate）
    wavesurfer.on('timeupdate', (_time: number) => {
      // 外部控制播放位置，此处不主动回调 onSeek，避免循环
    });

    // Region 循环：当播放进入 Region 时可触发循环（由 onRegionLoop 外部处理）
    regionsPlugin.on('region-clicked', (region: any) => {
      onSeek?.(region.start);
    });

    return () => {
      wavesurfer.destroy();
      wavesurferRef.current = undefined;
      setReady(false);
    };
  }, [audioUrl, waveColor, progressColor, lyrics, onSeek]);

  // ---------- 歌词高亮：当 currentTime 变化，滚动到对应行 ----------
  const activeIndexRef = useRef(-1);
  useEffect(() => {
    if (!lyrics || lyrics.length === 0 || currentTime == null) return;
    const idx = lyrics.findLastIndex((line) => line.time <= currentTime);
    if (idx !== activeIndexRef.current) {
      activeIndexRef.current = idx;
    }
  }, [currentTime, lyrics]);

  // ---------- 外部 isPlaying 控制 ----------
  useEffect(() => {
    const ws = wavesurferRef.current;
    if (!ws || !ready) return;
    if (isPlaying) {
      ws.play().catch(() => {});
    } else {
      ws.pause();
    }
  }, [isPlaying, ready]);

  // ---------- 当 currentTime 变化，同步 wavesurfer 播放位置 ----------
  useEffect(() => {
    const ws = wavesurferRef.current;
    if (!ws || !ready || currentTime == null) return;
    // 仅当差异较大时才 seek，避免频繁跳转
    const diff = Math.abs(ws.getCurrentTime() - currentTime);
    if (diff > 0.5) {
      ws.seek(currentTime);
    }
  }, [currentTime, ready]);

  // ---------- 渲染歌词列表（点击跳转） ----------
  const handleLyricClick = useCallback(
    (time: number) => {
      onSeek?.(time);
      const ws = wavesurferRef.current;
      if (ws) ws.seek(time);
    },
    [onSeek]
  );

  return (
    <div className={`w-full flex flex-col gap-4 ${className}`}>
      {/* Waveform 区域 */}
      <div
        ref={containerRef}
        className={`w-full bg-black/20 rounded-xl border border-white/10 relative ${className}`}
        style={{ height: 80 }}
      />
      {/* 歌词列表 */}
      <div className="flex-1 overflow-y-auto py-2">
        {lyrics.map((line, index) => {
          const isActive =
            activeIndexRef.current === index;
          return (
            <div
              key={index}
              onClick={() => handleLyricClick(line.time)}
              className={`cursor-pointer px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-white/50 hover:bg-white/5 hover:text-white/70'
              }`}
            >
              <span className="text-xs text-white/30 mr-2">{line.time.toFixed(1)}s</span>
              {line.text}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WaveformLyrics;
