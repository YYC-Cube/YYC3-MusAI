// D-Music 设计层 · 分子组件 DUserCard

import React from 'react';
import { cn } from '../../ui/utils';

import { DCard } from './DCard';
import { DBadge } from './DBadge';

/** User card — for creator/profile display */
interface DUserCardProps {
  name: string;
  avatar?: string;
  subtitle?: string;
  badge?: string;
  onClick?: () => void;
  className?: string;
}

export const DUserCard: React.FC<DUserCardProps> = ({
  name, avatar, subtitle, badge, onClick, className,
}) => {
  return (
    <DCard variant="default" interactive onClick={onClick} padding="sm" className={cn('flex items-center gap-3', className)}>
      <div
        className="w-10 h-10 rounded-full flex-shrink-0 bg-gradient-to-br from-[var(--dm-accent-from)] to-[var(--dm-accent-to)] flex items-center justify-center text-white text-sm font-bold overflow-hidden"
      >
        {avatar ? (
          <img src={avatar} alt={name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          name.charAt(0).toUpperCase()
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate" style={{ color: 'var(--dm-text-primary)' }}>{name}</span>
          {badge && <DBadge variant="accent" size="sm">{badge}</DBadge>}
        </div>
        {subtitle && <p className="text-xs truncate" style={{ color: 'var(--dm-text-tertiary)' }}>{subtitle}</p>}
      </div>
    </DCard>
  );
};
