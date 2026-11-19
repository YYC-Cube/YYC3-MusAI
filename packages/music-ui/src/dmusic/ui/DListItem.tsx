// D-Music 设计层 · 分子组件 DListItem

import React from 'react';
import { cn } from '../../ui/utils';

interface DListItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  active?: boolean;
}

export const DListItem: React.FC<DListItemProps> = ({
  children,
  onClick,
  className,
  active = false,
}) => {
  return (
    <div
      role="listitem"
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        'px-3 py-2.5',
        onClick && 'cursor-pointer hover:bg-[var(--dm-hover-bg)] dm-focus-ring transition-colors',
        active && 'bg-[var(--dm-active-bg)]',
        className
      )}
    >
      {children}
    </div>
  );
};
