// 社区面板子组件 · 上传面板歌词 Tab（目标信息 + 歌词编辑器 + 空态引导）
import React, { Dispatch, SetStateAction } from 'react';
import { Music, X, PenLine } from 'lucide-react';
import { T, formatDuration } from './shared';
import type { UploadedMedia } from './shared';
import { LyricsEditor } from './LyricsEditor';

export type UploadTabKey = 'upload' | 'list' | 'lyrics';

interface LyricsTabProps {
  t: (key: keyof typeof T) => string;
  lang: 'zh' | 'en';
  lyricsTarget: UploadedMedia | null;
  setLyricsTarget: Dispatch<SetStateAction<UploadedMedia | null>>;
  setActiveTab: Dispatch<SetStateAction<UploadTabKey>>;
}

export const LyricsTab: React.FC<LyricsTabProps> = ({
  t, lang, lyricsTarget, setLyricsTarget, setActiveTab,
}) => {
  return (
    <div className="p-4">
      {lyricsTarget ? (
        <div className="space-y-3">
          {/* Target info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
              <Music className="w-4 h-4 text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/90 font-medium truncate">{lyricsTarget.title}</p>
              <p className="text-xs text-white/40">{lyricsTarget.artist} &middot; {formatDuration(lyricsTarget.duration)}</p>
            </div>
            <button
              onClick={() => setLyricsTarget(null)}
              className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <LyricsEditor
            mediaId={lyricsTarget.id}
            mediaDuration={lyricsTarget.duration}
            lang={lang}
            signedUrl={lyricsTarget.signedUrl}
          />
        </div>
      ) : (
        <div className="text-center py-12">
          <PenLine className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/30">
            {lang === 'zh' ? '从"我的上传"中选择一首歌来编辑歌词' : 'Select a song from "My Uploads" to edit lyrics'}
          </p>
          <button
            onClick={() => setActiveTab('list')}
            className="mt-3 text-xs text-violet-400 hover:text-violet-300 underline transition-colors"
          >
            {t('upload.myUploads')}
          </button>
        </div>
      )}
    </div>
  );
};
