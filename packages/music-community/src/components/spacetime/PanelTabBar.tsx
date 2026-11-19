// 社区面板子组件 · 时空墙标签栏（消息 / 胶囊 / 附近）
import React, { Dispatch, SetStateAction } from 'react';
import { MessageCircle, Package, Compass } from 'lucide-react';
import { clsx } from 'clsx';
import type { TranslationKey } from '@yyc3/music-hooks';
import type { STTab, STMessage } from './shared';

interface PanelTabBarProps {
  tab: STTab;
  setTab: Dispatch<SetStateAction<STTab>>;
  geoSupported: boolean;
  nearbyMessages: STMessage[];
  fetchNearby: () => Promise<void>;
  t: (key: TranslationKey) => string;
}

export const PanelTabBar: React.FC<PanelTabBarProps> = ({
  tab, setTab, geoSupported, nearbyMessages, fetchNearby, t,
}) => {
  return (
    <div className="flex p-2 mx-4 mt-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
      <button
        onClick={() => setTab('messages')}
        className={clsx(
          'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5',
          tab === 'messages' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/20' : 'text-white/40 hover:text-white/60'
        )}
      >
        <MessageCircle className="w-3.5 h-3.5" />
        {t('spacetime.messages')}
      </button>
      <button
        onClick={() => setTab('capsules')}
        className={clsx(
          'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5',
          tab === 'capsules' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/20' : 'text-white/40 hover:text-white/60'
        )}
      >
        <Package className="w-3.5 h-3.5" />
        {t('spacetime.capsules')}
      </button>
      {geoSupported && (
        <button
          onClick={() => { setTab('nearby'); if (nearbyMessages.length === 0) fetchNearby(); }}
          className={clsx(
            'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5',
            tab === 'nearby' ? 'bg-green-500/20 text-green-300 border border-green-500/20' : 'text-white/40 hover:text-white/60'
          )}
        >
          <Compass className="w-3.5 h-3.5" />
          {t('spacetime.nearby')}
        </button>
      )}
    </div>
  );
};
