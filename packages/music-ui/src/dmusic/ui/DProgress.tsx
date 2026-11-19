// D-Music 设计层 · 原子组件 DProgress

import React from 'react';
import { cn } from '../../ui/utils';

interface DProgressProps {
  value: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'gradient' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  className?: string;
  'aria-label'?: string;
}

const progressHeights: Record<string, string> = { sm: 'h-1', md: 'h-2', lg: 'h-3' };

export const DProgress: React.FC<DProgressProps> = ({
  value,
  size = 'md',
  variant = 'gradient',
  showLabel = false,
  className,
  ...props
}) => {
  const clamped = Math.min(100, Math.max(0, value));

  const fillStyle: React.CSSProperties = variant === 'gradient'
    ? { background: `linear-gradient(to right, var(--dm-accent-from), var(--dm-accent-to))`, width: `${clamped}%` }
    : variant === 'success' ? { background: 'var(--dm-success)', width: `${clamped}%` }
    : variant === 'warning' ? { background: 'var(--dm-warning)', width: `${clamped}%` }
    : variant === 'error' ? { background: 'var(--dm-error)', width: `${clamped}%` }
    : { background: 'var(--dm-accent-from)', width: `${clamped}%` };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn('flex-1 rounded-full overflow-hidden', progressHeights[size])}
        style={{ background: 'var(--dm-hover-bg)' }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={props['aria-label'] || `Progress: ${clamped}%`}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500 ease-out')}
          style={fillStyle}
        />
      </div>
      {showLabel && (
        <span className="text-xs tabular-nums flex-shrink-0" style={{ color: 'var(--dm-text-tertiary)' }}>
          {clamped}%
        </span>
      )}
    </div>
  );
};
