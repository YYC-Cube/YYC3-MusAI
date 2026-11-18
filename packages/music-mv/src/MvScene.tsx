"use client";

/**
 * YYC³ music-mv · MvScene 场景组件（W4 适用选配）
 *
 * 借鉴 revideo (Apache-2.0) 程序化视频编辑模型，
 * 以 React 组件方式描述 MV 画面与动画。
 *
 * 注意：此处为可编辑的场景描述组件，实际视频渲染由
 * revideo 的 <Composition> / <Clip> 在构建时编译为 MP4。
 * 本包不引入 Remotion (Commercial)，遵循 Apache-2.0 许可证。
 */

import React from 'react';
import type { MvTrack, MvTheme } from './types';

interface MvSceneProps {
  track: MvTrack;
  theme: MvTheme;
  currentTime: number;
  width: number;
  height: number;
}

const THEME_BG: Record<MvTheme, string> = {
  starfield: '#0b0e16',
  neonPulse: '#0a0a0a',
  aurora: '#0f172a',
  inkWash: '#f5f5f0',
  cyberCity: '#050505',
};

export const MvScene: React.FC<MvSceneProps> = ({
  track,
  theme,
  currentTime,
  width,
  height,
}) => {
  const bg = THEME_BG[theme];

  // 根据当前播放时间找到对应歌词行
  const currentLyric = track.lyrics
    .filter((l) => l.time <= currentTime)
    .pop();

  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width,
        height,
        background: bg,
        color: '#fff',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      }}
    >
      {/* 背景装饰（按主题区分） */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background:
            theme === 'starfield'
              ? 'radial-gradient(circle at 50% 50%, #1e293b 0%, #0b0e16 100%)'
              : theme === 'neonPulse'
              ? 'linear-gradient(135deg, #1e1b4b 0%, #0a0a0a 100%)'
              : theme === 'aurora'
              ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)'
              : theme === 'inkWash'
              ? 'linear-gradient(180deg, #f8fafc 0%, #f5f5f0 100%)'
              : 'linear-gradient(135deg, #0f172a 0%, #050505 100%)',
        }}
      />

      {/* 封面 */}
      <div
        className="relative z-10 w-64 h-64 rounded-2xl shadow-2xl border border-white/10"
        style={{
          backgroundImage: `url(${track.coverUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.5))',
        }}
      />

      {/* 歌词 */}
      {currentLyric && (
        <div
          className="absolute bottom-20 z-10 text-center text-2xl font-bold tracking-wider"
          style={{
            textShadow: '0 0 10px rgba(0,0,0,0.6)',
          }}
        >
          {currentLyric.text}
        </div>
      )}

      {/* 标题 */}
      <div className="absolute top-6 left-6 z-10 text-sm text-white/50">
        {track.title}
      </div>

      {/* 进度提示 */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10"
        style={{
          width: Math.min(width * 0.6, 400),
          height: 4,
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          className="h-full"
          style={{
            width: `${Math.min((currentTime / track.lyrics[track.lyrics.length - 1]?.time || 1) * 100, 100)}%`,
            background:
              theme === 'inkWash' ? '#000' : 'linear-gradient(90deg, #60a5fa, #fbbf24)',
          }}
        />
      </div>
    </div>
  );
};

export default MvScene;
