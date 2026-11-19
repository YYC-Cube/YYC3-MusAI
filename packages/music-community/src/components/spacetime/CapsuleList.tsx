// 社区面板子组件 · 时空墙胶囊列表（加载 / 空态 / 列表）
import React from 'react';
import { Package } from 'lucide-react';
import type { TranslationKey, Lang } from '@yyc3/music-hooks';
import { CapsuleCard } from './CapsuleCard';
import type { STCapsule } from './shared';

interface CapsuleListProps {
  capLoading: boolean;
  capsules: STCapsule[];
  user: any;
  lang: Lang;
  t: (key: TranslationKey) => string;
  handleDecryptCapsule: React.MutableRefObject<(cap: STCapsule) => Promise<void>>;
  handleLikeCapsule: (capId: string) => Promise<void>;
}

export const CapsuleList: React.FC<CapsuleListProps> = ({
  capLoading, capsules, user, lang, t, handleDecryptCapsule, handleLikeCapsule,
}) => {
  return (
    <React.Fragment>
      {/* Capsule List */}
      {capLoading && capsules.length === 0 ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      ) : capsules.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm">{t('spacetime.noCapsules')}</p>
          <p className="text-white/15 text-xs mt-1">{t('spacetime.beFirstCapsule')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {capsules.map(cap => (
            <CapsuleCard
              key={cap.id}
              cap={cap}
              user={user}
              lang={lang}
              t={t}
              handleDecryptCapsule={handleDecryptCapsule}
              handleLikeCapsule={handleLikeCapsule}
            />
          ))}
        </div>
      )}
    </React.Fragment>
  );
};
