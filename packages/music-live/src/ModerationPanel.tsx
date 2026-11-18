"use client";

/**
 * YYC³ music-live · ModerationPanel 审核/管理面板（W3 补流媒体）
 * 仅房主/管理员可见：禁言、踢人、删除消息等。
 */

import React, { useState } from 'react';

interface ModerationPanelProps {
  onModerate: (action: 'mute' | 'unmute' | 'kick' | 'delete', targetUser: string) => void;
  isModerator: boolean;
}

export const ModerationPanel: React.FC<ModerationPanelProps> = ({ onModerate, isModerator }) => {
  const [targetUser, setTargetUser] = useState('');

  if (!isModerator) return null;

  const actions: Array<{ label: string; action: 'mute' | 'unmute' | 'kick' | 'delete'; color: string }> = [
    { label: '禁言', action: 'mute', color: 'text-red-400' },
    { label: '解禁', action: 'unmute', color: 'text-green-400' },
    { label: '踢人', action: 'kick', color: 'text-red-500' },
    { label: '删除', action: 'delete', color: 'text-red-500' },
  ];

  return (
    <div className="flex items-center gap-2 ml-2">
      <input
        type="text"
        placeholder="目标用户ID"
        value={targetUser}
        onChange={(e) => setTargetUser(e.target.value)}
        className="w-24 text-xs bg-white/10 border border-white/20 rounded px-2 py-1 text-white focus:outline-none focus:border-white/50"
      />
      {actions.map((a) => (
        <button
          key={a.action}
          onClick={() => {
            if (!targetUser) {
              alert('请输入目标用户ID');
              return;
            }
            onModerate(a.action, targetUser);
          }}
          className={`text-xs ${a.color} bg-white/10 hover:bg-white/20 px-2 py-1 rounded border border-transparent hover:border-white/30 transition-colors`}
          title={a.label}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
};

export default ModerationPanel;
