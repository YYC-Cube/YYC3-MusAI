// D-Music 设计层 · 原子组件 DSpinner

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../ui/utils';

/** Inline loading spinner */
interface DSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const DSpinner: React.FC<DSpinnerProps> = ({ size = 'md', className }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return (
    <Loader2
      className={cn('animate-spin', sizes[size], className)}
      style={{ color: 'var(--dm-accent-from)' }}
      aria-label="Loading"
    />
  );
};
