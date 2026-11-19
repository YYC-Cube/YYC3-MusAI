// D-Music 设计层 · 分子组件 DList

import React from 'react';
import { cn } from '../../ui/utils';

interface DListProps {
  children: React.ReactNode;
  label?: string;
  className?: string;
  divided?: boolean;
}

export const DList: React.FC<DListProps> = ({
  children,
  label,
  className,
  divided = true,
}) => {
  return (
    <div className={cn(className)} role="list" aria-label={label}>
      <div className={cn(divided && 'divide-y divide-[var(--dm-border-subtle)]')}>
        {children}
      </div>
    </div>
  );
};
