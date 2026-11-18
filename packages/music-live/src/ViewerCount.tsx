"use client";

/**
 * YYC³ music-live · ViewerCount 在线人数显示（W3 补流媒体）
 */

import React from 'react';

interface ViewerCountProps {
  count: number;
}

export const ViewerCount: React.FC<ViewerCountProps> = ({ count }) => {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-300 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
      <span className="text-green-400">●</span>
      <span>{count}</span> 人在线
    </div>
  );
};

export default ViewerCount;
