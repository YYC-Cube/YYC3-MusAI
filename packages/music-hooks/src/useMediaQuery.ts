/**
 * §9.x — 响应式媒体查询 Hook
 *
 * 基于 window.matchMedia 返回给定媒体查询是否匹配，随窗口大小变化自动更新。
 * 适用于音乐播放器的响应式布局（如切换音频/视频模式、收起/展开面板）。
 *
 * @example
 *   import { useMediaQuery } from '@yyc3/music-hooks';
 *   const isMobile = useMediaQuery('(max-width: 768px)');
 */

import { useState, useEffect, useCallback } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  const handleChange = useCallback((event: MediaQueryListEvent) => {
    setMatches(event.matches);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia(query);
    setMatches(media.matches);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [query, handleChange]);

  return matches;
}
