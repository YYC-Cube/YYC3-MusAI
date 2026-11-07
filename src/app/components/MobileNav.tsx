import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import {
  Music, Users, Wand2, BarChart3, UserCircle,
  ListMusic, MessageCircle, Compass, Mic,
  GitBranch, Heart, Brain, Radio,
} from 'lucide-react';
import { useI18n } from '../hooks/useI18n';

interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isPlaying: boolean;
  audioEnergy: number;
  hasUser: boolean;
  onMicTap?: () => void;
  isListening?: boolean;
  unreadNotifications?: number;
  onOpenForkTree?: () => void;
  onOpenMHeart?: () => void;
  onOpenSmartPlaylist?: () => void;
  onOpenLiveSession?: () => void;
}

const TABS = [
  { id: 'player', iconFn: Music, labelZh: '播放', labelEn: 'Play' },
  { id: 'community', iconFn: Users, labelZh: '社区', labelEn: 'Social' },
  { id: 'create', iconFn: Wand2, labelZh: '创作', labelEn: 'Create' },
  { id: 'discover', iconFn: Compass, labelZh: '发现', labelEn: 'Discover' },
  { id: 'me', iconFn: UserCircle, labelZh: '我的', labelEn: 'Me' },
];

const quickBtnCls = "flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-medium bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] transition-all flex-shrink-0 whitespace-nowrap";

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  onTabChange,
  isPlaying,
  audioEnergy,
  hasUser,
  onMicTap,
  isListening,
  unreadNotifications = 0,
  onOpenForkTree,
  onOpenMHeart,
  onOpenSmartPlaylist,
  onOpenLiveSession,
}) => {
  const { lang } = useI18n();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-[52] bg-[#0A0E2F]/95 backdrop-blur-2xl border-t border-white/[0.06]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* §20/§21/§25/§26 — Quick action row (horizontally scrollable) */}
      <div className="flex items-center gap-2 px-4 pt-2 pb-0.5 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
        <button onClick={onOpenForkTree} className={clsx(quickBtnCls, 'text-white/30 hover:text-cyan-400/70')} aria-label={lang === 'zh' ? '协作分支树' : 'Fork Tree'}>
          <GitBranch className="w-3 h-3" />
          <span>{lang === 'zh' ? '分支树' : 'Forks'}</span>
        </button>
        {hasUser && (
          <button onClick={onOpenMHeart} className={clsx(quickBtnCls, 'text-white/30 hover:text-pink-400/70')} aria-label="M❤️值">
            <Heart className="w-3 h-3" />
            <span>M❤️</span>
          </button>
        )}
        {hasUser && (
          <button onClick={onOpenSmartPlaylist} className={clsx(quickBtnCls, 'text-white/30 hover:text-indigo-400/70')} aria-label={lang === 'zh' ? '智能歌单' : 'Smart'}>
            <Brain className="w-3 h-3" />
            <span>{lang === 'zh' ? '智能歌单' : 'Smart'}</span>
          </button>
        )}
        {hasUser && (
          <button onClick={onOpenLiveSession} className={clsx(quickBtnCls, 'text-white/30 hover:text-green-400/70')} aria-label={lang === 'zh' ? '实时互动' : 'Live'}>
            <Radio className="w-3 h-3" />
            <span>{lang === 'zh' ? '实时' : 'Live'}</span>
          </button>
        )}
      </div>

      {/* Main tab bar */}
      <div className="flex items-center justify-around px-2 pt-2 pb-1.5">
        {TABS.map((tab) => {
          const Icon = tab.iconFn;
          const isActive = activeTab === tab.id;
          const isPlayerActive = tab.id === 'player' && isPlaying;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={clsx(
                'flex flex-col items-center justify-center gap-0.5 min-w-[48px] w-16 py-1.5 rounded-xl transition-all relative',
                isActive ? 'text-purple-400' : 'text-white/30'
              )}
            >
              {/* Active glow */}
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-active"
                  className="absolute -top-1.5 w-8 h-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                  transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                />
              )}

              <div className="relative">
                <Icon className={clsx('w-5 h-5', isActive && 'drop-shadow-[0_0_6px_rgba(139,92,246,0.5)]')} />
                {/* Playing pulse on player tab */}
                {isPlayerActive && (
                  <motion.div
                    className="absolute -inset-1 rounded-full border border-purple-500/30"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
                {/* Notification badge on Me tab */}
                {tab.id === 'me' && unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-pink-500 text-white text-[7px] font-bold flex items-center justify-center">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </div>

              <span className={clsx(
                'text-[9px] font-medium leading-none',
                isActive ? 'text-purple-400' : 'text-white/25'
              )}>
                {lang === 'zh' ? tab.labelZh : tab.labelEn}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
