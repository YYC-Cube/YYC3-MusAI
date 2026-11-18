"use client";

/**
 * YYC³ music-live · DanmakuBoard 弹幕看板（W3 补流媒体）
 *
 * 接收 danmaku/emoji/gift/moderation 消息，在视频上方滚动显示。
 * 由父组件通过 onDanmaku 回调注入消息（或直接由 LiveRoom 状态驱动）。
 */

import React, { useEffect, useState } from 'react';

interface DanmakuItem {
  id: string;
  type: 'danmaku' | 'emoji' | 'gift' | 'moderation';
  text?: string;
  emoji?: string;
  giftId?: string;
  count?: number;
  user?: string | null;
  ts: number;
  color?: string;
}

interface DanmakuBoardProps {
  /** 外部注入的弹幕消息数组（父组件维护） */
  messages?: DanmakuItem[];
  className?: string;
}

const COLORS = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd'];

export const DanmakuBoard: React.FC<DanmakuBoardProps> = ({ messages = [], className = '' }) => {
  const [items, setItems] = useState<DanmakuItem[]>([]);

  // 将传入的 messages 同步到内部状态（带去重）
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    setItems((prev) => {
      const existingIds = new Set(prev.map((i) => i.id));
      const added = messages.filter((m) => !existingIds.has(m.id));
      return [...prev, ...added].slice(-200);
    });
  }, [messages]);

  useEffect(() => {
    // 自动移除过期弹幕（10 秒后消失）
    const timer = setInterval(() => {
      setItems((prev) => {
        const now = Date.now();
        return prev.filter((i) => now - i.ts < 10_000);
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className={`w-full h-full pointer-events-none ${className}`}
      style={{ overflow: 'hidden' }}
    >
      {items.map((item) => {
        const delay = (item.ts % 3) / 10;
        const duration = 6 + Math.random() * 4;
        const top = 10 + Math.random() * 80;
        const color = COLORS[Math.abs(hashStr(item.user ?? 'anon')) % COLORS.length];
        const content = item.type === 'emoji'
          ? item.emoji
          : item.type === 'gift'
          ? `🎁 ${item.giftId} ×${item.count}  ${item.user ?? '匿名'}`
          : item.type === 'moderation'
          ? `⚡ [管理] ${(item as any).action} → ${(item as any).targetUser}`
          : item.text;

        return (
          <div
            key={`${item.id}-${item.ts}`}
            className="absolute whitespace-nowrap z-50 px-2 py-1 rounded text-xs font-bold drop-shadow"
            style={{
              color,
              background: 'rgba(0,0,0,0.55)',
              border: `1px solid ${color}`,
              top: `${top}%`,
              left: '100%',
              animation: `danmaku ${duration}s linear ${delay}s`,
            }}
          >
            {content}
          </div>
        );
      })}
      <style>{`
        @keyframes danmaku {
          0% { transform: translateX(0); }
          100% { transform: translateX(-120vw); }
        }
      `}</style>
    </div>
  );
};

/** 简单字符串哈希，用于稳定选色 */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  }
  return h;
}

export default DanmakuBoard;
