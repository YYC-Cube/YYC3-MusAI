/**
 * D-Music §1.4 — Theme System (Complete)
 *
 * 6 immersive themes for D-Music:
 *   1. Deep Space (深空) — default, indigo/purple     [星空主题]
 *   2. Aurora (极光) — green/cyan borealis
 *   3. Ocean (海洋) — deep blue/teal
 *   4. Light (晨光) — clean light mode                [默认浅色]
 *   5. Midnight (暗夜) — neutral dark                 [深色主题]
 *   6. Custom (自定义) — user-configurable            [用户自定义]
 *
 * Design Token Structure (§1.4):
 *   - Color system (primary, secondary, semantic)
 *   - Font system (via design-tokens.ts)
 *   - Spacing system (4px base)
 *   - Border radius (4/8/12/16)
 *   - Shadow system (levels 0-4)
 *   - Animation system (durations, easings)
 *
 * Themes are applied via CSS custom properties on <html>.
 * Theme transitions use 300ms ease for smooth switching.
 * Pure utility module (no React dependency).
 */

export type ThemeId = 'deep-space' | 'aurora' | 'ocean' | 'light' | 'midnight' | 'custom';

export interface ThemeDefinition {
  id: ThemeId;
  label: { zh: string; en: string };
  description: { zh: string; en: string };
  icon: string;
  isDark: boolean;

  // ── Surface Colors ──
  /** Main background color */
  bg: string;
  /** Secondary / panel background */
  bgPanel: string;
  /** Elevated surface (cards, popovers) */
  bgElevated: string;
  /** Overlay background (modals backdrop) */
  bgOverlay: string;

  // ── Text Colors ──
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textDisabled: string;
  textInverse: string;

  // ── Accent & Brand ──
  /** Ambient glow RGB (for radial-gradient overlays) */
  glowRgb: string;
  /** Primary accent gradient (from → to) */
  accentFrom: string;
  accentTo: string;
  /** Starfield base color RGB */
  starRgb: string;
  /** Selection highlight */
  selectionBg: string;
  /** Header gradient stops */
  headerFrom: string;
  headerVia: string;
  /** Progress bar gradient */
  progressFrom: string;
  progressTo: string;
  /** Brand text gradient */
  brandFrom: string;
  brandVia: string;
  brandTo: string;

  // ── Semantic Colors ──
  success: string;
  warning: string;
  error: string;
  info: string;

  // ── Interactive ──
  hoverBg: string;
  activeBg: string;
  focusRing: string;

  // ── Borders ──
  border: string;
  borderSubtle: string;
  borderStrong: string;

  // ── Shadows ──
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
}

// ============================================================
// Theme Definitions
// ============================================================

const DEEP_SPACE: ThemeDefinition = {
  id: 'deep-space',
  label: { zh: '深空', en: 'Deep Space' },
  description: { zh: '星辰大海，宇宙沉浸', en: 'Cosmic immersion' },
  icon: '🌌',
  isDark: true,
  bg: '#0A0E2F',
  bgPanel: '#0D1235',
  bgElevated: '#111640',
  bgOverlay: 'rgba(10,14,47,0.85)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.60)',
  textTertiary: 'rgba(255,255,255,0.35)',
  textDisabled: 'rgba(255,255,255,0.20)',
  textInverse: '#0A0E2F',
  glowRgb: '102,126,234',
  accentFrom: '#8B5CF6',
  accentTo: '#EC4899',
  starRgb: '140,140,255',
  selectionBg: 'rgba(236,72,153,0.3)',
  headerFrom: '#0A0E2F',
  headerVia: 'rgba(10,14,47,0.8)',
  progressFrom: '#8B5CF6',
  progressTo: '#EC4899',
  brandFrom: '#FCD34D',
  brandVia: '#FDE68A',
  brandTo: '#FBBF24',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  hoverBg: 'rgba(255,255,255,0.06)',
  activeBg: 'rgba(255,255,255,0.10)',
  focusRing: '#8B5CF6',
  border: 'rgba(255,255,255,0.10)',
  borderSubtle: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.20)',
  shadowSm: '0 1px 3px rgba(0,0,0,0.4)',
  shadowMd: '0 4px 12px rgba(0,0,0,0.5)',
  shadowLg: '0 12px 40px rgba(0,0,0,0.6)',
};

const AURORA: ThemeDefinition = {
  id: 'aurora',
  label: { zh: '极光', en: 'Aurora' },
  description: { zh: '北极光芒，翠绿交织', en: 'Northern lights dance' },
  icon: '🌈',
  isDark: true,
  bg: '#071A1F',
  bgPanel: '#0A2229',
  bgElevated: '#0E2A32',
  bgOverlay: 'rgba(7,26,31,0.85)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.60)',
  textTertiary: 'rgba(255,255,255,0.35)',
  textDisabled: 'rgba(255,255,255,0.20)',
  textInverse: '#071A1F',
  glowRgb: '34,197,94',
  accentFrom: '#22C55E',
  accentTo: '#06B6D4',
  starRgb: '34,197,94',
  selectionBg: 'rgba(34,197,94,0.3)',
  headerFrom: '#071A1F',
  headerVia: 'rgba(7,26,31,0.8)',
  progressFrom: '#22C55E',
  progressTo: '#06B6D4',
  brandFrom: '#A7F3D0',
  brandVia: '#6EE7B7',
  brandTo: '#34D399',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#06B6D4',
  hoverBg: 'rgba(255,255,255,0.06)',
  activeBg: 'rgba(255,255,255,0.10)',
  focusRing: '#22C55E',
  border: 'rgba(255,255,255,0.10)',
  borderSubtle: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.20)',
  shadowSm: '0 1px 3px rgba(0,0,0,0.4)',
  shadowMd: '0 4px 12px rgba(0,0,0,0.5)',
  shadowLg: '0 12px 40px rgba(0,0,0,0.6)',
};

const OCEAN: ThemeDefinition = {
  id: 'ocean',
  label: { zh: '海洋', en: 'Ocean' },
  description: { zh: '深海静谧，蔚蓝沉思', en: 'Deep sea serenity' },
  icon: '🌊',
  isDark: true,
  bg: '#07142B',
  bgPanel: '#0B1C38',
  bgElevated: '#0F2444',
  bgOverlay: 'rgba(7,20,43,0.85)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.60)',
  textTertiary: 'rgba(255,255,255,0.35)',
  textDisabled: 'rgba(255,255,255,0.20)',
  textInverse: '#07142B',
  glowRgb: '59,130,246',
  accentFrom: '#3B82F6',
  accentTo: '#14B8A6',
  starRgb: '59,130,246',
  selectionBg: 'rgba(59,130,246,0.3)',
  headerFrom: '#07142B',
  headerVia: 'rgba(7,20,43,0.8)',
  progressFrom: '#3B82F6',
  progressTo: '#14B8A6',
  brandFrom: '#93C5FD',
  brandVia: '#BFDBFE',
  brandTo: '#60A5FA',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  hoverBg: 'rgba(255,255,255,0.06)',
  activeBg: 'rgba(255,255,255,0.10)',
  focusRing: '#3B82F6',
  border: 'rgba(255,255,255,0.10)',
  borderSubtle: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.20)',
  shadowSm: '0 1px 3px rgba(0,0,0,0.4)',
  shadowMd: '0 4px 12px rgba(0,0,0,0.5)',
  shadowLg: '0 12px 40px rgba(0,0,0,0.6)',
};

const LIGHT: ThemeDefinition = {
  id: 'light',
  label: { zh: '晨光', en: 'Light' },
  description: { zh: '清透明亮，轻盈雅致', en: 'Clean and bright' },
  icon: '☀️',
  isDark: false,
  bg: '#F8F9FC',
  bgPanel: '#FFFFFF',
  bgElevated: '#FFFFFF',
  bgOverlay: 'rgba(0,0,0,0.4)',
  textPrimary: 'rgba(0,0,0,0.87)',
  textSecondary: 'rgba(0,0,0,0.60)',
  textTertiary: 'rgba(0,0,0,0.38)',
  textDisabled: 'rgba(0,0,0,0.20)',
  textInverse: '#FFFFFF',
  glowRgb: '99,102,241',
  accentFrom: '#6366F1',
  accentTo: '#EC4899',
  starRgb: '99,102,241',
  selectionBg: 'rgba(99,102,241,0.15)',
  headerFrom: '#F8F9FC',
  headerVia: 'rgba(248,249,252,0.9)',
  progressFrom: '#6366F1',
  progressTo: '#EC4899',
  brandFrom: '#6366F1',
  brandVia: '#8B5CF6',
  brandTo: '#EC4899',
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  info: '#2563EB',
  hoverBg: 'rgba(0,0,0,0.04)',
  activeBg: 'rgba(0,0,0,0.08)',
  focusRing: '#6366F1',
  border: 'rgba(0,0,0,0.12)',
  borderSubtle: 'rgba(0,0,0,0.06)',
  borderStrong: 'rgba(0,0,0,0.20)',
  shadowSm: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
  shadowMd: '0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)',
  shadowLg: '0 12px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08)',
};

const MIDNIGHT: ThemeDefinition = {
  id: 'midnight',
  label: { zh: '暗夜', en: 'Midnight' },
  description: { zh: '纯黑质感，极简深色', en: 'Pure dark elegance' },
  icon: '🌑',
  isDark: true,
  bg: '#0C0C0E',
  bgPanel: '#141416',
  bgElevated: '#1C1C1F',
  bgOverlay: 'rgba(12,12,14,0.85)',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(255,255,255,0.55)',
  textTertiary: 'rgba(255,255,255,0.30)',
  textDisabled: 'rgba(255,255,255,0.18)',
  textInverse: '#0C0C0E',
  glowRgb: '168,85,247',
  accentFrom: '#A855F7',
  accentTo: '#F472B6',
  starRgb: '168,85,247',
  selectionBg: 'rgba(168,85,247,0.3)',
  headerFrom: '#0C0C0E',
  headerVia: 'rgba(12,12,14,0.8)',
  progressFrom: '#A855F7',
  progressTo: '#F472B6',
  brandFrom: '#E9D5FF',
  brandVia: '#D8B4FE',
  brandTo: '#C084FC',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#818CF8',
  hoverBg: 'rgba(255,255,255,0.05)',
  activeBg: 'rgba(255,255,255,0.08)',
  focusRing: '#A855F7',
  border: 'rgba(255,255,255,0.08)',
  borderSubtle: 'rgba(255,255,255,0.04)',
  borderStrong: 'rgba(255,255,255,0.15)',
  shadowSm: '0 1px 3px rgba(0,0,0,0.5)',
  shadowMd: '0 4px 12px rgba(0,0,0,0.6)',
  shadowLg: '0 12px 40px rgba(0,0,0,0.7)',
};

/** Default custom theme — user can override */
const CUSTOM_DEFAULT: ThemeDefinition = {
  ...DEEP_SPACE,
  id: 'custom',
  label: { zh: '自定义', en: 'Custom' },
  description: { zh: '打造你的专属风格', en: 'Your own style' },
  icon: '🎨',
};

// ============================================================
// Exports
// ============================================================

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  'deep-space': DEEP_SPACE,
  aurora: AURORA,
  ocean: OCEAN,
  light: LIGHT,
  midnight: MIDNIGHT,
  custom: CUSTOM_DEFAULT,
};

export const THEME_IDS: ThemeId[] = ['deep-space', 'aurora', 'ocean', 'light', 'midnight', 'custom'];

// ============================================================
// Custom Theme Storage
// ============================================================

const CUSTOM_THEME_KEY = 'dmusic-custom-theme';

/** Configurable properties for custom theme */
export interface CustomThemeConfig {
  bg: string;
  bgPanel: string;
  accentFrom: string;
  accentTo: string;
  isDark: boolean;
}

export function loadCustomTheme(): CustomThemeConfig | null {
  try {
    const raw = localStorage.getItem(CUSTOM_THEME_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCustomTheme(config: CustomThemeConfig): void {
  try {
    localStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(config));
  } catch {
    // localStorage unavailable
  }
}

function buildCustomTheme(config: CustomThemeConfig): ThemeDefinition {
  const base = config.isDark ? DEEP_SPACE : LIGHT;
  // Extract RGB from hex for glow
  const hex = config.accentFrom.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return {
    ...base,
    id: 'custom',
    label: CUSTOM_DEFAULT.label,
    description: CUSTOM_DEFAULT.description,
    icon: CUSTOM_DEFAULT.icon,
    isDark: config.isDark,
    bg: config.bg,
    bgPanel: config.bgPanel,
    bgElevated: config.bgPanel,
    bgOverlay: config.isDark ? `rgba(0,0,0,0.85)` : `rgba(0,0,0,0.4)`,
    glowRgb: `${r},${g},${b}`,
    accentFrom: config.accentFrom,
    accentTo: config.accentTo,
    progressFrom: config.accentFrom,
    progressTo: config.accentTo,
    focusRing: config.accentFrom,
    selectionBg: `rgba(${r},${g},${b},0.3)`,
    starRgb: `${r},${g},${b}`,
    headerFrom: config.bg,
    headerVia: config.isDark ? `rgba(0,0,0,0.8)` : `rgba(255,255,255,0.9)`,
    textPrimary: config.isDark ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.87)',
    textSecondary: config.isDark ? 'rgba(255,255,255,0.60)' : 'rgba(0,0,0,0.60)',
    textTertiary: config.isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.38)',
    textDisabled: config.isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.20)',
    textInverse: config.isDark ? config.bg : '#FFFFFF',
    hoverBg: config.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    activeBg: config.isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
    border: config.isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)',
    borderSubtle: config.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    borderStrong: config.isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.20)',
  };
}

// ============================================================
// Theme Application
// ============================================================

/**
 * Apply a theme by setting CSS custom properties on <html>.
 * Includes transition class for smooth switching (300ms).
 */
export function applyTheme(id: ThemeId): void {
  let theme = THEMES[id];
  if (!theme) theme = THEMES['deep-space'];

  // For custom theme, merge saved config
  if (id === 'custom') {
    const config = loadCustomTheme();
    if (config) {
      theme = buildCustomTheme(config);
    }
  }

  const root = document.documentElement;

  // Add transition class for smooth switching
  root.classList.add('theme-transitioning');
  requestAnimationFrame(() => {
    setTimeout(() => root.classList.remove('theme-transitioning'), 350);
  });

  // ── Surface ──
  root.style.setProperty('--dm-bg', theme.bg);
  root.style.setProperty('--dm-bg-panel', theme.bgPanel);
  root.style.setProperty('--dm-bg-elevated', theme.bgElevated);
  root.style.setProperty('--dm-bg-overlay', theme.bgOverlay);

  // ── Text ──
  root.style.setProperty('--dm-text-primary', theme.textPrimary);
  root.style.setProperty('--dm-text-secondary', theme.textSecondary);
  root.style.setProperty('--dm-text-tertiary', theme.textTertiary);
  root.style.setProperty('--dm-text-disabled', theme.textDisabled);
  root.style.setProperty('--dm-text-inverse', theme.textInverse);

  // ── Accent & Brand ──
  root.style.setProperty('--dm-glow-rgb', theme.glowRgb);
  root.style.setProperty('--dm-accent-from', theme.accentFrom);
  root.style.setProperty('--dm-accent-to', theme.accentTo);
  root.style.setProperty('--dm-star-rgb', theme.starRgb);
  root.style.setProperty('--dm-selection-bg', theme.selectionBg);
  root.style.setProperty('--dm-header-from', theme.headerFrom);
  root.style.setProperty('--dm-header-via', theme.headerVia);
  root.style.setProperty('--dm-progress-from', theme.progressFrom);
  root.style.setProperty('--dm-progress-to', theme.progressTo);
  root.style.setProperty('--dm-brand-from', theme.brandFrom);
  root.style.setProperty('--dm-brand-via', theme.brandVia);
  root.style.setProperty('--dm-brand-to', theme.brandTo);

  // ── Semantic ──
  root.style.setProperty('--dm-success', theme.success);
  root.style.setProperty('--dm-warning', theme.warning);
  root.style.setProperty('--dm-error', theme.error);
  root.style.setProperty('--dm-info', theme.info);

  // ── Interactive ──
  root.style.setProperty('--dm-hover-bg', theme.hoverBg);
  root.style.setProperty('--dm-active-bg', theme.activeBg);
  root.style.setProperty('--dm-focus-ring', theme.focusRing);

  // ── Borders ──
  root.style.setProperty('--dm-border', theme.border);
  root.style.setProperty('--dm-border-subtle', theme.borderSubtle);
  root.style.setProperty('--dm-border-strong', theme.borderStrong);

  // ── Shadows ──
  root.style.setProperty('--dm-shadow-sm', theme.shadowSm);
  root.style.setProperty('--dm-shadow-md', theme.shadowMd);
  root.style.setProperty('--dm-shadow-lg', theme.shadowLg);

  // ── Dark mode class ──
  if (theme.isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // ── Data attribute for CSS selectors ──
  root.setAttribute('data-theme', id);

  // ── PWA theme-color meta ──
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme.bg);
}

/**
 * Get a theme definition (with custom config applied if 'custom').
 */
export function getTheme(id: ThemeId): ThemeDefinition {
  if (id === 'custom') {
    const config = loadCustomTheme();
    if (config) return buildCustomTheme(config);
  }
  return THEMES[id] || THEMES['deep-space'];
}
