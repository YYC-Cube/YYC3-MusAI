// 创作工作室 · 面板头（返回 / 标题 / 关闭）
import React from 'react';
import { X, Wand2, ArrowLeft } from 'lucide-react';
import { MODES, type CreationMode } from './shared';

interface StudioHeaderProps {
  activeMode: CreationMode | null;
  onBack: () => void;
  onClose: () => void;
  lang: string;
}

export const StudioHeader: React.FC<StudioHeaderProps> = ({ activeMode, onBack, onClose, lang }) => {
  return (
    <div className="flex items-center justify-between p-5 pb-3 border-b border-white/[0.06] flex-shrink-0">
      <div className="flex items-center gap-3">
        {activeMode && (
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors mr-1"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center">
          <Wand2 className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-sm leading-tight">
            {activeMode
              ? MODES.find(m => m.id === activeMode)?.[lang === 'zh' ? 'labelZh' : 'label']
              : (lang === 'zh' ? 'AI 创作工坊' : 'AI Creation Studio')}
          </h3>
          <p className="text-white/30 text-xs">
            {activeMode
              ? MODES.find(m => m.id === activeMode)?.[lang === 'zh' ? 'descZh' : 'desc']
              : (lang === 'zh' ? '选择创作模式开始' : 'Choose a creation mode')}
          </p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
