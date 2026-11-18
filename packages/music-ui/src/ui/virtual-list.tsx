"use client";

/**
 * §5.x — TanStack Virtual 长列表块
 *
 * 对 1000+ 条目进行窗口化渲染，避免一次性挂载全部 DOM。
 * 外部通过 renderItem 渲染单条。
 *
 * @example
 *   import { VirtualTrackList } from '@yyc3/music-ui';
 *   <VirtualTrackList items={tracks} renderItem={renderTrack} />
 */

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

export interface VirtualTrackListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  estimatedSize?: number;
  overscan?: number;
  className?: string;
}

/** 虚拟滚动长列表 */
export const VirtualTrackList = <T,>({
  items,
  renderItem,
  estimatedSize = 64,
  overscan = 10,
  className,
}: VirtualTrackListProps<T>) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedSize,
    overscan,
  });

  return (
    <div
      ref={parentRef}
      className={className}
      style={{
        overflow: 'auto',
        height: '100%',
        position: 'relative',
      }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: estimatedSize,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {renderItem(item, virtualItem.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** 音乐曲目虚拟列表（默认 64px 行高，适配歌单/播放列表） */
export const VirtualMusicList = ({
  items,
  renderItem,
  className,
}: {
  items: { id: string; title: string; artist: string }[];
  renderItem: (item: { id: string; title: string; artist: string }, index: number) => React.ReactNode;
  className?: string;
}) => {
  return (
    <VirtualTrackList items={items} renderItem={renderItem} estimatedSize={64} className={className} />
  );
};
