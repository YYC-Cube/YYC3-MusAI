// 创作工作室 · 预览器-歌词预览（含复制按钮）
import React from 'react';
import { motion } from 'motion/react';
import { Copy, Check } from 'lucide-react';

interface LyricsPreviewProps {
  title: string;
  titleClassName: string;
  gradient: string;
  lyrics: string[];
  copied: boolean;
  onCopy: () => void;
  stepDelay: number;
  lang: string;
}

export const LyricsPreview: React.FC<LyricsPreviewProps> = ({
  title,
  titleClassName,
  gradient,
  lyrics,
  copied,
  onCopy,
  stepDelay,
  lang,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border border-white/[0.08] bg-gradient-to-br ${gradient} p-4`}
    >
      <div className="flex items-center justify-between mb-3">
        <p className={titleClassName}>{title}</p>
        <button
          onClick={onCopy}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          {copied ? (lang === 'zh' ? '已复制' : 'Copied') : (lang === 'zh' ? '复制' : 'Copy')}
        </button>
      </div>
      <div className="space-y-1.5">
        {lyrics.map((line, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * stepDelay }}
            className="text-sm text-white/70 leading-relaxed"
          >
            {line}
          </motion.p>
        ))}
      </div>
    </motion.div>
  );
};
