// 创作工作室 · 步骤面板-大师写歌
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { Plus, Minus, X, Wand2 } from 'lucide-react';
import { STRUCTURES, INSTRUMENTS, type AILyricsTheme, type ComposingStage } from './shared';
import { CompactThemePicker } from './CompactThemePicker';
import { CreateButton } from './CreateButton';
import { LyricsPreview } from './LyricsPreview';

interface MasterPanelProps {
  lang: string;
  onHaptic?: (pattern: string) => void;
  masterTheme: AILyricsTheme;
  onSelectTheme: (theme: AILyricsTheme) => void;
  masterKeywords: string[];
  setMasterKeywords: (v: string[] | ((prev: string[]) => string[])) => void;
  masterKwInput: string;
  setMasterKwInput: (v: string) => void;
  addMasterKeyword: () => void;
  masterStructure: string;
  setMasterStructure: (id: string) => void;
  masterInstruments: string[];
  toggleInstrument: (id: string) => void;
  masterLineCount: number;
  setMasterLineCount: (v: number) => void;
  masterTempo: number;
  setMasterTempo: (v: number) => void;
  masterGenerating: boolean;
  masterComposing: ComposingStage;
  masterLyrics: string[] | null;
  unlockedPremium: Set<string>;
  user?: any;
  starPower?: number;
  onUnlockTheme: (themeId: string, cost: number) => void;
  onCreate: () => void;
  getProgressLabel: (stage: string) => string;
  copiedId: string | null;
  onCopyLyrics: (lyrics: string[], id: string) => void;
}

export const MasterPanel: React.FC<MasterPanelProps> = ({
  lang,
  onHaptic,
  masterTheme,
  onSelectTheme,
  masterKeywords,
  setMasterKeywords,
  masterKwInput,
  setMasterKwInput,
  addMasterKeyword,
  masterStructure,
  setMasterStructure,
  masterInstruments,
  toggleInstrument,
  masterLineCount,
  setMasterLineCount,
  masterTempo,
  setMasterTempo,
  masterGenerating,
  masterComposing,
  masterLyrics,
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
      {/* Theme */}
      <CompactThemePicker
        label={lang === 'zh' ? '情绪基调' : 'Emotional Base'}
        value={masterTheme}
        onSelect={onSelectTheme}
        unlockedPremium={unlockedPremium}
        user={user}
        starPower={starPower}
        onUnlockTheme={onUnlockTheme}
        onHaptic={onHaptic}
        lang={lang}
      />

      {/* Keywords */}
      <div>
        <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-2">
          {lang === 'zh' ? '创作关键词' : 'Keywords'} <span className="text-white/20">({masterKeywords.length}/8)</span>
        </p>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={masterKwInput}
            onChange={e => setMasterKwInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addMasterKeyword()}
            placeholder={lang === 'zh' ? '添加关键词...' : 'Add keyword...'}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50"
          />
          <button
            onClick={addMasterKeyword}
            disabled={!masterKwInput.trim() || masterKeywords.length >= 8}
            className="p-2 rounded-lg bg-white/5 border border-white/[0.08] text-white/60 hover:text-white transition-colors disabled:opacity-30"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {masterKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {masterKeywords.map(kw => (
              <span key={kw} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs text-indigo-300">
                {kw}
                <button onClick={() => setMasterKeywords(p => p.filter(k => k !== kw))} className="text-indigo-400/60 hover:text-indigo-300">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Structure */}
      <div>
        <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-2">
          {lang === 'zh' ? '歌曲结构' : 'Song Structure'}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {STRUCTURES.map(s => (
            <button
              key={s.id}
              onClick={() => setMasterStructure(s.id)}
              className={clsx(
                'py-2 px-3 rounded-lg border text-xs transition-all',
                masterStructure === s.id
                  ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                  : 'bg-white/[0.02] border-white/[0.06] text-white/40 hover:bg-white/[0.05]'
              )}
            >
              {lang === 'zh' ? s.labelZh : s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Instruments */}
      <div>
        <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-2">
          {lang === 'zh' ? '乐器编排' : 'Instruments'}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {INSTRUMENTS.map(inst => (
            <button
              key={inst.id}
              onClick={() => toggleInstrument(inst.id)}
              className={clsx(
                'py-2 px-3 rounded-lg border text-xs transition-all flex items-center gap-1.5',
                masterInstruments.includes(inst.id)
                  ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                  : 'bg-white/[0.02] border-white/[0.06] text-white/40 hover:bg-white/[0.05]'
              )}
            >
              <span>{inst.emoji}</span>
              <span>{lang === 'zh' ? inst.labelZh : inst.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Line Count + Tempo */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-2">
            {lang === 'zh' ? '歌词行数' : 'Lines'}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setMasterLineCount(Math.max(4, masterLineCount - 2))}
              className="p-1.5 rounded-lg bg-white/5 border border-white/[0.08] text-white/60 hover:text-white transition-colors">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-lg font-bold text-white font-mono flex-1 text-center">{masterLineCount}</span>
            <button onClick={() => setMasterLineCount(Math.min(20, masterLineCount + 2))}
              className="p-1.5 rounded-lg bg-white/5 border border-white/[0.08] text-white/60 hover:text-white transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div>
          <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-2">
            {lang === 'zh' ? '速度 BPM' : 'Tempo BPM'}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setMasterTempo(Math.max(60, masterTempo - 10))}
              className="p-1.5 rounded-lg bg-white/5 border border-white/[0.08] text-white/60 hover:text-white transition-colors">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-lg font-bold text-white font-mono flex-1 text-center">{masterTempo}</span>
            <button onClick={() => setMasterTempo(Math.min(200, masterTempo + 10))}
              className="p-1.5 rounded-lg bg-white/5 border border-white/[0.08] text-white/60 hover:text-white transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Create Button */}
      <CreateButton
        onClick={onCreate}
        disabled={masterGenerating}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
        stage={masterComposing}
        progressLabel={getProgressLabel(masterComposing)}
        doneLabel={lang === 'zh' ? '大师之作完成!' : 'Masterpiece Complete!'}
        idleIcon={<Wand2 className="w-5 h-5" />}
        idleLabel={lang === 'zh' ? '开始创作' : 'Start Creating'}
      />

      {/* Master lyrics preview */}
      <AnimatePresence>
        {masterLyrics && (
          <LyricsPreview
            title={lang === 'zh' ? '大师之作' : 'Master Work'}
            titleClassName="text-xs text-white/40"
            gradient="from-indigo-500/10 to-blue-500/10"
            lyrics={masterLyrics}
            copied={copiedId === 'master'}
            onCopy={() => onCopyLyrics(masterLyrics, 'master')}
            stepDelay={0.05}
            lang={lang}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
