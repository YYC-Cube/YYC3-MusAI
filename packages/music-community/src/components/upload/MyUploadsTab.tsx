// 社区面板子组件 · 上传面板我的上传 Tab（列表 / 试听 / 歌词入口 / 删除）
import React from 'react';
import { motion } from 'motion/react';
import { Music, Video, Play, Pause, Trash2, PenLine, Loader2 } from 'lucide-react';
import { T, formatFileSize, formatDuration } from './shared';
import type { UploadedMedia } from './shared';

interface MyUploadsTabProps {
  t: (key: keyof typeof T) => string;
  loadingUploads: boolean;
  myUploads: UploadedMedia[];
  playingId: string | null;
  togglePreview: (media: UploadedMedia) => void;
  openLyricsEditor: (media: UploadedMedia) => void;
  handleDelete: (mediaId: string) => Promise<void>;
}

export const MyUploadsTab: React.FC<MyUploadsTabProps> = ({
  t, loadingUploads, myUploads, playingId, togglePreview, openLyricsEditor, handleDelete,
}) => {
  return (
    <div className="p-4">
      {loadingUploads ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
          <span className="ml-3 text-sm text-white/40">{t('upload.loading')}</span>
        </div>
      ) : myUploads.length === 0 ? (
        <div className="text-center py-12">
          <Music className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/30">{t('upload.noUploads')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {myUploads.map(media => (
            <motion.div
              key={media.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -50 }}
              className="group flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] transition-all"
            >
              {/* Cover / Type Icon */}
              <div className="w-11 h-11 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                {media.coverSignedUrl ? (
                  <img src={media.coverSignedUrl} alt="" className="w-full h-full object-cover" />
                ) : media.mediaType === 'video' ? (
                  <Video className="w-4 h-4 text-violet-400/40" />
                ) : (
                  <Music className="w-4 h-4 text-violet-400/40" />
                )}
                {media.signedUrl && media.mediaType === 'audio' && (
                  <button
                    onClick={() => togglePreview(media)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    {playingId === media.id ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
                  </button>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/90 font-medium truncate">{media.title}</p>
                <p className="text-xs text-white/40 truncate">{media.artist}</p>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-white/20">
                  <span>{formatFileSize(media.fileSize)}</span>
                  {media.duration > 0 && <span>{formatDuration(media.duration)}</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {media.mediaType === 'audio' && (
                  <button
                    onClick={() => openLyricsEditor(media)}
                    className="w-7 h-7 rounded-full bg-white/[0.04] text-white/30 hover:bg-violet-500/10 hover:text-violet-400 flex items-center justify-center transition-all"
                    title={t('upload.lyrics')}
                  >
                    <PenLine className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(media.id)}
                  className="w-7 h-7 rounded-full bg-white/[0.04] text-white/20 hover:bg-red-500/10 hover:text-red-400 flex items-center justify-center transition-all"
                  title={t('upload.delete')}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
