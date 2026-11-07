import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Star,
  Clock,
  Heart,
  MessageCircle,
  Award,
  TrendingUp,
  Zap,
  Calendar,
  ChevronRight,
  Download,
} from 'lucide-react';
import { clsx } from 'clsx';
import { ACHIEVEMENTS, type Achievement, type UserProfileData } from '../playlistData';
import { useI18n } from '../hooks/useI18n';
import { apiFetch } from '../lib/supabase';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  profile: UserProfileData | null;
  starPower: number;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  isOpen,
  onClose,
  user,
  profile,
  starPower,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'stats'>('overview');
  const [isExporting, setIsExporting] = useState(false);
  const { t } = useI18n();

  // §12.x — Data export handler
  const handleExport = async () => {
    if (!user?.id || isExporting) return;
    setIsExporting(true);
    try {
      const data = await apiFetch<Record<string, any>>(`/export/${user.id}`);
      if (data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `d-music-export-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('[D-Music] Data export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  if (!user) return null;

  const displayName = profile?.displayName || user.email?.split('@')[0] || 'Explorer';
  const unlockedAchievements = profile?.achievements || [];
  const totalListeningMins = Math.floor((profile?.totalListeningTime || 0) / 60);
  const totalAnnotations = profile?.totalAnnotations || 0;
  const totalLikes = profile?.totalLikes || 0;
  const streak = profile?.streak || 0;

  // Calculate level from star power
  const level = Math.floor(Math.sqrt(starPower / 50)) + 1;
  const currentLevelThreshold = Math.pow(level - 1, 2) * 50;
  const nextLevelThreshold = Math.pow(level, 2) * 50;
  const levelProgress = (starPower - currentLevelThreshold) / (nextLevelThreshold - currentLevelThreshold);

  const tabs = [
    { id: 'overview' as const, label: t('profile.overview') },
    { id: 'achievements' as const, label: t('profile.achievements') },
    { id: 'stats' as const, label: t('profile.stats') },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-[61] max-h-[85vh] bg-[#0D1235]/95 backdrop-blur-2xl border-t border-white/10 rounded-t-3xl flex flex-col shadow-2xl md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-2xl md:border md:max-h-[80vh]"
          >
            {/* Header */}
            <div className="relative p-6 pb-4">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Avatar + Name */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 p-0.5">
                    <div className="w-full h-full rounded-full bg-[#0D1235] flex items-center justify-center">
                      <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  {/* Level badge */}
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center text-[11px] font-bold text-white shadow-lg border-2 border-[#0D1235]">
                    {level}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white truncate">{displayName}</h3>
                  <p className="text-xs text-white/30 truncate">{user.email}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      <span className="text-xs text-yellow-200 font-mono">{starPower}</span>
                    </div>
                    {streak > 0 && (
                      <div className="flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-orange-400" />
                        <span className="text-xs text-orange-200">{streak}{t('profile.dStreak')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Level Progress */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-white/30 mb-1.5">
                  <span>Level {level}</span>
                  <span>Level {level + 1}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(levelProgress * 100, 100)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                <p className="text-[10px] text-white/20 mt-1 text-right">
                  {starPower - currentLevelThreshold} / {nextLevelThreshold - currentLevelThreshold} SP
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex px-6 gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    'flex-1 py-2 text-sm font-medium rounded-lg transition-colors relative',
                    activeTab === tab.id
                      ? 'text-white'
                      : 'text-white/30 hover:text-white/50'
                  )}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="profile-tab"
                      className="absolute inset-0 bg-white/5 rounded-lg -z-10"
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 pt-4" style={{ scrollbarWidth: 'none' }}>
              <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <StatCard
                        icon={<Clock className="w-4 h-4 text-blue-400" />}
                        label={t('profile.listeningTime')}
                        value={`${totalListeningMins}m`}
                        gradient="from-blue-500/10 to-cyan-500/10"
                      />
                      <StatCard
                        icon={<Heart className="w-4 h-4 text-pink-400" />}
                        label={t('profile.totalLikes')}
                        value={totalLikes.toString()}
                        gradient="from-pink-500/10 to-red-500/10"
                      />
                      <StatCard
                        icon={<MessageCircle className="w-4 h-4 text-purple-400" />}
                        label={t('profile.annotations')}
                        value={totalAnnotations.toString()}
                        gradient="from-purple-500/10 to-indigo-500/10"
                      />
                      <StatCard
                        icon={<Award className="w-4 h-4 text-yellow-400" />}
                        label={t('profile.achievements')}
                        value={`${unlockedAchievements.length}/${ACHIEVEMENTS.length}`}
                        gradient="from-yellow-500/10 to-orange-500/10"
                      />
                    </div>

                    {/* Recent Achievements */}
                    <div>
                      <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
                        {t('profile.recentAchievements')}
                      </h4>
                      {unlockedAchievements.length === 0 ? (
                        <div className="text-center py-6 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                          <Award className="w-8 h-8 text-white/10 mx-auto mb-2" />
                          <p className="text-sm text-white/20">{t('profile.noAchievements')}</p>
                          <p className="text-xs text-white/10 mt-1">
                            {t('profile.keepListening')}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {unlockedAchievements.slice(-3).reverse().map((achievementId) => {
                            const achievement = ACHIEVEMENTS.find((a) => a.id === achievementId);
                            if (!achievement) return null;
                            return (
                              <AchievementRow key={achievementId} achievement={achievement} unlocked />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'achievements' && (
                  <motion.div
                    key="achievements"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-2"
                  >
                    {ACHIEVEMENTS.map((achievement) => {
                      const unlocked = unlockedAchievements.includes(achievement.id);
                      return (
                        <AchievementRow
                          key={achievement.id}
                          achievement={achievement}
                          unlocked={unlocked}
                        />
                      );
                    })}
                  </motion.div>
                )}

                {activeTab === 'stats' && (
                  <motion.div
                    key="stats"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="space-y-3">
                      <StatRow
                        label={t('profile.totalStarPower')}
                        value={starPower.toString()}
                        icon={<Star className="w-4 h-4 text-yellow-400" />}
                      />
                      <StatRow
                        label={t('profile.currentLevel')}
                        value={`${t('profile.level')} ${level}`}
                        icon={<TrendingUp className="w-4 h-4 text-green-400" />}
                      />
                      <StatRow
                        label={t('profile.listeningTime')}
                        value={`${totalListeningMins} ${t('profile.minutes')}`}
                        icon={<Clock className="w-4 h-4 text-blue-400" />}
                      />
                      <StatRow
                        label={t('profile.emotionAnnotations')}
                        value={totalAnnotations.toString()}
                        icon={<MessageCircle className="w-4 h-4 text-purple-400" />}
                      />
                      <StatRow
                        label={t('profile.songsLiked')}
                        value={totalLikes.toString()}
                        icon={<Heart className="w-4 h-4 text-pink-400" />}
                      />
                      <StatRow
                        label={t('profile.currentStreak')}
                        value={`${streak} ${t('profile.days')}`}
                        icon={<Calendar className="w-4 h-4 text-orange-400" />}
                      />
                      <StatRow
                        label={t('profile.achievementsUnlocked')}
                        value={`${unlockedAchievements.length} / ${ACHIEVEMENTS.length}`}
                        icon={<Award className="w-4 h-4 text-yellow-400" />}
                      />
                    </div>

                    {/* Star Power Breakdown */}
                    <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-yellow-500/5 to-orange-500/5 border border-yellow-500/10">
                      <h4 className="text-xs font-medium text-yellow-300/60 uppercase tracking-wider mb-2">
                        {t('profile.howToEarn')}
                      </h4>
                      <div className="space-y-1.5 text-xs text-white/40">
                        <p>{t('profile.earnAnnotation')}</p>
                        <p>{t('profile.earnLike')}</p>
                        <p>{t('profile.earnStreak')}</p>
                        <p>{t('profile.earnAchievement')}</p>
                        <p>{t('profile.earnWelcome')}</p>
                      </div>
                    </div>

                    {/* §12.x — Data Export */}
                    <button
                      onClick={handleExport}
                      disabled={isExporting}
                      className={clsx(
                        'w-full flex items-center justify-center gap-2 py-3 rounded-xl border transition-all text-sm font-medium',
                        isExporting
                          ? 'bg-white/[0.02] border-white/[0.04] text-white/30 cursor-wait'
                          : 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20 text-blue-300 hover:from-blue-500/20 hover:to-purple-500/20 hover:text-blue-200'
                      )}
                      aria-label="导出个人数据 / Export your data"
                    >
                      <Download className={clsx('w-4 h-4', isExporting && 'animate-bounce')} aria-hidden="true" />
                      {isExporting ? '导出中... / Exporting...' : '导出我的数据 / Export My Data'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ==========================================
// Sub-components
// ==========================================

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  gradient: string;
}> = ({ icon, label, value, gradient }) => (
  <div
    className={clsx(
      'p-4 rounded-xl border border-white/[0.06] bg-gradient-to-br',
      gradient
    )}
  >
    <div className="flex items-center gap-2 mb-2">{icon}</div>
    <p className="text-xl font-bold text-white">{value}</p>
    <p className="text-xs text-white/30 mt-0.5">{label}</p>
  </div>
);

const AchievementRow: React.FC<{
  achievement: Achievement;
  unlocked: boolean;
}> = ({ achievement, unlocked }) => (
  <div
    className={clsx(
      'flex items-center gap-3 p-3 rounded-xl border transition-all',
      unlocked
        ? 'bg-white/[0.04] border-white/[0.08]'
        : 'bg-white/[0.01] border-white/[0.04] opacity-40'
    )}
  >
    <div
      className={clsx(
        'w-10 h-10 rounded-xl flex items-center justify-center text-lg',
        unlocked
          ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20'
          : 'bg-white/[0.03]'
      )}
    >
      {unlocked ? achievement.icon : '🔒'}
    </div>
    <div className="flex-1 min-w-0">
      <p
        className={clsx(
          'text-sm font-medium truncate',
          unlocked ? 'text-white' : 'text-white/40'
        )}
      >
        {achievement.name}
      </p>
      <p className="text-xs text-white/20 truncate">{achievement.description}</p>
    </div>
    {unlocked && (
      <div className="text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20 font-medium">
        ✓
      </div>
    )}
  </div>
);

const StatRow: React.FC<{
  label: string;
  value: string;
  icon: React.ReactNode;
}> = ({ label, value, icon }) => (
  <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/[0.02] transition-colors">
    <div className="flex items-center gap-3">
      {icon}
      <span className="text-sm text-white/50">{label}</span>
    </div>
    <span className="text-sm text-white font-medium font-mono tabular-nums">{value}</span>
  </div>
);