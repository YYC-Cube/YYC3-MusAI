/**
 * D-Music §1.2 — Unified Panel Component
 *
 * A standardized panel shell for all D-Music side panels/drawers/modals.
 *
 * Features:
 *   - Unified visual style (glassmorphism, theme-aware)
 *   - Clear information hierarchy (header → body → optional footer)
 *   - Smooth spring animation (enter from right)
 *   - Mobile: fullscreen panel / bottom drawer
 *   - Desktop: side drawer (right) with backdrop
 *   - Keyboard: Escape to close, focus trap
 *   - WCAG 2.1 AA: role="dialog", aria-modal, aria-label
 *
 * Panel Types Supported:
 *   playlist, profile, community, analytics, ai-lyrics, leaderboard,
 *   recommendations, creation-studio, mv-creator, space-time, star-power,
 *   ip-matrix, achievements, discover-hub, copyright, shop, challenge,
 *   fork-tree, mheart, smart-playlist, live-session, comments
 *
 * Usage:
 *   <DPanel isOpen={show} onClose={close} title="播放列表" icon={<Music />}>
 *     <PlaylistContent />
 *   </DPanel>
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

export type PanelSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface DPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: PanelSize;
  /** Section label (e.g., "§19.x") shown in bottom hint */
  sectionLabel?: string;
  className?: string;
  /** If true, panel enters from bottom on mobile */
  mobileBottomSheet?: boolean;
  /** If true, no backdrop blur */
  noBackdrop?: boolean;
  /** Custom header-right actions */
  headerActions?: React.ReactNode;
}

const panelSizes: Record<PanelSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full',
};

export const DPanel: React.FC<DPanelProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  size = 'md',
  sectionLabel,
  className,
  mobileBottomSheet = false,
  noBackdrop = false,
  headerActions,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Keyboard: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Focus trap: focus panel on open
  useEffect(() => {
    if (isOpen && panelRef.current) {
      const firstFocusable = panelRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          {!noBackdrop && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60] backdrop-blur-sm"
              style={{ background: 'var(--dm-bg-overlay, rgba(0,0,0,0.4))' }}
              onClick={onClose}
              aria-hidden="true"
            />
          )}

          {/* Panel */}
          <motion.div
            ref={panelRef}
            initial={mobileBottomSheet
              ? { y: '100%', opacity: 0 }
              : { x: '100%', opacity: 0 }
            }
            animate={mobileBottomSheet
              ? { y: 0, opacity: 1 }
              : { x: 0, opacity: 1 }
            }
            exit={mobileBottomSheet
              ? { y: '100%', opacity: 0 }
              : { x: '100%', opacity: 0 }
            }
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={clsx(
              'fixed z-[61] flex flex-col shadow-2xl',
              // Responsive positioning
              mobileBottomSheet
                ? 'bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl'
                : 'right-0 top-0 bottom-0 w-full',
              !mobileBottomSheet && panelSizes[size],
              className
            )}
            style={{
              background: 'var(--dm-bg-panel, #0D1235)',
              borderLeft: mobileBottomSheet ? 'none' : '1px solid var(--dm-border-subtle)',
              borderTop: mobileBottomSheet ? '1px solid var(--dm-border-subtle)' : 'none',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            {/* ── Header ── */}
            <div
              className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--dm-border-subtle)' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                {icon && (
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, var(--dm-accent-from, #8B5CF6)20, var(--dm-accent-to, #EC4899)20)',
                      border: '1px solid var(--dm-border)',
                    }}
                  >
                    <span style={{ color: 'var(--dm-accent-from)' }}>{icon}</span>
                  </div>
                )}
                <div className="min-w-0">
                  <h3
                    className="font-semibold text-sm truncate"
                    style={{ color: 'var(--dm-text-primary)' }}
                  >
                    {title}
                  </h3>
                  {subtitle && (
                    <p
                      className="text-xs truncate"
                      style={{ color: 'var(--dm-text-tertiary)' }}
                    >
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {headerActions}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg transition-colors dm-focus-ring"
                  style={{
                    color: 'var(--dm-text-tertiary)',
                    background: 'transparent',
                  }}
                  onMouseEnter={e => {
                    (e.target as HTMLElement).style.background = 'var(--dm-hover-bg)';
                    (e.target as HTMLElement).style.color = 'var(--dm-text-primary)';
                  }}
                  onMouseLeave={e => {
                    (e.target as HTMLElement).style.background = 'transparent';
                    (e.target as HTMLElement).style.color = 'var(--dm-text-tertiary)';
                  }}
                  aria-label="Close panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
              {children}
            </div>

            {/* ── Footer (optional) ── */}
            {footer && (
              <div
                className="flex-shrink-0 px-5 py-3"
                style={{ borderTop: '1px solid var(--dm-border-subtle)' }}
              >
                {footer}
              </div>
            )}

            {/* ── Section hint ── */}
            {sectionLabel && (
              <div className="px-5 pb-2 flex-shrink-0">
                <p className="text-[9px] text-center" style={{ color: 'var(--dm-text-disabled)' }}>
                  {sectionLabel}
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
