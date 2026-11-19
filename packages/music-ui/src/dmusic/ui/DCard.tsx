// D-Music 设计层 · 分子组件 DCard

import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../ui/utils';

type CardVariant = 'default' | 'music' | 'user' | 'achievement' | 'glass';

interface DCardProps {
  variant?: CardVariant;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  interactive?: boolean;
  glowColor?: string;
  padding?: 'sm' | 'md' | 'lg' | 'none';
}

const cardPadding: Record<string, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export const DCard: React.FC<DCardProps> = ({
  variant = 'default',
  className,
  children,
  onClick,
  interactive = false,
  glowColor,
  padding = 'md',
}) => {
  const isInteractive = interactive || !!onClick;
  const Component = isInteractive ? motion.div : 'div';

  const baseStyles = cn(
    'rounded-2xl border overflow-hidden',
    cardPadding[padding],
    isInteractive && 'cursor-pointer dm-focus-ring',
    variant === 'glass' && 'backdrop-blur-xl',
    className
  );

  const style: React.CSSProperties = {
    background: variant === 'glass'
      ? 'var(--dm-bg-overlay)'
      : 'var(--dm-bg-elevated)',
    borderColor: 'var(--dm-border-subtle)',
    boxShadow: glowColor
      ? `0 0 20px ${glowColor}20, var(--dm-shadow-sm)`
      : 'var(--dm-shadow-sm)',
  };

  const motionProps = isInteractive
    ? {
        whileHover: { scale: 1.02, y: -2 },
        whileTap: { scale: 0.98 },
        transition: { type: 'spring' as const, damping: 20, stiffness: 300 },
      }
    : {};

  return (
    <Component
      className={baseStyles}
      style={style}
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={isInteractive ? (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      } : undefined}
      {...motionProps}
    >
      {children}
    </Component>
  );
};
