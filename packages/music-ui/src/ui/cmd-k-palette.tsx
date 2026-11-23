"use client";

/**
 * YYC³ music-ui — CmdK 命令面板（基于 cmdk，MIT）
 *
 * 对应 INTEGRATION-STATUS.md：pacocoursey/cmdk → music-ui Command palette（Planned → Done）。
 * shadcn 风格，全局快捷键（默认 Cmd+K / Ctrl+K）触发（disableShortcut 可关闭），
 * 支持受控（open/onOpenChange）与非受控两种用法；支持分组与快捷键提示。
 * 集成 /api/search 全局搜索：歌曲、歌单、艺术家、专辑分组展示。
 *
 * W8 修复：搜索结果项 value 携带标题/副标题，避免按歌名搜索时结果被 cmdk
 * 默认过滤吞掉（修复前 value=result.id，仅 id 命中查询时可见）。
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

interface SearchResult {
  id: string;
  type: 'song' | 'playlist' | 'artist' | 'album';
  title: string;
  subtitle?: string;
  artwork?: string;
}

interface CmdKPaletteProps {
  /** 受控开启态；不传则组件内部自管（⌘K 可直接开合） */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** 关闭内置 ⌘K / Ctrl+K 全局快捷键（宿主自行接管时使用） */
  disableShortcut?: boolean;
  className?: string;
  children?: React.ReactNode;
  onSelectSearchResult?: (result: SearchResult) => void;
}

export const CmdKPalette: React.FC<CmdKPaletteProps> = ({
  open,
  onOpenChange,
  disableShortcut = false,
  className,
  children,
  onSelectSearchResult,
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);

  const isOpen = open ?? uncontrolledOpen;
  const setOpen = React.useCallback(
    (next: boolean) => {
      onOpenChange?.(next);
      if (open === undefined) setUncontrolledOpen(next);
    },
    [onOpenChange, open]
  );

  // 内置全局快捷键 ⌘K / Ctrl+K（W8 补齐：README 承诺但组件此前未实现）
  React.useEffect(() => {
    if (disableShortcut) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!isOpen);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [disableShortcut, isOpen, setOpen]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      const results: SearchResult[] = (data?.results || []).map((item: any) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        subtitle: item.subtitle,
        artwork: item.artwork,
      }));
      setSearchResults(results);
    } catch (err) {
      console.error('[CmdK] Search error:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchResultSelect = (result: SearchResult) => {
    onSelectSearchResult?.(result);
    setOpen(false);
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={setOpen}>
      <CommandList className={cn('w-full max-w-md', className)}>
        <CommandInput
          placeholder="搜索命令（⌘K / Ctrl+K）"
          onValueChange={(value) => {
            setSearchQuery(value);
            void handleSearch(value);
          }}
        />
        <CommandEmpty>没有匹配的命令</CommandEmpty>

        {/* 播放控制 */}
        <CommandGroup heading="播放控制">
          <CommandItem value="play-pause">播放/暂停</CommandItem>
          <CommandItem value="next">下一首</CommandItem>
          <CommandItem value="prev">上一首</CommandItem>
        </CommandGroup>

        {/* 视图 */}
        <CommandGroup heading="视图">
          <CommandItem value="lyrics">切换歌词</CommandItem>
          <CommandItem value="mini">切换迷你播放器</CommandItem>
        </CommandGroup>

        {/* 全局搜索结果 */}
        {searchQuery.trim() && (
          <CommandGroup heading="搜索结果">
            {isSearching ? (
              /* value=当前查询 → 始终通过 cmdk 过滤，保证「搜索中」可见 */
              <CommandItem disabled value={searchQuery}>
                搜索中...
              </CommandItem>
            ) : searchResults.length === 0 ? (
              <CommandItem disabled value={searchQuery}>
                没有搜索结果
              </CommandItem>
            ) : (
              searchResults.map((result) => (
                <CommandItem
                  key={result.id}
                  value={`${result.title} ${result.subtitle ?? ''} ${result.id}`}
                  onSelect={() => handleSearchResultSelect(result)}
                >
                  <div className="flex items-center gap-3">
                    {result.artwork && (
                      <img
                        src={result.artwork}
                        alt=""
                        className="w-8 h-8 rounded-md object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {result.title}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {result.subtitle || result.type}
                      </div>
                    </div>
                  </div>
                </CommandItem>
              ))
            )}
          </CommandGroup>
        )}

        {children}
      </CommandList>
    </CommandDialog>
  );
};

export default CmdKPalette;
