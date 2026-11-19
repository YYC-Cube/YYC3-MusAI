// 社区面板子组件 · 时空墙面板头部
import React from 'react';
import { X, Radio } from 'lucide-react';
import type { TranslationKey } from '@yyc3/music-hooks';

interface PanelHeaderProps {
  t: (key: TranslationKey) => string;
  onClose: () => void;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({ t, onClose }) => {
  return (
    <div className="flex items-center justify-between p-5 border-b border-white/[0.06] flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center">
          <Radio className="w-4.5 h-4.5 text-purple-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-sm leading-tight">{t('spacetime.title')}</h3>
          <p className="text-white/30 text-xs">{t('spacetime.subtitle')}</p>
        </div>
      </div>
      <button onClick={onClose} className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
