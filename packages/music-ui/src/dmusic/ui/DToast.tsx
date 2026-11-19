// D-Music 设计层 · 有机体组件 DToast

import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../ui/utils';

import { feedbackConfig } from './shared';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface DToastProps {
  variant: ToastVariant;
  message: string;
  description?: string;
  duration?: number;
  onDismiss: () => void;
  className?: string;
}

export const DToast: React.FC<DToastProps> = ({
  variant,
  message,
  description,
  onDismiss,
  className,
}) => {
  const { Icon, colorVar } = feedbackConfig[variant];
  const colorValue = `var(${colorVar})`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 400 }}
      className={cn(
        'flex items-start gap-3 p-3 rounded-xl border shadow-lg max-w-sm pointer-events-auto',
        className
      )}
      style={{
        background: 'var(--dm-bg-elevated)',
        borderColor: `color-mix(in srgb, ${colorValue} 30%, transparent)`,
        boxShadow: 'var(--dm-shadow-lg)',
      }}
      role="alert"
      aria-live="assertive"
    >
      <Icon
        className="w-5 h-5 flex-shrink-0 mt-0.5"
        style={{ color: colorValue }}
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--dm-text-primary)' }}>{message}</p>
        {description && <p className="text-xs mt-0.5" style={{ color: 'var(--dm-text-secondary)' }}>{description}</p>}
      </div>
      <button
        onClick={onDismiss}
        className="p-0.5 rounded dm-focus-ring flex-shrink-0"
        style={{ color: 'var(--dm-text-tertiary)' }}
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};
