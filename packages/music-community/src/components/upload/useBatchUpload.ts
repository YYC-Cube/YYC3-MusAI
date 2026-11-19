// 社区面板逻辑层 · 上传面板批量分片上传（进度 / 取消 / 编排）
import { useState, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { apiFetch } from '@yyc3/music-utils';
import { CHUNK_SIZE_BYTES, fileToBase64, fileSliceToBase64 } from './shared';
import type { BatchFileItem, UploadedMedia } from './shared';

interface UseBatchUploadParams {
  batchFiles: BatchFileItem[];
  userId: string;
  userName: string;
  updateBatchItem: (id: string, updates: Partial<BatchFileItem>) => void;
  setMyUploads: Dispatch<SetStateAction<UploadedMedia[]>>;
  onUploadComplete?: (media: UploadedMedia) => void;
}

export function useBatchUpload({
  batchFiles, userId, userName, updateBatchItem, setMyUploads, onUploadComplete,
}: UseBatchUploadParams) {
  const [isUploading, setIsUploading] = useState(false);

  // Abort controller for cancellation
  const abortRef = useRef(false);

  // ============================================
  // Chunked Upload with Progress
  // ============================================

  /** Upload a single file using chunked upload with real progress */
  const uploadSingleFile = async (item: BatchFileItem): Promise<UploadedMedia | null> => {
    const { file } = item;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE_BYTES);

    // Prepare cover
    let coverBase64: string | undefined;
    let coverMimeType: string | undefined;
    if (item.coverFile) {
      try {
        coverBase64 = await fileToBase64(item.coverFile);
        coverMimeType = item.coverFile.type;
      } catch { /* skip cover */ }
    }

    const tags = item.tags
      .split(/[,\uFF0C]/)
      .map(t => t.trim())
      .filter(t => t.length > 0)
      .slice(0, 10);

    // For small files (<1MB), use single upload for simplicity
    if (file.size < 1 * 1024 * 1024) {
      updateBatchItem(item.id, { progress: 10, status: 'uploading' });

      const fileBase64 = await fileToBase64(file);
      updateBatchItem(item.id, { progress: 40 });

      const result = await apiFetch<{ success: boolean; media: UploadedMedia }>('/upload/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64,
          mimeType: file.type || 'audio/mpeg',
          title: item.title.trim() || file.name,
          artist: item.artist.trim() || 'Unknown Artist',
          album: item.album.trim() || 'Unknown Album',
          genre: item.genre,
          duration: item.duration,
          description: item.description.trim(),
          isPublic: item.isPublic,
          tags,
          coverBase64,
          coverMimeType,
          userId,
          userName,
        }),
      });

      updateBatchItem(item.id, { progress: 100 });

      if (result?.success && result.media) {
        return result.media;
      }
      throw new Error('Upload returned no data');
    }

    // Chunked upload for larger files
    // Step 1: Initialize session
    updateBatchItem(item.id, { progress: 2, status: 'uploading' });

    const initResult = await apiFetch<{ success: boolean; sessionId: string; totalChunks: number }>('/upload/chunk/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type || 'audio/mpeg',
        totalChunks,
        totalSize: file.size,
        title: item.title.trim() || file.name,
        artist: item.artist.trim() || 'Unknown Artist',
        album: item.album.trim() || 'Unknown Album',
        genre: item.genre,
        duration: item.duration,
        description: item.description.trim(),
        isPublic: item.isPublic,
        tags,
        coverBase64,
        coverMimeType,
        userId,
        userName,
      }),
    });

    if (!initResult?.success || !initResult.sessionId) {
      throw new Error('Failed to initialize chunked upload session');
    }

    const sessionId = initResult.sessionId;

    // Step 2: Upload chunks sequentially with progress
    for (let i = 0; i < totalChunks; i++) {
      if (abortRef.current) throw new Error('Upload cancelled');

      const start = i * CHUNK_SIZE_BYTES;
      const end = Math.min(start + CHUNK_SIZE_BYTES, file.size);
      const chunkBase64 = await fileSliceToBase64(file, start, end);

      const chunkResult = await apiFetch<{ success: boolean; progress: number }>(`/upload/chunk/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chunkIndex: i, chunkBase64 }),
      });

      if (!chunkResult?.success) {
        throw new Error(`Chunk ${i + 1}/${totalChunks} upload failed`);
      }

      // Progress: 5% init + 85% chunks + 10% finalization
      const chunkProgress = 5 + Math.round(((i + 1) / totalChunks) * 85);
      updateBatchItem(item.id, { progress: chunkProgress });
    }

    // Step 3: Finalize
    updateBatchItem(item.id, { progress: 92 });

    const completeResult = await apiFetch<{ success: boolean; media: UploadedMedia }>(`/upload/chunk/${sessionId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    updateBatchItem(item.id, { progress: 100 });

    if (completeResult?.success && completeResult.media) {
      return completeResult.media;
    }
    throw new Error('Chunked upload finalization failed');
  };

  // ============================================
  // Batch Upload Orchestrator
  // ============================================

  const startBatchUpload = async () => {
    const pending = batchFiles.filter(f => f.status === 'pending');
    if (pending.length === 0) return;

    setIsUploading(true);
    abortRef.current = false;

    for (const item of pending) {
      if (abortRef.current) break;

      updateBatchItem(item.id, { status: 'uploading', progress: 0, error: '' });

      try {
        const result = await uploadSingleFile(item);
        if (result) {
          updateBatchItem(item.id, { status: 'success', progress: 100, result });
          setMyUploads(prev => [result, ...prev]);
          onUploadComplete?.(result);
        } else {
          updateBatchItem(item.id, { status: 'error', error: 'No result returned' });
        }
      } catch (err: any) {
        console.error(`[Upload] Batch file error:`, err);
        updateBatchItem(item.id, { status: 'error', error: err?.message || 'Upload failed' });
      }
    }

    setIsUploading(false);
  };

  return { isUploading, startBatchUpload };
}
