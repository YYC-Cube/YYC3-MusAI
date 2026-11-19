// 创作工作室 · 表单块-情绪主题选择（大师/改编通用紧凑版）
import React from 'react';
import { clsx } from 'clsx';
import { THEMES, type AILyricsTheme } from './shared';

interface CompactThemePickerProps {
  label: string;
  value: AILyricsTheme;
  onSelect: (theme: AILyricsTheme) => void;
  unlockedPremium: Set<string>;
  user?: any;
  starPower?: number;
  onUnlockTheme: (themeId: string, cost: number) => void;
  onHaptic?: (pattern: string) => void;
  lang: string;
}

export const CompactThemePicker: React.FC<CompactThemePickerProps> = ({
  label,
  value,
  onSelect,
  unlockedPremium,
  user,
  starPower,
  onUnlockTheme,
  onHaptic,
  lang,
}) => {
  return (
    <div>
      <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-3">
        {label}
      </p>
      <div className="grid grid-cols-5 gap-2">
        {THEMES.map(theme => {
          const Icon = theme.icon;
          const isActive = value === theme.id;
          const isLocked = theme.premium && !unlockedPremium.has(theme.id);
          return (
            <button
              key={theme.id}
              onClick={() => {
                if (isLocked) {
                  if (user && starPower >= (theme.spCost || 200)) onUnlockTheme(theme.id, theme.spCost || 200);
                  return;
                }
                onSelect(theme.id); onHaptic?.('selection');
              }}
              className={clsx(
                'p-2.5 rounded-xl border transition-all text-center relative',
                isLocked ? 'bg-white/[0.01] border-white/[0.04] opacity-60'
                  : isActive ? `bg-gradient-to-br ${theme.bg} border-white/15`
                  : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
              )}
            >
              {isLocked && <span className="absolute -top-1 -right-1 text-[8px] px-1 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/20 font-medium">{theme.spCost}SP</span>}
              <Icon className={clsx('w-4 h-4 mx-auto mb-0.5', isActive ? theme.color : isLocked ? 'text-white/15' : 'text-white/30')} />
              <p className={clsx('text-[9px]', isActive ? 'text-white/80' : 'text-white/30')}>
                {lang === 'zh' ? theme.labelZh : theme.label}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
