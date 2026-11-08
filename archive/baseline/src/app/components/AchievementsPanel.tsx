import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, Lock, Sparkles, TrendingUp, Star, Flame } from 'lucide-react';
import { clsx } from 'clsx';
import { apiFetch } from '../lib/supabase';
import { useI18n } from '../hooks/useI18n';

interface AchievementsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  starPower?: number;
}

interface Achievement {
  id: string;
  nameZh: string;
  nameEn: string;
  descZh: string;
  descEn: string;
  icon: string;
  unlocked: boolean;
  newlyUnlocked: boolean;
}

interface AchievementStats {
  totalWorks?: number;
  streakDays?: number;
  totalLikesReceived?: number;
  totalForks?: number;
  totalPlays?: number;
  totalMessages?: number;
  totalCapsules?: number;
  peakStarPower?: number;
  locationMessages?: number;
  voiceMessages?: number;
}

export const AchievementsPanel: React.FC<AchievementsPanelProps> = ({
  isOpen, onClose, user, starPower = 0,
}) => {
  const { t, lang } = useI18n();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<AchievementStats>({});
  const [totalUnlocked, setTotalUnlocked] = useState(0);
  const [totalAchievements, setTotalAchievements] = useState(12);
  const [loading, setLoading] = useState(false);
  const [showNewBadge, setShowNewBadge] = useState<string | null>(null);

  const fetchAchievements = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Track daily login + update star power
      await apiFetch(`/achievements/${user.id}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'daily_login', starPower }),
      });

      const data = await apiFetch<{
        achievements: Achievement[];
        stats: AchievementStats;
        totalUnlocked: number;
        totalAchievements: number;
      }>(`/achievements/${user.id}`);

      if (data?.achievements) {
        setAchievements(data.achievements);
        setStats(data.stats || {});
        setTotalUnlocked(data.totalUnlocked);
        setTotalAchievements(data.totalAchievements);

        // Show celebration for newly unlocked
        const newOne = data.achievements.find(a => a.newlyUnlocked);
        if (newOne) {
          setShowNewBadge(newOne.id);
          setTimeout(() => setShowNewBadge(null), 4000);
        }
      }
    } catch (err) { console.error('Achievements fetch error:', err); }
    finally { setLoading(false); }
  }, [user, starPower]);

  useEffect(() => {
    if (isOpen && user) fetchAchievements();
  }, [isOpen, user, fetchAchievements]);

  const progressPercent = totalAchievements > 0 ? (totalUnlocked / totalAchievements) * 100 : 0;

  const STAT_DISPLAY: Array<{ key: keyof AchievementStats; labelZh: string; labelEn: string; icon: React.ElementType; color: string }> = [
    { key: 'totalWorks', labelZh: '总作品', labelEn: 'Works', icon: Star, color: 'text-yellow-400' },
    { key: 'streakDays', labelZh: '连续天数', labelEn: 'Streak', icon: Flame, color: 'text-orange-400' },
    { key: 'totalLikesReceived', labelZh: '获赞', labelEn: 'Likes', icon: TrendingUp, color: 'text-pink-400' },
    { key: 'totalMessages', labelZh: '喊话', labelEn: 'Messages', icon: Sparkles, color: 'text-purple-400' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-[61] w-full max-w-md bg-[#0D1235]/95 backdrop-blur-2xl border-l border-white/10 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-yellow-500/20 to-orange-500/20 border border-white/10 flex items-center justify-center">
                  <Trophy className="w-4.5 h-4.5 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm leading-tight">{t('achievements.title')}</h3>
                  <p className="text-white/30 text-xs">{t('achievements.subtitle')}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: 'none' }}>
              {!user ? (
                <div className="text-center py-16">
                  <Trophy className="w-12 h-12 text-white/10 mx-auto mb-3" />
                  <p className="text-white/30 text-sm">{lang === 'zh' ? '登录后查看成就' : 'Sign in to view achievements'}</p>
                </div>
              ) : loading && achievements.length === 0 ? (
                <div className="flex justify-center py-16">
                  <div className="w-6 h-6 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* Progress Overview */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-yellow-500/[0.06] to-orange-500/[0.06] border border-yellow-500/10">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs text-white/40 uppercase tracking-wider font-medium">{t('achievements.progress')}</p>
                        <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 mt-0.5">
                          {totalUnlocked} / {totalAchievements}
                        </p>
                      </div>
                      <div className="w-16 h-16 relative">
                        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                          <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-white/[0.04]" />
                          <circle
                            cx="32" cy="32" r="28" fill="none"
                            stroke="url(#achieveGrad)"
                            strokeWidth="4"
                            strokeDasharray={`${175.9 * progressPercent / 100} 175.9`}
                            strokeLinecap="round"
                          />
                          <defs>
                            <linearGradient id="achieveGrad" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor="#eab308" />
                              <stop offset="100%" stopColor="#f97316" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-bold text-yellow-300">{Math.round(progressPercent)}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick stats */}
                    <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-white/[0.04]">
                      {STAT_DISPLAY.map(sd => {
                        const Icon = sd.icon;
                        return (
                          <div key={sd.key} className="text-center">
                            <Icon className={clsx('w-3.5 h-3.5 mx-auto mb-0.5', sd.color)} />
                            <p className="text-sm font-semibold text-white/80">{stats[sd.key] || 0}</p>
                            <p className="text-[9px] text-white/25">{lang === 'zh' ? sd.labelZh : sd.labelEn}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* New Badge Celebration */}
                  <AnimatePresence>
                    {showNewBadge && (() => {
                      const badge = achievements.find(a => a.id === showNewBadge);
                      if (!badge) return null;
                      return (
                        <motion.div
                          key="celebration"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="p-4 rounded-2xl bg-gradient-to-br from-yellow-500/15 to-orange-500/15 border border-yellow-500/25 text-center"
                        >
                          <motion.div
                            animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="text-4xl mb-2"
                          >
                            {badge.icon}
                          </motion.div>
                          <p className="text-xs text-yellow-300 font-semibold uppercase tracking-wider">
                            {lang === 'zh' ? '新成就解锁!' : 'Achievement Unlocked!'}
                          </p>
                          <p className="text-sm font-bold text-white/90 mt-1">
                            {lang === 'zh' ? badge.nameZh : badge.nameEn}
                          </p>
                          <p className="text-[10px] text-white/40 mt-0.5">
                            {lang === 'zh' ? badge.descZh : badge.descEn}
                          </p>
                        </motion.div>
                      );
                    })()}
                  </AnimatePresence>

                  {/* Achievement Grid */}
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider font-medium mb-3">{t('achievements.allBadges')}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {achievements.map((ach, idx) => (
                        <motion.div
                          key={ach.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className={clsx(
                            'p-3 rounded-xl border transition-all relative',
                            ach.unlocked
                              ? 'bg-gradient-to-br from-white/[0.04] to-white/[0.02] border-yellow-500/15 hover:border-yellow-500/25'
                              : 'bg-white/[0.01] border-white/[0.04] opacity-50'
                          )}
                        >
                          {ach.newlyUnlocked && (
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                              className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-yellow-400/50 border border-yellow-400/30"
                            />
                          )}
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xl">{ach.unlocked ? ach.icon : '🔒'}</span>
                            {ach.unlocked && (
                              <span className="text-[8px] px-1 py-0.5 rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/15 font-medium">
                                {lang === 'zh' ? '已解锁' : 'Unlocked'}
                              </span>
                            )}
                          </div>
                          <p className={clsx('text-xs font-medium', ach.unlocked ? 'text-white/80' : 'text-white/30')}>
                            {lang === 'zh' ? ach.nameZh : ach.nameEn}
                          </p>
                          <p className={clsx('text-[10px] mt-0.5 leading-relaxed', ach.unlocked ? 'text-white/40' : 'text-white/15')}>
                            {lang === 'zh' ? ach.descZh : ach.descEn}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-white/[0.06] flex-shrink-0 flex items-center justify-center">
              <div className="flex items-center gap-1.5 text-white/15">
                <Trophy className="w-3 h-3" />
                <span className="text-[10px]">{t('achievements.subtitle')}</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
