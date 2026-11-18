"use client";

/**
 * YYC³ music-live · EmojiPanel 表情面板（W3 补流媒体）
 */

import React from 'react';
import { DEFAULT_EMOJIS } from './types';

interface EmojiPanelProps {
  onEmoji: (emoji: string) => void;
}

export const EmojiPanel: React.FC<EmojiPanelProps> = ({ onEmoji }) => {
  return (
    <div className="flex items-center gap-1">
      {DEFAULT_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onEmoji(emoji)}
          className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-lg flex items-center justify-center transition-colors"
          title={emoji}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

export default EmojiPanel;
