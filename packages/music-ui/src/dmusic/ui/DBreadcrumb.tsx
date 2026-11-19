// D-Music 设计层 · 原子组件 DBreadcrumb

import React from 'react';
import { cn } from '../../ui/utils';

interface DBreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface DBreadcrumbProps {
  items: DBreadcrumbItem[];
  separator?: React.ReactNode;
  className?: string;
}

export const DBreadcrumb: React.FC<DBreadcrumbProps> = ({
  items,
  separator,
  className,
}) => {
  const sep = separator || (
    <span className="text-[10px] mx-1" style={{ color: 'var(--dm-text-disabled)' }} aria-hidden="true">/</span>
  );

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center flex-wrap', className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            {isLast ? (
              <span
                className="text-xs font-medium"
                style={{ color: 'var(--dm-text-primary)' }}
                aria-current="page"
              >
                {item.label}
              </span>
            ) : (
              <>
                <button
                  onClick={item.onClick}
                  className="text-xs hover:underline dm-focus-ring transition-colors"
                  style={{ color: 'var(--dm-text-tertiary)' }}
                >
                  {item.label}
                </button>
                {sep}
              </>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
