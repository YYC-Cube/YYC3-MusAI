import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Music,
  Play,
  Pause,
  Plus,
  Link,
  Upload,
  GripVertical,
  Disc3,
  Sparkles,
} from 'lucide-react';
import { clsx } from 'clsx';
import { ImageWithFallback } from './figma/ImageWithFallback';
import type { Track } from '../playlistData';
import { useI18n } from '../hooks/useI18n';
import { useVirtualList } from '../hooks/useVirtualList';

interface PlaylistPanelProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: Track[];
  currentTrackIndex: number;
  isPlaying: boolean;
  onSelectTrack: (index: number) => void;
  onAddTrackFromFile: (file: File) => void;
  onAddTrackFromUrl: (url: string, title?: string) => void;
  audioMode: 'file' | 'demo';
}

export const PlaylistPanel: React.FC<PlaylistPanelProps> = ({
  isOpen,
  onClose,
  playlist,
  currentTrackIndex,
  isPlaying,
  onSelectTrack,
  onAddTrackFromFile,
  onAddTrackFromUrl,
  audioMode,
}) => {
  const { t } = useI18n();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // §9.3 — Incremental rendering for large playlists
  const { visibleCount, sentinelRef, hasMore } = useVirtualList(playlist.length, {
    initialCount: 25,
    increment: 20,
    rootRef: listContainerRef,
  });

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      const audioFile = files.find((f) =>
        f.type.startsWith('audio/') || f.name.match(/\.(mp3|wav|ogg|flac|aac|m4a|webm)$/i)
      );
      if (audioFile) {
        onAddTrackFromFile(audioFile);
      }
    },
    [onAddTrackFromFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onAddTrackFromFile(file);
      }
      e.target.value = '';
    },
    [onAddTrackFromFile]
  );

  const handleAddUrl = useCallback(() => {
    if (urlInput.trim()) {
      onAddTrackFromUrl(urlInput.trim(), titleInput.trim() || undefined);
      setUrlInput('');
      setTitleInput('');
      setShowAddMenu(false);
    }
  }, [urlInput, titleInput, onAddTrackFromUrl]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* §11.x — Panel with dialog semantics */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
            aria-label={t('playlist.title')}
            className="fixed right-0 top-0 bottom-0 z-[61] w-full max-w-md bg-[#0D1235]/95 backdrop-blur-2xl border-l border-white/10 flex flex-col shadow-2xl"
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleFileDrop}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
                  <Music className="w-4 h-4 text-blue-400" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">{t('playlist.title')}</h3>
                  <p className="text-white/30 text-xs">{playlist.length} {t('playlist.tracks')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddMenu(!showAddMenu)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/[0.08] text-white/60 hover:text-white transition-colors"
                  aria-label={t('playlist.addTrack')}
                  aria-expanded={showAddMenu}
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
                  aria-label="关闭播放列表 / Close playlist"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Add Track Menu */}
            <AnimatePresence>
              {showAddMenu && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-white/[0.06]"
                >
                  <div className="p-4 space-y-3">
                    <p className="text-xs text-white/40 font-medium uppercase tracking-wider">
                      {t('playlist.addTrack')}
                    </p>

                    {/* File upload */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/8 border border-white/[0.08] transition-colors group"
                      aria-label={t('playlist.uploadFile')}
                    >
                      <Upload className="w-4 h-4 text-blue-400 group-hover:text-blue-300" aria-hidden="true" />
                      <div className="text-left">
                        <p className="text-sm text-white/80">{t('playlist.uploadFile')}</p>
                        <p className="text-xs text-white/30">{t('playlist.fileFormats')}</p>
                      </div>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      aria-label="选择音频文件 / Select audio file"
                    />

                    {/* URL input */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Link className="w-4 h-4 text-purple-400 flex-shrink-0" aria-hidden="true" />
                        <input
                          type="url"
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          placeholder={t('playlist.pasteUrl')}
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50"
                          aria-label="音频URL / Audio URL"
                        />
                      </div>
                      {urlInput && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex gap-2"
                        >
                          <input
                            type="text"
                            value={titleInput}
                            onChange={(e) => setTitleInput(e.target.value)}
                            placeholder={t('playlist.trackTitle')}
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50"
                            aria-label="曲目标题 / Track title"
                          />
                          <button
                            onClick={handleAddUrl}
                            className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium hover:from-blue-500 hover:to-purple-500 transition-all"
                          >
                            {t('playlist.add')}
                          </button>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Drag & Drop Overlay */}
            <AnimatePresence>
              {isDragOver && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 bg-blue-500/10 backdrop-blur-sm border-2 border-dashed border-blue-400/40 rounded-lg flex items-center justify-center"
                  aria-live="polite"
                >
                  <div className="text-center">
                    <Upload className="w-10 h-10 text-blue-400 mx-auto mb-2" aria-hidden="true" />
                    <p className="text-blue-300 font-medium">{t('playlist.dropHere')}</p>
                    <p className="text-blue-300/50 text-sm">{t('playlist.fileFormats')}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* §9.3 — Track List with incremental rendering */}
            <div
              ref={listContainerRef}
              className="flex-1 overflow-y-auto py-2"
              style={{ scrollbarWidth: 'none' }}
              role="list"
              aria-label={`${t('playlist.title')} — ${playlist.length} ${t('playlist.tracks')}`}
            >
              {playlist.slice(0, visibleCount).map((track, index) => {
                const isCurrent = index === currentTrackIndex;
                const isCurrentPlaying = isCurrent && isPlaying;

                return (
                  <motion.button
                    key={track.id}
                    onClick={() => onSelectTrack(index)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-3 transition-all relative group',
                      isCurrent
                        ? 'bg-white/[0.06]'
                        : 'hover:bg-white/[0.03]'
                    )}
                    whileHover={{ x: 4 }}
                    transition={{ duration: 0.15 }}
                    role="listitem"
                    aria-label={`${track.title} — ${track.artist}, ${formatDuration(track.duration)}`}
                    aria-current={isCurrent ? 'true' : undefined}
                  >
                    {/* Active indicator */}
                    {isCurrent && (
                      <motion.div
                        layoutId="playlist-active"
                        className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-blue-500 to-purple-500 rounded-r"
                      />
                    )}

                    {/* Track number / Playing indicator */}
                    <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center" aria-hidden="true">
                      {isCurrentPlaying ? (
                        <div className="flex items-end gap-[2px] h-4">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              className="w-[3px] rounded-full bg-gradient-to-t from-blue-500 to-purple-500"
                              animate={{
                                height: ['4px', '14px', '6px', '12px', '4px'],
                              }}
                              transition={{
                                duration: 0.8,
                                repeat: Infinity,
                                delay: i * 0.15,
                                ease: 'easeInOut',
                              }}
                            />
                          ))}
                        </div>
                      ) : isCurrent ? (
                        <Pause className="w-4 h-4 text-blue-400" />
                      ) : (
                        <span className="text-xs text-white/20 font-mono group-hover:hidden">
                          {index + 1}
                        </span>
                      )}
                      {!isCurrent && (
                        <Play className="w-3.5 h-3.5 text-white/50 hidden group-hover:block" />
                      )}
                    </div>

                    {/* Album Art Thumbnail */}
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative">
                      <ImageWithFallback
                        src={track.albumArt}
                        alt={track.album}
                        className="w-full h-full object-cover"
                      />
                      {isCurrent && (
                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20" />
                      )}
                    </div>

                    {/* Track Info */}
                    <div className="flex-1 min-w-0 text-left">
                      <p
                        className={clsx(
                          'text-sm font-medium truncate',
                          isCurrent
                            ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400'
                            : 'text-white/80'
                        )}
                      >
                        {track.title}
                      </p>
                      <p className="text-xs text-white/30 truncate">{track.artist}</p>
                    </div>

                    {/* Duration & Mode Badge */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {track.audioUrl && (
                        <span className="text-[9px] uppercase tracking-wider text-emerald-400/60 bg-emerald-400/10 px-1.5 py-0.5 rounded-full border border-emerald-400/20 font-medium">
                          HD
                        </span>
                      )}
                      {!track.audioUrl && (
                        <Sparkles className="w-3 h-3 text-purple-400/40" aria-hidden="true" />
                      )}
                      <span className="text-xs text-white/20 font-mono tabular-nums">
                        {formatDuration(track.duration)}
                      </span>
                    </div>
                  </motion.button>
                );
              })}

              {/* §9.3 — Sentinel for incremental loading */}
              {hasMore && (
                <div ref={sentinelRef} className="flex items-center justify-center py-4">
                  <div className="flex items-center gap-2 text-white/20 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" />
                    <span>加载更多 / Loading more...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/[0.06]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/20">
                  <Disc3 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="text-xs">
                    {audioMode === 'file' ? t('playlist.playingFile') : t('playlist.demoMode')}
                  </span>
                </div>
                <p className="text-[10px] text-white/15">
                  {t('playlist.dragDrop')}
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
