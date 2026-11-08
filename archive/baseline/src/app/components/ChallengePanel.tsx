import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Swords, Clock, Trophy, Star, Users, Heart, Send, ChevronRight, Sparkles, Tag, Medal, Crown, Award } from 'lucide-react';
import { clsx } from 'clsx';
import { apiFetch } from '../lib/supabase';
import { useI18n } from '../hooks/useI18n';

interface ChallengePanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onOpenCreationStudio: () => void;
}

interface Challenge {
  id: string;
  titleZh: string;
  titleEn: string;
  descZh: string;
  descEn: string;
  tags: string[];
  startsAt: number;
  endsAt: number;
  judgeWeight: number;
  communityWeight: number;
  entryCount: number;
  prizes: { rank: number; rewardZh: string; rewardEn: string; sp: number }[];
}

interface ChallengeEntry {
  id: string;
  userId: string;
  userName: string;
  workTitle: string;
  workTheme: string;
  submittedAt: number;
  judgeScore: number;
  communityVotes: number;
  communityScoreNorm: number;
  totalScore: number;
  aiBreakdown?: {
    themeRelevance: number;
    emotionalDepth: number;
    creativity: number;
    technicalQuality: number;
  };
  aiFeedback?: string;
  aiProvider?: string;
}

const RANK_ICONS = [Crown, Medal, Award];
const RANK_COLORS = ['text-yellow-400', 'text-gray-300', 'text-amber-600'];

export const ChallengePanel: React.FC<ChallengePanelProps> = ({
  isOpen, onClose, user, onOpenCreationStudio,
}) => {
  const { lang } = useI18n();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [entries, setEntries] = useState<ChallengeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'overview' | 'leaderboard' | 'submit' | 'champions'>('overview');
  const [submitTitle, setSubmitTitle] = useState('');
  const [submitTheme, setSubmitTheme] = useState('');
  const [submitLyrics, setSubmitLyrics] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);
  const [voting, setVoting] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [serverOffset, setServerOffset] = useState(0);
  // §23.x — Champions state
  const [champions, setChampions] = useState<any[]>([]);
  // §24.x — Auto-finalize notification
  const [finalizeNotice, setFinalizeNotice] = useState<any>(null);

  const fetchChampions = useCallback(async () => {
    try {
      const data = await apiFetch<{ champions: any[] }>('/challenges/champions');
      if (data?.champions) setChampions(data.champions);
    } catch (err) { console.error('Champions fetch error:', err); }
  }, []);

  const fetchChallenge = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ challenge: Challenge; serverTime?: number; autoFinalizeResult?: any }>('/challenges/active');
      // §24.x — Show auto-finalize result if challenge just ended
      if (data?.autoFinalizeResult?.finalized) {
        setFinalizeNotice(data.autoFinalizeResult);
      }
      if (data?.challenge) {
        setChallenge(data.challenge);
        if (data.serverTime) {
          setServerOffset(data.serverTime - Date.now());
        }
        // Fetch entries
        const entriesData = await apiFetch<{ entries: ChallengeEntry[] }>(`/challenges/${data.challenge.id}/entries`);
        if (entriesData?.entries) {
          setEntries(entriesData.entries);
          if (user) setHasSubmitted(entriesData.entries.some(e => e.userId === user.id));
        }
      }
    } catch (err) { console.error('Challenge fetch error:', err); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => {
    if (isOpen) { fetchChallenge(); fetchChampions(); }
  }, [isOpen, fetchChallenge, fetchChampions]);
  
  // Force re-render every minute to update countdown
  useEffect(() => {
    if (!isOpen || !challenge) return;
    const timer = setInterval(() => {
      // Just trigger re-render
      setServerOffset(prev => prev); 
    }, 60000);
    return () => clearInterval(timer);
  }, [isOpen, challenge]);

  const handleSubmit = async () => {
    if (!user || !challenge || !submitTitle.trim() || submitting) return;
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const result = await apiFetch<any>(`/challenges/${challenge.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userName: user.email?.split('@')[0] || 'User',
          workTitle: submitTitle.trim(),
          workTheme: submitTheme.trim(),
          workLyrics: submitLyrics.split('\n').filter(l => l.trim()),
        }),
      });
      if (result?.success) {
        setSubmitResult({ success: true, message: lang === 'zh' ? '提交成功!' : 'Submitted!' });
        setHasSubmitted(true);
        setSubmitTitle('');
        setSubmitTheme('');
        setSubmitLyrics('');
        fetchChallenge();
        setTab('leaderboard');
      } else {
        setSubmitResult({
          success: false,
          message: result?.alreadySubmitted
            ? (lang === 'zh' ? '你已提交过作品' : 'Already submitted')
            : (result?.error || (lang === 'zh' ? '提交失败' : 'Submit failed')),
        });
      }
    } catch (err) { setSubmitResult({ success: false, message: lang === 'zh' ? '网络错误' : 'Network error' }); }
    finally { setSubmitting(false); setTimeout(() => setSubmitResult(null), 3000); }
  };

  const handleVote = async (entryId: string) => {
    if (!user || !challenge || voting || hasVoted) return;
    setVoting(entryId);
    try {
      const result = await apiFetch<any>(`/challenges/${challenge.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, entryId }),
      });
      if (result?.success) {
        setHasVoted(true);
        setEntries(prev => prev.map(e => e.id === entryId ? { ...e, communityVotes: result.votes } : e));
      }
    } catch {}
    finally { setVoting(null); }
  };

  const timeRemaining = () => {
    if (!challenge) return '';
    const now = Date.now() + serverOffset;
    const diff = challenge.endsAt - now;
    if (diff <= 0) return lang === 'zh' ? '已结束' : 'Ended';
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    return lang === 'zh' ? `${days}天 ${hours}小时` : `${days}d ${hours}h`;
  };

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
            className="fixed right-0 top-0 bottom-0 z-[61] w-full max-w-md bg-[#0D1235]/98 backdrop-blur-2xl border-l border-white/[0.06] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center">
                  <Swords className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white leading-tight">
                    {lang === 'zh' ? '创作挑战赛' : 'Creative Challenge'}
                  </h2>
                  <p className="text-[10px] text-white/30">
                    {lang === 'zh' ? '每周主题 · 混合计分' : 'Weekly Theme · Hybrid Scoring'}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                <X className="w-3.5 h-3.5 text-white/40" />
              </button>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
              </div>
            ) : !challenge ? (
              <div className="flex-1 flex items-center justify-center text-white/30 text-sm">
                {lang === 'zh' ? '暂无活动赛事' : 'No active challenge'}
              </div>
            ) : (
              <>
                {/* Challenge Banner */}
                <div className="px-5 py-4 bg-gradient-to-r from-red-500/[0.08] via-orange-500/[0.06] to-amber-500/[0.08] border-b border-white/[0.04]">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-white font-bold text-lg">
                        {lang === 'zh' ? challenge.titleZh : challenge.titleEn}
                      </h3>
                      <p className="text-white/40 text-xs mt-0.5 leading-relaxed max-w-[240px]">
                        {lang === 'zh' ? challenge.descZh : challenge.descEn}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 text-orange-400 text-sm font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        {timeRemaining()}
                      </div>
                      <p className="text-[10px] text-white/20 mt-0.5">
                        {challenge.entryCount} {lang === 'zh' ? '参赛' : 'entries'}
                      </p>
                    </div>
                  </div>
                  {/* Tags */}
                  <div className="flex items-center gap-1.5 mt-2.5">
                    {challenge.tags.map((tag) => (
                      <span key={tag} className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white/[0.05] text-[10px] text-white/30 border border-white/[0.06]">
                        <Tag className="w-2.5 h-2.5" /> {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/[0.04]">
                  {(['overview', 'leaderboard', 'champions', 'submit'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={clsx(
                        'flex-1 py-2.5 text-xs font-medium transition-colors relative',
                        tab === t ? 'text-white' : 'text-white/30 hover:text-white/50'
                      )}
                    >
                      {t === 'overview' ? (lang === 'zh' ? '详情' : 'Details') :
                        t === 'leaderboard' ? (lang === 'zh' ? '排行榜' : 'Board') :
                        t === 'champions' ? (lang === 'zh' ? '荣耀殿堂' : 'Hall') :
                          (lang === 'zh' ? '提交' : 'Submit')}
                      {tab === t && (
                        <motion.div layoutId="challenge-tab" className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-red-500 to-orange-500 rounded-full" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-4">
                  {/* §24.x — Auto-finalize notification banner */}
                  {finalizeNotice && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-3.5"
                    >
                      <div className="flex items-start gap-2.5">
                        <Crown className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-yellow-200 font-semibold">
                            {lang === 'zh' ? '上期赛事已结算!' : 'Previous challenge finalized!'}
                          </p>
                          <p className="text-[10px] text-white/40 mt-0.5">
                            {lang === 'zh'
                              ? `「${finalizeNotice.previousChallenge?.titleZh}」冠军: @${finalizeNotice.winner?.userName} (${finalizeNotice.totalEntries}人参赛)`
                              : `"${finalizeNotice.previousChallenge?.titleEn}" Winner: @${finalizeNotice.winner?.userName} (${finalizeNotice.totalEntries} entries)`}
                          </p>
                        </div>
                        <button onClick={() => { setFinalizeNotice(null); setTab('champions'); }} className="text-[10px] text-yellow-400/60 hover:text-yellow-400 whitespace-nowrap flex-shrink-0">
                          {lang === 'zh' ? '查看' : 'View'}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {tab === 'overview' && (
                    <div className="space-y-4">
                      {/* Scoring Breakdown */}
                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                        <p className="text-xs text-white/50 font-medium mb-3">
                          {lang === 'zh' ? '计分规则' : 'Scoring Rules'}
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded bg-purple-500/10 flex items-center justify-center">
                                <Sparkles className="w-3 h-3 text-purple-400" />
                              </div>
                              <span className="text-xs text-white/60">
                                {lang === 'zh' ? 'AI 评委分' : 'AI Judge Score'}
                              </span>
                            </div>
                            <span className="text-sm text-purple-400 font-bold">70%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded bg-pink-500/10 flex items-center justify-center">
                                <Users className="w-3 h-3 text-pink-400" />
                              </div>
                              <span className="text-xs text-white/60">
                                {lang === 'zh' ? '社区投票' : 'Community Votes'}
                              </span>
                            </div>
                            <span className="text-sm text-pink-400 font-bold">30%</span>
                          </div>
                        </div>
                      </div>

                      {/* Prizes */}
                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                        <p className="text-xs text-white/50 font-medium mb-3">
                          {lang === 'zh' ? '奖励' : 'Prizes'}
                        </p>
                        <div className="space-y-2.5">
                          {challenge.prizes.map((prize, i) => {
                            const RankIcon = RANK_ICONS[i] || Award;
                            return (
                              <div key={prize.rank} className="flex items-center gap-3">
                                <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center',
                                  i === 0 ? 'bg-yellow-500/15' : i === 1 ? 'bg-gray-400/10' : 'bg-amber-700/10'
                                )}>
                                  <RankIcon className={clsx('w-4 h-4', RANK_COLORS[i])} />
                                </div>
                                <div className="flex-1">
                                  <p className="text-xs text-white/70">
                                    {lang === 'zh' ? prize.rewardZh : prize.rewardEn}
                                  </p>
                                </div>
                                <div className="flex items-center gap-0.5 text-yellow-400 text-xs font-bold">
                                  <Star className="w-3 h-3 fill-yellow-400" />
                                  {prize.sp}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* CTA */}
                      {!hasSubmitted && user && (
                        <button
                          onClick={() => setTab('submit')}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all"
                        >
                          <Send className="w-4 h-4" />
                          {lang === 'zh' ? '提交参赛作品' : 'Submit Entry'}
                        </button>
                      )}
                      {hasSubmitted && (
                        <div className="text-center py-2">
                          <span className="text-xs text-emerald-400/60 flex items-center justify-center gap-1">
                            <Trophy className="w-3.5 h-3.5" />
                            {lang === 'zh' ? '你已参赛，等待结果!' : 'Entry submitted! Awaiting results.'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {tab === 'leaderboard' && (
                    <div className="space-y-2">
                      {/* §23.x — Top 3 Podium Spotlight */}
                      {entries.length >= 3 && (
                        <div className="flex items-end justify-center gap-3 pb-4 mb-3 border-b border-white/[0.04]">
                          {/* 2nd place */}
                          <div className="text-center w-20">
                            <div className="w-10 h-10 rounded-xl bg-gray-400/10 mx-auto mb-1.5 flex items-center justify-center">
                              <Medal className="w-5 h-5 text-gray-300" />
                            </div>
                            <p className="text-[10px] text-white/60 font-medium truncate">{entries[1].workTitle}</p>
                            <p className="text-[8px] text-white/25">@{entries[1].userName}</p>
                            <p className="text-[10px] text-gray-300 font-bold mt-0.5">{entries[1].totalScore.toFixed(1)}</p>
                            <div className="h-10 bg-gray-400/5 rounded-t-lg mt-1 border-t border-x border-white/[0.04]" />
                          </div>
                          {/* 1st place */}
                          <div className="text-center w-24">
                            <motion.div
                              className="w-12 h-12 rounded-xl bg-yellow-500/15 mx-auto mb-1.5 flex items-center justify-center"
                              animate={{ boxShadow: ['0 0 10px rgba(255,215,0,0.15)', '0 0 20px rgba(255,215,0,0.25)', '0 0 10px rgba(255,215,0,0.15)'] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              <Crown className="w-6 h-6 text-yellow-400" />
                            </motion.div>
                            <p className="text-[11px] text-white/80 font-bold truncate">{entries[0].workTitle}</p>
                            <p className="text-[9px] text-white/30">@{entries[0].userName}</p>
                            <p className="text-xs text-yellow-400 font-bold mt-0.5">{entries[0].totalScore.toFixed(1)}</p>
                            <div className="h-16 bg-yellow-500/5 rounded-t-lg mt-1 border-t border-x border-yellow-500/10" />
                          </div>
                          {/* 3rd place */}
                          <div className="text-center w-20">
                            <div className="w-10 h-10 rounded-xl bg-amber-700/10 mx-auto mb-1.5 flex items-center justify-center">
                              <Award className="w-5 h-5 text-amber-600" />
                            </div>
                            <p className="text-[10px] text-white/60 font-medium truncate">{entries[2].workTitle}</p>
                            <p className="text-[8px] text-white/25">@{entries[2].userName}</p>
                            <p className="text-[10px] text-amber-600 font-bold mt-0.5">{entries[2].totalScore.toFixed(1)}</p>
                            <div className="h-6 bg-amber-700/5 rounded-t-lg mt-1 border-t border-x border-white/[0.04]" />
                          </div>
                        </div>
                      )}
                      {entries.length === 0 ? (
                        <div className="text-center py-10">
                          <Trophy className="w-10 h-10 text-white/10 mx-auto mb-3" />
                          <p className="text-sm text-white/30">
                            {lang === 'zh' ? '暂无参赛作品' : 'No entries yet'}
                          </p>
                          <p className="text-[11px] text-white/15 mt-1">
                            {lang === 'zh' ? '成为第一个参赛者!' : 'Be the first to enter!'}
                          </p>
                        </div>
                      ) : entries.map((entry, i) => (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className={clsx(
                            'bg-white/[0.03] border rounded-xl p-3.5 transition-colors',
                            i === 0 ? 'border-yellow-500/20 bg-yellow-500/[0.03]' :
                              i === 1 ? 'border-gray-400/10' :
                                i === 2 ? 'border-amber-700/10' : 'border-white/[0.06]'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            {/* Rank */}
                            <div className={clsx(
                              'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0',
                              i === 0 ? 'bg-yellow-500/15 text-yellow-400' :
                                i === 1 ? 'bg-gray-400/10 text-gray-300' :
                                  i === 2 ? 'bg-amber-700/10 text-amber-600' : 'bg-white/5 text-white/20'
                            )}>
                              {i < 3 ? (() => { const Icon = RANK_ICONS[i]; return <Icon className="w-4 h-4" />; })() : `#${i + 1}`}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-white font-semibold truncate">{entry.workTitle}</p>
                              <p className="text-[10px] text-white/25 mt-0.5">
                                @{entry.userName} · {entry.workTheme || '-'}
                              </p>
                              <div className="flex items-center gap-3 mt-2">
                                <span className="text-[10px] text-purple-400/60">
                                  {lang === 'zh' ? '评委' : 'Judge'}: {entry.judgeScore.toFixed(1)}
                                </span>
                                <span className="text-[10px] text-pink-400/60">
                                  {lang === 'zh' ? '票数' : 'Votes'}: {entry.communityVotes}
                                </span>
                                <span className="text-[10px] text-orange-400 font-bold">
                                  {lang === 'zh' ? '总分' : 'Total'}: {entry.totalScore.toFixed(1)}
                                </span>
                              </div>
                              {/* §M-4 — AI Breakdown */}
                              {entry.aiBreakdown && (
                                <div className="mt-2 grid grid-cols-4 gap-1">
                                  {[
                                    { key: 'themeRelevance', labelZh: '主题', labelEn: 'Theme', max: 30, color: 'bg-indigo-500' },
                                    { key: 'emotionalDepth', labelZh: '情感', labelEn: 'Emotion', max: 30, color: 'bg-violet-500' },
                                    { key: 'creativity', labelZh: '创意', labelEn: 'Creative', max: 25, color: 'bg-fuchsia-500' },
                                    { key: 'technicalQuality', labelZh: '技术', labelEn: 'Tech', max: 15, color: 'bg-cyan-500' },
                                  ].map((dim) => {
                                    const val = (entry.aiBreakdown as any)[dim.key] || 0;
                                    return (
                                      <div key={dim.key} className="text-center">
                                        <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden mb-0.5">
                                          <div
                                            className={`h-full rounded-full ${dim.color}/60`}
                                            style={{ width: `${(val / dim.max) * 100}%` }}
                                          />
                                        </div>
                                        <span className="text-[8px] text-white/25">
                                          {lang === 'zh' ? dim.labelZh : dim.labelEn} {val}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {entry.aiFeedback && (
                                <p className="text-[9px] text-white/20 mt-1 italic leading-tight">
                                  {entry.aiProvider === 'openai' && <Sparkles className="w-2.5 h-2.5 inline mr-0.5 text-purple-400/40" />}
                                  {entry.aiFeedback}
                                </p>
                              )}
                            </div>

                            {/* Vote button */}
                            {user && entry.userId !== user.id && !hasVoted && (
                              <button
                                onClick={() => handleVote(entry.id)}
                                disabled={!!voting}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400 text-[10px] hover:bg-pink-500/20 transition-colors flex-shrink-0"
                              >
                                <Heart className={clsx('w-3 h-3', voting === entry.id && 'animate-pulse')} />
                                {lang === 'zh' ? '投票' : 'Vote'}
                              </button>
                            )}
                            {hasVoted && (
                              <span className="text-[10px] text-white/15 flex-shrink-0">
                                {lang === 'zh' ? '已投' : 'Voted'}
                              </span>
                            )}
                          </div>

                          {/* Score bar */}
                          <div className="mt-2.5 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, entry.totalScore)}%` }}
                              transition={{ delay: 0.2 + i * 0.05, duration: 0.6 }}
                              className={clsx('h-full rounded-full',
                                i === 0 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                                  i === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                                    i === 2 ? 'bg-gradient-to-r from-amber-600 to-amber-700' :
                                      'bg-gradient-to-r from-purple-500/50 to-pink-500/50'
                              )}
                            />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* §23.x — Champions Hall (荣耀殿堂) */}
                  {tab === 'champions' && (
                    <div className="space-y-3">
                      {champions.length === 0 ? (
                        <div className="text-center py-12">
                          <Trophy className="w-10 h-10 text-white/10 mx-auto mb-3" />
                          <p className="text-sm text-white/30">
                            {lang === 'zh' ? '暂无历史冠军' : 'No past champions yet'}
                          </p>
                          <p className="text-[10px] text-white/15 mt-1">
                            {lang === 'zh' ? '本赛季结束后将在此展示' : 'Champions appear after each season ends'}
                          </p>
                        </div>
                      ) : champions.map((champ, ci) => (
                        <motion.div
                          key={champ.challengeId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: ci * 0.05 }}
                          className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden"
                        >
                          {/* Champion header */}
                          <div className="px-4 py-3 bg-gradient-to-r from-yellow-500/[0.06] to-orange-500/[0.06] border-b border-white/[0.04]">
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-white/60 font-medium">
                                {lang === 'zh' ? champ.challengeTitle?.zh : champ.challengeTitle?.en}
                              </p>
                              <span className="text-[9px] text-white/20">
                                {new Date(champ.finalizedAt).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          </div>
                          {/* Podium */}
                          <div className="p-4 space-y-2">
                            {[
                              { data: champ.winner, icon: Crown, color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: '#1' },
                              { data: champ.runnerUp, icon: Medal, color: 'text-gray-300', bg: 'bg-gray-400/10', label: '#2' },
                              { data: champ.thirdPlace, icon: Award, color: 'text-amber-600', bg: 'bg-amber-700/10', label: '#3' },
                            ].filter(p => p.data).map((place, pi) => {
                              const Icon = place.icon;
                              return (
                                <div key={pi} className="flex items-center gap-2.5">
                                  <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', place.bg)}>
                                    <Icon className={clsx('w-3.5 h-3.5', place.color)} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] text-white/70 font-medium truncate">{place.data.workTitle}</p>
                                    <p className="text-[9px] text-white/30">@{place.data.userName}</p>
                                  </div>
                                  <span className="text-[10px] text-orange-400/70 font-mono tabular-nums">
                                    {place.data.totalScore?.toFixed(1)}
                                  </span>
                                </div>
                              );
                            })}
                            <p className="text-[9px] text-white/15 pt-1">
                              {champ.totalEntries} {lang === 'zh' ? '位参赛者' : 'participants'}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {tab === 'submit' && (
                    <div className="space-y-4">
                      {!user ? (
                        <div className="text-center py-10">
                          <p className="text-sm text-white/30">
                            {lang === 'zh' ? '请先登录' : 'Please sign in first'}
                          </p>
                        </div>
                      ) : hasSubmitted ? (
                        <div className="text-center py-10">
                          <Trophy className="w-10 h-10 text-emerald-400/30 mx-auto mb-3" />
                          <p className="text-sm text-emerald-400/60">
                            {lang === 'zh' ? '你已提交参赛作品' : 'You have already submitted'}
                          </p>
                          <button
                            onClick={() => setTab('leaderboard')}
                            className="mt-3 text-xs text-white/30 hover:text-white/50 flex items-center gap-1 mx-auto"
                          >
                            {lang === 'zh' ? '查看排行榜' : 'View leaderboard'}
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div>
                            <label className="text-[11px] text-white/40 block mb-1.5">
                              {lang === 'zh' ? '作品标题 *' : 'Work Title *'}
                            </label>
                            <input
                              value={submitTitle}
                              onChange={(e) => setSubmitTitle(e.target.value)}
                              placeholder={lang === 'zh' ? '输入你的作品标题...' : 'Enter work title...'}
                              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-orange-500/30 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-white/40 block mb-1.5">
                              {lang === 'zh' ? '主题风格' : 'Theme / Style'}
                            </label>
                            <input
                              value={submitTheme}
                              onChange={(e) => setSubmitTheme(e.target.value)}
                              placeholder={challenge ? (lang === 'zh' ? challenge.titleZh : challenge.titleEn) : ''}
                              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/15 focus:outline-none focus:border-orange-500/30 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-white/40 block mb-1.5">
                              {lang === 'zh' ? '歌词（选填，每行一句）' : 'Lyrics (optional, one line each)'}
                            </label>
                            <textarea
                              value={submitLyrics}
                              onChange={(e) => setSubmitLyrics(e.target.value)}
                              rows={5}
                              placeholder={lang === 'zh' ? '在此输入歌词...' : 'Enter lyrics here...'}
                              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/15 focus:outline-none focus:border-orange-500/30 transition-colors resize-none"
                            />
                          </div>

                          {/* Submit Result */}
                          {submitResult && (
                            <p className={clsx('text-xs', submitResult.success ? 'text-emerald-400' : 'text-red-400')}>
                              {submitResult.message}
                            </p>
                          )}

                          <button
                            onClick={handleSubmit}
                            disabled={!submitTitle.trim() || submitting}
                            className={clsx(
                              'w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all',
                              submitTitle.trim()
                                ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white hover:brightness-110'
                                : 'bg-white/5 text-white/20 cursor-not-allowed'
                            )}
                          >
                            <Send className="w-4 h-4" />
                            {submitting ? '...' : (lang === 'zh' ? '提交参赛' : 'Submit Entry')}
                          </button>

                          <p className="text-[10px] text-white/15 text-center">
                            {lang === 'zh'
                              ? '提示：也可以在「创作工坊」中先创作作品，然后在此提交'
                              : 'Tip: Create in Creation Studio first, then submit here'}
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};