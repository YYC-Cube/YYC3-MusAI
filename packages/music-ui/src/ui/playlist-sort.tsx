"use client";

/**
 * YYC³ music-ui — DndKit 歌单排序块
 *
 * 基于 @dnd-kit 实现可拖拽排序的歌单条目，用于播放列表与组件目录拖入。
 * 与 @tanstack/react-table 配合使用时，排序仅改变行顺序，不触碰媒体源。
 *
 * 许可：MIT（dnd-kit MIT，shadcn 风格基础 UI）
 */

import type { DragEndEvent } from "@dnd-kit/core";
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import * as React from "react";

import { cn } from "./utils";

interface PlaylistSortProps {
  items: { id: string; title: string }[];
  onReorder: (orderedIds: string[]) => void;
  className?: string;
}

type SortableItemProps = {
  id: string;
  title: string;
  index: number;
};

const SortableItem = React.forwardRef<HTMLDivElement, SortableItemProps>(
  ({ id, title, index }, ref) => {
    const { attributes, transform, transition } = useSortable({ id });
    const style = React.useMemo(
      () => ({
        transform: transform ? CSS.Transform.toString(transform) : undefined,
        transition,
      }),
      [transform, transition],
    );

    return (
      <div
        ref={ref}
        {...attributes}
        style={style}
        className={cn(
          "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent cursor-move transition-all duration-200 hover:bg-muted/50 data-[active]:bg-muted data-[active]:shadow-md data-[active]:shadow-accent/20 data-[active]:ring-1 data-[active]:ring-accent",
        )}
        data-slot="playlist-sort-item"
      >
        <div
          className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground group-data-[active]:hidden opacity-0 group-hover:opacity-100"
          aria-label="拖拽手柄"
        >
          ⠿
        </div>
        <span className="text-sm text-foreground">{title}</span>
        <span className="ml-auto text-xs text-muted-foreground">#{index + 1}</span>
      </div>
    );
  },
);

SortableItem.displayName = "SortableItem";

export function PlaylistSort({ items, onReorder, className }: PlaylistSortProps) {
  const sensors = useSensors(useSensor(PointerSensor));

  const [sortedItems, setSortedItems] = React.useState(items);

  const handleDragEnd = React.useCallback((event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;
      const activeId = String(active.id);
      const overId = String(over.id);
      if (activeId === overId) return;

      const oldIndex = sortedItems.findIndex((i) => i.id === activeId);
      const newIndex = sortedItems.findIndex((i) => i.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = [...sortedItems];
      reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, sortedItems[oldIndex]);

      setSortedItems(reordered);
      onReorder(reordered.map((i) => i.id));
    },
    [sortedItems, onReorder],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      <div
        className={cn("flex flex-col gap-1.5", className)}
        data-slot="playlist-sort"
      >
        <SortableContext
          items={sortedItems.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {sortedItems.map((item, index) => (
            <SortableItem
              key={item.id}
              id={item.id}
              title={item.title}
              index={index}
            />
          ))}
        </SortableContext>
      </div>
    </DndContext>
  );
}
