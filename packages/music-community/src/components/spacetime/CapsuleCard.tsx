// 社区面板子组件 · 时空墙时间胶囊卡片（解锁状态 / E2EE 解密 / 点赞）
import React from 'react';
import { motion } from 'motion/react';
import {
  Unlock, Lock, Shield, ShieldCheck, KeyRound,
  Music, Heart,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { TranslationKey, Lang } from '@yyc3/music-hooks';
import { emotionOf, timeAgo, timeUntil } from './shared';
import type { STCapsule } from './shared';

interface CapsuleCardProps {
  cap: STCapsule;
  user: any;
  lang: Lang;
  t: (key: TranslationKey) => string;
  handleDecryptCapsule: React.MutableRefObject<(cap: STCapsule) => Promise<void>>;
  handleLikeCapsule: (capId: string) => Promise<void>;
}

export const CapsuleCard: React.FC<CapsuleCardProps> = ({
  cap, user, lang, t, handleDecryptCapsule, handleLikeCapsule,
}) => {
  const emo = emotionOf(cap.emotion);
  const countdown = timeUntil(cap.unlockTs);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        'p-3 rounded-xl border transition-colors',
        cap.isUnlocked
          ? 'bg-white/[0.03] border-cyan-500/15 hover:bg-white/[0.05]'
          : 'bg-white/[0.01] border-white/[0.04]'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {cap.isUnlocked ? (
            <Unlock className="w-3.5 h-3.5 text-cyan-400" />
          ) : (
            <Lock className="w-3.5 h-3.5 text-white/20" />
          )}
          <span className="text-sm font-medium text-white/80">{cap.title}</span>
          {cap.encrypted && <Shield className="w-3 h-3 text-emerald-400/60 flex-shrink-0" />}
          <span className={clsx('text-xs', emo.color)}>{emo.emoji}</span>
        </div>
        {/* Status badge */}
        {cap.isUnlocked ? (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/20">
            {t('spacetime.unlocked')}
          </span>
        ) : (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.04] text-white/30 border border-white/[0.06]">
            {countdown.value > 0
              ? `${t('spacetime.unlocksIn')} ${countdown.value}${countdown.unit}`
              : t('spacetime.justUnlocked')}
          </span>
        )}
      </div>
      {cap.isUnlocked ? (
        <>
          {/* E2EE Encrypted capsule */}
          {cap.encrypted ? (
            cap._decryptedContent ? (
              <div className="mb-2">
                <div className="flex items-center gap-1 mb-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span className="text-[9px] text-emerald-300/50">{lang === 'zh' ? '端到端加密 · 已解密' : 'E2EE · Decrypted'}</span>
                  {cap.senderFingerprint && (
                    <span className="text-[8px] text-emerald-300/25 ml-1 font-mono" title={lang === 'zh' ? `发送者指纹: ${cap.senderFingerprint}` : `Sender fingerprint: ${cap.senderFingerprint}`}>
                      🔑 {cap.senderFingerprint.slice(0, 8)}…
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/60 leading-relaxed">{cap._decryptedContent}</p>
              </div>
            ) : cap._decryptError ? (
              <div className="mb-2 p-2 rounded-lg bg-red-500/[0.05] border border-red-500/10">
                <div className="flex items-center gap-1">
                  <KeyRound className="w-3 h-3 text-red-400/50" />
                  <span className="text-[10px] text-red-300/50">{lang === 'zh' ? '解密失败 — 你可能不是指定接收者' : 'Decryption failed — you may not be the recipient'}</span>
                </div>
              </div>
            ) : (
              <div className="mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-[10px] text-emerald-300/50">
                    <Shield className="w-3 h-3" />
                    {lang === 'zh' ? '端到端加密内容' : 'E2EE Encrypted Content'}
                  </div>
                  {user && (cap.recipientUserId === user.id || cap.userId === user.id) && (
                    <button
                      onClick={() => handleDecryptCapsule.current(cap)}
                      className="px-2 py-0.5 rounded-full text-[9px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/25 transition-all"
                    >
                      {lang === 'zh' ? '解密' : 'Decrypt'}
                    </button>
                  )}
                </div>
              </div>
            )
          ) : (
            <p className="text-xs text-white/60 leading-relaxed mb-2">{cap.content}</p>
          )}
          {cap.recipientName && (
            <p className="text-[10px] text-purple-300/50 mb-1">
              {t('spacetime.to')} {cap.recipientName}
            </p>
          )}
          {cap.songTitle && (
            <div className="flex items-center gap-1 text-[10px] text-cyan-400/50 mb-1.5">
              <Music className="w-2.5 h-2.5" />
              {cap.songTitle}
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center py-4">
          <div className="text-center">
            <Lock className="w-6 h-6 text-white/10 mx-auto mb-1" />
            <p className="text-[10px] text-white/15">{t('spacetime.locked')}</p>
          </div>
        </div>
      )}
      {/* Footer */}
      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] text-white/15">{cap.userName} · {timeAgo(cap.createdAt)}</span>
        {cap.isUnlocked && (
          <button
            onClick={() => handleLikeCapsule(cap.id)}
            className="flex items-center gap-1 text-[11px] text-white/20 hover:text-pink-400/60 transition-colors"
          >
            <Heart className="w-3 h-3" />
            {cap.likes > 0 && cap.likes}
          </button>
        )}
      </div>
    </motion.div>
  );
};
