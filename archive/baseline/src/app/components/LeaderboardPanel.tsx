import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Trophy,
  Crown,
  Medal,
  TrendingUp,
  TrendingDown,
  Minus,
  Heart,
  Play,
  MessageCircle,
  RefreshCw,
  Info,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Zap,
  Rocket,
} from 'lucide-react';
import { clsx } from 'clsx';
import { apiFetch } from '../lib/supabase';
import { DEMO_PLAYLIST } from '../playlistData';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useI18n } from '../hooks/useI18n';

interface LeaderboardPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTrack?: (songId: string) => void;
  user?: any;
  starPower?: number;
  onStarPowerUpdate?: (sp: number) => void;
}

interface RankingEntry {
  songId: string;
  likes: number;
  plays: number;
  comments: number;
  wilsonScore: number;
  engagement: number;
}

// Rank change: positive = moved up, negative = moved down, 0 = same, null = new
interface RankingWithChange extends RankingEntry {
  rankChange: number | null;
  previousRank: number | null;
}

const RANK_DECORATIONS = [
  { icon: Crown, color: 'text-yellow-400', bg: 'from-yellow-500/20 to-amber-500/20', border: 'border-yellow-500/30', glow: 'shadow-yellow-500/20', barColor: 'from-yellow-400 to-amber-500' },
  { icon: Medal, color: 'text-gray-300', bg: 'from-gray-400/20 to-slate-400/20', border: 'border-gray-400/20', glow: 'shadow-gray-400/10', barColor: 'from-gray-300 to-slate-400' },
  { icon: Medal, color: 'text-amber-600', bg: 'from-amber-600/20 to-orange-600/20', border: 'border-amber-600/20', glow: 'shadow-amber-600/10', barColor: 'from-amber-500 to-orange-500' },
];

const STORAGE_KEY = 'dmusic-leaderboard-prev';

function loadPreviousRankings(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function savePreviousRankings(rankings: RankingEntry[]) {
  try {
    const map: Record<string, number> = {};
    rankings.forEach((r, i) => { map[r.songId] = i + 1; });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

function computeRankChanges(rankings: RankingEntry[]): RankingWithChange[] {
  const prev = loadPreviousRankings();
  const hasPrev = Object.keys(prev).length > 0;

  return rankings.map((entry, index) => {
    const currentRank = index + 1;
    const previousRank = prev[entry.songId] ?? null;

    let rankChange: number | null = null;
    if (!hasPrev) {
      rankChange = null; // First load, no change data
    } else if (previousRank === null) {
      rankChange = null; // New entry
    } else {
      rankChange = previousRank - currentRank; // positive = moved up
    }

    return { ...entry, rankChange, previousRank };
  });
}

// Wilson score bar max value for normalization
function getMaxWilson(rankings: RankingEntry[]): number {
  if (rankings.length === 0) return 1;
  return Math.max(...rankings.map(r => r.wilsonScore), 0.0001);
}

export const LeaderboardPanel: React.FC<LeaderboardPanelProps> = ({
  isOpen,
  onClose,
  onSelectTrack,
  user,
  starPower = 0,
  onStarPowerUpdate,
}) => {
  const [rankings, setRankings] = useState<RankingWithChange[]>([]);
  const [rawRankings, setRawRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [boostFlash, setBoostFlash] = useState<string | null>(null);
  const isFirstLoad = useRef(true);
  const { t } = useI18n();

  const handleBoost = async (songId: string) => {
    if (!user || starPower < 100) return;
    try {
      const result = await apiFetch<any>('/leaderboard/boost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, songId, amount: 100 }),
      });
      if (result?.success) {
        onStarPowerUpdate?.(result.starPower);
        setBoostFlash(songId);
        setTimeout(() => setBoostFlash(null), 2000);
        // Refresh leaderboard
        if (rawRankings.length > 0) savePreviousRankings(rawRankings);
        fetchLeaderboard();
      }
    } catch (err) { console.error('Boost error:', err); }
  };

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiFetch<{ rankings: RankingEntry[] }>('/leaderboard');
      if (result?.rankings) {
        const withChanges = computeRankChanges(result.rankings);
        setRankings(withChanges);
        setRawRankings(result.rankings);

        // Save current as "previous" for next comparison (delay to avoid self-comparison on rapid refresh)
        if (!isFirstLoad.current) {
          savePreviousRankings(result.rankings);
        } else {
          // On first load, if no previous data exists, seed it
          const prev = loadPreviousRankings();
          if (Object.keys(prev).length === 0) {
            savePreviousRankings(result.rankings);
          }
          isFirstLoad.current = false;
        }
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchLeaderboard();
  }, [isOpen, fetchLeaderboard]);

  const getTrack = (songId: string) => DEMO_PLAYLIST.find((t) => t.id === songId);

  const maxWilson = getMaxWilson(rawRankings);

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
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
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
                  <h3 className="text-white font-semibold text-sm leading-tight">{t('leaderboard.title')}</h3>
                  <p className="text-white/30 text-xs">{t('leaderboard.subtitle')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowInfo(!showInfo)}
                  className={clsx(
                    'p-2 rounded-lg border transition-all',
                    showInfo
                      ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                      : 'bg-white/5 border-white/[0.08] text-white/40 hover:text-white/70'
                  )}
                  title={t('leaderboard.aboutWilson')}
                >
                  <Info className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    // Save current before refreshing so next fetch shows changes
                    if (rawRankings.length > 0) savePreviousRankings(rawRankings);
                    fetchLeaderboard();
                  }}
                  disabled={loading}
                  className={clsx(
                    'p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/[0.08] text-white/60 hover:text-white transition-all',
                    loading && 'animate-spin'
                  )}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Wilson Score Info */}
            <AnimatePresence>
              {showInfo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-white/[0.04]"
                >
                  <div className="p-4 bg-blue-500/5">
                    <h4 className="text-xs font-semibold text-blue-300 mb-2 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      {t('leaderboard.wilsonAlgorithm')}
                    </h4>
                    <p className="text-xs text-white/40 leading-relaxed">
                      {t('leaderboard.wilsonInfo')}
                    </p>
                    <div className="mt-2 p-2 bg-white/[0.03] rounded-lg font-mono text-[10px] text-white/30">
                      score = (p̂ + z²/2n − z√(p̂(1−p̂)/n + z²/4n²)) / (1 + z²/n)
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Rankings */}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              {loading && rankings.length === 0 ? (
                <div className="flex justify-center py-16">
                  <div className="w-6 h-6 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
                </div>
              ) : rankings.length === 0 ? (
                <div className="text-center py-16 px-6">
                  <Trophy className="w-12 h-12 text-white/10 mx-auto mb-3" />
                  <p className="text-white/30 text-sm">{t('leaderboard.noRankings')}</p>
                  <p className="text-white/15 text-xs mt-1">
                    {t('leaderboard.buildBoard')}
                  </p>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {rankings.map((entry, index) => {
                    const track = getTrack(entry.songId);
                    const decoration = RANK_DECORATIONS[index];
                    const isTop3 = index < 3;
                    const RankIcon = decoration?.icon || Trophy;
                    const wilsonPercent = maxWilson > 0 ? (entry.wilsonScore / maxWilson) * 100 : 0;
                    const totalEngagement = entry.plays + entry.likes + entry.comments;

                    return (
                      <motion.div
                        key={entry.songId}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.08 }}
                        onClick={() => onSelectTrack?.(entry.songId)}
                        className={clsx(
                          'p-4 rounded-xl border transition-all cursor-pointer group relative',
                          isTop3
                            ? `bg-gradient-to-r ${decoration.bg} ${decoration.border} shadow-lg ${decoration.glow}`
                            : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                        )}
                      >
                        {/* Rank Change Badge — top-right corner */}
                        <RankChangeBadge change={entry.rankChange} />

                        <div className="flex items-center gap-3">
                          {/* Rank */}
                          <div className={clsx(
                            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                            isTop3
                              ? `bg-white/10`
                              : 'bg-white/[0.04]'
                          )}>
                            {isTop3 ? (
                              <RankIcon className={clsx('w-4 h-4', decoration?.color)} />
                            ) : (
                              <span className="text-xs font-mono text-white/30">{index + 1}</span>
                            )}
                          </div>

                          {/* Album Art */}
                          {track && (
                            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                              <ImageWithFallback
                                src={track.albumArt}
                                alt={track.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}

                          {/* Song Info */}
                          <div className="flex-1 min-w-0">
                            <p className={clsx(
                              'text-sm font-medium truncate',
                              isTop3 ? 'text-white' : 'text-white/80'
                            )}>
                              {track?.title || entry.songId}
                            </p>
                            <p className="text-xs text-white/30 truncate">{track?.artist || t('leaderboard.unknown')}</p>
                          </div>

                          {/* Score */}
                          <div className="text-right flex-shrink-0">
                            <p className={clsx(
                              'text-sm font-bold font-mono tabular-nums',
                              isTop3 ? decoration?.color : 'text-white/60'
                            )}>
                              {entry.wilsonScore.toFixed(4)}
                            </p>
                            <p className="text-[10px] text-white/20">{t('leaderboard.score')}</p>
                          </div>
                        </div>

                        {/* Wilson Score Visualization Bar */}
                        <div className="mt-3 ml-11">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-white/20 flex items-center gap-1">
                              <Zap className="w-2.5 h-2.5" />
                              {t('leaderboard.wilsonBar')}
                            </span>
                            <span className="text-[10px] text-white/25 font-mono tabular-nums">
                              {(wilsonPercent).toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${wilsonPercent}%` }}
                              transition={{ delay: index * 0.08 + 0.3, duration: 0.6, ease: 'easeOut' }}
                              className={clsx(
                                'h-full rounded-full bg-gradient-to-r',
                                isTop3
                                  ? decoration.barColor
                                  : 'from-indigo-400 to-purple-500'
                              )}
                            />
                          </div>
                        </div>

                        {/* Stats Row */}
                        <div className="flex items-center gap-4 mt-2.5 ml-11">
                          <span className="flex items-center gap-1 text-[11px] text-white/25">
                            <Play className="w-3 h-3" />
                            {entry.plays}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-white/25">
                            <Heart className="w-3 h-3" />
                            {entry.likes}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-white/25">
                            <MessageCircle className="w-3 h-3" />
                            {entry.comments}
                          </span>
                          {user && starPower >= 100 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleBoost(entry.songId); }}
                              disabled={boostFlash === entry.songId}
                              className={clsx(
                                'ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium border transition-all',
                                boostFlash === entry.songId
                                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
                                  : 'bg-yellow-500/10 text-yellow-300/70 border-yellow-500/15 hover:bg-yellow-500/20 hover:text-yellow-300'
                              )}
                              title={t('starpower.boostCost')}
                            >
                              <Rocket className="w-2.5 h-2.5" />
                              {boostFlash === entry.songId ? t('starpower.boostSuccess') : `${t('starpower.boost')} 100SP`}
                            </button>
                          )}
                          {(!user || starPower < 100) && (
                            <span className="text-[10px] text-white/15 ml-auto flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              {totalEngagement} {t('leaderboard.totalEngagement')}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/[0.06] flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/20">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span className="text-xs">{t('leaderboard.poweredBy')}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ==========================================
// Rank Change Badge Component
// ==========================================
const RankChangeBadge: React.FC<{ change: number | null }> = ({ change }) => {
  const { t } = useI18n();

  if (change === null) {
    // New entry or first load — show "NEW" sparkle
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4, type: 'spring', damping: 12 }}
        className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/20"
      >
        <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
        <span className="text-[9px] font-semibold text-cyan-400">{t('leaderboard.rankNew')}</span>
      </motion.div>
    );
  }

  if (change === 0) {
    return (
      <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
        <Minus className="w-2.5 h-2.5 text-white/25" />
        <span className="text-[9px] text-white/25">{t('leaderboard.rankSame')}</span>
      </div>
    );
  }

  if (change > 0) {
    return (
      <motion.div
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/20"
      >
        <ArrowUp className="w-2.5 h-2.5 text-emerald-400" />
        <span className="text-[9px] font-semibold text-emerald-400">
          {change} {t('leaderboard.rankUp')}
        </span>
      </motion.div>
    );
  }

  // change < 0
  return (
    <motion.div
      initial={{ y: -5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/20"
    >
      <ArrowDown className="w-2.5 h-2.5 text-red-400" />
      <span className="text-[9px] font-semibold text-red-400">
        {Math.abs(change)} {t('leaderboard.rankDown')}
      </span>
    </motion.div>
  );
};
