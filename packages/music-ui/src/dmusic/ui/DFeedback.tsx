// D-Music 设计层 · 分子组件 DFeedback

import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../ui/utils';

import { feedbackConfig } from './shared';
import type { FeedbackType } from './shared';

interface DFeedbackProps {
  type: FeedbackType;
  message: string;
  description?: string;
  className?: string;
  onDismiss?: () => void;
}

export const DFeedback: React.FC<DFeedbackProps> = ({
  type, message, description, className, onDismiss,
}) => {
  const { Icon, colorVar } = feedbackConfig[type];
  const colorValue = `var(${colorVar})`;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn(
        'flex items-start gap-3 p-3 rounded-xl border',
        className
      )}
      style={{
        background: `color-mix(in srgb, ${colorValue} 10%, transparent)`,
        borderColor: `color-mix(in srgb, ${colorValue} 30%, transparent)`,
      }}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      <Icon
        className={cn('w-5 h-5 flex-shrink-0 mt-0.5', type === 'loading' && 'animate-spin')}
        style={{ color: colorValue }}
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--dm-text-primary)' }}>{message}</p>
        {description && <p className="text-xs mt-0.5" style={{ color: 'var(--dm-text-secondary)' }}>{description}</p>}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-0.5 rounded dm-focus-ring flex-shrink-0"
          style={{ color: 'var(--dm-text-tertiary)' }}
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
};
