// 社区面板子组件 · 时空墙附近消息 Tab（定位信息栏 + 附近消息列表）
import React from 'react';
import { motion } from 'motion/react';
import { MapPin, Navigation, Music, Heart } from 'lucide-react';
import { clsx } from 'clsx';
import type { TranslationKey, Lang } from '@yyc3/music-hooks';
import { emotionOf, timeAgo } from './shared';
import type { STMessage } from './shared';

interface NearbyTabProps {
  userLocation: { lat: number; lng: number; label?: string } | null;
  nearbyLoading: boolean;
  geoLoading: boolean;
  nearbyMessages: STMessage[];
  fetchNearby: () => Promise<void>;
  t: (key: TranslationKey) => string;
  lang: Lang;
}

export const NearbyTab: React.FC<NearbyTabProps> = ({
  userLocation, nearbyLoading, geoLoading, nearbyMessages, fetchNearby, t, lang,
}) => {
  return (
    <div className="p-4">
      {/* Location info bar */}
      <div className="mb-4 p-3 rounded-xl bg-green-500/[0.04] border border-green-500/10">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-green-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-green-300/80">{t('spacetime.nearbyTitle')}</p>
            {userLocation ? (
              <p className="text-[10px] text-green-300/40 mt-0.5 truncate">
                {userLocation.label} · {lang === 'zh' ? '50km范围' : '50km radius'}
              </p>
            ) : (
              <p className="text-[10px] text-white/25 mt-0.5">{t('spacetime.nearbyHint')}</p>
            )}
          </div>
          <button
            onClick={fetchNearby}
            disabled={nearbyLoading || geoLoading}
            className="px-2.5 py-1 rounded-lg text-[10px] bg-green-500/15 text-green-300 border border-green-500/15 hover:bg-green-500/25 disabled:opacity-30 transition-all"
          >
            {nearbyLoading || geoLoading ? <Navigation className="w-3 h-3 animate-spin" /> : t('spacetime.nearbyRefresh')}
          </button>
        </div>
      </div>

      {/* Nearby messages list */}
      {nearbyLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
        </div>
      ) : nearbyMessages.length === 0 ? (
        <div className="text-center py-12">
          <MapPin className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm">{t('spacetime.nearbyEmpty')}</p>
          <p className="text-white/15 text-xs mt-1">{t('spacetime.nearbyEmptyHint')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {nearbyMessages.map(msg => {
            const emo = emotionOf(msg.emotion);
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-green-500/30 to-cyan-500/30 flex items-center justify-center flex-shrink-0 text-xs text-white/60">
                    {msg.userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-white/70">{msg.userName}</span>
                      <span className={clsx('text-[10px]', emo.color)}>{emo.emoji}</span>
                      <span className="text-[10px] text-white/15 ml-auto">{timeAgo(msg.createdAt)}</span>
                    </div>
                    <p className="text-sm text-white/80 mt-1 leading-relaxed">{msg.content}</p>
                    {msg.targetLocation && (
                      <div className="flex items-center gap-1 mt-1.5 text-[10px] text-green-400/50">
                        <MapPin className="w-2.5 h-2.5" />
                        {msg.targetLocation.label || `${msg.targetLocation.lat.toFixed(3)}, ${msg.targetLocation.lng.toFixed(3)}`}
                        {msg.distance != null && (
                          <span className="text-white/20 ml-1">
                            ({msg.distance < 1 ? `${(msg.distance * 1000).toFixed(0)}m` : `${msg.distance.toFixed(1)}km`})
                          </span>
                        )}
                      </div>
                    )}
                    {msg.songTitle && (
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-cyan-400/50">
                        <Music className="w-2.5 h-2.5" />{msg.songTitle}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-[11px] text-white/20">
                        <Heart className="w-3 h-3" /> {msg.likes > 0 && msg.likes}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
