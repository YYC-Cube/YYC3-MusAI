import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Star, Music, Heart, Play, Award,
  Calendar, Sparkles, ExternalLink, BarChart3,
  Users, ArrowLeft, ChevronRight, GitFork, GitBranch,
} from 'lucide-react';
import { clsx } from 'clsx';
import { apiFetch } from '../lib/supabase';
import { useI18n } from '../hooks/useI18n';
import type { UserProfileData } from '../playlistData';

interface IPMatrixPanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  profile: UserProfileData | null;
  starPower: number;
  onOpenCreationStudio: () => void;
}

interface SharedWork {
  workId: string;
  title: string;
  theme: string;
  lyrics: string[];
  mode: string;
  createdAt: number;
  sharedAt: number;
  userName: string;
  userId?: string;
  likes: number;
  plays: number;
  forkedFrom?: { workId: string; author: string; forkedAt: number } | null;
}

interface ForkNode {
  workId: string;
  author: string;
  forkedAt: number;
}

interface CreatorInfo {
  userName: string;
  userId?: string;
  works: number;
  totalLikes: number;
  latestWork: number;
}

const THEME_COLORS: Record<string, string> = {
  happy: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/20',
  sad: 'from-blue-500/20 to-indigo-500/20 border-blue-500/20',
  energetic: 'from-orange-500/20 to-red-500/20 border-orange-500/20',
  calm: 'from-cyan-500/20 to-teal-500/20 border-cyan-500/20',
  love: 'from-pink-500/20 to-rose-500/20 border-pink-500/20',
};

const THEME_EMOJIS: Record<string, string> = {
  happy: '😊', sad: '😢', energetic: '⚡', calm: '🌙', love: '❤️',
};

const CREATOR_LEVELS = [
  { min: 0, label: '新手创作者', labelEn: 'Beginner', icon: '🌱' },
  { min: 3, label: '铜牌创作者', labelEn: 'Bronze Creator', icon: '🥉' },
  { min: 8, label: '银牌创作者', labelEn: 'Silver Creator', icon: '🥈' },
  { min: 15, label: '金牌创作者', labelEn: 'Gold Creator', icon: '🥇' },
  { min: 30, label: '星级创作者', labelEn: 'Star Creator', icon: '⭐' },
];

function getCreatorLevel(workCount: number) {
  let result = CREATOR_LEVELS[0];
  for (const lvl of CREATOR_LEVELS) {
    if (workCount >= lvl.min) result = lvl;
  }
  return result;
}

export const IPMatrixPanel: React.FC<IPMatrixPanelProps> = ({
  isOpen, onClose, user, profile, starPower, onOpenCreationStudio,
}) => {
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<'profile' | 'portfolio' | 'analytics' | 'explore'>('profile');
  const [works, setWorks] = useState<SharedWork[]>([]);
  const [loading, setLoading] = useState(false);

  // Explore creators state
  const [creators, setCreators] = useState<CreatorInfo[]>([]);
  const [creatorsLoading, setCreatorsLoading] = useState(false);
  const [viewingCreator, setViewingCreator] = useState<string | null>(null);
  const [creatorWorks, setCreatorWorks] = useState<SharedWork[]>([]);
  const [creatorWorksLoading, setCreatorWorksLoading] = useState(false);

  // Fork state
  const [forkingWorkId, setForkingWorkId] = useState<string | null>(null);
  const [forkChain, setForkChain] = useState<ForkNode[]>([]);
  const [showForkTree, setShowForkTree] = useState<string | null>(null);
  const [forkTreeLoading, setForkTreeLoading] = useState(false);

  const fetchCreators = useCallback(async () => {
    setCreatorsLoading(true);
    try {
      const data = await apiFetch<{ creators: CreatorInfo[] }>('/creators');
      if (data?.creators) setCreators(data.creators);
    } catch (err) { console.error('Creators fetch error:', err); }
    finally { setCreatorsLoading(false); }
  }, []);

  const fetchCreatorWorks = useCallback(async (userName: string) => {
    setCreatorWorksLoading(true);
    try {
      const data = await apiFetch<{ works: SharedWork[] }>(`/creators/${encodeURIComponent(userName)}/works`);
      if (data?.works) setCreatorWorks(data.works);
    } catch (err) { console.error('Creator works error:', err); }
    finally { setCreatorWorksLoading(false); }
  }, []);

  const fetchWorks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ works: SharedWork[] }>('/shared-works');
      if (data?.works) {
        // Filter to show only this user's works
        const myWorks = user
          ? data.works.filter(w => w.userName === (user.email?.split('@')[0] || '') || w.userId === user.id)
          : data.works;
        setWorks(myWorks);
      }
    } catch (err) { console.error('IP Matrix fetch error:', err); }
    finally { setLoading(false); }
  }, [user]);

  const handleFork = useCallback(async (work: SharedWork) => {
    if (!user) return;
    setForkingWorkId(work.workId);
    try {
      const result = await apiFetch<{ success: boolean; forkedWork: SharedWork }>('/works/fork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalWorkId: work.workId,
          originalAuthor: work.userName,
          userId: user.id,
          userName: user.email?.split('@')[0] || 'User',
          title: `${work.title} (${lang === 'zh' ? '改编' : 'Remix'})`,
          theme: work.theme,
          lyrics: work.lyrics,
        }),
      });
      if (result?.success) {
        fetchWorks();
        if (viewingCreator) fetchCreatorWorks(viewingCreator);
        // Track achievement: create_work for forker + receive_fork for original author
        apiFetch(`/achievements/${user.id}/track`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create_work' }),
        }).catch(() => {});
        if (work.userId) {
          apiFetch(`/achievements/${work.userId}/track`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'receive_fork' }),
          }).catch(() => {});
        }
      }
    } catch (err) { console.error('Fork error:', err); }
    finally { setForkingWorkId(null); }
  }, [user, fetchWorks, viewingCreator, fetchCreatorWorks, lang]);

  const fetchForkChain = useCallback(async (workId: string) => {
    setForkTreeLoading(true);
    try {
      const data = await apiFetch<{ forks: ForkNode[]; count: number }>(`/works/${workId}/forks`);
      if (data?.forks) setForkChain(data.forks);
    } catch (err) { console.error('Fork chain error:', err); setForkChain([]); }
    finally { setForkTreeLoading(false); }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchWorks();
      if (tab === 'explore') fetchCreators();
    }
  }, [isOpen, tab, fetchWorks, fetchCreators]);

  const totalLikes = works.reduce((acc, w) => acc + (w.likes || 0), 0);
  const totalPlays = works.reduce((acc, w) => acc + (w.plays || 0), 0);
  const creatorLevel = getCreatorLevel(works.length);
  const displayName = profile?.displayName || user?.email?.split('@')[0] || 'Creator';
  const joinedDate = profile?.joinedAt
    ? new Date(profile.joinedAt).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'short' })
    : '';

  // Influence score: combination of works, likes, and starPower
  const influenceScore = Math.round(
    works.length * 100 + totalLikes * 50 + totalPlays * 10 + starPower * 0.5
  );
  const engagementRate = works.length > 0
    ? Math.round(((totalLikes + totalPlays) / Math.max(works.length, 1)) * 10) / 10
    : 0;

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
            className="fixed right-0 top-0 bottom-0 z-[61] w-full max-w-lg bg-[#0D1235]/95 backdrop-blur-2xl border-l border-white/10 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center">
                  <Sparkles className="w-4.5 h-4.5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm leading-tight">{t('ipmatrix.title')}</h3>
                  <p className="text-white/30 text-xs">{t('ipmatrix.subtitle')}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab bar */}
            <div className="flex p-2 mx-4 mt-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
              {[
                { id: 'profile' as const, label: t('ipmatrix.creatorProfile'), icon: Star },
                { id: 'portfolio' as const, label: t('ipmatrix.portfolio'), icon: Music },
                { id: 'explore' as const, label: t('ipmatrix.explore'), icon: Users },
                { id: 'analytics' as const, label: t('ipmatrix.analytics'), icon: BarChart3 },
              ].map(tb => (
                <button
                  key={tb.id}
                  onClick={() => setTab(tb.id)}
                  className={clsx(
                    'flex-1 py-2 px-2 rounded-lg text-[11px] font-medium transition-all flex items-center justify-center gap-1',
                    tab === tb.id ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/20' : 'text-white/40 hover:text-white/60'
                  )}
                >
                  <tb.icon className="w-3 h-3" />
                  {tb.label}
                </button>
              ))}
            </div>

            {!user ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-white/30 text-sm">{t('ipmatrix.signInRequired')}</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: 'none' }}>
                {tab === 'profile' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    {/* Creator Card */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10 border border-indigo-500/15 relative overflow-hidden">
                      <div className="absolute -top-8 -right-8 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl" />
                      <div className="relative flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 flex-shrink-0">
                          <div className="w-full h-full rounded-full bg-[#0D1235] flex items-center justify-center">
                            <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">
                              {displayName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-white truncate">{displayName}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs">{creatorLevel.icon}</span>
                            <span className="text-xs text-indigo-300/70">
                              {lang === 'zh' ? creatorLevel.label : creatorLevel.labelEn}
                            </span>
                          </div>
                          {joinedDate && (
                            <p className="text-[10px] text-white/20 mt-1 flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5" />
                              {t('ipmatrix.memberSince')} {joinedDate}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                        <Music className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
                        <p className="text-lg font-bold text-white font-mono tabular-nums">{works.length}</p>
                        <p className="text-[10px] text-white/25">{t('ipmatrix.totalWorks')}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                        <Heart className="w-4 h-4 text-pink-400 mx-auto mb-1" />
                        <p className="text-lg font-bold text-white font-mono tabular-nums">{totalLikes}</p>
                        <p className="text-[10px] text-white/25">{t('ipmatrix.totalLikes')}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                        <Star className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                        <p className="text-lg font-bold text-white font-mono tabular-nums">{starPower}</p>
                        <p className="text-[10px] text-white/25">SP</p>
                      </div>
                    </div>

                    {/* Influence Score */}
                    <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500/5 to-indigo-500/5 border border-purple-500/10">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-white/40">{t('ipmatrix.influence')}</p>
                          <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-indigo-300 font-mono tabular-nums">
                            {influenceScore.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-white/40">{t('ipmatrix.engagementRate')}</p>
                          <p className="text-lg font-bold text-indigo-300 font-mono tabular-nums">{engagementRate}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {tab === 'portfolio' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider">
                        {t('ipmatrix.sharedWorks')} ({works.length})
                      </h4>
                      <button
                        onClick={() => { onClose(); onOpenCreationStudio(); }}
                        className="flex items-center gap-1 text-[10px] text-indigo-400/60 hover:text-indigo-400 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {lang === 'zh' ? '创作工坊' : 'Studio'}
                      </button>
                    </div>

                    {loading ? (
                      <div className="flex justify-center py-12">
                        <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                      </div>
                    ) : works.length === 0 ? (
                      <div className="text-center py-12">
                        <Music className="w-10 h-10 text-white/10 mx-auto mb-3" />
                        <p className="text-white/30 text-sm">{t('ipmatrix.noWorks')}</p>
                        <p className="text-white/15 text-xs mt-1">{t('ipmatrix.startCreating')}</p>
                        <button
                          onClick={() => { onClose(); onOpenCreationStudio(); }}
                          className="mt-4 px-4 py-2 rounded-xl bg-indigo-500/20 text-indigo-300 text-xs font-medium border border-indigo-500/20 hover:bg-indigo-500/30 transition-colors"
                        >
                          {lang === 'zh' ? '开始创作' : 'Start Creating'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {works.map(work => {
                          const themeClass = THEME_COLORS[work.theme] || THEME_COLORS.happy;
                          const emoji = THEME_EMOJIS[work.theme] || '🎵';
                          return (
                            <motion.div
                              key={work.workId}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={clsx(
                                'p-3 rounded-xl bg-gradient-to-r border transition-colors hover:brightness-110',
                                themeClass
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-lg flex-shrink-0">
                                  {emoji}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white truncate">{work.title}</p>
                                  <p className="text-[10px] text-white/25 mt-0.5">
                                    {work.mode === 'quick' ? (lang === 'zh' ? '极简模式' : 'Quick') : work.mode === 'master' ? (lang === 'zh' ? '大师模式' : 'Master') : work.mode}
                                    {' · '}
                                    {work.lyrics?.length || 0} {lang === 'zh' ? '行歌词' : 'lines'}
                                  </p>
                                  <div className="flex items-center gap-3 mt-1.5">
                                    <span className="flex items-center gap-0.5 text-[10px] text-white/25">
                                      <Heart className="w-2.5 h-2.5" /> {work.likes || 0}
                                    </span>
                                    <span className="text-[10px] text-white/15">
                                      {new Date(work.createdAt).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}

                {tab === 'analytics' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    {/* Creator Level Progress */}
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                      <h4 className="text-xs text-white/40 mb-3">{t('ipmatrix.creatorLevel')}</h4>
                      <div className="space-y-2">
                        {CREATOR_LEVELS.map((lvl, idx) => {
                          const isActive = works.length >= lvl.min;
                          const nextMin = CREATOR_LEVELS[idx + 1]?.min || lvl.min + 10;
                          const progress = isActive ? Math.min(((works.length - lvl.min) / (nextMin - lvl.min)) * 100, 100) : 0;
                          return (
                            <div key={lvl.min} className={clsx('flex items-center gap-2', !isActive && 'opacity-30')}>
                              <span className="text-sm w-6 text-center">{lvl.icon}</span>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-[11px] text-white/60">
                                    {lang === 'zh' ? lvl.label : lvl.labelEn}
                                  </span>
                                  <span className="text-[9px] text-white/20 font-mono tabular-nums">{lvl.min}+</span>
                                </div>
                                <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                                  {isActive && (
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${progress}%` }}
                                      transition={{ duration: 0.6 }}
                                      className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-purple-500"
                                    />
                                  )}
                                </div>
                              </div>
                              {isActive && <Award className="w-3 h-3 text-indigo-400" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Stats breakdown */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/10">
                        <p className="text-[10px] text-white/25 mb-1">{t('ipmatrix.influence')}</p>
                        <p className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300 font-mono tabular-nums">
                          {influenceScore.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500/5 to-rose-500/5 border border-pink-500/10">
                        <p className="text-[10px] text-white/25 mb-1">{t('ipmatrix.engagementRate')}</p>
                        <p className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-rose-300 font-mono tabular-nums">
                          {engagementRate}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500/5 to-amber-500/5 border border-yellow-500/10">
                        <p className="text-[10px] text-white/25 mb-1">{t('ipmatrix.totalLikes')}</p>
                        <p className="text-xl font-bold text-yellow-300 font-mono tabular-nums">{totalLikes}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/5 to-teal-500/5 border border-cyan-500/10">
                        <p className="text-[10px] text-white/25 mb-1">{t('ipmatrix.totalWorks')}</p>
                        <p className="text-xl font-bold text-cyan-300 font-mono tabular-nums">{works.length}</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {tab === 'explore' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    {viewingCreator ? (
                      <>
                        {/* Back + Creator name */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setViewingCreator(null); setCreatorWorks([]); }}
                            className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            {t('ipmatrix.back')}
                          </button>
                          <span className="text-sm font-semibold text-white/80">{viewingCreator}{t('ipmatrix.creatorPortfolio')}</span>
                        </div>
                        {creatorWorksLoading ? (
                          <div className="flex justify-center py-12">
                            <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                          </div>
                        ) : creatorWorks.length === 0 ? (
                          <div className="text-center py-12">
                            <Music className="w-10 h-10 text-white/10 mx-auto mb-3" />
                            <p className="text-white/30 text-sm">{t('ipmatrix.noWorks')}</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {creatorWorks.map(work => {
                              const themeClass = THEME_COLORS[work.theme] || THEME_COLORS.happy;
                              return (
                                <div key={work.workId} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors">
                                  <div className="flex items-start justify-between">
                                    <div className="min-w-0 flex-1">
                                      <h4 className="text-sm font-medium text-white/80 truncate">{work.title}</h4>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className={clsx('text-[9px] px-1.5 py-0.5 rounded-full border', themeClass)}>
                                          {work.theme}
                                        </span>
                                        <span className="text-[10px] text-white/20">
                                          {new Date(work.createdAt).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                      </div>
                                      {work.forkedFrom && (
                                        <p className="text-[9px] text-purple-400/50 mt-1 flex items-center gap-0.5">
                                          <GitFork className="w-2.5 h-2.5" /> {t('ipmatrix.forkedFrom')} {work.forkedFrom.author}
                                        </p>
                                      )}
                                      {work.lyrics && work.lyrics.length > 0 && (
                                        <p className="text-[10px] text-white/25 mt-1.5 italic line-clamp-2">{work.lyrics[0]}</p>
                                      )}
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5 ml-2 flex-shrink-0">
                                      <div className="flex items-center gap-2">
                                        <span className="flex items-center gap-0.5 text-[10px] text-pink-400/50">
                                          <Heart className="w-2.5 h-2.5" /> {work.likes || 0}
                                        </span>
                                        <span className="flex items-center gap-0.5 text-[10px] text-white/20">
                                          <Play className="w-2.5 h-2.5" /> {work.plays || 0}
                                        </span>
                                      </div>
                                      {/* Fork + Tree buttons */}
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => handleFork(work)}
                                          disabled={forkingWorkId === work.workId || !user}
                                          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] bg-purple-500/10 border border-purple-500/15 text-purple-300/70 hover:bg-purple-500/20 hover:text-purple-200 transition-all disabled:opacity-30"
                                          title={t('ipmatrix.forkWork')}
                                        >
                                          <GitFork className="w-2.5 h-2.5" />
                                          {forkingWorkId === work.workId ? t('ipmatrix.forking') : t('ipmatrix.forkWork')}
                                        </button>
                                        <button
                                          onClick={() => {
                                            if (showForkTree === work.workId) { setShowForkTree(null); setForkChain([]); }
                                            else { setShowForkTree(work.workId); fetchForkChain(work.workId); }
                                          }}
                                          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] bg-white/[0.04] border border-white/[0.08] text-white/30 hover:text-white/50 transition-all"
                                          title={t('ipmatrix.forkTree')}
                                        >
                                          <GitBranch className="w-2.5 h-2.5" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                  {/* Fork tree inline */}
                                  {showForkTree === work.workId && (
                                    <div className="mt-2 pt-2 border-t border-white/[0.06]">
                                      <p className="text-[9px] text-white/30 mb-1.5 flex items-center gap-1">
                                        <GitBranch className="w-2.5 h-2.5" /> {t('ipmatrix.forkTree')}
                                      </p>
                                      {forkTreeLoading ? (
                                        <div className="flex justify-center py-2">
                                          <div className="w-4 h-4 border border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                                        </div>
                                      ) : forkChain.length === 0 ? (
                                        <p className="text-[9px] text-white/15 text-center py-1">{lang === 'zh' ? '暂无改编分支' : 'No forks yet'}</p>
                                      ) : (
                                        <div className="space-y-1 pl-2">
                                          {forkChain.map((node, idx) => (
                                            <div key={node.workId} className="flex items-center gap-1.5 text-[9px]">
                                              <div className="flex flex-col items-center w-3">
                                                {idx < forkChain.length - 1 && <div className="w-px h-3 bg-purple-500/20" />}
                                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500/40 flex-shrink-0" />
                                                {idx < forkChain.length - 1 && <div className="w-px h-3 bg-purple-500/20" />}
                                              </div>
                                              <span className="text-white/40">{node.author}</span>
                                              <span className="text-white/15">
                                                {new Date(node.forkedAt).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider">{t('ipmatrix.allCreators')}</h4>
                        {creatorsLoading ? (
                          <div className="flex justify-center py-12">
                            <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                          </div>
                        ) : creators.length === 0 ? (
                          <div className="text-center py-12">
                            <Users className="w-10 h-10 text-white/10 mx-auto mb-3" />
                            <p className="text-white/30 text-sm">{lang === 'zh' ? '暂无其他创作者' : 'No creators yet'}</p>
                            <p className="text-white/15 text-xs mt-1">{lang === 'zh' ? '分享作品后即可在此展示' : 'Share works to appear here'}</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {creators.map((creator, idx) => (
                              <button
                                key={creator.userName + idx}
                                onClick={() => {
                                  setViewingCreator(creator.userName);
                                  fetchCreatorWorks(creator.userName);
                                }}
                                className="w-full p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] hover:border-indigo-500/20 transition-all text-left group"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 flex-shrink-0">
                                    <div className="w-full h-full rounded-full bg-[#0D1235] flex items-center justify-center">
                                      <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">
                                        {creator.userName.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h4 className="text-sm font-medium text-white/80 truncate">{creator.userName}</h4>
                                    <div className="flex items-center gap-3 mt-0.5">
                                      <span className="text-[10px] text-white/25">
                                        {creator.works} {t('ipmatrix.works')}
                                      </span>
                                      <span className="flex items-center gap-0.5 text-[10px] text-pink-400/40">
                                        <Heart className="w-2.5 h-2.5" /> {creator.totalLikes}
                                      </span>
                                    </div>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-white/15 group-hover:text-indigo-400/50 transition-colors flex-shrink-0" />
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};