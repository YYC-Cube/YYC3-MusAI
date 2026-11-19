// D-Music 设计层 · 原子组件 DBadge

import React from 'react';
import { cn } from '../../ui/utils';

type BadgeVariant = 'default' | 'accent' | 'success' | 'warning' | 'error' | 'info';

interface DBadgeProps {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'bg-[var(--dm-hover-bg)] text-[var(--dm-text-secondary)] border-[var(--dm-border-subtle)]',
  accent: 'bg-[var(--dm-accent-from)]/15 text-[var(--dm-accent-from)] border-[var(--dm-accent-from)]/30',
  success: 'bg-[var(--dm-success)]/15 text-[var(--dm-success)] border-[var(--dm-success)]/30',
  warning: 'bg-[var(--dm-warning)]/15 text-[var(--dm-warning)] border-[var(--dm-warning)]/30',
  error: 'bg-[var(--dm-error)]/15 text-[var(--dm-error)] border-[var(--dm-error)]/30',
  info: 'bg-[var(--dm-info)]/15 text-[var(--dm-info)] border-[var(--dm-info)]/30',
};

export const DBadge: React.FC<DBadgeProps> = ({
  variant = 'default',
  size = 'sm',
  children,
  className,
  dot = false,
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 border rounded-full font-medium',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        badgeVariants[variant],
        className
      )}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
      )}
      {children}
    </span>
  );
};
