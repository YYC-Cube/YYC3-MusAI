// D-Music 设计层 · 分子组件 DMusicCard

import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../ui/utils';

import { DCard } from './DCard';
import { DTag } from './DTag';

/** Music card — specialized for track/album display */
interface DMusicCardProps {
  title: string;
  artist: string;
  coverUrl?: string;
  duration?: string;
  emotion?: string;
  isPlaying?: boolean;
  onClick?: () => void;
  className?: string;
}

export const DMusicCard: React.FC<DMusicCardProps> = ({
  title, artist, coverUrl, duration, emotion, isPlaying, onClick, className,
}) => {
  return (
    <DCard variant="default" interactive onClick={onClick} padding="sm" className={cn('flex items-center gap-3', className)}>
      <div
        className="w-12 h-12 rounded-xl flex-shrink-0 bg-gradient-to-br from-[var(--dm-accent-from)]/30 to-[var(--dm-accent-to)]/30 flex items-center justify-center overflow-hidden relative"
      >
        {coverUrl ? (
          <img src={coverUrl} alt={title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <span className="text-lg">🎵</span>
        )}
        {isPlaying && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="flex gap-0.5 items-end h-4" aria-label="Playing">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-1 rounded-full"
                  style={{ background: 'var(--dm-accent-from)' }}
                  animate={{ height: ['40%', '100%', '40%'] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--dm-text-primary)' }}>{title}</p>
        <p className="text-xs truncate" style={{ color: 'var(--dm-text-tertiary)' }}>{artist}</p>
      </div>
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        {duration && <span className="text-[10px] tabular-nums" style={{ color: 'var(--dm-text-disabled)' }}>{duration}</span>}
        {emotion && (
          <DTag size="xs" variant="emotion">{emotion}</DTag>
        )}
      </div>
    </DCard>
  );
};
