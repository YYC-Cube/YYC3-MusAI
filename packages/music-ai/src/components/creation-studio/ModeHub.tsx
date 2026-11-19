// 创作工作室 · 步骤面板-模式选择 Hub
import React from 'react';
import { motion } from 'motion/react';
import { Music, Sparkles, ChevronRight, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import { MODES, type CreationMode } from './shared';

interface ModeHubProps {
  worksCount: number;
  onSelectMode: (id: CreationMode) => void;
  onOpenMV?: () => void;
  onHaptic?: (pattern: string) => void;
  lang: string;
}

export const ModeHub: React.FC<ModeHubProps> = ({ worksCount, onSelectMode, onOpenMV, onHaptic, lang }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-5 space-y-3"
    >
      {MODES.map((mode, idx) => {
        const Icon = mode.icon;
        return (
          <motion.button
            key={mode.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.08 }}
            onClick={() => {
              if (mode.id === 'mv') {
                onOpenMV?.();
                onHaptic?.('selection');
                return;
              }
              onSelectMode(mode.id);
              onHaptic?.('selection');
            }}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all group text-left"
          >
            <div className={clsx(
              'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0',
              mode.gradient
            )}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">
                {lang === 'zh' ? mode.labelZh : mode.label}
              </p>
              <p className="text-xs text-white/30 mt-0.5">
                {lang === 'zh' ? mode.descZh : mode.desc}
              </p>
            </div>
            {mode.id === 'mv' ? (
              <ExternalLink className="w-4 h-4 text-cyan-400/40 group-hover:text-cyan-400/70 transition-colors flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors flex-shrink-0" />
            )}
          </motion.button>
        );
      })}

      {/* Stats row */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.04]">
        <div className="flex items-center gap-1.5 text-white/20 text-xs">
          <Music className="w-3.5 h-3.5" />
          <span>{lang === 'zh' ? `${worksCount} 首作品` : `${worksCount} works`}</span>
        </div>
        <div className="flex items-center gap-1.5 text-white/20 text-xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{lang === 'zh' ? 'AI驱动创作' : 'AI-powered creation'}</span>
        </div>
      </div>
    </motion.div>
  );
};
