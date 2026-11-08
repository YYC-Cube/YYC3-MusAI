import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import {
  Trophy, Sparkles, Radio, Star, GitBranch, Award,
  ChevronRight, TrendingUp, MapPin, Clock, Zap,
  Music, Users, Palette, Film, X, MessageCircle, Heart,
  Shield, ShoppingBag, Swords, Disc3, ArrowLeftRight, Upload,
} from 'lucide-react';
import { useI18n } from '@yyc3/music-hooks';
import { apiFetch } from '@yyc3/music-utils';

interface MobileDiscoverHubProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  starPower: number;
  onOpenLeaderboard: () => void;
  onOpenRecommendations: () => void;
  onOpenSpaceTime: () => void;
  onOpenStarPower: () => void;
  onOpenIPMatrix: () => void;
  onOpenAchievements: () => void;
  onOpenMVCreator: () => void;
  onOpenCreationStudio: () => void;
  onOpenCommunity: () => void;
  onOpenComments: () => void;
  onOpenCopyright: () => void;
  onOpenShop: () => void;
  onOpenChallenge: () => void;
  onOpenAlbumStore: () => void;
  onOpenE2ESetup?: () => void;
  onOpenSecondaryMarket?: () => void;
  onOpenUpload?: () => void;
}

interface QuickStat {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
}

const FEATURE_CARDS = [
  {
    id: 'leaderboard',
    iconFn: Trophy,
    nameZh: '排行榜',
    nameEn: 'Leaderboard',
    descZh: 'Wilson Score 实时排名',
    descEn: 'Wilson Score live ranking',
    gradient: 'from-yellow-500/20 to-orange-500/20',
    borderColor: 'border-yellow-500/30',
    iconColor: 'text-yellow-400',
    action: 'onOpenLeaderboard',
  },
  {
    id: 'recommendations',
    iconFn: Sparkles,
    nameZh: '为你推荐',
    nameEn: 'For You',
    descZh: '个性化智能推荐',
    descEn: 'Personalized recommendations',
    gradient: 'from-purple-500/20 to-indigo-500/20',
    borderColor: 'border-purple-500/30',
    iconColor: 'text-purple-400',
    action: 'onOpenRecommendations',
  },
  {
    id: 'spacetime',
    iconFn: Radio,
    nameZh: '时空喊话',
    nameEn: 'Space-Time Call',
    descZh: '跨时空互动消息',
    descEn: 'Cross space-time messaging',
    gradient: 'from-cyan-500/20 to-blue-500/20',
    borderColor: 'border-cyan-500/30',
    iconColor: 'text-cyan-400',
    action: 'onOpenSpaceTime',
  },
  {
    id: 'ipmatrix',
    iconFn: GitBranch,
    nameZh: 'IP 矩阵',
    nameEn: 'IP Matrix',
    descZh: '创作协作 · 分支树',
    descEn: 'Collaborate & fork tree',
    gradient: 'from-emerald-500/20 to-teal-500/20',
    borderColor: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
    action: 'onOpenIPMatrix',
  },
  {
    id: 'achievements',
    iconFn: Award,
    nameZh: '成就徽章',
    nameEn: 'Achievements',
    descZh: '解锁创作里程碑',
    descEn: 'Unlock milestones',
    gradient: 'from-amber-500/20 to-yellow-500/20',
    borderColor: 'border-amber-500/30',
    iconColor: 'text-amber-400',
    action: 'onOpenAchievements',
  },
  {
    id: 'starpower',
    iconFn: Star,
    nameZh: '星力值',
    nameEn: 'Star Power',
    descZh: '星力经济体系',
    descEn: 'Star power economy',
    gradient: 'from-pink-500/20 to-rose-500/20',
    borderColor: 'border-pink-500/30',
    iconColor: 'text-pink-400',
    action: 'onOpenStarPower',
  },
  {
    id: 'creation',
    iconFn: Palette,
    nameZh: 'AI 创作',
    nameEn: 'AI Create',
    descZh: 'AI 歌词 + 编曲工坊',
    descEn: 'AI lyrics + composition',
    gradient: 'from-violet-500/20 to-purple-500/20',
    borderColor: 'border-violet-500/30',
    iconColor: 'text-violet-400',
    action: 'onOpenCreationStudio',
  },
  {
    id: 'mv',
    iconFn: Film,
    nameZh: 'MV 创作',
    nameEn: 'MV Creator',
    descZh: '视觉化音乐体验',
    descEn: 'Visual music experience',
    gradient: 'from-blue-500/20 to-indigo-500/20',
    borderColor: 'border-blue-500/30',
    iconColor: 'text-blue-400',
    action: 'onOpenMVCreator',
  },
  {
    id: 'challenge',
    iconFn: Swords,
    nameZh: '创作挑战赛',
    nameEn: 'Challenge',
    descZh: '每周主题 · 混合计分',
    descEn: 'Weekly themes · hybrid scoring',
    gradient: 'from-red-500/20 to-orange-500/20',
    borderColor: 'border-red-500/30',
    iconColor: 'text-red-400',
    action: 'onOpenChallenge',
  },
  {
    id: 'shop',
    iconFn: ShoppingBag,
    nameZh: '星力商城',
    nameEn: 'SP Shop',
    descZh: '虚拟好物兑换',
    descEn: 'Virtual item exchange',
    gradient: 'from-amber-500/20 to-yellow-500/20',
    borderColor: 'border-amber-500/30',
    iconColor: 'text-amber-400',
    action: 'onOpenShop',
  },
  {
    id: 'copyright',
    iconFn: Shield,
    nameZh: '版权认证',
    nameEn: 'Copyright',
    descZh: '原创保护 · 证书管理',
    descEn: 'Original protection & certs',
    gradient: 'from-emerald-500/20 to-green-500/20',
    borderColor: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
    action: 'onOpenCopyright',
  },
  {
    id: 'album-store',
    iconFn: Disc3,
    nameZh: '数字专辑',
    nameEn: 'Albums',
    descZh: '限量版专辑 · 数字收藏',
    descEn: 'Limited edition · digital collection',
    gradient: 'from-violet-500/20 to-purple-500/20',
    borderColor: 'border-violet-500/30',
    iconColor: 'text-violet-400',
    action: 'onOpenAlbumStore',
  },
  {
    id: 'e2ee-setup',
    iconFn: Shield,
    nameZh: '端到端加密',
    nameEn: 'E2E Encryption',
    descZh: '密钥管理 · 隐私保护',
    descEn: 'Key management · privacy',
    gradient: 'from-teal-500/20 to-cyan-500/20',
    borderColor: 'border-teal-500/30',
    iconColor: 'text-teal-400',
    action: 'onOpenE2ESetup',
  },
  {
    id: 'secondary-market',
    iconFn: ArrowLeftRight,
    nameZh: '二级市场',
    nameEn: 'Secondary Market',
    descZh: '数字专辑转售交易',
    descEn: 'Album resale trading',
    gradient: 'from-orange-500/20 to-amber-500/20',
    borderColor: 'border-orange-500/30',
    iconColor: 'text-orange-400',
    action: 'onOpenSecondaryMarket',
  },
  {
    id: 'upload',
    iconFn: Upload,
    nameZh: '上传音乐/视频',
    nameEn: 'Upload Music/Video',
    descZh: '上传你的音频或视频文件',
    descEn: 'Upload your audio or video files',
    gradient: 'from-cyan-500/20 to-blue-500/20',
    borderColor: 'border-cyan-500/30',
    iconColor: 'text-cyan-400',
    action: 'onOpenUpload',
  },
] as const;

export const MobileDiscoverHub: React.FC<MobileDiscoverHubProps> = ({
  isOpen,
  onClose,
  user,
  starPower,
  onOpenLeaderboard,
  onOpenRecommendations,
  onOpenSpaceTime,
  onOpenStarPower,
  onOpenIPMatrix,
  onOpenAchievements,
  onOpenMVCreator,
  onOpenCreationStudio,
  onOpenCommunity,
  onOpenComments,
  onOpenCopyright,
  onOpenShop,
  onOpenChallenge,
  onOpenAlbumStore,
  onOpenE2ESetup,
  onOpenSecondaryMarket,
  onOpenUpload,
}) => {
  const { lang } = useI18n();
  const [quickStats, setQuickStats] = useState<QuickStat[]>([]);

  const actionMap: Record<string, () => void> = {
    onOpenLeaderboard,
    onOpenRecommendations,
    onOpenSpaceTime,
    onOpenStarPower,
    onOpenIPMatrix,
    onOpenAchievements,
    onOpenMVCreator,
    onOpenCreationStudio,
    onOpenCopyright,
    onOpenShop,
    onOpenChallenge,
    onOpenAlbumStore,
    onOpenE2ESetup: onOpenE2ESetup || (() => {}),
    onOpenSecondaryMarket: onOpenSecondaryMarket || (() => {}),
    onOpenUpload: onOpenUpload || (() => {}),
  };

  // Fetch quick stats when opened
  useEffect(() => {
    if (!isOpen || !user) return;
    const stats: QuickStat[] = [
      { label: lang === 'zh' ? '星力值' : 'Star Power', value: `${starPower}`, icon: Star, color: 'text-yellow-400' },
    ];
    setQuickStats(stats);

    // Fetch achievement count
    apiFetch<{ totalUnlocked?: number; totalAchievements?: number }>(
      `/achievements/${user.id}`
    ).then(data => {
      if (data?.totalUnlocked !== undefined) {
        setQuickStats(prev => [
          ...prev.filter(s => s.icon !== Award),
          {
            label: lang === 'zh' ? '成就' : 'Badges',
            value: `${data.totalUnlocked}/${data.totalAchievements}`,
            icon: Award,
            color: 'text-amber-400',
          },
        ]);
      }
    }).catch(() => {});
  }, [isOpen, user, starPower, lang]);

  const handleCardTap = useCallback((actionKey: string) => {
    const fn = actionMap[actionKey];
    if (fn) {
      onClose();
      // Small delay so close animation starts first
      setTimeout(fn, 100);
    }
  }, [actionMap, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          className="fixed inset-0 z-[60] bg-[#0A0E2F] overflow-y-auto"
          style={{ paddingBottom: 'calc(52px + env(safe-area-inset-bottom, 0px))' }}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-[#0A0E2F]/95 backdrop-blur-xl border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-white">
                {lang === 'zh' ? '发现' : 'Discover'}
              </h1>
              <p className="text-xs text-white/40 mt-0.5">
                {lang === 'zh' ? '探索 D-Music 全部功能' : 'Explore all D-Music features'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>

          {/* Quick Stats Banner */}
          {user && quickStats.length > 0 && (
            <div className="px-4 py-3">
              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
                {quickStats.map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 flex-shrink-0"
                    >
                      <Icon className={clsx('w-4 h-4', stat.color)} />
                      <div>
                        <p className="text-white text-sm font-semibold tabular-nums">{stat.value}</p>
                        <p className="text-white/40 text-[10px]">{stat.label}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Feature Cards Grid */}
          <div className="px-4 pb-6">
            <div className="grid grid-cols-2 gap-3">
              {FEATURE_CARDS.map((card, i) => {
                const Icon = card.iconFn;
                return (
                  <motion.button
                    key={card.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + i * 0.04, type: 'spring', damping: 20 }}
                    onClick={() => handleCardTap(card.action)}
                    className={clsx(
                      'relative flex flex-col items-start p-4 rounded-2xl border transition-all active:scale-[0.97]',
                      `bg-gradient-to-br ${card.gradient}`,
                      card.borderColor
                    )}
                  >
                    <div className={clsx(
                      'w-10 h-10 rounded-xl bg-white/[0.08] flex items-center justify-center mb-3',
                    )}>
                      <Icon className={clsx('w-5 h-5', card.iconColor)} />
                    </div>
                    <p className="text-white text-sm font-semibold text-left">
                      {lang === 'zh' ? card.nameZh : card.nameEn}
                    </p>
                    <p className="text-white/40 text-[11px] mt-0.5 text-left leading-tight">
                      {lang === 'zh' ? card.descZh : card.descEn}
                    </p>
                    <ChevronRight className="absolute top-4 right-3 w-4 h-4 text-white/15" />
                  </motion.button>
                );
              })}
            </div>

            {/* Quick Actions Row */}
            <div className="mt-4">
              <p className="text-white/30 text-xs uppercase tracking-wider mb-2 px-1">
                {lang === 'zh' ? '快捷入口' : 'Quick Access'}
              </p>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => { onClose(); setTimeout(onOpenCommunity, 100); }}
                  className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 flex-shrink-0 active:bg-white/[0.08] transition-colors"
                >
                  <Users className="w-4 h-4 text-green-400" />
                  <span className="text-white/70 text-xs whitespace-nowrap">
                    {lang === 'zh' ? '社区动态' : 'Community'}
                  </span>
                </button>
                <button
                  onClick={() => { onClose(); setTimeout(onOpenComments, 100); }}
                  className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 flex-shrink-0 active:bg-white/[0.08] transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-pink-400" />
                  <span className="text-white/70 text-xs whitespace-nowrap">
                    {lang === 'zh' ? '歌曲评论' : 'Comments'}
                  </span>
                </button>
              </div>
            </div>

            {/* Not logged in prompt */}
            {!user && (
              <div className="mt-6 text-center py-6 bg-white/[0.02] rounded-2xl border border-white/[0.06]">
                <Zap className="w-8 h-8 text-purple-400/50 mx-auto mb-2" />
                <p className="text-white/50 text-sm">
                  {lang === 'zh' ? '登录解锁全部功能' : 'Sign in to unlock all features'}
                </p>
                <p className="text-white/25 text-xs mt-1">
                  {lang === 'zh'
                    ? '成就追踪 · 星力值 · 个性化推荐'
                    : 'Achievements · Star Power · Personalized'
                  }
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
