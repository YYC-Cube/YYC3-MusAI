// D-Music 设计层 · 分子组件 DEmptyState

import React from 'react';
import { cn } from '../../ui/utils';

interface DEmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const DEmptyState: React.FC<DEmptyStateProps> = ({
  icon = '🎵',
  title,
  description,
  action,
  className,
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-6 text-center', className)}>
      <span className="text-4xl mb-4" role="img" aria-hidden="true">{icon}</span>
      <h3 className="text-base font-medium mb-1" style={{ color: 'var(--dm-text-primary)' }}>{title}</h3>
      {description && (
        <p className="text-sm max-w-xs" style={{ color: 'var(--dm-text-tertiary)' }}>{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
