"use client";

/**
 * YYC³ music-ui — CmdK 命令面板（基于 cmdk，MIT）
 *
 * 对应 INTEGRATION-STATUS.md：pacocoursey/cmdk → music-ui Command palette（Planned → Done）。
 * shadcn 风格，全局快捷键（默认 Cmd+K / Ctrl+K）触发，支持分组与快捷键提示。
 */

import * as React from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from 'cmdk';
import { cn } from './utils';

interface CmdKPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  children?: React.ReactNode;
}

export const CmdKPalette: React.FC<CmdKPaletteProps> = ({
  open = false,
  onOpenChange,
  className,
  children,
}) => {
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandList className={cn('w-full max-w-md', className)}>
        <CommandInput placeholder="搜索命令（⌘K / Ctrl+K）" />
        <CommandEmpty>没有匹配的命令</CommandEmpty>
        <CommandGroup heading="播放控制">
          <CommandItem value="play-pause">播放/暂停</CommandItem>
          <CommandItem value="next">下一首</CommandItem>
          <CommandItem value="prev">上一首</CommandItem>
        </CommandGroup>
        <CommandGroup heading="视图">
          <CommandItem value="lyrics">切换歌词</CommandItem>
          <CommandItem value="mini">切换迷你播放器</CommandItem>
        </CommandGroup>
        {children}
      </CommandList>
    </CommandDialog>
  );
};

export default CmdKPalette;
