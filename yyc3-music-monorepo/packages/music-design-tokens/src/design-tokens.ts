/**
 * D-Music §1.1 — Design Token System
 *
 * Complete design token documentation following Material Design 3.0 principles,
 * adapted for D-Music's deep-space universe aesthetic.
 *
 * Token Categories:
 *   1. Color System (primary, secondary, semantic, data-viz)
 *   2. Typography System (font families, weights, sizes, line-heights)
 *   3. Spacing System (4px base grid)
 *   4. Border Radius System (4/8/12/16/24/full)
 *   5. Shadow/Elevation System (5 levels)
 *   6. Animation System (durations, easings)
 *   7. Breakpoints (responsive)
 *   8. Z-Index System (layering)
 *
 * WCAG 2.1 AA: All color pairings maintain >=4.5:1 contrast ratio for text.
 * 60fps Target: All animations use GPU-accelerated properties (transform, opacity).
 */

// ============================================================
// 1. Color System
// ============================================================

/** Semantic color roles mapped to CSS custom properties */
export const COLOR_ROLES = {
  // Surface colors
  background: '--dm-bg',
  backgroundPanel: '--dm-bg-panel',
  backgroundElevated: '--dm-bg-elevated',
  backgroundOverlay: '--dm-bg-overlay',

  // Content colors
  textPrimary: '--dm-text-primary',
  textSecondary: '--dm-text-secondary',
  textTertiary: '--dm-text-tertiary',
  textDisabled: '--dm-text-disabled',
  textInverse: '--dm-text-inverse',

  // Accent / Brand
  accentFrom: '--dm-accent-from',
  accentTo: '--dm-accent-to',
  brandFrom: '--dm-brand-from',
  brandVia: '--dm-brand-via',
  brandTo: '--dm-brand-to',

  // Semantic
  success: '--dm-success',
  warning: '--dm-warning',
  error: '--dm-error',
  info: '--dm-info',

  // Interactive
  hoverBg: '--dm-hover-bg',
  activeBg: '--dm-active-bg',
  focusRing: '--dm-focus-ring',
  selectionBg: '--dm-selection-bg',

  // Borders
  borderDefault: '--dm-border',
  borderSubtle: '--dm-border-subtle',
  borderStrong: '--dm-border-strong',
} as const;

/** Data visualization color palette — 8 distinct hues for chart series */
export const DATA_VIZ_COLORS = {
  series1: '#8B5CF6', // Violet
  series2: '#EC4899', // Pink
  series3: '#06B6D4', // Cyan
  series4: '#F59E0B', // Amber
  series5: '#22C55E', // Green
  series6: '#3B82F6', // Blue
  series7: '#EF4444', // Red
  series8: '#A855F7', // Purple
} as const;

/** Emotion-mapped colors for audio visualization */
export const EMOTION_COLORS = {
  happy:     { primary: '#FFD700', secondary: '#FFA500', glow: 'rgba(255,215,0,0.3)' },
  sad:       { primary: '#6495ED', secondary: '#4169E1', glow: 'rgba(100,149,237,0.3)' },
  energetic: { primary: '#FF4500', secondary: '#FF1493', glow: 'rgba(255,69,0,0.3)' },
  calm:      { primary: '#00CED1', secondary: '#7B68EE', glow: 'rgba(0,206,209,0.3)' },
  neutral:   { primary: '#667EEA', secondary: '#764BA2', glow: 'rgba(102,126,234,0.3)' },
  love:      { primary: '#FF6B9D', secondary: '#C44569', glow: 'rgba(255,107,157,0.3)' },
  nostalgic: { primary: '#DEB887', secondary: '#D2691E', glow: 'rgba(222,184,135,0.3)' },
  hopeful:   { primary: '#98FB98', secondary: '#00FA9A', glow: 'rgba(152,251,152,0.3)' },
  angry:     { primary: '#DC143C', secondary: '#8B0000', glow: 'rgba(220,20,60,0.3)' },
  romantic:  { primary: '#FFB6C1', secondary: '#FF69B4', glow: 'rgba(255,182,193,0.3)' },
} as const;

// ============================================================
// 2. Typography System
// ============================================================

export const TYPOGRAPHY = {
  fontFamily: {
    display: "'Space Grotesk', system-ui, -apple-system, sans-serif",
    body: "'Space Grotesk', system-ui, -apple-system, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
    cjk: "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  fontWeight: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  fontSize: {
    '2xs': '0.625rem',   // 10px
    xs: '0.75rem',       // 12px
    sm: '0.875rem',      // 14px
    base: '1rem',        // 16px
    lg: '1.125rem',      // 18px
    xl: '1.25rem',       // 20px
    '2xl': '1.5rem',     // 24px
    '3xl': '1.875rem',   // 30px
    '4xl': '2.25rem',    // 36px
  },
  lineHeight: {
    tight: 1.2,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

// ============================================================
// 3. Spacing System (4px base grid)
// ============================================================

export const SPACING = {
  0: '0px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const;

// ============================================================
// 4. Border Radius System
// ============================================================

export const RADIUS = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  full: '9999px',
} as const;

// ============================================================
// 5. Shadow / Elevation System
// ============================================================

export const SHADOWS = {
  /** Level 0 — flat */
  none: 'none',
  /** Level 1 — subtle (cards, buttons) */
  sm: '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
  /** Level 2 — medium (dropdowns, popovers) */
  md: '0 4px 6px rgba(0,0,0,0.35), 0 2px 4px rgba(0,0,0,0.2)',
  /** Level 3 — high (modals, dialogs) */
  lg: '0 10px 25px rgba(0,0,0,0.4), 0 4px 10px rgba(0,0,0,0.25)',
  /** Level 4 — highest (overlays, floating panels) */
  xl: '0 20px 50px rgba(0,0,0,0.5), 0 8px 20px rgba(0,0,0,0.3)',
  /** Inner shadow (inset elements) */
  inner: 'inset 0 2px 4px rgba(0,0,0,0.25)',
  /** Glow effect (accent-colored) */
  glow: (color: string) => `0 0 20px ${color}40, 0 0 60px ${color}20`,
} as const;

// ============================================================
// 6. Animation System
// ============================================================

export const ANIMATION = {
  duration: {
    instant: '50ms',
    fast: '150ms',
    normal: '250ms',
    slow: '400ms',
    slower: '600ms',
    slowest: '1000ms',
  },
  easing: {
    /** Standard Material easing */
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    /** Decelerate (entering elements) */
    decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
    /** Accelerate (exiting elements) */
    accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
    /** Spring-like bounce */
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    /** Linear (progress bars, infinite loops) */
    linear: 'linear',
  },
  /** Motion variants for motion/react */
  variants: {
    fadeIn: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
    slideUp: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 20 },
    },
    slideDown: {
      initial: { opacity: 0, y: -20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
    },
    scaleIn: {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.9 },
    },
    panelSlide: {
      initial: { opacity: 0, x: 300 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 300 },
      transition: { type: 'spring', damping: 30, stiffness: 300 },
    },
  },
} as const;

// ============================================================
// 7. Breakpoints (responsive)
// ============================================================

export const BREAKPOINTS = {
  xs: 320,    // Small phones
  sm: 640,    // Phones
  md: 768,    // Tablets
  lg: 1024,   // Laptops
  xl: 1280,   // Desktops
  '2xl': 1536, // Large desktops
} as const;

// ============================================================
// 8. Z-Index System (strict layering)
// ============================================================

export const Z_INDEX = {
  base: 0,
  starfield: 1,
  content: 10,
  header: 20,
  mobileNav: 30,
  dropdown: 40,
  panel: 50,
  overlay: 60,
  modal: 70,
  toast: 80,
  tooltip: 90,
  perfMonitor: 95,
  maxOverlay: 100,
} as const;

// ============================================================
// 9. Component Token Presets
// ============================================================

export const COMPONENT_TOKENS = {
  button: {
    heightSm: '32px',
    heightMd: '40px',
    heightLg: '48px',
    paddingX: { sm: '12px', md: '16px', lg: '24px' },
    fontSize: { sm: '0.75rem', md: '0.875rem', lg: '1rem' },
    radius: RADIUS.lg,
    transition: `all ${ANIMATION.duration.fast} ${ANIMATION.easing.standard}`,
  },
  input: {
    height: '40px',
    paddingX: '12px',
    fontSize: '0.875rem',
    radius: RADIUS.lg,
    borderWidth: '1px',
  },
  card: {
    padding: { sm: '12px', md: '16px', lg: '24px' },
    radius: RADIUS.xl,
    borderWidth: '1px',
  },
  modal: {
    maxWidth: '560px',
    padding: '24px',
    radius: RADIUS['2xl'],
    backdropBlur: '12px',
  },
  panel: {
    width: '400px',
    maxWidth: '90vw',
    radius: RADIUS.xl,
    backdropBlur: '20px',
  },
} as const;

// ============================================================
// 10. WCAG 2.1 AA Contrast Helpers
// ============================================================

/**
 * Minimum contrast ratios for WCAG 2.1 AA compliance:
 *   - Normal text (< 18pt): 4.5:1
 *   - Large text (>= 18pt or >= 14pt bold): 3:1
 *   - UI components / graphical objects: 3:1
 */
export const WCAG = {
  minContrastNormalText: 4.5,
  minContrastLargeText: 3.0,
  minContrastUI: 3.0,
  focusIndicatorWidth: '2px',
  focusIndicatorOffset: '2px',
  minTouchTarget: '44px', // 44x44px minimum touch target
} as const;
