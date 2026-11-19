// 社区面板子组件 · 时空墙面板底部栏（副标题 + 刷新）
import React from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import type { TranslationKey } from '@yyc3/music-hooks';
import type { STTab } from './shared';

interface PanelFooterProps {
  tab: STTab;
  fetchMessages: () => Promise<void>;
  fetchCapsules: () => Promise<void>;
  fetchNearby: () => Promise<void>;
  t: (key: TranslationKey) => string;
}

export const PanelFooter: React.FC<PanelFooterProps> = ({
  tab, fetchMessages, fetchCapsules, fetchNearby, t,
}) => {
  return (
    <div className="p-3 border-t border-white/[0.06] flex-shrink-0 flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-white/15">
        <Sparkles className="w-3 h-3" />
        <span className="text-[10px]">{t('spacetime.subtitle')}</span>
      </div>
      <button
        onClick={() => { if (tab === 'messages') fetchMessages(); else if (tab === 'capsules') fetchCapsules(); else fetchNearby(); }}
        className="p-1.5 rounded-lg text-white/25 hover:text-white/50 transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
