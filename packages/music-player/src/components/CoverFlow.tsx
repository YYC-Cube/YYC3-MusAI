/**
 * @file CoverFlow — 3D 封面流
 * @description 合并 YYC3-D-MusAI 与 YYC3-Music-AI 两处 CoverFlow：
 * 拖拽惯性、键盘导航、封面倒影/高光/地面光晕、封面回退与加载态、受控/非受控选中。
 * 样式全部内联，不依赖 Tailwind，也不注入全局样式。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  TouchEvent as ReactTouchEvent,
} from 'react'
import { motion } from 'motion/react'

export interface CoverFlowTrack {
  id: string
  title: string
  artist?: string
  cover?: string | null
}

export interface CoverFlowProps {
  tracks: CoverFlowTrack[]
  onSelect?: (track: CoverFlowTrack, index: number) => void
  selectedId?: string | null
  selectedIndex?: number
  defaultSelectedIndex?: number
  getCover?: (track: CoverFlowTrack) => string | null | undefined
  isLoading?: (trackId: string) => boolean
  itemSize?: number
  spacing?: number
  height?: number
  showReflection?: boolean
  showGloss?: boolean
  showFloorGlow?: boolean
  enableKeyboard?: boolean
  enableDrag?: boolean
  emptyText?: ReactNode
  className?: string
  style?: CSSProperties
}

const MAX_Z_INDEX = 1000
const ROTATION = 55
const DRAG_THRESHOLD = 50
const VELOCITY_THRESHOLD = 0.5
const HIGH_VELOCITY_THRESHOLD = 2
const EASING = 'cubic-bezier(0.23, 1, 0.32, 1)'

const COVER_SHADOW =
  '0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1)'
const FALLBACK_SHADOW =
  '0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)'
const REFLECTION_MASK =
  'linear-gradient(to top, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.4) 20%, rgba(255,255,255,0.15) 40%, transparent 60%)'
const GLOSS_GRADIENT =
  'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 25%, transparent 50%, rgba(0,0,0,0.02) 75%, rgba(0,0,0,0.08) 100%)'
const FLOOR_GRADIENT =
  'linear-gradient(to bottom, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.12) 40%, transparent 100%)'

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0
  return Math.min(Math.max(index, 0), length - 1)
}

function zIndexFor(offset: number): number {
  if (offset === 0) return MAX_Z_INDEX
  if (offset === 1) return 100
  if (offset === 2) return 50
  if (offset === 3) return 25
  if (offset === 4) return 15
  return Math.max(1, 10 - offset)
}

interface ReflectionProps {
  src: string
  active: boolean
}

function CoverReflection({ src, active }: ReflectionProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        width: '100%',
        height: '100%',
        borderRadius: 8,
        pointerEvents: 'none',
        userSelect: 'none',
        backgroundImage: `url("${src}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        transform: 'scaleY(-1)',
        opacity: active ? 0.9 : 0.75,
        maskImage: REFLECTION_MASK,
        WebkitMaskImage: REFLECTION_MASK,
        filter: 'blur(0.5px) brightness(0.6) contrast(1.3)',
        transition: `opacity 500ms ${EASING}`,
      }}
    />
  )
}

export function CoverFlow(props: CoverFlowProps) {
  const {
    tracks,
    onSelect,
    selectedId,
    selectedIndex,
    defaultSelectedIndex,
    getCover,
    isLoading,
    itemSize,
    spacing,
    height,
    showReflection = true,
    showGloss = true,
    showFloorGlow = true,
    enableKeyboard = true,
    enableDrag = true,
    emptyText = '暂无音乐',
    className,
    style,
  } = props

  const [internalIndex, setInternalIndex] = useState(() =>
    clampIndex(defaultSelectedIndex ?? Math.floor(tracks.length / 2), tracks.length)
  )
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 1200 : window.innerWidth
  )
  const dragRef = useRef({
    active: false,
    startX: 0,
    lastX: 0,
    lastTime: 0,
    offset: 0,
    velocity: 0,
    moved: false,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleResize = () => setViewportWidth(window.innerWidth)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    setInternalIndex((index) => clampIndex(index, tracks.length))
  }, [tracks.length])

  const controlledIndex = useMemo(() => {
    if (selectedIndex !== undefined) return clampIndex(selectedIndex, tracks.length)
    if (selectedId !== undefined && selectedId !== null) {
      const found = tracks.findIndex((track) => track.id === selectedId)
      if (found !== -1) return found
    }
    return null
  }, [selectedIndex, selectedId, tracks])

  const currentIndex = controlledIndex ?? clampIndex(internalIndex, tracks.length)

  const resolvedItemSize = itemSize ?? Math.max(120, Math.min(220, viewportWidth * 0.18))
  const resolvedSpacing = spacing ?? Math.max(80, Math.min(180, viewportWidth * 0.15))
  const resolvedHeight = height ?? (viewportWidth < 640 ? 280 : 384)

  const selectIndex = useCallback(
    (nextIndex: number) => {
      const target = clampIndex(nextIndex, tracks.length)
      const track = tracks[target]
      if (!track) return
      setInternalIndex(target)
      onSelect?.(track, target)
    },
    [tracks, onSelect]
  )

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (!enableKeyboard) return
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        selectIndex(currentIndex - 1)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        selectIndex(currentIndex + 1)
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        selectIndex(currentIndex)
      }
    },
    [enableKeyboard, currentIndex, selectIndex]
  )

  const handleDragStart = useCallback((clientX: number) => {
    const drag = dragRef.current
    drag.active = true
    drag.startX = clientX
    drag.lastX = clientX
    drag.offset = 0
    drag.velocity = 0
    drag.moved = false
    drag.lastTime = Date.now()
    setIsDragging(true)
    setDragOffset(0)
  }, [])

  const handleDragMove = useCallback((clientX: number) => {
    const drag = dragRef.current
    if (!drag.active) return

    const now = Date.now()
    const deltaTime = Math.max(now - drag.lastTime, 1)
    const offset = clientX - drag.startX

    drag.velocity = (clientX - drag.lastX) / deltaTime
    drag.lastX = clientX
    drag.lastTime = now
    drag.offset = offset
    if (Math.abs(offset) > 5) drag.moved = true
    setDragOffset(offset)
  }, [])

  const handleDragEnd = useCallback(() => {
    const drag = dragRef.current
    if (!drag.active) return
    drag.active = false
    setIsDragging(false)

    const distance = Math.abs(drag.offset)
    const speed = Math.abs(drag.velocity)
    let targetIndex = currentIndex

    if (distance > DRAG_THRESHOLD || speed > VELOCITY_THRESHOLD) {
      let jumpCount = 1
      if (speed > HIGH_VELOCITY_THRESHOLD) {
        jumpCount = Math.min(2, Math.ceil(speed / 1.5))
      }
      if (distance > DRAG_THRESHOLD * 2) {
        jumpCount = Math.max(jumpCount, Math.floor(distance / (DRAG_THRESHOLD * 1.5)))
      }

      if (drag.offset < 0 || drag.velocity < -VELOCITY_THRESHOLD) {
        targetIndex = currentIndex + jumpCount
      } else if (drag.offset > 0 || drag.velocity > VELOCITY_THRESHOLD) {
        targetIndex = currentIndex - jumpCount
      }
    }

    selectIndex(targetIndex)
    setDragOffset(0)
  }, [currentIndex, selectIndex])

  const handleMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      event.preventDefault()
      handleDragStart(event.clientX)
    },
    [handleDragStart]
  )

  const handleMouseMove = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      handleDragMove(event.clientX)
    },
    [handleDragMove]
  )

  const handleTouchStart = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      const touch = event.touches[0]
      if (touch) handleDragStart(touch.clientX)
    },
    [handleDragStart]
  )

  const handleTouchMove = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      const touch = event.touches[0]
      if (touch) handleDragMove(touch.clientX)
    },
    [handleDragMove]
  )

  const handleItemClick = useCallback(
    (track: CoverFlowTrack, index: number) => {
      if (dragRef.current.moved) return
      const target = clampIndex(index, tracks.length)
      setInternalIndex(target)
      onSelect?.(track, target)
    },
    [tracks.length, onSelect]
  )

  const getTransform = (index: number) => {
    const offset = index - currentIndex + (isDragging ? dragOffset / 100 : 0)
    if (Math.abs(offset) < 0.1) {
      return 'translateX(0px) translateZ(300px) rotateY(0deg) scale(1.3)'
    }
    const distance = Math.abs(offset)
    const x = (offset < 0 ? -resolvedSpacing : resolvedSpacing) * distance
    const z = -80 * distance
    const scale = Math.max(0.8, 1.15 - distance * 0.04)
    const rotateY = offset < 0 ? ROTATION : -ROTATION
    return `translateX(${x}px) translateZ(${z}px) rotateY(${rotateY}deg) scale(${scale})`
  }

  const getOpacity = (index: number) => {
    const offset = Math.abs(index - currentIndex + (isDragging ? dragOffset / 100 : 0))
    if (offset <= 2) return 1
    if (offset <= 3) return 0.95
    if (offset <= 4) return 0.9
    return Math.max(0.8, 0.9 - (offset - 4) * 0.05)
  }

  if (tracks.length === 0) {
    return (
      <div
        className={className}
        style={{
          padding: '48px 16px',
          textAlign: 'center',
          fontSize: 14,
          color: 'rgba(255, 255, 255, 0.4)',
          ...style,
        }}
      >
        {emptyText}
      </div>
    )
  }

  return (
    <div
      className={className}
      style={{ width: '100%', maxWidth: 1280, margin: '0 auto', position: 'relative', ...style }}
    >
      <div
        data-testid="cover-flow-viewport"
        role="group"
        aria-label="封面流 / Cover flow"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onMouseDown={enableDrag ? handleMouseDown : undefined}
        onMouseMove={enableDrag ? handleMouseMove : undefined}
        onMouseUp={enableDrag ? handleDragEnd : undefined}
        onMouseLeave={enableDrag ? handleDragEnd : undefined}
        onTouchStart={enableDrag ? handleTouchStart : undefined}
        onTouchMove={enableDrag ? handleTouchMove : undefined}
        onTouchEnd={enableDrag ? handleDragEnd : undefined}
        style={{
          position: 'relative',
          height: resolvedHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible',
          userSelect: 'none',
          outline: 'none',
          perspective: '1500px',
          perspectiveOrigin: 'center center',
          touchAction: enableDrag ? 'pan-y' : undefined,
          cursor: enableDrag ? (isDragging ? 'grabbing' : 'grab') : 'default',
        }}
      >
        {tracks.map((track, index) => {
          const fromGetter = getCover ? getCover(track) : track.cover
          const cover = fromGetter || track.cover || null
          const active = index === currentIndex
          const loading = isLoading?.(track.id) ?? false

          return (
            <div
              key={track.id}
              role="button"
              tabIndex={-1}
              aria-label={track.artist ? `${track.title} - ${track.artist}` : track.title}
              aria-current={active ? 'true' : undefined}
              onClick={() => handleItemClick(track, index)}
              style={{
                position: 'absolute',
                transform: getTransform(index),
                zIndex: zIndexFor(Math.abs(index - currentIndex)) + MAX_Z_INDEX,
                opacity: getOpacity(index),
                transformOrigin: 'center center',
                transformStyle: 'preserve-3d',
                transition: isDragging ? 'none' : `transform 400ms ${EASING}, opacity 400ms ${EASING}`,
                userSelect: 'none',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: resolvedItemSize,
                  height: resolvedItemSize,
                  userSelect: 'none',
                }}
              >
                {cover ? (
                  <img
                    src={cover}
                    alt={track.title}
                    draggable={false}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: 8,
                      boxShadow: COVER_SHADOW,
                      userSelect: 'none',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, #0a0a0a, #000)',
                      boxShadow: FALLBACK_SHADOW,
                      userSelect: 'none',
                    }}
                  >
                    {loading ? (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 8,
                          color: 'rgba(255, 255, 255, 0.6)',
                        }}
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            border: '2px solid rgba(255, 255, 255, 0.2)',
                            borderBottomColor: 'rgba(255, 255, 255, 0.7)',
                          }}
                        />
                        <span style={{ fontSize: 12 }}>加载中...</span>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 8,
                          color: 'rgba(255, 255, 255, 0.4)',
                        }}
                      >
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                        </svg>
                        <span style={{ fontSize: 12, textAlign: 'center', padding: '0 8px' }}>
                          {track.artist ?? track.title}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {showGloss && (
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 8,
                      pointerEvents: 'none',
                      background: GLOSS_GRADIENT,
                    }}
                  />
                )}

                {showReflection && cover && <CoverReflection src={cover} active={active} />}

                {showFloorGlow && (
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      width: '100%',
                      height: 12,
                      borderRadius: 8,
                      pointerEvents: 'none',
                      background: FLOOR_GRADIENT,
                      transform: 'translateY(6px)',
                      opacity: active ? 0.6 : 0.35,
                      transition: `opacity 1000ms ${EASING}`,
                    }}
                  />
                )}

                {active && (
                  <>
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 8,
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)',
                        pointerEvents: 'none',
                      }}
                    />
                    <motion.div
                      aria-hidden="true"
                      animate={{ opacity: [0.9, 0.55, 0.9], scale: [1, 0.85, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      style={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: '#fff',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.6)',
                        pointerEvents: 'none',
                      }}
                    />
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: '25%',
                        right: '25%',
                        height: 4,
                        borderRadius: 9999,
                        background: 'rgba(255, 255, 255, 0.2)',
                        filter: 'blur(4px)',
                        pointerEvents: 'none',
                      }}
                    />
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
