"use client";

/**
 * YYC³ music-ui — TanStack Virtual 长列表块（v3 API）
 *
 * 基于 @tanstack/react-virtual 实现高性能长列表渲染，仅渲染可见窗口内条目。
 * 适用于数百首歌曲的播放列表与社区信息流。
 *
 * ⧗ 与 useVirtualList 的选型边界（W6-P1-5）：本组件＝真窗口化虚拟滚动
 * （千行级列表，DOM 只留可视窗）；若列表需配合 motion/AnimatePresence 布局
 * 动画、已渲染行必须保持挂载 → 用 @yyc3/music-hooks 的 `useVirtualList`
 * （IntersectionObserver 渐进渲染，非虚拟化）。
 *
 * 许可：MIT（TanStack Virtual MIT，shadcn 风格基础 UI）
 */

import { useVirtualizer } from "@tanstack/react-virtual";
import * as React from "react";

import { cn } from "./utils";

interface VirtualListProps<Item> {
  items: Item[];
  estimateSize?: number;
  overscan?: number;
  renderItem: (item: Item, index: number) => React.ReactNode;
  /** 初始视口尺寸（SSR / 测试环境 jsdom 无真实布局时传入） */
  initialRect?: { width: number; height: number };
  className?: string;
  itemClassName?: string;
}

export function VirtualList<Item>({
  items,
  estimateSize = 48,
  overscan = 10,
  renderItem,
  initialRect,
  className,
  itemClassName,
}: VirtualListProps<Item>) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    initialRect,
  });

  const scrollOffset = virtualizer.scrollOffset ?? 0;
  const virtualItems = virtualizer.getVirtualItems();

  const totalHeight = virtualizer.getTotalSize();

  return (
    <div
      ref={parentRef}
      className={cn(
        "flex flex-col h-full min-h-[200px] overflow-auto outline-none",
        className,
      )}
      data-slot="virtual-list"
    >
      {/* Spacer 撑开可滚动总高度 */}
      <div
        style={{ height: `${totalHeight}px` }}
        className="w-full"
        data-slot="virtual-list-spacer"
      >
        {/* 整体随滚动偏移位移，配合 spacer 实现虚拟滚动 */}
        <div
          className={cn(
            "relative w-full",
            itemClassName,
          )}
          data-slot="virtual-list-inner"
          style={{ transform: `translateY(${scrollOffset}px)` }}
        >
          {virtualItems.map((item) => {
            const dataItem = items[item.index];
            if (!dataItem) return null;
            return (
              <div
                key={item.key}
                className="relative"
                style={{
                  position: "absolute",
                  top: `${item.start}px`,
                  height: `${item.size}px`,
                  width: "100%",
                }}
                data-slot="virtual-list-item"
              >
                {renderItem(dataItem, item.index)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * 主仓兼容别名（2026-11-09 合入）：`VirtualTrackList` ＝ `VirtualList`。
 *
 * 主仓同期实现使用了 `estimatedSize`（默认 64）的 prop 命名；本仓 W5-P1-5 沉淀版
 * 为 `estimateSize`（默认 48）。二者同为 TanStack Virtual v3 窗口化列表，这里做
 * 一层薄映射保证主仓调用方 `@example` 用法（`<VirtualTrackList items
 * renderItem />`）在合并后仍然可用。
 */
export function VirtualTrackList<Item>(
  props: Omit<VirtualListProps<Item>, "estimateSize"> & { estimatedSize?: number },
) {
  const { estimatedSize, ...rest } = props;
  return <VirtualList {...rest} estimateSize={estimatedSize} />;
}
