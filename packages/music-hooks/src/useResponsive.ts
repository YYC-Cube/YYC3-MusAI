// YYC³ music-hooks — 响应式断点（由 D-MusAI 与 Music-AI 两份实现合并抽取）
import { useEffect, useState } from 'react'

export interface UseResponsiveOptions {
  /** 移动端上界（不含），默认 768 */
  mobileMax?: number
  /** 平板端上界（不含），默认 1024 */
  tabletMax?: number
  /** SSR / 测试环境的初始宽度，默认 1200 */
  initialWidth?: number
  /** SSR / 测试环境的初始高度，默认 800 */
  initialHeight?: number
}

export interface UseResponsiveReturn {
  width: number
  height: number
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
}

function readViewport(fallbackWidth: number, fallbackHeight: number) {
  if (typeof window === 'undefined') {
    return { width: fallbackWidth, height: fallbackHeight }
  }
  return { width: window.innerWidth, height: window.innerHeight }
}

/**
 * 订阅视口尺寸并给出断点判定。
 * 只负责断点，不产出 albumSize 等布局尺寸：两处来源的尺寸公式互相冲突，
 * 尺寸应由调用方基于 width 自行计算。
 */
export function useResponsive(options: UseResponsiveOptions = {}): UseResponsiveReturn {
  const { mobileMax = 768, tabletMax = 1024, initialWidth = 1200, initialHeight = 800 } = options
  const [viewport, setViewport] = useState(() => readViewport(initialWidth, initialHeight))

  useEffect(() => {
    const handleResize = () => setViewport(readViewport(initialWidth, initialHeight))
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [initialWidth, initialHeight])

  const { width, height } = viewport
  return {
    width,
    height,
    isMobile: width < mobileMax,
    isTablet: width >= mobileMax && width < tabletMax,
    isDesktop: width >= tabletMax,
  }
}
