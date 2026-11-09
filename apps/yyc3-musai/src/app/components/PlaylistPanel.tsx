import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Music,
  Play,
  Pause,
  Plus,
  Link,
  Upload,
  Disc3,
  Sparkles,
  Save,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import { clsx } from 'clsx';
import { ImageWithFallback } from '@yyc3/music-ui';
import type { Track, SavedPlaylist } from '@yyc3/music-data';
import { deletePlaylist, getSavedPlaylists } from '@yyc3/music-data';
import { useI18n } from '@yyc3/music-hooks';
import { useVirtualList } from '@yyc3/music-hooks';

interface PlaylistPanelProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: Track[];
  currentTrackIndex: number;
  isPlaying: boolean;
  onSelectTrack: (index: number) => void;
  onAddTrackFromFile: (file: File) => void;
  onAddTrackFromUrl: (url: string, title?: string) => void;
  /** 保存当前队列为本地歌单；未传时不显示保存入口 */
  onSaveQueue?: () => void | Promise<void>;
  /** 加载已保存歌单；未传时不显示已保存列表 */
  onLoadPlaylist?: (trackIds: string[]) => void | Promise<void>;
  /** 从队列移除单条曲目；未传时不显示移除按钮 */
  onRemoveTrack?: (index: number) => void;
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
  onSaveQueue,
  onLoadPlaylist,
  onRemoveTrack,
  audioMode,
}) => {
  const { t } = useI18n();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [savedPlaylists, setSavedPlaylists] = useState<SavedPlaylist[]>([]);
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

  // 保存成功后的短暂提示，避免新增弹窗
  useEffect(() => {
    if (!justSaved) return;
    const timer = setTimeout(() => setJustSaved(false), 1600);
    return () => clearTimeout(timer);
  }, [justSaved]);

  const handleSaveQueue = useCallback(() => {
    if (!onSaveQueue) return;
    void Promise.resolve(onSaveQueue()).then(() => {
      setJustSaved(true);
      if (onLoadPlaylist) void getSavedPlaylists().then(setSavedPlaylists);
    });
  }, [onSaveQueue, onLoadPlaylist]);

  // 打开面板时刷新已保存歌单
  useEffect(() => {
    if (!isOpen || !onLoadPlaylist) return;
    let cancelled = false;
    void getSavedPlaylists().then((list) => {
      if (!cancelled) setSavedPlaylists(list);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, onLoadPlaylist]);

  const handleDeleteSaved = useCallback(async (id: string) => {
    await deletePlaylist(id);
    setSavedPlaylists(await getSavedPlaylists());
  }, []);

  const handleLoadSaved = useCallback(
    (item: SavedPlaylist) => {
      void onLoadPlaylist?.(item.trackIds);
      setShowSaved(false);
    },
    [onLoadPlaylist]
  );

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
                {onSaveQueue && (
                  <>
                    <button
                      onClick={handleSaveQueue}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/[0.08] text-white/60 hover:text-white transition-colors"
                      aria-label={justSaved ? '已保存到本地 / Saved locally' : '保存当前队列 / Save current queue'}
                      data-testid="save-queue"
                    >
                      <Save
                        className={clsx('w-4 h-4', justSaved && 'text-emerald-400')}
                        aria-hidden="true"
                      />
                    </button>
                    {justSaved && (
                      <span role="status" className="text-[11px] text-emerald-400">
                        已保存 / Saved
                      </span>
                    )}
                  </>
                )}
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

            {/* 已保存歌单 */}
            {onLoadPlaylist && (
              <div className="border-b border-white/[0.06]">
                <button
                  onClick={() => setShowSaved((value) => !value)}
                  className="w-full flex items-center justify-between px-4 py-3 text-white/50 hover:text-white/80 transition-colors"
                  aria-expanded={showSaved}
                  aria-label="已保存歌单 / Saved playlists"
                  data-testid="toggle-saved-playlists"
                >
                  <span className="text-xs font-medium uppercase tracking-wider">
                    已保存 / Saved（{savedPlaylists.length}）
                  </span>
                  <ChevronDown
                    className={clsx('w-4 h-4 transition-transform', showSaved && 'rotate-180')}
                    aria-hidden="true"
                  />
                </button>
                <AnimatePresence>
                  {showSaved && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-3 space-y-2">
                        {savedPlaylists.length === 0 ? (
                          <p className="text-xs text-white/25">暂无已保存歌单 / No saved playlists</p>
                        ) : (
                          savedPlaylists.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/[0.06]"
                            >
                              <button
                                onClick={() => handleLoadSaved(item)}
                                className="flex-1 min-w-0 text-left"
                                aria-label={`加载 ${item.name}`}
                                data-testid={`load-playlist-${item.id}`}
                              >
                                <p className="text-sm text-white/80 truncate">{item.name}</p>
                                <p className="text-xs text-white/30">
                                  {item.trackIds.length} {t('playlist.tracks')}
                                </p>
                              </button>
                              <button
                                onClick={() => void handleDeleteSaved(item.id)}
                                className="p-1.5 rounded-md text-white/30 hover:text-red-400 hover:bg-white/10 transition-colors"
                                aria-label={`删除 ${item.name}`}
                                data-testid={`delete-playlist-${item.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

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
                  <motion.div
                    key={track.id}
                    className={clsx(
                      'w-full flex items-center gap-2 px-4 py-3 transition-all relative group',
                      isCurrent
                        ? 'bg-white/[0.06]'
                        : 'hover:bg-white/[0.03]'
                    )}
                    whileHover={{ x: 4 }}
                    transition={{ duration: 0.15 }}
                    role="listitem"
                    aria-current={isCurrent ? 'true' : undefined}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectTrack(index)}
                      className="flex flex-1 items-center gap-3 min-w-0 text-left"
                      aria-label={`${track.title} — ${track.artist}, ${formatDuration(track.duration)}`}
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
                    </button>
                    {onRemoveTrack && (
                      <button
                        type="button"
                        onClick={() => onRemoveTrack(index)}
                        className="p-1.5 rounded-md text-white/20 hover:text-red-400 hover:bg-white/10 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                        aria-label={`从队列移除 ${track.title}`}
                        data-testid={`remove-track-${track.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </motion.div>
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
