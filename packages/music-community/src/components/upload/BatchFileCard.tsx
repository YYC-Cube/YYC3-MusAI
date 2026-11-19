// 社区面板子组件 · 上传面板批量文件卡片（状态 / 进度 / 元数据表单 / 封面）
import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import {
  X, FileAudio, FileVideo, ChevronDown, ChevronUp, PenLine,
  CheckCircle2, XCircle, Loader2,
} from 'lucide-react';
import { Image as ImageIcon } from 'lucide-react';
import { T, GENRES, ACCEPT_IMAGE, MAX_COVER_SIZE, formatFileSize, formatDuration } from './shared';
import type { BatchFileItem } from './shared';

// ==========================================
// Sub-component: Batch File Card
// ==========================================

export const BatchFileCard: React.FC<{
  item: BatchFileItem;
  lang: 'zh' | 'en';
  isUploading: boolean;
  onRemove: () => void;
  onUpdate: (updates: Partial<BatchFileItem>) => void;
  onOpenLyrics: () => void;
}> = ({ item, lang, isUploading, onRemove, onUpdate, onOpenLyrics }) => {
  const t = (key: keyof typeof T) => T[key][lang];
  const coverInputRef = useRef<HTMLInputElement>(null);

  const isAudio = !item.file.type.startsWith('video/');
  const statusIcon = item.status === 'success'
    ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
    : item.status === 'error'
      ? <XCircle className="w-4 h-4 text-red-400" />
      : item.status === 'uploading'
        ? <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
        : isAudio
          ? <FileAudio className="w-4 h-4 text-white/30" />
          : <FileVideo className="w-4 h-4 text-white/30" />;

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || f.size > MAX_COVER_SIZE) return;
    onUpdate({ coverFile: f, coverPreview: URL.createObjectURL(f) });
  };

  return (
    <motion.div layout className="rounded-xl bg-white/[0.02] border border-white/[0.05] overflow-hidden">
      {/* Summary row */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        {/* Status icon */}
        <div className="flex-shrink-0">{statusIcon}</div>

        {/* File name + size */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/80 font-medium truncate">{item.title || item.file.name}</p>
          <div className="flex items-center gap-2 text-[10px] text-white/30">
            <span>{formatFileSize(item.file.size)}</span>
            {item.duration > 0 && <span>{formatDuration(item.duration)}</span>}
            {item.status === 'uploading' && <span className="text-violet-400 font-mono">{item.progress}%</span>}
          </div>
        </div>

        {/* Actions */}
        {item.status === 'pending' && !isUploading && (
          <>
            <button
              onClick={() => onUpdate({ expanded: !item.expanded })}
              className="w-6 h-6 rounded text-white/20 hover:text-white/50 flex items-center justify-center transition-colors"
            >
              {item.expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onRemove}
              className="w-6 h-6 rounded text-white/20 hover:text-red-400 flex items-center justify-center transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        {item.status === 'success' && isAudio && (
          <button
            onClick={onOpenLyrics}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-violet-400/60 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
            title={lang === 'zh' ? '编辑歌词' : 'Edit lyrics'}
          >
            <PenLine className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Progress bar */}
      {item.status === 'uploading' && (
        <div className="px-3 pb-2">
          <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full"
              animate={{ width: `${item.progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Error message */}
      {item.status === 'error' && item.error && (
        <div className="px-3 pb-2">
          <p className="text-[10px] text-red-400/70 truncate">{item.error}</p>
        </div>
      )}

      {/* Expanded metadata form */}
      <AnimatePresence>
        {item.expanded && item.status === 'pending' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2 border-t border-white/[0.04] pt-2">
              {/* Title */}
              <input
                type="text"
                value={item.title}
                onChange={e => onUpdate({ title: e.target.value })}
                maxLength={200}
                placeholder={t('upload.songTitle')}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-violet-400/40 transition-colors"
              />

              {/* Artist + Album */}
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={item.artist}
                  onChange={e => onUpdate({ artist: e.target.value })}
                  maxLength={100}
                  placeholder={t('upload.artist')}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-violet-400/40 transition-colors"
                />
                <input
                  type="text"
                  value={item.album}
                  onChange={e => onUpdate({ album: e.target.value })}
                  maxLength={200}
                  placeholder={t('upload.album')}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-violet-400/40 transition-colors"
                />
              </div>

              {/* Genre + Tags */}
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={item.genre}
                  onChange={e => onUpdate({ genre: e.target.value })}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-violet-400/40 transition-colors appearance-none"
                >
                  {GENRES.map(g => (
                    <option key={g} value={g} className="bg-[#0D1235] text-white">{g}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={item.tags}
                  onChange={e => onUpdate({ tags: e.target.value })}
                  placeholder={t('upload.tags')}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-violet-400/40 transition-colors"
                />
              </div>

              {/* Cover + Public toggle */}
              <div className="flex items-center gap-3">
                <input
                  ref={coverInputRef}
                  type="file"
                  accept={ACCEPT_IMAGE}
                  onChange={handleCoverSelect}
                  className="hidden"
                />
                {item.coverPreview ? (
                  <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0">
                    <img src={item.coverPreview} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => {
                        if (item.coverPreview) URL.revokeObjectURL(item.coverPreview);
                        onUpdate({ coverFile: null, coverPreview: null });
                      }}
                      className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center"
                    >
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => coverInputRef.current?.click()}
                    className="w-10 h-10 rounded border border-dashed border-white/[0.12] flex items-center justify-center hover:border-white/[0.2] transition-colors flex-shrink-0"
                  >
                    <ImageIcon className="w-4 h-4 text-white/15" />
                  </button>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => onUpdate({ isPublic: true })}
                    className={clsx(
                      'px-2 py-1 rounded-full text-[10px] font-medium transition-all',
                      item.isPublic ? 'bg-violet-500/20 text-violet-300 ring-1 ring-violet-400/30' : 'bg-white/[0.04] text-white/30'
                    )}
                  >
                    {t('upload.public')}
                  </button>
                  <button
                    onClick={() => onUpdate({ isPublic: false })}
                    className={clsx(
                      'px-2 py-1 rounded-full text-[10px] font-medium transition-all',
                      !item.isPublic ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/30' : 'bg-white/[0.04] text-white/30'
                    )}
                  >
                    {t('upload.private')}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
