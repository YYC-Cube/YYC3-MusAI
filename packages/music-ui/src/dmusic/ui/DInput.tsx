// D-Music 设计层 · 原子组件 DInput

import React from 'react';
import { Search, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { cn } from '../../ui/utils';

import type { ButtonSize } from './shared';

type InputVariant = 'default' | 'search' | 'password';

interface DInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: InputVariant;
  label?: string;
  error?: string;
  hint?: string;
  inputSize?: ButtonSize;
  leftIcon?: React.ReactNode;
}

export const DInput: React.FC<DInputProps> = ({
  variant = 'default',
  label,
  error,
  hint,
  inputSize = 'md',
  leftIcon,
  className,
  id,
  type: propType,
  ...props
}) => {
  const [showPassword, setShowPassword] = React.useState(false);
  // useId 必须无条件调用，否则会因 id 是否传入而改变 Hook 调用顺序
  const generatedId = React.useId();
  const inputId = id || `dinput-${generatedId}`;
  const isPassword = variant === 'password';
  const isSearch = variant === 'search';
  const actualType = isPassword ? (showPassword ? 'text' : 'password') : (propType || 'text');

  const heights: Record<ButtonSize, string> = { sm: 'h-8', md: 'h-10', lg: 'h-12' };
  const textSizes: Record<ButtonSize, string> = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' };

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium"
          style={{ color: 'var(--dm-text-secondary)' }}
        >
          {label}
        </label>
      )}
      <div className="relative">
        {(isSearch || leftIcon) && (
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--dm-text-tertiary)' }}
            aria-hidden="true"
          >
            {isSearch ? <Search className="w-4 h-4" /> : leftIcon}
          </span>
        )}
        <input
          id={inputId}
          type={actualType}
          className={cn(
            'w-full rounded-xl border px-3 font-normal',
            'transition-all duration-150 ease-out dm-focus-ring',
            'placeholder:text-[var(--dm-text-disabled)]',
            heights[inputSize],
            textSizes[inputSize],
            (isSearch || leftIcon) && 'pl-9',
            isPassword && 'pr-9',
            error
              ? 'border-[var(--dm-error)] bg-[var(--dm-error)]/5'
              : 'border-[var(--dm-border)] bg-[var(--dm-bg-panel)]'
          )}
          style={{ color: 'var(--dm-text-primary)' }}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(p => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded dm-focus-ring"
            style={{ color: 'var(--dm-text-tertiary)' }}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} className="text-xs flex items-center gap-1" style={{ color: 'var(--dm-error)' }} role="alert">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-xs" style={{ color: 'var(--dm-text-tertiary)' }}>
          {hint}
        </p>
      )}
    </div>
  );
};
