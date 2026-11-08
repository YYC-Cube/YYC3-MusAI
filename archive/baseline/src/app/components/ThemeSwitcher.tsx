import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Palette, X, Sun, Moon, Check, RotateCcw } from 'lucide-react';
import { clsx } from 'clsx';
import {
  THEMES, THEME_IDS, type ThemeId,
  loadCustomTheme, saveCustomTheme, type CustomThemeConfig,
} from '../lib/themes';

/**
 * §1.4 — Theme Switcher (Complete)
 *
 * Features:
 *   - 5 built-in themes + 1 custom theme
 *   - Color preview swatches with gradient accent bars
 *   - Custom theme editor (bg, accent, dark/light toggle)
 *   - Smooth transition animation via CSS class
 *   - WCAG 2.1 AA: aria-labels, keyboard navigation, focus-visible
 *   - Auto-saved via preferences
 */

interface ThemeSwitcherProps {
  currentTheme: ThemeId;
  onThemeChange: (id: ThemeId) => void;
  lang: 'zh' | 'en';
}

const DEFAULT_CUSTOM: CustomThemeConfig = {
  bg: '#0F172A',
  bgPanel: '#1E293B',
  accentFrom: '#F43F5E',
  accentTo: '#A855F7',
  isDark: true,
};

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  currentTheme,
  onThemeChange,
  lang,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [showCustomEditor, setShowCustomEditor] = React.useState(false);
  const [customConfig, setCustomConfig] = React.useState<CustomThemeConfig>(
    () => loadCustomTheme() || DEFAULT_CUSTOM
  );

  const handleSelectTheme = (id: ThemeId) => {
    if (id === 'custom') {
      setShowCustomEditor(true);
      return;
    }
    onThemeChange(id);
    setIsOpen(false);
  };

  const handleApplyCustom = () => {
    saveCustomTheme(customConfig);
    onThemeChange('custom');
    setShowCustomEditor(false);
    setIsOpen(false);
  };

  const handleResetCustom = () => {
    setCustomConfig(DEFAULT_CUSTOM);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((p) => !p)}
        className="flex items-center gap-1 text-white/30 hover:text-white/60 transition-colors bg-white/[0.03] hover:bg-white/[0.06] px-2.5 py-1 rounded-full border border-white/[0.06] text-xs dm-focus-ring"
        title={lang === 'zh' ? '主题切换' : 'Theme'}
        aria-label={lang === 'zh' ? '主题切换' : 'Switch theme'}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Palette className="w-3 h-3" />
        <span className="hidden sm:inline">{THEMES[currentTheme]?.icon || '🌌'}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Click outside to close */}
            <div
              className="fixed inset-0 z-[99]"
              onClick={() => { setIsOpen(false); setShowCustomEditor(false); }}
              aria-hidden="true"
            />

            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 400 }}
              className="absolute right-0 top-full mt-2 z-[100] w-72 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
              role="dialog"
              aria-label={lang === 'zh' ? '选择主题' : 'Select theme'}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Palette className="w-3.5 h-3.5 text-white/40" />
                  <span className="text-xs font-semibold text-white/70">
                    {showCustomEditor
                      ? (lang === 'zh' ? '自定义主题' : 'Custom Theme')
                      : (lang === 'zh' ? '主题风格' : 'Theme Style')}
                  </span>
                </div>
                <button
                  onClick={() => { setIsOpen(false); setShowCustomEditor(false); }}
                  className="p-1 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors dm-focus-ring"
                  aria-label={lang === 'zh' ? '关闭' : 'Close'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {!showCustomEditor ? (
                /* ── Theme Grid ── */
                <div className="p-3 space-y-1">
                  {THEME_IDS.map((id) => {
                    const theme = THEMES[id];
                    const isActive = id === currentTheme;
                    return (
                      <button
                        key={id}
                        onClick={() => handleSelectTheme(id)}
                        className={clsx(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left dm-focus-ring',
                          isActive
                            ? 'bg-white/10 border border-white/15'
                            : 'hover:bg-white/[0.04] border border-transparent'
                        )}
                        aria-pressed={isActive}
                        aria-label={`${theme.label[lang]} ${theme.description[lang]}`}
                      >
                        {/* Color preview swatch */}
                        <div
                          className="w-9 h-9 rounded-xl flex-shrink-0 relative overflow-hidden border border-white/10"
                          style={{ background: theme.bg }}
                        >
                          {/* Gradient accent bar */}
                          <div
                            className="absolute bottom-0 left-0 right-0 h-2"
                            style={{
                              background: `linear-gradient(to right, ${theme.accentFrom}, ${theme.accentTo})`,
                            }}
                          />
                          {/* Light/Dark indicator */}
                          <div className="absolute top-1 right-1">
                            {theme.isDark
                              ? <Moon className="w-2 h-2 text-white/30" />
                              : <Sun className="w-2 h-2 text-yellow-400/80" />
                            }
                          </div>
                        </div>

                        {/* Label */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{theme.icon}</span>
                            <span className={clsx('text-xs font-medium', isActive ? 'text-white' : 'text-white/60')}>
                              {theme.label[lang]}
                            </span>
                          </div>
                          <span className="text-[10px] text-white/25 block truncate">
                            {theme.description[lang]}
                          </span>
                        </div>

                        {/* Active indicator */}
                        {isActive && (
                          <motion.div
                            layoutId="theme-active"
                            className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                            style={{
                              background: `linear-gradient(to right, ${theme.accentFrom}, ${theme.accentTo})`,
                              boxShadow: `0 0 8px ${theme.accentFrom}50`,
                            }}
                          >
                            <Check className="w-3 h-3 text-white" />
                          </motion.div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* ── Custom Theme Editor ── */
                <div className="p-4 space-y-4">
                  {/* Dark / Light Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/50">
                      {lang === 'zh' ? '模式' : 'Mode'}
                    </span>
                    <div className="flex gap-1 bg-white/[0.05] rounded-lg p-0.5">
                      <button
                        onClick={() => setCustomConfig(p => ({ ...p, isDark: true, bg: '#0F172A', bgPanel: '#1E293B' }))}
                        className={clsx(
                          'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all dm-focus-ring',
                          customConfig.isDark ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                        )}
                      >
                        <Moon className="w-3 h-3" />
                        {lang === 'zh' ? '深色' : 'Dark'}
                      </button>
                      <button
                        onClick={() => setCustomConfig(p => ({ ...p, isDark: false, bg: '#F8F9FC', bgPanel: '#FFFFFF' }))}
                        className={clsx(
                          'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all dm-focus-ring',
                          !customConfig.isDark ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                        )}
                      >
                        <Sun className="w-3 h-3" />
                        {lang === 'zh' ? '浅色' : 'Light'}
                      </button>
                    </div>
                  </div>

                  {/* Color Pickers */}
                  <div className="space-y-3">
                    <ColorPicker
                      label={lang === 'zh' ? '背景色' : 'Background'}
                      value={customConfig.bg}
                      onChange={v => setCustomConfig(p => ({ ...p, bg: v }))}
                    />
                    <ColorPicker
                      label={lang === 'zh' ? '面板色' : 'Panel'}
                      value={customConfig.bgPanel}
                      onChange={v => setCustomConfig(p => ({ ...p, bgPanel: v }))}
                    />
                    <ColorPicker
                      label={lang === 'zh' ? '强调色 A' : 'Accent A'}
                      value={customConfig.accentFrom}
                      onChange={v => setCustomConfig(p => ({ ...p, accentFrom: v }))}
                    />
                    <ColorPicker
                      label={lang === 'zh' ? '强调色 B' : 'Accent B'}
                      value={customConfig.accentTo}
                      onChange={v => setCustomConfig(p => ({ ...p, accentTo: v }))}
                    />
                  </div>

                  {/* Preview */}
                  <div
                    className="rounded-xl border border-white/10 p-3 flex items-center gap-2"
                    style={{ background: customConfig.bg }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg"
                      style={{ background: customConfig.bgPanel, border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                    <div className="flex-1">
                      <div
                        className="h-1.5 rounded-full w-3/4"
                        style={{ background: `linear-gradient(to right, ${customConfig.accentFrom}, ${customConfig.accentTo})` }}
                      />
                      <div
                        className="h-1 rounded-full w-1/2 mt-1.5"
                        style={{ background: customConfig.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.10)' }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleResetCustom}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/60 hover:bg-white/5 transition-colors dm-focus-ring"
                    >
                      <RotateCcw className="w-3 h-3" />
                      {lang === 'zh' ? '重置' : 'Reset'}
                    </button>
                    <button
                      onClick={() => setShowCustomEditor(false)}
                      className="flex-1 px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/70 hover:bg-white/5 transition-colors dm-focus-ring"
                    >
                      {lang === 'zh' ? '返回' : 'Back'}
                    </button>
                    <button
                      onClick={handleApplyCustom}
                      className="flex-1 px-3 py-1.5 rounded-xl text-xs font-medium text-white transition-all dm-focus-ring"
                      style={{
                        background: `linear-gradient(to right, ${customConfig.accentFrom}, ${customConfig.accentTo})`,
                      }}
                    >
                      {lang === 'zh' ? '应用' : 'Apply'}
                    </button>
                  </div>
                </div>
              )}

              {/* Footer hint */}
              <div className="px-4 pb-2.5 pt-1 border-t border-white/[0.04]">
                <p className="text-[9px] text-white/15 text-center">
                  §1.4 · {lang === 'zh' ? '主题自动保存 · 支持自定义' : 'Auto-saved · Custom supported'}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Color Picker sub-component ──

const ColorPicker: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
}> = ({ label, value, onChange }) => {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-white/50">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-white/25 uppercase">{value}</span>
        <label className="relative cursor-pointer">
          <input
            type="color"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label={label}
          />
          <div
            className="w-6 h-6 rounded-lg border border-white/15 shadow-inner"
            style={{ background: value }}
          />
        </label>
      </div>
    </div>
  );
};
