// D-Music 设计层 · 有机体组件 DModal

import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../ui/utils';

interface DModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  closeOnBackdrop?: boolean;
}

const modalSizes: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export const DModal: React.FC<DModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
  closeOnBackdrop = true,
}) => {
  const modalRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  React.useEffect(() => {
    if (isOpen && modalRef.current) {
      const firstFocusable = modalRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[70] backdrop-blur-sm"
        style={{ background: 'var(--dm-bg-overlay, rgba(0,0,0,0.5))' }}
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      {/* Dialog */}
      <div className="fixed inset-0 z-[71] flex items-center justify-center p-4">
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={cn(
            'w-full rounded-2xl border shadow-2xl overflow-hidden',
            modalSizes[size],
            className
          )}
          style={{
            background: 'var(--dm-bg-panel)',
            borderColor: 'var(--dm-border-subtle)',
            backdropFilter: 'blur(20px)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid var(--dm-border-subtle)' }}
          >
            <div className="min-w-0">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--dm-text-primary)' }}>
                {title}
              </h3>
              {description && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--dm-text-tertiary)' }}>
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors dm-focus-ring flex-shrink-0 hover:bg-[var(--dm-hover-bg)]"
              style={{ color: 'var(--dm-text-tertiary)' }}
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Body */}
          <div className="px-5 py-4 overflow-y-auto max-h-[60vh]">
            {children}
          </div>
          {/* Footer */}
          {footer && (
            <div
              className="px-5 py-3 flex justify-end gap-2"
              style={{ borderTop: '1px solid var(--dm-border-subtle)' }}
            >
              {footer}
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
};
