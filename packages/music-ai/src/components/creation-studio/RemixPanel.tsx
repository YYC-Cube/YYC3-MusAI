// 创作工作室 · 步骤面板-热歌改编
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { Check, Layers } from 'lucide-react';
import type { Track } from '@yyc3/music-data';
import { type AILyricsTheme, type ComposingStage } from './shared';
import { CompactThemePicker } from './CompactThemePicker';
import { CreateButton } from './CreateButton';
import { LyricsPreview } from './LyricsPreview';

interface RemixPanelProps {
  lang: string;
  onHaptic?: (pattern: string) => void;
  playlist: Track[];
  remixSourceTrack: number | null;
  onSelectTrack: (idx: number) => void;
  remixTargetTheme: AILyricsTheme;
  onSelectTargetTheme: (theme: AILyricsTheme) => void;
  remixGenerating: boolean;
  remixComposing: ComposingStage;
  remixResult: string[] | null;
  unlockedPremium: Set<string>;
  user?: any;
  starPower?: number;
  onUnlockTheme: (themeId: string, cost: number) => void;
  onRemix: () => void;
  getProgressLabel: (stage: string) => string;
  copiedId: string | null;
  onCopyLyrics: (lyrics: string[], id: string) => void;
}

export const RemixPanel: React.FC<RemixPanelProps> = ({
  lang,
  onHaptic,
  playlist,
  remixSourceTrack,
  onSelectTrack,
  remixTargetTheme,
  onSelectTargetTheme,
  remixGenerating,
  remixComposing,
  remixResult,
  unlockedPremium,
  user,
  starPower,
  onUnlockTheme,
  onRemix,
  getProgressLabel,
  copiedId,
  onCopyLyrics,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-5 space-y-5"
    >
      {/* Source track selector */}
      <div>
        <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-3">
          {lang === 'zh' ? '选择原曲' : 'Select Source Track'}
        </p>
        <div className="space-y-2 max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          {playlist.map((track, idx) => (
            <button
              key={track.id}
              onClick={() => { onSelectTrack(idx); onHaptic?.('selection'); }}
              className={clsx(
                'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                remixSourceTrack === idx
                  ? 'bg-orange-500/10 border-orange-500/20'
                  : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
              )}
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                <img src={track.albumArt} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={clsx('text-sm font-medium truncate', remixSourceTrack === idx ? 'text-orange-300' : 'text-white/70')}>
                  {track.title}
                </p>
                <p className="text-xs text-white/30">{track.artist}</p>
              </div>
              {remixSourceTrack === idx && (
                <div className="w-5 h-5 rounded-full bg-orange-500/30 border border-orange-500/50 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-orange-300" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Target theme */}
      <CompactThemePicker
        label={lang === 'zh' ? '改编风格' : 'Target Style'}
        value={remixTargetTheme}
        onSelect={onSelectTargetTheme}
        unlockedPremium={unlockedPremium}
        user={user}
        starPower={starPower}
        onUnlockTheme={onUnlockTheme}
        onHaptic={onHaptic}
        lang={lang}
      />

      {/* Remix Button */}
      <CreateButton
        onClick={onRemix}
        disabled={remixSourceTrack === null || remixGenerating}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-40"
        stage={remixComposing}
        progressLabel={getProgressLabel(remixComposing)}
        doneLabel={lang === 'zh' ? '改编完成!' : 'Remix Complete!'}
        idleIcon={<Layers className="w-5 h-5" />}
        idleLabel={lang === 'zh' ? '开始改编 (含音频重合成)' : 'Remix (with audio synthesis)'}
      />

      {/* Remix result */}
      <AnimatePresence>
        {remixResult && (
          <LyricsPreview
            title={lang === 'zh' ? '改编歌词' : 'Remixed Lyrics'}
            titleClassName="text-xs text-white/40"
            gradient="from-orange-500/10 to-red-500/10"
            lyrics={remixResult}
            copied={copiedId === 'remix'}
            onCopy={() => onCopyLyrics(remixResult, 'remix')}
            stepDelay={0.06}
            lang={lang}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
