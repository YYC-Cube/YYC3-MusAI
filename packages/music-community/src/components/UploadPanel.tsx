/**
 * D-Music $27 -- Media Upload Panel (batch upload, chunked progress, lyrics editor)
 *
 * Features:
 *   - Batch upload: select/drop multiple files at once
 *   - Per-file metadata editing (title, artist, album, genre, tags)
 *   - Chunked upload with real percentage progress per file
 *   - Post-upload inline lyrics editor with timestamp sync
 *   - My uploads list with preview, delete, lyrics editing
 *   - i18n (zh/en)
 *
 * Supported formats:
 *   Audio: MP3, WAV, FLAC, OGG, M4A, WebM, AAC
 *   Video: MP4, WebM, MOV
 * Max file size: 10MB per file
 */

// 社区面板 · 上传面板（组装层：队列状态编排 + 区块装配；子组件 / 逻辑 / 类型见 ./upload/）

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { apiFetch } from '@yyc3/music-utils';
import { useBatchUpload } from './upload/useBatchUpload';
import { PanelHeader } from './upload/PanelHeader';
import { UploadTab } from './upload/UploadTab';
import { MyUploadsTab } from './upload/MyUploadsTab';
import { LyricsTab } from './upload/LyricsTab';
import { T, MAX_BATCH, MAX_FILE_SIZE, getAudioDuration, isValidMediaFile } from './upload/shared';
import type { UploadedMedia, BatchFileItem } from './upload/shared';

interface UploadPanelProps {
  onClose: () => void;
  userId: string;
  userName: string;
  lang: 'zh' | 'en';
  onUploadComplete?: (media: UploadedMedia) => void;
}

// ==========================================
// Main Component
// ==========================================

export const UploadPanel: React.FC<UploadPanelProps> = ({
  onClose,
  userId,
  userName,
  lang,
  onUploadComplete,
}) => {
  const t = (key: keyof typeof T) => T[key][lang];

  // Batch queue
  const [batchFiles, setBatchFiles] = useState<BatchFileItem[]>([]);
  const [activeTab, setActiveTab] = useState<'upload' | 'list' | 'lyrics'>('upload');

  // My uploads
  const [myUploads, setMyUploads] = useState<UploadedMedia[]>([]);
  const [loadingUploads, setLoadingUploads] = useState(false);

  // Lyrics editor target
  const [lyricsTarget, setLyricsTarget] = useState<UploadedMedia | null>(null);

  // Playing preview
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user uploads on mount
  useEffect(() => {
    loadMyUploads();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMyUploads = async () => {
    setLoadingUploads(true);
    try {
      const data = await apiFetch<{ media: UploadedMedia[] }>(`/upload/media?userId=${userId}`);
      if (data?.media) {
        setMyUploads(data.media);
      }
    } catch (err) {
      console.error('[Upload] Failed to load uploads:', err);
    } finally {
      setLoadingUploads(false);
    }
  };

  // ============================================
  // File Selection (batch)
  // ============================================

  const addFilesToQueue = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    const newItems: BatchFileItem[] = [];

    for (const file of arr) {
      if (batchFiles.length + newItems.length >= MAX_BATCH) break;
      if (file.size > MAX_FILE_SIZE) continue;
      if (!isValidMediaFile(file)) continue;

      const dur = await getAudioDuration(file);
      const name = file.name.replace(/\.[^/.]+$/, '');

      newItems.push({
        id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        file,
        title: name,
        artist: userName || 'Unknown Artist',
        album: 'My Collection',
        genre: 'Other',
        tags: '',
        description: '',
        isPublic: true,
        coverFile: null,
        coverPreview: null,
        duration: dur,
        status: 'pending',
        progress: 0,
        error: '',
        result: null,
        expanded: arr.length === 1, // auto-expand if single file
      });
    }

    setBatchFiles(prev => [...prev, ...newItems]);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) addFilesToQueue(e.dataTransfer.files);
  };

  const removeFromQueue = (id: string) => {
    setBatchFiles(prev => {
      const item = prev.find(f => f.id === id);
      if (item?.coverPreview) URL.revokeObjectURL(item.coverPreview);
      return prev.filter(f => f.id !== id);
    });
  };

  const updateBatchItem = (id: string, updates: Partial<BatchFileItem>) => {
    setBatchFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const clearQueue = () => {
    batchFiles.forEach(f => { if (f.coverPreview) URL.revokeObjectURL(f.coverPreview); });
    setBatchFiles([]);
  };

  const { isUploading, startBatchUpload } = useBatchUpload({
    batchFiles, userId, userName, updateBatchItem, setMyUploads, onUploadComplete,
  });

  // ============================================
  // Delete & Preview
  // ============================================

  const handleDelete = async (mediaId: string) => {
    try {
      const result = await apiFetch<{ success: boolean }>(`/upload/media/${mediaId}`, { method: 'DELETE' });
      if (result?.success) {
        setMyUploads(prev => prev.filter(m => m.id !== mediaId));
        if (lyricsTarget?.id === mediaId) setLyricsTarget(null);
      }
    } catch (err) {
      console.error('[Upload] Delete error:', err);
    }
  };

  const togglePreview = (media: UploadedMedia) => {
    if (playingId === media.id) {
      audioPreviewRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioPreviewRef.current) audioPreviewRef.current.pause();
      if (media.signedUrl) {
        const audio = new Audio(media.signedUrl);
        audioPreviewRef.current = audio;
        audio.play().catch(() => {});
        audio.onended = () => setPlayingId(null);
        setPlayingId(media.id);
      }
    }
  };

  const openLyricsEditor = (media: UploadedMedia) => {
    setLyricsTarget(media);
    setActiveTab('lyrics');
  };

  // ============================================
  // Computed
  // ============================================

  const pendingCount = batchFiles.filter(f => f.status === 'pending').length;
  const successCount = batchFiles.filter(f => f.status === 'success').length;
  const errorCount = batchFiles.filter(f => f.status === 'error').length;
  const totalProgress = batchFiles.length > 0
    ? Math.round(batchFiles.reduce((sum, f) => sum + f.progress, 0) / batchFiles.length)
    : 0;

  // ==========================================
  // Render
  // ==========================================

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed right-0 top-0 h-full w-full max-w-lg bg-[#0D1235]/95 backdrop-blur-xl border-l border-white/[0.08] z-50 flex flex-col shadow-2xl"
    >
      <PanelHeader
        t={t}
        onClose={onClose}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        myUploads={myUploads}
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* =================== UPLOAD TAB =================== */}
        {activeTab === 'upload' && (
          <UploadTab
            t={t}
            lang={lang}
            addFilesToQueue={addFilesToQueue}
            isDragging={isDragging}
            handleDragOver={handleDragOver}
            handleDragLeave={handleDragLeave}
            handleDrop={handleDrop}
            fileInputRef={fileInputRef}
            batchFiles={batchFiles}
            successCount={successCount}
            errorCount={errorCount}
            clearQueue={clearQueue}
            isUploading={isUploading}
            totalProgress={totalProgress}
            removeFromQueue={removeFromQueue}
            updateBatchItem={updateBatchItem}
            openLyricsEditor={openLyricsEditor}
            startBatchUpload={startBatchUpload}
            pendingCount={pendingCount}
          />
        )}

        {/* =================== LIST TAB =================== */}
        {activeTab === 'list' && (
          <MyUploadsTab
            t={t}
            loadingUploads={loadingUploads}
            myUploads={myUploads}
            playingId={playingId}
            togglePreview={togglePreview}
            openLyricsEditor={openLyricsEditor}
            handleDelete={handleDelete}
          />
        )}

        {/* =================== LYRICS TAB =================== */}
        {activeTab === 'lyrics' && (
          <LyricsTab
            t={t}
            lang={lang}
            lyricsTarget={lyricsTarget}
            setLyricsTarget={setLyricsTarget}
            setActiveTab={setActiveTab}
          />
        )}
      </div>
    </motion.div>
  );
};
