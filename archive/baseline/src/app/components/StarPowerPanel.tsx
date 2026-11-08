import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Star, Zap, Calendar, TrendingUp, Gift, Award,
  ChevronRight, Sparkles, RefreshCw,
} from 'lucide-react';
import { clsx } from 'clsx';
import { apiFetch } from '../lib/supabase';
import { useI18n } from '../hooks/useI18n';

interface StarPowerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  starPower: number;
  onStarPowerUpdate: (sp: number) => void;
  onOpenShop?: () => void;
}

interface VIPLevel {
  level: number;
  label: string;
  labelEn: string;
  threshold: number;
  color: string;
  dailyReward: number;
  nextThreshold: number | null;
  nextLabel: string | null;
}

interface Transaction {
  id: string;
  type: 'earn' | 'spend';
  amount: number;
  reason: string;
  detail: string;
  timestamp: number;
  balance: number;
}

const REASON_LABELS: Record<string, { zh: string; en: string }> = {
  daily_checkin: { zh: '每日签到', en: 'Daily Check-in' },
  like: { zh: '歌曲点赞', en: 'Song Like' },
  annotation: { zh: '情感标注', en: 'Emotion Annotation' },
  achievement: { zh: '成就解锁', en: 'Achievement Unlocked' },
  welcome: { zh: '注册奖励', en: 'Welcome Bonus' },
};

export const StarPowerPanel: React.FC<StarPowerPanelProps> = ({
  isOpen, onClose, user, starPower, onStarPowerUpdate, onOpenShop,
}) => {
  const { t, lang } = useI18n();
  const [vipLevel, setVipLevel] = useState<VIPLevel | null>(null);
  const [allLevels, setAllLevels] = useState<VIPLevel[]>([]);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [streak, setStreak] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkinFlash, setCheckinFlash] = useState<{ reward: number; streak: number } | null>(null);
  const [showAllLevels, setShowAllLevels] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [levelData, txnData] = await Promise.all([
        apiFetch<any>(`/starpower/${user.id}/level`),
        apiFetch<any>(`/starpower/${user.id}/transactions`),
      ]);
      if (levelData) {
        setVipLevel(levelData.vipLevel);
        setAllLevels(levelData.allLevels || []);
        setCheckedInToday(levelData.checkedInToday || false);
        setStreak(levelData.streak || 0);
      }
      if (txnData?.transactions) {
        setTransactions(txnData.transactions);
      }
    } catch (err) { console.error('StarPower fetch error:', err); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => {
    if (isOpen && user) fetchData();
  }, [isOpen, user, fetchData]);

  const handleCheckin = async () => {
    if (!user || checkedInToday) return;
    try {
      const result = await apiFetch<any>(`/starpower/${user.id}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (result?.success) {
        setCheckedInToday(true);
        setStreak(result.streak);
        setCheckinFlash({ reward: result.reward, streak: result.streak });
        onStarPowerUpdate(result.starPower);
        setTimeout(() => setCheckinFlash(null), 3000);
        // Refresh transactions
        fetchData();
      } else if (result?.alreadyCheckedIn) {
        setCheckedInToday(true);
      }
    } catch (err) { console.error('Check-in error:', err); }
  };

  const progressToNext = vipLevel?.nextThreshold
    ? ((starPower - vipLevel.threshold) / (vipLevel.nextThreshold - vipLevel.threshold)) * 100
    : 100;

  function timeAgo(ts: number): string {
    const diff = Date.now() - ts;
    if (diff < 60000) return lang === 'zh' ? '刚刚' : 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}${lang === 'zh' ? '分钟前' : 'm ago'}`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}${lang === 'zh' ? '小时前' : 'h ago'}`;
    return `${Math.floor(diff / 86400000)}${lang === 'zh' ? '天前' : 'd ago'}`;
  }

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
                  <Star className="w-4.5 h-4.5 text-yellow-400 fill-yellow-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm leading-tight">{t('starpower.title')}</h3>
                  <p className="text-white/30 text-xs">{t('starpower.subtitle')}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {!user ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-white/30 text-sm">{t('starpower.signInRequired')}</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: 'none' }}>
                {/* Balance Card */}
                <div className="relative p-5 rounded-2xl bg-gradient-to-br from-yellow-500/10 via-orange-500/5 to-purple-500/10 border border-yellow-500/15 mb-4 overflow-hidden">
                  {/* Glow effect */}
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl" />
                  <div className="relative">
                    <p className="text-xs text-yellow-200/50 uppercase tracking-wider mb-1">{t('starpower.balance')}</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400 font-mono tabular-nums">
                        {starPower.toLocaleString()}
                      </span>
                      <span className="text-xs text-yellow-300/40">SP</span>
                    </div>
                    {vipLevel && (
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full border"
                          style={{ color: vipLevel.color, borderColor: vipLevel.color + '40', backgroundColor: vipLevel.color + '15' }}
                        >
                          {lang === 'zh' ? vipLevel.label : vipLevel.labelEn}
                        </span>
                        <span className="text-[10px] text-white/20">Lv.{vipLevel.level}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Shop Button */}
                {onOpenShop && (
                  <button
                    onClick={() => { onClose(); setTimeout(onOpenShop, 150); }}
                    className="w-full mb-4 flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-amber-500/[0.06] to-orange-500/[0.06] border border-amber-500/15 hover:border-amber-500/30 transition-all group"
                  >
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-amber-400" />
                      <span className="text-xs text-white/60 group-hover:text-white/80 transition-colors">
                        {lang === 'zh' ? '星力商城 — 兑换虚拟好物' : 'SP Shop — Redeem virtual items'}
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
                  </button>
                )}

                {/* VIP Progress */}
                {vipLevel && (
                  <div className="mb-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/40">{t('starpower.vipLevel')}</span>
                      {vipLevel.nextThreshold ? (
                        <span className="text-[10px] text-white/25">
                          {t('starpower.needMore')} {(vipLevel.nextThreshold - starPower).toLocaleString()} {t('starpower.spMore')}
                        </span>
                      ) : (
                        <span className="text-[10px] text-yellow-400/50">{t('starpower.maxLevel')}</span>
                      )}
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(progressToNext, 100)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${vipLevel.color}80, ${vipLevel.color})` }}
                      />
                    </div>
                    {/* Level markers */}
                    <button
                      onClick={() => setShowAllLevels(!showAllLevels)}
                      className="flex items-center gap-1 mt-2 text-[10px] text-white/20 hover:text-white/40 transition-colors"
                    >
                      <Award className="w-3 h-3" />
                      {t('starpower.allLevels')}
                      <ChevronRight className={clsx('w-3 h-3 transition-transform', showAllLevels && 'rotate-90')} />
                    </button>
                    <AnimatePresence>
                      {showAllLevels && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden mt-2"
                        >
                          <div className="space-y-1">
                            {allLevels.map(lvl => (
                              <div
                                key={lvl.level}
                                className={clsx(
                                  'flex items-center justify-between px-2 py-1 rounded-lg text-[11px]',
                                  starPower >= lvl.threshold ? 'bg-white/[0.03]' : 'opacity-40'
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: lvl.color }} />
                                  <span className="text-white/60">
                                    {lang === 'zh' ? lvl.label : lvl.labelEn}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-white/25 font-mono tabular-nums">{lvl.threshold.toLocaleString()} SP</span>
                                  <span className="text-white/20">+{lvl.dailyReward}/day</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Daily Check-in */}
                <div className="mb-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-orange-400" />
                      <div>
                        <p className="text-xs text-white/60">{t('starpower.checkin')}</p>
                        <p className="text-[10px] text-white/25">
                          {t('starpower.streak')}: {streak} {lang === 'zh' ? '天' : 'days'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleCheckin}
                      disabled={checkedInToday}
                      className={clsx(
                        'px-4 py-2 rounded-xl text-xs font-medium transition-all',
                        checkedInToday
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 cursor-default'
                          : 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 border border-yellow-500/20 hover:from-yellow-500/30 hover:to-orange-500/30'
                      )}
                    >
                      {checkedInToday ? t('starpower.checkinDone') : t('starpower.checkin')}
                    </button>
                  </div>
                  {/* Check-in reward flash */}
                  <AnimatePresence>
                    {checkinFlash && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/15 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                          <span className="text-xs text-yellow-200">
                            {t('starpower.checkinReward')} +{checkinFlash.reward} SP
                            {checkinFlash.streak > 1 && (
                              <span className="text-yellow-300/50"> ({t('starpower.streak')} ×{checkinFlash.streak})</span>
                            )}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Transactions */}
                <div>
                  <h4 className="text-xs font-medium text-white/30 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5" />
                    {t('starpower.transactions')}
                  </h4>
                  {transactions.length === 0 ? (
                    <div className="text-center py-8 bg-white/[0.01] rounded-xl border border-white/[0.04]">
                      <Gift className="w-8 h-8 text-white/10 mx-auto mb-2" />
                      <p className="text-xs text-white/20">{t('starpower.noTransactions')}</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {transactions.slice(0, 20).map(txn => {
                        const label = REASON_LABELS[txn.reason]?.[lang] || txn.reason;
                        return (
                          <div key={txn.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                            <div className="flex items-center gap-2">
                              <div className={clsx(
                                'w-6 h-6 rounded-full flex items-center justify-center',
                                txn.type === 'earn' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                              )}>
                                {txn.type === 'earn'
                                  ? <TrendingUp className="w-3 h-3 text-emerald-400" />
                                  : <Zap className="w-3 h-3 text-red-400" />}
                              </div>
                              <div>
                                <p className="text-[11px] text-white/60">{label}</p>
                                <p className="text-[9px] text-white/15">{txn.detail} · {timeAgo(txn.timestamp)}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={clsx(
                                'text-xs font-mono tabular-nums font-medium',
                                txn.type === 'earn' ? 'text-emerald-400' : 'text-red-400'
                              )}>
                                {txn.type === 'earn' ? '+' : '-'}{txn.amount}
                              </p>
                              <p className="text-[9px] text-white/15 font-mono tabular-nums">{txn.balance} SP</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
