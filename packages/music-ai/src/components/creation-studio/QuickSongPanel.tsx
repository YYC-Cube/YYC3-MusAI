// 创作工作室 · 步骤面板-极简写歌
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';
import type { AILyricsTheme, ComposingStage } from './shared';
import { QuickThemePicker } from './QuickThemePicker';
import { CreateButton } from './CreateButton';
import { LyricsPreview } from './LyricsPreview';

interface QuickSongPanelProps {
  lang: string;
  onHaptic?: (pattern: string) => void;
  quickTheme: AILyricsTheme;
  onSelectTheme: (theme: AILyricsTheme) => void;
  quickPrompt: string;
  setQuickPrompt: (v: string) => void;
  quickGenerating: boolean;
  quickComposing: ComposingStage;
  quickLyrics: string[] | null;
  unlockedPremium: Set<string>;
  user?: any;
  starPower?: number;
  onUnlockTheme: (themeId: string, cost: number) => void;
  onCreate: () => void;
  getProgressLabel: (stage: string) => string;
  copiedId: string | null;
  onCopyLyrics: (lyrics: string[], id: string) => void;
}

export const QuickSongPanel: React.FC<QuickSongPanelProps> = ({
  lang,
  onHaptic,
  quickTheme,
  onSelectTheme,
  quickPrompt,
  setQuickPrompt,
  quickGenerating,
  quickComposing,
  quickLyrics,
  unlockedPremium,
  user,
  starPower,
  onUnlockTheme,
  onCreate,
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
      {/* Theme picker */}
      <QuickThemePicker
        value={quickTheme}
        onSelect={onSelectTheme}
        unlockedPremium={unlockedPremium}
        user={user}
        starPower={starPower}
        onUnlockTheme={onUnlockTheme}
        onHaptic={onHaptic}
        lang={lang}
      />

      {/* Quick prompt */}
      <div>
        <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-2">
          {lang === 'zh' ? '灵感关键词（可选）' : 'Inspiration Keywords (optional)'}
        </p>
        <input
          type="text"
          value={quickPrompt}
          onChange={e => setQuickPrompt(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onCreate()}
          placeholder={lang === 'zh' ? '输入关键词，用逗号分隔...' : 'Enter keywords, comma separated...'}
          className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50"
        />
      </div>

      {/* One-click create */}
      <CreateButton
        onClick={onCreate}
        disabled={quickGenerating}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white font-semibold flex items-center justify-center gap-3 shadow-lg shadow-purple-500/20 disabled:opacity-50 transition-opacity text-base"
        stage={quickComposing}
        progressLabel={getProgressLabel(quickComposing)}
        doneLabel={lang === 'zh' ? '创作完成!' : 'Complete!'}
        idleIcon={<Sparkles className="w-5 h-5" />}
        idleLabel={lang === 'zh' ? '一键创作' : 'Create Now'}
      />

      {/* Generated lyrics preview */}
      <AnimatePresence>
        {quickLyrics && (
          <LyricsPreview
            title={lang === 'zh' ? '生成的歌词' : 'Generated Lyrics'}
            titleClassName="text-xs text-white/40 font-medium"
            gradient="from-purple-500/10 to-pink-500/10"
            lyrics={quickLyrics}
            copied={copiedId === 'quick'}
            onCopy={() => onCopyLyrics(quickLyrics, 'quick')}
            stepDelay={0.06}
            lang={lang}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
