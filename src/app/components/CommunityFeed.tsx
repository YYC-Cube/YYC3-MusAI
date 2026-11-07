import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Users,
  Heart,
  Smile,
  Frown,
  Zap,
  Cloud,
  Sparkles,
  Award,
  Music,
  RefreshCw,
  MessageCircle,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { Emotion } from '../hooks/useAudioEngine';
import type { CommunityActivity } from '../playlistData';
import { useI18n } from '../hooks/useI18n';
import { useVirtualList } from '../hooks/useVirtualList';

interface CommunityFeedProps {
  isOpen: boolean;
  onClose: () => void;
  activities: CommunityActivity[];
  onRefresh: () => void;
  isLoading: boolean;
}

const EMOTION_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  happy: { icon: Smile, color: 'text-yellow-400' },
  sad: { icon: Frown, color: 'text-blue-400' },
  energetic: { icon: Zap, color: 'text-red-400' },
  calm: { icon: Cloud, color: 'text-cyan-400' },
  neutral: { icon: Sparkles, color: 'text-purple-400' },
};

const TYPE_COLORS = {
  annotation: 'from-purple-500/20 to-indigo-500/20',
  like: 'from-pink-500/20 to-red-500/20',
  achievement: 'from-yellow-500/20 to-orange-500/20',
  play: 'from-blue-500/20 to-cyan-500/20',
};

const TYPE_ICONS = {
  annotation: MessageCircle,
  like: Heart,
  achievement: Award,
  play: Music,
};

export const CommunityFeed: React.FC<CommunityFeedProps> = ({
  isOpen,
  onClose,
  activities,
  onRefresh,
  isLoading,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const pullStartY = useRef(0);
  const pullActive = useRef(false);
  const { t } = useI18n();

  // §9.3 — Incremental rendering for large activity feeds
  const { visibleCount, sentinelRef, hasMore } = useVirtualList(activities.length, {
    initialCount: 20,
    increment: 15,
    rootRef: feedRef,
  });

  const PULL_THRESHOLD = 70;

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    // Haptic feedback on refresh trigger
    try { navigator.vibrate?.([10, 30, 10, 30, 40]); } catch {}
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  }, [onRefresh]);

  // Pull-to-refresh touch handlers
  const handlePullStart = useCallback((e: React.TouchEvent) => {
    const el = feedRef.current;
    if (!el || el.scrollTop > 5 || isRefreshing) return;
    pullStartY.current = e.touches[0].clientY;
    pullActive.current = true;
  }, [isRefreshing]);

  const handlePullMove = useCallback((e: React.TouchEvent) => {
    if (!pullActive.current) return;
    const diff = e.touches[0].clientY - pullStartY.current;
    if (diff < 0) {
      pullActive.current = false;
      setPullDistance(0);
      setIsPulling(false);
      return;
    }
    // Rubber-band effect: diminishing returns past threshold
    const rubberBand = diff < PULL_THRESHOLD ? diff : PULL_THRESHOLD + (diff - PULL_THRESHOLD) * 0.3;
    setPullDistance(rubberBand);
    setIsPulling(rubberBand > 10);
    // Light haptic when crossing threshold
    if (diff >= PULL_THRESHOLD && diff < PULL_THRESHOLD + 5) {
      try { navigator.vibrate?.(15); } catch {}
    }
  }, []);

  const handlePullEnd = useCallback(() => {
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      handleRefresh();
    }
    pullActive.current = false;
    setPullDistance(0);
    setIsPulling(false);
  }, [pullDistance, isRefreshing, handleRefresh]);

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return t('time.justNow');
    if (minutes < 60) return `${minutes}${t('time.mAgo')}`;
    if (hours < 24) return `${hours}${t('time.hAgo')}`;
    if (days < 7) return `${days}${t('time.dAgo')}`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getActivityMessage = (activity: CommunityActivity) => {
    switch (activity.type) {
      case 'annotation':
        return (
          <>
            <span className="text-white/70">{t('community.tagged')} </span>
            <span className="text-purple-400">{activity.detail}</span>
            <span className="text-white/70"> {t('community.on')} </span>
            <span className="text-white/90 font-medium">{activity.songTitle}</span>
          </>
        );
      case 'like':
        return (
          <>
            <span className="text-white/70">{t('community.liked')} </span>
            <span className="text-white/90 font-medium">{activity.songTitle}</span>
          </>
        );
      case 'achievement':
        return (
          <>
            <span className="text-white/70">{t('community.earned')} </span>
            <span className="text-yellow-400 font-medium">{activity.detail}</span>
          </>
        );
      case 'play':
        return (
          <>
            <span className="text-white/70">{t('community.listeningTo')} </span>
            <span className="text-white/90 font-medium">{activity.songTitle}</span>
          </>
        );
      default:
        return <span className="text-white/70">{activity.detail}</span>;
    }
  };

  const getActivityLabel = (activity: CommunityActivity): string => {
    switch (activity.type) {
      case 'annotation': return `${activity.userName} 标注了 ${activity.detail} 在 ${activity.songTitle}`;
      case 'like': return `${activity.userName} 喜欢了 ${activity.songTitle}`;
      case 'achievement': return `${activity.userName} 获得了成就 ${activity.detail}`;
      case 'play': return `${activity.userName} 正在听 ${activity.songTitle}`;
      default: return `${activity.userName}: ${activity.detail}`;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* §11.x — Dialog semantics */}
          <motion.div
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
            aria-label={t('community.title')}
            className="fixed left-0 top-0 bottom-0 z-[61] w-full max-w-full md:max-w-sm bg-[#0D1235]/95 backdrop-blur-2xl border-r border-white/10 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-green-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-green-400" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">{t('community.title')}</h3>
                  <p className="text-white/30 text-xs">{t('community.liveFeed')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  className={clsx(
                    'p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/[0.08] text-white/60 hover:text-white transition-all',
                    isRefreshing && 'animate-spin'
                  )}
                  aria-label={t('community.refreshFeed')}
                  disabled={isRefreshing}
                >
                  <RefreshCw className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
                  aria-label="关闭社区动态 / Close community feed"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Live indicator */}
            <div className="px-5 py-3 border-b border-white/[0.04] flex items-center gap-2" aria-live="polite">
              <div className="relative" aria-hidden="true">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <div className="w-2 h-2 rounded-full bg-green-400 absolute inset-0 animate-ping opacity-50" />
              </div>
              <span className="text-xs text-white/30">{t('community.liveActivity')}</span>
            </div>

            {/* Pull-to-refresh indicator */}
            <AnimatePresence>
              {(isPulling || isRefreshing) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{
                    height: isRefreshing ? 48 : Math.min(pullDistance, 60),
                    opacity: 1,
                  }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25 }}
                  className="flex items-center justify-center overflow-hidden"
                  role="status"
                  aria-label={isRefreshing ? '刷新中 / Refreshing' : '下拉刷新 / Pull to refresh'}
                >
                  <motion.div
                    animate={isRefreshing ? { rotate: 360 } : { rotate: pullDistance * 3 }}
                    transition={isRefreshing ? { duration: 0.8, repeat: Infinity, ease: 'linear' } : { duration: 0 }}
                  >
                    <RefreshCw className={clsx(
                      'w-5 h-5',
                      pullDistance >= PULL_THRESHOLD || isRefreshing
                        ? 'text-green-400'
                        : 'text-white/30'
                    )} />
                  </motion.div>
                  {pullDistance >= PULL_THRESHOLD && !isRefreshing && (
                    <span className="text-xs text-green-400/70 ml-2">
                      {t('community.refreshFeed')}
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* §9.3 — Feed with incremental rendering */}
            <div
              ref={feedRef}
              className="flex-1 overflow-y-auto"
              style={{ scrollbarWidth: 'none' }}
              onTouchStart={handlePullStart}
              onTouchMove={handlePullMove}
              onTouchEnd={handlePullEnd}
              role="feed"
              aria-label={t('community.title')}
              aria-busy={isLoading || isRefreshing}
            >
              {activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center px-6">
                  <div className="w-16 h-16 rounded-full bg-white/[0.03] flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-white/10" aria-hidden="true" />
                  </div>
                  <p className="text-white/30 text-sm mb-1">{t('community.noActivity')}</p>
                  <p className="text-white/15 text-xs">
                    {t('community.startListening')}
                  </p>
                </div>
              ) : (
                <div className="p-3 space-y-1">
                  {activities.slice(0, visibleCount).map((activity, index) => {
                    const TypeIcon = TYPE_ICONS[activity.type] || Music;
                    const emotionConfig =
                      activity.type === 'annotation'
                        ? EMOTION_ICONS[activity.detail] || EMOTION_ICONS.neutral
                        : null;

                    return (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(index, 10) * 0.05, duration: 0.3 }}
                        className="p-3 rounded-xl hover:bg-white/[0.02] transition-colors group"
                        role="article"
                        aria-label={getActivityLabel(activity)}
                      >
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div
                            className={clsx(
                              'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br',
                              TYPE_COLORS[activity.type]
                            )}
                            aria-hidden="true"
                          >
                            {emotionConfig ? (
                              <emotionConfig.icon
                                className={clsx('w-4 h-4', emotionConfig.color)}
                              />
                            ) : (
                              <TypeIcon
                                className={clsx(
                                  'w-4 h-4',
                                  activity.type === 'like'
                                    ? 'text-pink-400'
                                    : activity.type === 'achievement'
                                    ? 'text-yellow-400'
                                    : 'text-blue-400'
                                )}
                              />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm leading-relaxed">
                              <span className="text-white font-medium">
                                {activity.userName}
                              </span>{' '}
                              {getActivityMessage(activity)}
                            </p>
                            <p className="text-[11px] text-white/20 mt-1">
                              <time dateTime={new Date(activity.timestamp).toISOString()}>
                                {formatTimeAgo(activity.timestamp)}
                              </time>
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* §9.3 — Sentinel for incremental loading */}
                  {hasMore && (
                    <div ref={sentinelRef} className="flex items-center justify-center py-4">
                      <div className="flex items-center gap-2 text-white/20 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" />
                        <span>加载更多动态 / Loading more...</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Stats */}
            <div className="p-4 border-t border-white/[0.06]">
              <div className="flex items-center justify-around text-center" role="status" aria-label="社区统计 / Community stats">
                <div>
                  <p className="text-lg font-bold text-white">
                    {activities.filter((a) => a.type === 'annotation').length}
                  </p>
                  <p className="text-[10px] text-white/20 uppercase tracking-wider">
                    {t('community.annotations')}
                  </p>
                </div>
                <div className="w-px h-8 bg-white/[0.06]" aria-hidden="true" />
                <div>
                  <p className="text-lg font-bold text-white">
                    {activities.filter((a) => a.type === 'like').length}
                  </p>
                  <p className="text-[10px] text-white/20 uppercase tracking-wider">
                    {t('community.likes')}
                  </p>
                </div>
                <div className="w-px h-8 bg-white/[0.06]" aria-hidden="true" />
                <div>
                  <p className="text-lg font-bold text-white">
                    {new Set(activities.map((a) => a.userName)).size}
                  </p>
                  <p className="text-[10px] text-white/20 uppercase tracking-wider">
                    {t('community.activeUsers')}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
