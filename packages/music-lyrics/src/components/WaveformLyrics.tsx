"use client";

/**
 * YYC³ music-lyrics — WaveSurfer 波形歌词联动组件
 *
 * 基于 wavesurfer.js v8 渲染交互式音频波形：
 * - 每行歌词生成一个 Region，点击 Region 即跳转到该行并播放；
 * - `loopCurrentRegion` 开启后，播放到达当前 Region 末尾自动回到 Region 起点（片段循环）；
 * - 对外暴露 seek/play/pause，供 LyricsDisplay 的歌词行点击（tapSync）与波形时间轴联动。
 *
 * 许可：MIT（wavesurfer.js BSD-3-Clause，本组件 MIT）
 *
 * ⧗ 与 useWaveform 的选型边界（W6-P1-5）：需要歌词联动/Region 循环/点击 seek
 * 等交互式波形 → 用本组件（wavesurfer.js v8）；只要波形采样数据（进度条、
 * 迷你波形、可视化）→ 用 @yyc3/music-hooks 的 `useWaveform`（自研采样，零依赖）。
 *
 * ↺ 主仓 2026-11-09 合入增量：`onSeek` / `onRegionLoop` 回调、default 导出、
 *   "use client" 指令；主仓受控版（isPlaying/currentTime + 内置歌词列表）与
 *   本仓 LyricsDisplay+tapSync 架构重叠，未搬入（两仓测试均以本句柄 API 为准）。
 */

import RegionsPlugin from 'wavesurfer.js/plugins/regions';
import WaveSurfer from 'wavesurfer.js';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';

import type { LyricLine } from './LyricsDisplay';

/** WaveSurfer.create 的 plugins 数组元素类型（主入口未再导出 GenericPlugin） */
type WaveSurferPlugin = NonNullable<
  Parameters<typeof WaveSurfer.create>[0]['plugins']
>[number];

export interface WaveformLyricsHandle {
  play: () => void;
  pause: () => void;
  /** 跳转到指定秒数（歌词行 tapSync 联动入口） */
  seek: (time: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
}

export interface WaveformLyricsProps {
  /** 音频地址，支持常规格式与 .m3u8 以外的直接可解码源 */
  audioUrl: string;
  /** 歌词行数组，用于生成 Region */
  lyrics?: LyricLine[];
  /** 波形高度，默认 64px */
  height?: number;
  waveColor?: string;
  progressColor?: string;
  cursorColor?: string;
  /** 是否为每行歌词渲染 Region，默认 true */
  showRegions?: boolean;
  /** 播放到当前 Region 末尾时自动循环该片段 */
  loopCurrentRegion?: boolean;
  /** 播放进度回调（秒），用于与歌词滚动联动 */
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  /** 音频解码完成回调 */
  onReady?: (duration: number) => void;
  /** 点击 Region / 歌词行跳转时回调（主仓合入），参数为目标行起始秒数 */
  onSeek?: (time: number) => void;
  /** 片段循环触发时回调（主仓合入），参数为当前 Region 起点/终点秒数 */
  onRegionLoop?: (start: number, end: number) => void;
  className?: string;
}

export const WaveformLyrics = forwardRef<WaveformLyricsHandle, WaveformLyricsProps>(
  (
    {
      audioUrl,
      lyrics,
      height = 64,
      waveColor = 'rgba(255,255,255,0.35)',
      progressColor = 'linear-gradient(90deg, #667eea, #764ba2)',
      cursorColor = '#ffffff',
      showRegions = true,
      loopCurrentRegion = false,
      onTimeUpdate,
      onReady,
      onSeek,
      onRegionLoop,
      className,
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WaveSurfer | null>(null);
    const regionsRef = useRef<ReturnType<typeof RegionsPlugin.create> | null>(null);
    const activeRegionIdRef = useRef<string | null>(null);
    const loopRef = useRef(loopCurrentRegion);
    loopRef.current = loopCurrentRegion;

    // ── WaveSurfer 生命周期：随 audioUrl 重建 ──
    useEffect(() => {
      const container = containerRef.current;
      if (!container || !audioUrl) return;

      const regions = RegionsPlugin.create();
      regionsRef.current = regions;

      const ws = WaveSurfer.create({
        container,
        url: audioUrl,
        height,
        waveColor,
        progressColor,
        cursorColor,
        cursorWidth: 2,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        normalize: true,
        dragToSeek: true,
        hideScrollbar: true,
        plugins: [regions as unknown as WaveSurferPlugin],
      });
      wsRef.current = ws;

      const onTime = (currentTime: number) => {
        // 片段循环：到达当前 Region 末尾时回到起点
        if (loopRef.current && activeRegionIdRef.current) {
          const region = regions.getRegions().find((r) => r.id === activeRegionIdRef.current);
          if (region && currentTime >= region.end - 0.05) {
            ws.setTime(region.start);
            if (!ws.isPlaying()) void ws.play();
            onRegionLoop?.(region.start, region.end);
          }
        }
        onTimeUpdate?.(currentTime, ws.getDuration());
      };
      const onReadyHandler = () => onReady?.(ws.getDuration());

      ws.on('timeupdate', onTime);
      ws.on('ready', onReadyHandler);

      return () => {
        ws.un('timeupdate', onTime);
        ws.un('ready', onReadyHandler);
        activeRegionIdRef.current = null;
        regionsRef.current = null;
        wsRef.current = null;
        ws.destroy();
      };
      // 波形颜色等展示项不触发重建
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [audioUrl, height]);

    // ── 歌词行 → Region 同步 ──
    useEffect(() => {
      const regions = regionsRef.current;
      const ws = wsRef.current;
      if (!regions || !ws || !showRegions) return;

      const duration = ws.getDuration() || 0;
      regions.clearRegions();

      (lyrics || []).forEach((line, i) => {
        const next = (lyrics || [])[i + 1];
        const start = line.time;
        const end = next ? next.time : duration || line.time + 5;
        if (end <= start) return;

        regions.addRegion({
          id: `lyric-${i}`,
          start,
          end,
          content: line.text,
          color: 'rgba(255,255,255,0.04)',
          drag: false,
          resize: false,
        });
      });

      const clickUnsub = regions.on('region-clicked', (region) => {
        activeRegionIdRef.current = region.id;
        ws.setTime(region.start);
        void ws.play();
        region.play();
        onSeek?.(region.start);
      });
      const inUnsub = regions.on('region-in', (region) => {
        activeRegionIdRef.current = region.id;
      });

      return () => {
        clickUnsub();
        inUnsub();
      };
    }, [lyrics, showRegions]);

    // ── 命令句柄：供歌词 tapSync 联动 ──
    const seek = useCallback((time: number) => {
      wsRef.current?.setTime(time);
    }, []);

    useImperativeHandle(ref, () => ({
      play: () => void wsRef.current?.play(),
      pause: () => wsRef.current?.pause(),
      seek,
      getCurrentTime: () => wsRef.current?.getCurrentTime() ?? 0,
      getDuration: () => wsRef.current?.getDuration() ?? 0,
    }), [seek]);

    return (
      <div
        ref={containerRef}
        className={className}
        data-slot="waveform-lyrics"
        role="slider"
        aria-label="音频波形 / Waveform"
        aria-valuemin={0}
        aria-valuemax={Math.round(wsRef.current?.getDuration() ?? 0)}
        aria-valuenow={Math.round(wsRef.current?.getCurrentTime() ?? 0)}
      />
    );
  },
);

WaveformLyrics.displayName = 'WaveformLyrics';

// 主仓兼容：default 导出（主仓调用方 `import WaveformLyrics from ...` 用法）
export default WaveformLyrics;
