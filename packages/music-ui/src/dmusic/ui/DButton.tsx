// D-Music 设计层 · 原子组件 DButton

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../ui/utils';

import type { ButtonSize } from './shared';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';

interface DButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-gradient-to-r from-[var(--dm-accent-from)] to-[var(--dm-accent-to)] text-white shadow-[var(--dm-shadow-sm)] hover:shadow-[var(--dm-shadow-md)] hover:brightness-110 active:brightness-95',
  secondary: 'bg-[var(--dm-hover-bg)] text-[var(--dm-text-primary)] border border-[var(--dm-border)] hover:bg-[var(--dm-active-bg)] hover:border-[var(--dm-border-strong)]',
  ghost: 'bg-transparent text-[var(--dm-text-secondary)] hover:bg-[var(--dm-hover-bg)] hover:text-[var(--dm-text-primary)]',
  danger: 'bg-[var(--dm-error)] text-white hover:brightness-110 active:brightness-95',
  accent: 'bg-[var(--dm-accent-from)]/15 text-[var(--dm-accent-from)] border border-[var(--dm-accent-from)]/30 hover:bg-[var(--dm-accent-from)]/25',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-xl',
};

export const DButton: React.FC<DButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  disabled,
  className,
  children,
  ...props
}) => {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium',
        'transition-all duration-150 ease-out',
        'dm-focus-ring select-none',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
        buttonVariants[variant],
        buttonSizes[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
      ) : icon ? (
        <span className="flex-shrink-0" aria-hidden="true">{icon}</span>
      ) : null}
      {children && <span>{children}</span>}
      {iconRight && !loading && (
        <span className="flex-shrink-0" aria-hidden="true">{iconRight}</span>
      )}
    </button>
  );
};
