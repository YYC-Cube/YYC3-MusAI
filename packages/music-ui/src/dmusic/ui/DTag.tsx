// D-Music 设计层 · 原子组件 DTag

import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../ui/utils';

interface DTagProps {
  variant?: 'default' | 'emotion' | 'outline';
  size?: 'xs' | 'sm' | 'md';
  children: React.ReactNode;
  onRemove?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const DTag: React.FC<DTagProps> = ({
  variant = 'default',
  size = 'sm',
  children,
  onRemove,
  className,
  style,
}) => {
  const sizeClasses = {
    xs: 'px-1.5 py-0 text-[9px]',
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium border',
        sizeClasses[size],
        variant === 'emotion'
          ? 'bg-[var(--dm-accent-from)]/10 text-[var(--dm-accent-from)] border-[var(--dm-accent-from)]/20'
          : variant === 'outline'
          ? 'bg-transparent text-[var(--dm-text-secondary)] border-[var(--dm-border)]'
          : 'bg-[var(--dm-hover-bg)] text-[var(--dm-text-secondary)] border-[var(--dm-border-subtle)]',
        className
      )}
      style={style}
    >
      {children}
      {onRemove && (
        <button
          onClick={onRemove}
          className="p-0 rounded-full hover:text-[var(--dm-text-primary)] dm-focus-ring"
          aria-label={`Remove ${children}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};
