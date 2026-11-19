// D-Music 设计层 · 有机体组件 DTabBar

import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../ui/utils';

interface DTabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
  disabled?: boolean;
}

interface DTabBarProps {
  tabs: DTabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  size?: 'sm' | 'md';
  className?: string;
  fullWidth?: boolean;
}

export const DTabBar: React.FC<DTabBarProps> = ({
  tabs,
  activeTab,
  onTabChange,
  variant = 'default',
  size = 'md',
  className,
  fullWidth = false,
}) => {
  return (
    <div
      role="tablist"
      className={cn(
        'flex',
        variant === 'default' && 'gap-1 p-1 rounded-xl',
        variant === 'pills' && 'gap-2',
        variant === 'underline' && 'gap-0',
        fullWidth && 'w-full',
        className
      )}
      style={variant === 'default' ? { background: 'var(--dm-hover-bg)' } : undefined}
    >
      {tabs.map(tab => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-disabled={tab.disabled}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            className={cn(
              'relative inline-flex items-center justify-center gap-1.5 font-medium transition-all dm-focus-ring',
              fullWidth && 'flex-1',
              tab.disabled && 'opacity-40 cursor-not-allowed',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
              variant === 'default' && cn(
                'rounded-lg',
                isActive
                  ? 'bg-[var(--dm-bg-panel)] text-[var(--dm-text-primary)] shadow-sm'
                  : 'text-[var(--dm-text-tertiary)] hover:text-[var(--dm-text-secondary)]'
              ),
              variant === 'pills' && cn(
                'rounded-full border',
                isActive
                  ? 'bg-[var(--dm-accent-from)]/15 text-[var(--dm-accent-from)] border-[var(--dm-accent-from)]/30'
                  : 'text-[var(--dm-text-tertiary)] border-transparent hover:text-[var(--dm-text-secondary)] hover:bg-[var(--dm-hover-bg)]'
              ),
              variant === 'underline' && cn(
                'pb-2',
                isActive
                  ? 'text-[var(--dm-text-primary)]'
                  : 'text-[var(--dm-text-tertiary)] hover:text-[var(--dm-text-secondary)]'
              )
            )}
          >
            {tab.icon && <span className="flex-shrink-0" aria-hidden="true">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className="min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
                style={{
                  background: isActive ? 'var(--dm-accent-from)' : 'var(--dm-hover-bg)',
                  color: isActive ? '#fff' : 'var(--dm-text-tertiary)',
                }}
              >
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
            {/* Underline indicator */}
            {variant === 'underline' && isActive && (
              <motion.div
                layoutId="tab-underline"
                className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                style={{ background: 'var(--dm-accent-from)' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
