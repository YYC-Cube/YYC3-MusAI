// 社区面板子组件 · 上传面板上传 Tab（拖放区 + 批量队列 + 全部上传）
import React from 'react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import {
  Upload, Check, CheckCircle2, XCircle, Loader2,
} from 'lucide-react';
import { BatchFileCard } from './BatchFileCard';
import { T, ACCEPT_ALL } from './shared';
import type { BatchFileItem, UploadedMedia } from './shared';

interface UploadTabProps {
  t: (key: keyof typeof T) => string;
  lang: 'zh' | 'en';
  addFilesToQueue: (files: FileList | File[]) => void;
  isDragging: boolean;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  batchFiles: BatchFileItem[];
  successCount: number;
  errorCount: number;
  clearQueue: () => void;
  isUploading: boolean;
  totalProgress: number;
  removeFromQueue: (id: string) => void;
  updateBatchItem: (id: string, updates: Partial<BatchFileItem>) => void;
  openLyricsEditor: (media: UploadedMedia) => void;
  startBatchUpload: () => Promise<void>;
  pendingCount: number;
}

export const UploadTab: React.FC<UploadTabProps> = ({
  t, lang, addFilesToQueue, isDragging, handleDragOver, handleDragLeave, handleDrop,
  fileInputRef, batchFiles, successCount, errorCount, clearQueue,
  isUploading, totalProgress, removeFromQueue, updateBatchItem,
  openLyricsEditor, startBatchUpload, pendingCount,
}) => {
  return (
    <div className="p-4 space-y-3">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={clsx(
          'border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200',
          isDragging
            ? 'border-violet-400 bg-violet-500/10 scale-[1.02]'
            : 'border-white/[0.12] hover:border-white/[0.2] bg-white/[0.02] hover:bg-white/[0.04]'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_ALL}
          multiple
          onChange={e => e.target.files && addFilesToQueue(e.target.files)}
          className="hidden"
        />
        <div className="space-y-2">
          <div className="w-12 h-12 mx-auto rounded-full bg-white/[0.04] flex items-center justify-center">
            <Upload className="w-6 h-6 text-white/30" />
          </div>
          <p className="text-sm text-white/60">{t('upload.dragDrop')}</p>
          <p className="text-xs text-white/30">
            {t('upload.or')} <span className="text-violet-400 underline">{t('upload.browse')}</span>
          </p>
          <p className="text-[10px] text-white/20">{t('upload.formats')}</p>
          <p className="text-[10px] text-white/20">{t('upload.maxSize')}</p>
        </div>
      </div>

      {/* Batch Queue */}
      {batchFiles.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          {/* Queue header */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">
              {batchFiles.length} {t('upload.filesReady')}
              {successCount > 0 && <span className="text-emerald-400 ml-2">{successCount} <Check className="w-3 h-3 inline -mt-0.5" /></span>}
              {errorCount > 0 && <span className="text-red-400 ml-2">{errorCount} <XCircle className="w-3 h-3 inline -mt-0.5" /></span>}
            </span>
            <button
              onClick={clearQueue}
              disabled={isUploading}
              className="text-[10px] text-white/30 hover:text-red-400 transition-colors disabled:opacity-30"
            >
              {t('upload.clearQueue')}
            </button>
          </div>

          {/* Overall progress */}
          {isUploading && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-white/40">{t('upload.uploading')}...</span>
                <span className="text-violet-400 font-mono">{totalProgress}%</span>
              </div>
              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full"
                  animate={{ width: `${totalProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          {/* File items */}
          <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
            {batchFiles.map(item => (
              <BatchFileCard
                key={item.id}
                item={item}
                lang={lang}
                isUploading={isUploading}
                onRemove={() => removeFromQueue(item.id)}
                onUpdate={(updates) => updateBatchItem(item.id, updates)}
                onOpenLyrics={() => {
                  if (item.result) openLyricsEditor(item.result);
                }}
              />
            ))}
          </div>

          {/* Upload All button */}
          <button
            onClick={startBatchUpload}
            disabled={pendingCount === 0 || isUploading}
            className={clsx(
              'w-full py-3 rounded-xl text-sm font-bold transition-all',
              isUploading
                ? 'bg-white/[0.06] text-white/30 cursor-wait'
                : pendingCount === 0
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-gradient-to-r from-violet-600 to-pink-600 text-white hover:from-violet-500 hover:to-pink-500 active:scale-[0.98]'
            )}
          >
            {isUploading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('upload.uploading')} ({totalProgress}%)
              </span>
            ) : pendingCount === 0 && batchFiles.length > 0 ? (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {t('upload.allDone')}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Upload className="w-4 h-4" />
                {t('upload.uploadAll')} ({pendingCount})
              </span>
            )}
          </button>
        </motion.div>
      )}
    </div>
  );
};
