"use client";

/**
 * §5.x — DND 歌单排序块（基于 @dnd-kit v10）
 *
 * 提供可拖拽排序的歌单条目，用于 playlist、queue 等场景。
 * 排序结果通过 onDragEnd 回调由外部业务层处理持久化。
 *
 * @example
 *   import { PlaylistSortableList } from '@yyc3/music-ui';
 *   <PlaylistSortableList items={tracks} onDragEnd={handleDragEnd} />
 */

import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { forwardRef, useCallback } from 'react';

interface PlaylistItem {
  id: string;
  title: string;
  artist: string;
}

interface SortableItemProps {
  id: string;
  index: number;
  title: string;
  artist: string;
}

const SortableItem = forwardRef<HTMLDivElement, SortableItemProps>(
  ({ id, index, title, artist }, ref) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
    } = useSortable({ id });

    const style = {
      transform: transform ? CSS.Transform.toString(transform) : undefined,
      borderRadius: 8,
      padding: '8px 12px',
      marginBottom: 8,
      background: 'var(--dm-bg-panel, #111827)',
      border: '1px solid var(--dm-border, #374151)',
      cursor: 'grab',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    };

    return (
      <div
        ref={(node) => {
          setNodeRef(node);
          if (ref) {
            if (typeof ref === 'function') ref(node);
            // React 18 类型中 RefObject.current 只读，React 19 才可变；可变结构断言兼容两者
            else (ref as { current: HTMLDivElement | null }).current = node;
          }
        }}
        {...attributes}
        {...listeners}
        style={style}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs text-muted-foreground">{index + 1}</span>
          <div>
            <div className="text-sm font-medium">{title}</div>
            <div className="text-xs text-muted-foreground">{artist}</div>
          </div>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <path d="M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" />
        </svg>
      </div>
    );
  }
);

export const PlaylistSortableList = ({
  items,
  onDragEnd,
  className,
}: {
  items: PlaylistItem[];
  onDragEnd?: (orderedIds: string[]) => void;
  className?: string;
}) => {
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeId = String(active.id);
      const overId = String(over.id);
      const activeIndex = items.findIndex((i) => i.id === activeId);
      const overIndex = items.findIndex((i) => i.id === overId);

      if (activeIndex === -1 || overIndex === -1) return;

      const newItems = [...items];
      const [moved] = newItems.splice(activeIndex, 1);
      newItems.splice(overIndex, 0, moved);

      onDragEnd?.(newItems.map((i) => i.id));
    },
    [items, onDragEnd]
  );

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div
        className={className}
        style={{ display: 'flex', flexDirection: 'column', gap: 0 }}
      >
        {items.map((item, index) => (
          <SortableContext
            key={item.id}
            items={[{ id: item.id }]}
            strategy={verticalListSortingStrategy}
          >
            <SortableItem
              id={item.id}
              index={index}
              title={item.title}
              artist={item.artist}
            />
          </SortableContext>
        ))}
      </div>
    </DndContext>
  );
};

/** 简单歌单项预览（只读展示） */
export const PlaylistItemView = ({ item, index }: { item: PlaylistItem; index: number }) => {
  return (
    <div
      className="flex items-center gap-3 min-w-0"
      style={{
        borderRadius: 8,
        padding: '8px 12px',
        marginBottom: 8,
        background: 'var(--dm-bg-panel, #111827)',
        border: '1px solid var(--dm-border, #374151)',
      }}
    >
      <span className="text-xs text-muted-foreground">{index + 1}</span>
      <div className="flex items-center gap-3 min-w-0">
        <div>
          <div className="text-sm font-medium">{item.title}</div>
          <div className="text-xs text-muted-foreground">{item.artist}</div>
        </div>
      </div>
    </div>
  );
};
