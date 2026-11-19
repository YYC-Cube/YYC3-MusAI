// 创作工作室 · 步骤面板-作品管理
import React from 'react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { Music, Clock, Copy, Check, Trash2, Share2, Film } from 'lucide-react';
import { THEMES, MODES, type CreatedWork } from './shared';

interface WorksPanelProps {
  lang: string;
  works: CreatedWork[];
  onStartCreate: () => void;
  copiedId: string | null;
  onCopyLyrics: (lyrics: string[], id: string) => void;
  deleteWork: (id: string) => void;
  formatDate: (ts: number) => string;
  onShareWork?: (work: CreatedWork) => void;
  onOpenMV?: (workLyrics?: string[]) => void;
}

export const WorksPanel: React.FC<WorksPanelProps> = ({
  lang,
  works,
  onStartCreate,
  copiedId,
  onCopyLyrics,
  deleteWork,
  formatDate,
  onShareWork,
  onOpenMV,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-5"
    >
      {works.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <Music className="w-7 h-7 text-white/20" />
          </div>
          <p className="text-white/30 text-sm text-center">
            {lang === 'zh' ? '还没有创作作品\n去创作你的第一首歌吧!' : 'No works yet\nCreate your first song!'}
          </p>
          <button
            onClick={onStartCreate}
            className="px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm hover:bg-purple-500/20 transition-colors"
          >
            {lang === 'zh' ? '开始创作' : 'Start Creating'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-3">
            {lang === 'zh' ? `${works.length} 首作品` : `${works.length} Works`}
          </p>
          {works.map((work, idx) => {
            const theme = THEMES.find(t => t.id === work.theme);
            const ThemeIcon = theme?.icon || Music;
            const modeInfo = MODES.find(m => m.id === work.mode);
            return (
              <motion.div
                key={work.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 group"
              >
                <div className="flex items-start gap-3">
                  <div className={clsx(
                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br',
                    theme?.bg || 'from-white/5 to-white/5'
                  )}>
                    <ThemeIcon className={clsx('w-5 h-5', theme?.color || 'text-white/30')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-white/80 truncate">{work.title}</p>
                      <span className="text-[9px] text-white/20 bg-white/5 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        {modeInfo ? (lang === 'zh' ? modeInfo.labelZh : modeInfo.label) : work.mode}
                      </span>
                    </div>
                    <p className="text-xs text-white/25 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(work.createdAt)}
                    </p>
                    {/* Lyrics preview */}
                    <p className="text-xs text-white/30 mt-2 line-clamp-2 italic">
                      "{work.lyrics.slice(0, 2).join(' / ')}"
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={() => onCopyLyrics(work.lyrics, work.id)}
                      className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
                      title={lang === 'zh' ? '复制歌词' : 'Copy lyrics'}
                    >
                      {copiedId === work.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => deleteWork(work.id)}
                      className="p-1.5 rounded-lg text-white/30 hover:text-red-400/60 hover:bg-red-500/5 transition-colors"
                      title={lang === 'zh' ? '删除' : 'Delete'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {onShareWork && (
                      <button
                        onClick={() => onShareWork(work)}
                        className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
                        title={lang === 'zh' ? '分享作品' : 'Share work'}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onOpenMV && (
                      <button
                        onClick={() => onOpenMV(work.lyrics)}
                        className="p-1.5 rounded-lg text-white/30 hover:text-cyan-400/60 hover:bg-cyan-500/5 transition-colors"
                        title={lang === 'zh' ? '从此作品创建MV' : 'Create MV from this work'}
                      >
                        <Film className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};
