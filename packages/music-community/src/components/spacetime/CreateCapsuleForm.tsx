// 社区面板子组件 · 时空墙胶囊创建表单（含 E2EE 加密开关）
import React, { Dispatch, SetStateAction } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Music, Shield, ShieldCheck, KeyRound, Sparkles, Package } from 'lucide-react';
import { clsx } from 'clsx';
import type { TranslationKey, Lang } from '@yyc3/music-hooks';
import { EMOTIONS } from './shared';

interface CreateCapsuleFormProps {
  user: any;
  capTitle: string;
  setCapTitle: Dispatch<SetStateAction<string>>;
  capContent: string;
  setCapContent: Dispatch<SetStateAction<string>>;
  capUnlockAt: string;
  setCapUnlockAt: Dispatch<SetStateAction<string>>;
  capRecipient: string;
  setCapRecipient: Dispatch<SetStateAction<string>>;
  capEmotion: string;
  setCapEmotion: Dispatch<SetStateAction<string>>;
  capLinkSong: boolean;
  setCapLinkSong: Dispatch<SetStateAction<boolean>>;
  currentTrackTitle?: string;
  capEncrypt: boolean;
  setCapEncrypt: Dispatch<SetStateAction<boolean>>;
  capRecipientId: string;
  setCapRecipientId: Dispatch<SetStateAction<string>>;
  e2eeReady: boolean;
  e2eeChecked: boolean;
  e2eePromptVisible: boolean;
  setE2eePromptVisible: Dispatch<SetStateAction<boolean>>;
  capCreatedFlash: boolean;
  capCreating: boolean;
  handleCreateCapsule: () => Promise<void>;
  t: (key: TranslationKey) => string;
  lang: Lang;
}

export const CreateCapsuleForm: React.FC<CreateCapsuleFormProps> = ({
  user, capTitle, setCapTitle, capContent, setCapContent,
  capUnlockAt, setCapUnlockAt, capRecipient, setCapRecipient,
  capEmotion, setCapEmotion, capLinkSong, setCapLinkSong,
  currentTrackTitle, capEncrypt, setCapEncrypt, capRecipientId,
  setCapRecipientId, e2eeReady, e2eeChecked, e2eePromptVisible,
  setE2eePromptVisible, capCreatedFlash, capCreating, handleCreateCapsule, t, lang,
}) => {
  return (
    <React.Fragment>
      {/* Create Capsule Form */}
      {user ? (
        <div className="mb-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <input
            value={capTitle}
            onChange={e => setCapTitle(e.target.value)}
            placeholder={t('spacetime.capsuleTitle')}
            maxLength={100}
            className="w-full bg-transparent text-white text-sm placeholder:text-white/20 outline-none mb-2"
          />
          <textarea
            value={capContent}
            onChange={e => setCapContent(e.target.value)}
            placeholder={t('spacetime.capsuleContent')}
            maxLength={1000}
            rows={3}
            className="w-full bg-transparent text-white/80 text-xs placeholder:text-white/15 resize-none outline-none border-t border-white/[0.04] pt-2"
          />
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <label className="text-[10px] text-white/25 mb-1 block">{t('spacetime.capsuleUnlockAt')}</label>
              <input
                type="datetime-local"
                value={capUnlockAt}
                onChange={e => setCapUnlockAt(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1 text-[11px] text-white/70 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/25 mb-1 block">{t('spacetime.capsuleRecipient')}</label>
              <input
                value={capRecipient}
                onChange={e => setCapRecipient(e.target.value)}
                placeholder={t('spacetime.capsuleRecipient')}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1 text-[11px] text-white/70 outline-none placeholder:text-white/15"
              />
            </div>
          </div>
          {/* Emotion + Link Song */}
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {EMOTIONS.slice(0, 5).map(emo => (
              <button
                key={emo.key}
                onClick={() => setCapEmotion(emo.key)}
                className={clsx(
                  'px-2 py-0.5 rounded-full text-[10px] border transition-all',
                  capEmotion === emo.key
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'border-transparent text-white/30 hover:text-white/50'
                )}
              >
                {emo.emoji}
              </button>
            ))}
            <button
              onClick={() => setCapLinkSong(!capLinkSong)}
              className={clsx(
                'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border transition-all ml-auto',
                capLinkSong ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300' : 'border-white/[0.06] text-white/25 hover:text-white/40'
              )}
            >
              <Music className="w-2.5 h-2.5" />
              {t('spacetime.linkSong')}
            </button>
          </div>
          {capLinkSong && currentTrackTitle && (
            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-cyan-300/60">
              <Music className="w-2.5 h-2.5" />
              {currentTrackTitle}
            </div>
          )}
          {/* E2EE Encryption Toggle */}
          {e2eeReady ? (
            <div className="mt-2 p-2 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/10">
              <button
                onClick={() => setCapEncrypt(!capEncrypt)}
                className={clsx(
                  'flex items-center gap-1.5 text-[10px] transition-all w-full',
                  capEncrypt ? 'text-emerald-300' : 'text-white/30 hover:text-emerald-300/60'
                )}
              >
                {capEncrypt ? <ShieldCheck className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                {lang === 'zh' ? (capEncrypt ? '端到端加密已开启' : '开启端到端加密') : (capEncrypt ? 'E2EE Enabled' : 'Enable E2E Encryption')}
              </button>
              {capEncrypt && (
                <div className="mt-1.5">
                  <input
                    value={capRecipientId}
                    onChange={e => setCapRecipientId(e.target.value)}
                    placeholder={lang === 'zh' ? '接收者用户ID (必填)' : 'Recipient User ID (required)'}
                    className="w-full bg-white/[0.04] border border-emerald-500/15 rounded-lg px-2 py-1 text-[10px] text-white/70 outline-none placeholder:text-white/15"
                  />
                  <p className="text-[9px] text-emerald-300/30 mt-1">
                    {lang === 'zh'
                      ? '内容将使用RSA-OAEP + AES-GCM-256加密，仅接收者可解密'
                      : 'Content encrypted with RSA-OAEP + AES-GCM-256, only recipient can decrypt'}
                  </p>
                </div>
              )}
            </div>
          ) : e2eeChecked && user ? (
            <div className="mt-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <button
                onClick={() => setE2eePromptVisible(true)}
                className="flex items-center gap-1.5 text-[10px] text-white/25 hover:text-emerald-300/50 transition-all w-full"
              >
                <KeyRound className="w-3.5 h-3.5" />
                {lang === 'zh' ? '设置E2EE密钥以启用加密胶囊' : 'Set up E2EE keys to enable encrypted capsules'}
              </button>
              <AnimatePresence>
                {e2eePromptVisible && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="text-[9px] text-white/20 mt-1.5 leading-relaxed">
                      {lang === 'zh'
                        ? '你尚未设置端到端加密密钥。请通过侧边栏菜单打开「E2EE密钥设置」面板完成配置，然后即可发送加密胶囊消息。'
                        : 'You have not set up E2EE keys yet. Open the "E2EE Key Setup" panel from the sidebar menu to complete configuration, then you can send encrypted capsule messages.'}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : null}
          {/* Create button */}
          <div className="flex justify-end mt-3">
            <button
              onClick={handleCreateCapsule}
              disabled={!capTitle.trim() || !capContent.trim() || !capUnlockAt || capCreating}
              className={clsx(
                'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all',
                capCreatedFlash
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-30'
              )}
            >
              {capCreatedFlash ? <Sparkles className="w-3.5 h-3.5" /> : <Package className="w-3.5 h-3.5" />}
              {capCreatedFlash ? t('spacetime.capsuleCreated') : capCreating ? t('spacetime.creating') : t('spacetime.createCapsule')}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
          <p className="text-xs text-white/30">{t('spacetime.signInRequired')}</p>
        </div>
      )}
    </React.Fragment>
  );
};
