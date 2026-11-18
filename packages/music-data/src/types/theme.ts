// 主题系统域 — 主题定义、自定义主题配置与主题切换器

import type { Lang, ThemeId } from './common';

/** Theme definition (complete) */
export interface ThemeDefinition {
  id: ThemeId;
  label: { zh: string; en: string };
  description: { zh: string; en: string };
  icon: string;
  isDark: boolean;
  bg: string;
  bgPanel: string;
  bgElevated: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accentFrom: string;
  accentTo: string;
  border: string;
  glassOverlay: string;
}

/** Custom theme user configuration */
export interface CustomThemeConfig {
  bg: string;
  bgPanel: string;
  accentFrom: string;
  accentTo: string;
  isDark: boolean;
}

export interface ThemeSwitcherProps {
  currentTheme: ThemeId;
  onThemeChange: (id: ThemeId) => void;
  lang: Lang;
}
