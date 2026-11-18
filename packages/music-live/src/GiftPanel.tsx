"use client";

/**
 * YYC³ music-live · GiftPanel 礼物面板（W3 补流媒体）
 */

import React from 'react';
import type { GiftItem } from './types';

interface GiftPanelProps {
  gifts: GiftItem[];
  onGift: (gift: GiftItem) => void;
  isModerator?: boolean;
}

export const GiftPanel: React.FC<GiftPanelProps> = ({ gifts = [], onGift, isModerator = false }) => {
  const giftList = gifts.length > 0 ? gifts : [];

  return (
    <div className="flex items-center gap-2">
      {giftList.map((gift) => (
        <button
          key={gift.id}
          onClick={() => onGift(gift)}
          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs transition-colors border border-transparent hover:border-white/30"
          title={`${gift.label} (${gift.price})`}
        >
          <span>{gift.icon}</span>
        </button>
      ))}
      {isModerator && (
        <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-xs flex items-center justify-center transition-colors">
          🛡️
        </button>
      )}
    </div>
  );
};

export default GiftPanel;
