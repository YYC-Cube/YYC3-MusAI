// D-Music 设计层 · 分子组件 DAchievementCard

import React from 'react';
import { cn } from '../../ui/utils';

import { DCard } from './DCard';
import { AchievementRing } from './AchievementRing';
import { DTag } from './DTag';

/** Achievement card — with progress ring */
interface DAchievementCardProps {
  title: string;
  description?: string;
  icon: string;
  progress: number; // 0-100
  unlocked?: boolean;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  className?: string;
}

const rarityColors = {
  common: { color: '#9CA3AF', label: '普通' },
  rare: { color: '#3B82F6', label: '稀有' },
  epic: { color: '#A855F7', label: '史诗' },
  legendary: { color: '#F59E0B', label: '传说' },
};

export const DAchievementCard: React.FC<DAchievementCardProps> = ({
  title, description, icon, progress, unlocked, rarity = 'common', className,
}) => {
  const rarityInfo = rarityColors[rarity];
  return (
    <DCard
      variant="default"
      padding="md"
      glowColor={unlocked ? rarityInfo.color : undefined}
      className={cn('flex items-center gap-4', !unlocked && 'opacity-60', className)}
    >
      <div className="relative flex-shrink-0">
        <AchievementRing progress={progress} size={52} color={rarityInfo.color} strokeWidth={3} />
        <span className="absolute inset-0 flex items-center justify-center text-xl" role="img" aria-label={title}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--dm-text-primary)' }}>{title}</p>
        {description && <p className="text-xs truncate" style={{ color: 'var(--dm-text-tertiary)' }}>{description}</p>}
        <div className="flex items-center gap-2 mt-1">
          <DTag size="xs" style={{ color: rarityInfo.color, borderColor: `${rarityInfo.color}40`, background: `${rarityInfo.color}15` }}>
            {rarityInfo.label}
          </DTag>
          <span className="text-[10px] tabular-nums" style={{ color: 'var(--dm-text-disabled)' }}>{progress}%</span>
        </div>
      </div>
    </DCard>
  );
};
