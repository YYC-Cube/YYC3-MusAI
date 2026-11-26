// 社区面板子组件 · 上传面板头部与标签页（上传 / 我的上传 / 歌词）
import React, { Dispatch, SetStateAction } from 'react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { Upload, X, Layers, Disc3, PenLine } from 'lucide-react';
import { T } from './shared';
import type { UploadedMedia } from './shared';
import type { UploadTabKey } from './LyricsTab';

interface PanelHeaderProps {
  t: (key: keyof typeof T) => string;
  onClose: () => void;
  activeTab: UploadTabKey;
  setActiveTab: Dispatch<SetStateAction<UploadTabKey>>;
  myUploads: UploadedMedia[];
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({
  t, onClose, activeTab, setActiveTab, myUploads,
}) => {
  return (
    <React.Fragment>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
            <Upload className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-base font-bold text-white">{t('upload.title')}</h2>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition-colors"
          aria-label="关闭上传面板 / Close upload panel"
        >
          <X className="w-4 h-4 text-white/60" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.06]">
        {(['upload', 'list', 'lyrics'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              'flex-1 py-3 text-xs font-medium transition-colors relative',
              activeTab === tab ? 'text-violet-400' : 'text-white/40 hover:text-white/60'
            )}
          >
            {tab === 'upload' && <><Layers className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />{t('upload.title')}</>}
            {tab === 'list' && <><Disc3 className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />{t('upload.myUploads')} ({myUploads.length})</>}
            {tab === 'lyrics' && <><PenLine className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />{t('upload.lyricsTab')}</>}
            {activeTab === tab && (
              <motion.div layoutId="upload-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-pink-500" />
            )}
          </button>
        ))}
      </div>
    </React.Fragment>
  );
};
