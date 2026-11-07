/**
 * D-Music §1.1 — Component Library
 *
 * Material Design 3.0 inspired, adapted for D-Music's deep-space aesthetic.
 * All components:
 *   - Use CSS custom properties from §1.4 Theme System
 *   - WCAG 2.1 AA compliant (aria-*, focus-visible, contrast ratios)
 *   - Support keyboard navigation
 *   - 60fps animations (GPU-accelerated transform/opacity)
 *   - Responsive (mobile/tablet/desktop)
 *
 * Component Categories:
 *   1. DButton — Primary/Secondary/Ghost/Danger variants
 *   2. DInput — Text/Password/Search inputs
 *   3. DCard — Music/User/Achievement cards
 *   4. DProgress — Linear and ring progress indicators
 *   5. DFeedback — Loading/Success/Error/Warning states
 *   6. DBadge — Status/count badges
 *   7. DTooltip — Accessible tooltip wrapper
 *   8. DTag — Genre/mood/status tags
 */

import React from 'react';
import { clsx } from 'clsx';
import { motion } from 'motion/react';
import {
  Loader2, CheckCircle2, AlertCircle, AlertTriangle, Info,
  Search, Eye, EyeOff, X,
} from 'lucide-react';

// ============================================================
// 1. DButton
// ============================================================

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
type ButtonSize = 'sm' | 'md' | 'lg';

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
      className={clsx(
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

// ============================================================
// 2. DInput
// ============================================================

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
  const inputId = id || `dinput-${React.useId()}`;
  const isPassword = variant === 'password';
  const isSearch = variant === 'search';
  const actualType = isPassword ? (showPassword ? 'text' : 'password') : (propType || 'text');

  const heights: Record<ButtonSize, string> = { sm: 'h-8', md: 'h-10', lg: 'h-12' };
  const textSizes: Record<ButtonSize, string> = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' };

  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
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
          className={clsx(
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

// ============================================================
// 3. DCard
// ============================================================

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

  const baseStyles = clsx(
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
        transition: { type: 'spring', damping: 20, stiffness: 300 },
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

/** Music card — specialized for track/album display */
interface DMusicCardProps {
  title: string;
  artist: string;
  coverUrl?: string;
  duration?: string;
  emotion?: string;
  isPlaying?: boolean;
  onClick?: () => void;
  className?: string;
}

export const DMusicCard: React.FC<DMusicCardProps> = ({
  title, artist, coverUrl, duration, emotion, isPlaying, onClick, className,
}) => {
  return (
    <DCard variant="default" interactive onClick={onClick} padding="sm" className={clsx('flex items-center gap-3', className)}>
      <div
        className="w-12 h-12 rounded-xl flex-shrink-0 bg-gradient-to-br from-[var(--dm-accent-from)]/30 to-[var(--dm-accent-to)]/30 flex items-center justify-center overflow-hidden relative"
      >
        {coverUrl ? (
          <img src={coverUrl} alt={title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <span className="text-lg">🎵</span>
        )}
        {isPlaying && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="flex gap-0.5 items-end h-4" aria-label="Playing">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-1 rounded-full"
                  style={{ background: 'var(--dm-accent-from)' }}
                  animate={{ height: ['40%', '100%', '40%'] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--dm-text-primary)' }}>{title}</p>
        <p className="text-xs truncate" style={{ color: 'var(--dm-text-tertiary)' }}>{artist}</p>
      </div>
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        {duration && <span className="text-[10px] tabular-nums" style={{ color: 'var(--dm-text-disabled)' }}>{duration}</span>}
        {emotion && (
          <DTag size="xs" variant="emotion">{emotion}</DTag>
        )}
      </div>
    </DCard>
  );
};

/** User card — for creator/profile display */
interface DUserCardProps {
  name: string;
  avatar?: string;
  subtitle?: string;
  badge?: string;
  onClick?: () => void;
  className?: string;
}

export const DUserCard: React.FC<DUserCardProps> = ({
  name, avatar, subtitle, badge, onClick, className,
}) => {
  return (
    <DCard variant="default" interactive onClick={onClick} padding="sm" className={clsx('flex items-center gap-3', className)}>
      <div
        className="w-10 h-10 rounded-full flex-shrink-0 bg-gradient-to-br from-[var(--dm-accent-from)] to-[var(--dm-accent-to)] flex items-center justify-center text-white text-sm font-bold overflow-hidden"
      >
        {avatar ? (
          <img src={avatar} alt={name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          name.charAt(0).toUpperCase()
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate" style={{ color: 'var(--dm-text-primary)' }}>{name}</span>
          {badge && <DBadge variant="accent" size="sm">{badge}</DBadge>}
        </div>
        {subtitle && <p className="text-xs truncate" style={{ color: 'var(--dm-text-tertiary)' }}>{subtitle}</p>}
      </div>
    </DCard>
  );
};

/** Achievement card — with progress ring */
interface DAchievementCardProps {
  title: string;
  description?: string;
  icon: string;
  progress: number; // 0-100
  unlocked?: boolean;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  className?: string;
}

const rarityColors = {
  common: { color: '#9CA3AF', label: '普通' },
  rare: { color: '#3B82F6', label: '稀有' },
  epic: { color: '#A855F7', label: '史诗' },
  legendary: { color: '#F59E0B', label: '传说' },
};

export const DAchievementCard: React.FC<DAchievementCardProps> = ({
  title, description, icon, progress, unlocked, rarity = 'common', className,
}) => {
  const rarityInfo = rarityColors[rarity];
  return (
    <DCard
      variant="default"
      padding="md"
      glowColor={unlocked ? rarityInfo.color : undefined}
      className={clsx('flex items-center gap-4', !unlocked && 'opacity-60', className)}
    >
      <div className="relative flex-shrink-0">
        <AchievementRing progress={progress} size={52} color={rarityInfo.color} strokeWidth={3} />
        <span className="absolute inset-0 flex items-center justify-center text-xl" role="img" aria-label={title}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--dm-text-primary)' }}>{title}</p>
        {description && <p className="text-xs truncate" style={{ color: 'var(--dm-text-tertiary)' }}>{description}</p>}
        <div className="flex items-center gap-2 mt-1">
          <DTag size="xs" style={{ color: rarityInfo.color, borderColor: `${rarityInfo.color}40`, background: `${rarityInfo.color}15` }}>
            {rarityInfo.label}
          </DTag>
          <span className="text-[10px] tabular-nums" style={{ color: 'var(--dm-text-disabled)' }}>{progress}%</span>
        </div>
      </div>
    </DCard>
  );
};

// ============================================================
// 4. DProgress — Linear & Ring
// ============================================================

interface DProgressProps {
  value: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'gradient' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  className?: string;
  'aria-label'?: string;
}

const progressHeights: Record<string, string> = { sm: 'h-1', md: 'h-2', lg: 'h-3' };

export const DProgress: React.FC<DProgressProps> = ({
  value,
  size = 'md',
  variant = 'gradient',
  showLabel = false,
  className,
  ...props
}) => {
  const clamped = Math.min(100, Math.max(0, value));

  const fillStyle: React.CSSProperties = variant === 'gradient'
    ? { background: `linear-gradient(to right, var(--dm-accent-from), var(--dm-accent-to))`, width: `${clamped}%` }
    : variant === 'success' ? { background: 'var(--dm-success)', width: `${clamped}%` }
    : variant === 'warning' ? { background: 'var(--dm-warning)', width: `${clamped}%` }
    : variant === 'error' ? { background: 'var(--dm-error)', width: `${clamped}%` }
    : { background: 'var(--dm-accent-from)', width: `${clamped}%` };

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <div
        className={clsx('flex-1 rounded-full overflow-hidden', progressHeights[size])}
        style={{ background: 'var(--dm-hover-bg)' }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={props['aria-label'] || `Progress: ${clamped}%`}
      >
        <div
          className={clsx('h-full rounded-full transition-[width] duration-500 ease-out')}
          style={fillStyle}
        />
      </div>
      {showLabel && (
        <span className="text-xs tabular-nums flex-shrink-0" style={{ color: 'var(--dm-text-tertiary)' }}>
          {clamped}%
        </span>
      )}
    </div>
  );
};

/** SVG Achievement Ring — §1.3 */
interface AchievementRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  children?: React.ReactNode;
  className?: string;
}

export const AchievementRing: React.FC<AchievementRingProps> = ({
  progress,
  size = 48,
  strokeWidth = 3,
  color,
  bgColor,
  children,
  className,
}) => {
  const clamped = Math.min(100, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={clsx('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor || 'var(--dm-hover-bg)'}
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color || 'var(--dm-accent-from)'}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-700 ease-out"
          style={{ filter: `drop-shadow(0 0 4px ${color || 'var(--dm-accent-from)'}60)` }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
};

// ============================================================
// 5. DFeedback — Loading/Success/Error/Warning/Info
// ============================================================

type FeedbackType = 'loading' | 'success' | 'error' | 'warning' | 'info';

interface DFeedbackProps {
  type: FeedbackType;
  message: string;
  description?: string;
  className?: string;
  onDismiss?: () => void;
}

const feedbackConfig: Record<FeedbackType, { Icon: React.FC<any>; colorVar: string }> = {
  loading: { Icon: Loader2, colorVar: '--dm-info' },
  success: { Icon: CheckCircle2, colorVar: '--dm-success' },
  error: { Icon: AlertCircle, colorVar: '--dm-error' },
  warning: { Icon: AlertTriangle, colorVar: '--dm-warning' },
  info: { Icon: Info, colorVar: '--dm-info' },
};

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
      className={clsx(
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
        className={clsx('w-5 h-5 flex-shrink-0 mt-0.5', type === 'loading' && 'animate-spin')}
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

/** Inline loading spinner */
interface DSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const DSpinner: React.FC<DSpinnerProps> = ({ size = 'md', className }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return (
    <Loader2
      className={clsx('animate-spin', sizes[size], className)}
      style={{ color: 'var(--dm-accent-from)' }}
      aria-label="Loading"
    />
  );
};

// ============================================================
// 6. DBadge
// ============================================================

type BadgeVariant = 'default' | 'accent' | 'success' | 'warning' | 'error' | 'info';

interface DBadgeProps {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'bg-[var(--dm-hover-bg)] text-[var(--dm-text-secondary)] border-[var(--dm-border-subtle)]',
  accent: 'bg-[var(--dm-accent-from)]/15 text-[var(--dm-accent-from)] border-[var(--dm-accent-from)]/30',
  success: 'bg-[var(--dm-success)]/15 text-[var(--dm-success)] border-[var(--dm-success)]/30',
  warning: 'bg-[var(--dm-warning)]/15 text-[var(--dm-warning)] border-[var(--dm-warning)]/30',
  error: 'bg-[var(--dm-error)]/15 text-[var(--dm-error)] border-[var(--dm-error)]/30',
  info: 'bg-[var(--dm-info)]/15 text-[var(--dm-info)] border-[var(--dm-info)]/30',
};

export const DBadge: React.FC<DBadgeProps> = ({
  variant = 'default',
  size = 'sm',
  children,
  className,
  dot = false,
}) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 border rounded-full font-medium',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        badgeVariants[variant],
        className
      )}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
      )}
      {children}
    </span>
  );
};

// ============================================================
// 7. DTag — genre/mood/status tags
// ============================================================

interface DTagProps {
  variant?: 'default' | 'emotion' | 'outline';
  size?: 'xs' | 'sm' | 'md';
  children: React.ReactNode;
  onRemove?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const DTag: React.FC<DTagProps> = ({
  variant = 'default',
  size = 'sm',
  children,
  onRemove,
  className,
  style,
}) => {
  const sizeClasses = {
    xs: 'px-1.5 py-0 text-[9px]',
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full font-medium border',
        sizeClasses[size],
        variant === 'emotion'
          ? 'bg-[var(--dm-accent-from)]/10 text-[var(--dm-accent-from)] border-[var(--dm-accent-from)]/20'
          : variant === 'outline'
          ? 'bg-transparent text-[var(--dm-text-secondary)] border-[var(--dm-border)]'
          : 'bg-[var(--dm-hover-bg)] text-[var(--dm-text-secondary)] border-[var(--dm-border-subtle)]',
        className
      )}
      style={style}
    >
      {children}
      {onRemove && (
        <button
          onClick={onRemove}
          className="p-0 rounded-full hover:text-[var(--dm-text-primary)] dm-focus-ring"
          aria-label={`Remove ${children}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};

// ============================================================
// 8. DEmptyState — Placeholder for empty lists
// ============================================================

interface DEmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const DEmptyState: React.FC<DEmptyStateProps> = ({
  icon = '🎵',
  title,
  description,
  action,
  className,
}) => {
  return (
    <div className={clsx('flex flex-col items-center justify-center py-12 px-6 text-center', className)}>
      <span className="text-4xl mb-4" role="img" aria-hidden="true">{icon}</span>
      <h3 className="text-base font-medium mb-1" style={{ color: 'var(--dm-text-primary)' }}>{title}</h3>
      {description && (
        <p className="text-sm max-w-xs" style={{ color: 'var(--dm-text-tertiary)' }}>{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

// ============================================================
// 9. DList — Styled list container
// ============================================================

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
    <div className={clsx(className)} role="list" aria-label={label}>
      <div className={clsx(divided && 'divide-y divide-[var(--dm-border-subtle)]')}>
        {children}
      </div>
    </div>
  );
};

interface DListItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  active?: boolean;
}

export const DListItem: React.FC<DListItemProps> = ({
  children,
  onClick,
  className,
  active = false,
}) => {
  return (
    <div
      role="listitem"
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={clsx(
        'px-3 py-2.5',
        onClick && 'cursor-pointer hover:bg-[var(--dm-hover-bg)] dm-focus-ring transition-colors',
        active && 'bg-[var(--dm-active-bg)]',
        className
      )}
    >
      {children}
    </div>
  );
};

// ============================================================
// 10. DModal — Dialog/Modal component (§1.1)
// ============================================================

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
          className={clsx(
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

// ============================================================
// 11. DTabBar — Navigation tabs (§1.1)
// ============================================================

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
      className={clsx(
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
            className={clsx(
              'relative inline-flex items-center justify-center gap-1.5 font-medium transition-all dm-focus-ring',
              fullWidth && 'flex-1',
              tab.disabled && 'opacity-40 cursor-not-allowed',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
              variant === 'default' && clsx(
                'rounded-lg',
                isActive
                  ? 'bg-[var(--dm-bg-panel)] text-[var(--dm-text-primary)] shadow-sm'
                  : 'text-[var(--dm-text-tertiary)] hover:text-[var(--dm-text-secondary)]'
              ),
              variant === 'pills' && clsx(
                'rounded-full border',
                isActive
                  ? 'bg-[var(--dm-accent-from)]/15 text-[var(--dm-accent-from)] border-[var(--dm-accent-from)]/30'
                  : 'text-[var(--dm-text-tertiary)] border-transparent hover:text-[var(--dm-text-secondary)] hover:bg-[var(--dm-hover-bg)]'
              ),
              variant === 'underline' && clsx(
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

// ============================================================
// 12. DToast — Notification toast (§1.1 Feedback)
// ============================================================

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
      className={clsx(
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

// ============================================================
// 13. DBreadcrumb — Navigation breadcrumb (§1.1)
// ============================================================

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
    <nav aria-label="Breadcrumb" className={clsx('flex items-center flex-wrap', className)}>
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