/**
 * @file CoverFlow 测试
 * @description 覆盖默认/受控选中、点击与键盘导航、拖拽惯性与点击抑制、
 * 封面回退/加载态、倒影开关、空态以及响应式尺寸与 resize 监听清理。
 */
import { createElement } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CoverFlow } from '../src'
import type { CoverFlowTrack } from '../src'

const tracks: CoverFlowTrack[] = [
  { id: 'a', title: '星轨', artist: 'YYC³' },
  { id: 'b', title: '夜航', artist: 'YYC³', cover: '/b.jpg' },
  { id: 'c', title: '回声', artist: 'YYC³' },
]

function renderFlow(overrides: Record<string, unknown> = {}) {
  return render(createElement(CoverFlow, { tracks, ...overrides }))
}

afterEach(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 })
})

describe('CoverFlow 选中与渲染', () => {
  it('默认选中中间项并渲染全部封面', () => {
    renderFlow()

    expect(screen.getAllByRole('button')).toHaveLength(3)
    expect(screen.getByRole('button', { name: '夜航 - YYC³' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('button', { name: '星轨 - YYC³' })).not.toHaveAttribute('aria-current')
  })

  it('受控 selectedIndex 与 selectedId 优先于内部状态', () => {
    const { unmount } = renderFlow({ selectedIndex: 2 })
    expect(screen.getByRole('button', { name: '回声 - YYC³' })).toHaveAttribute('aria-current', 'true')
    unmount()

    renderFlow({ selectedId: 'a' })
    expect(screen.getByRole('button', { name: '星轨 - YYC³' })).toHaveAttribute('aria-current', 'true')
  })

  it('defaultSelectedIndex 控制初始选中项', () => {
    renderFlow({ defaultSelectedIndex: 0 })
    expect(screen.getByRole('button', { name: '星轨 - YYC³' })).toHaveAttribute('aria-current', 'true')
  })

  it('点击封面触发 onSelect 并移动选中项', () => {
    const onSelect = vi.fn()
    renderFlow({ onSelect })

    fireEvent.click(screen.getByRole('button', { name: '回声 - YYC³' }))

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(tracks[2], 2)
    expect(screen.getByRole('button', { name: '回声 - YYC³' })).toHaveAttribute('aria-current', 'true')
  })

  it('空列表渲染空态且不挂载视口', () => {
    renderFlow({ tracks: [], emptyText: '还没有歌曲' })

    expect(screen.getByText('还没有歌曲')).toBeInTheDocument()
    expect(screen.queryByTestId('cover-flow-viewport')).toBeNull()
  })
})

describe('CoverFlow 交互', () => {
  it('键盘左右方向键与回车切换曲目', () => {
    const onSelect = vi.fn()
    renderFlow({ onSelect })
    const viewport = screen.getByTestId('cover-flow-viewport')

    fireEvent.keyDown(viewport, { key: 'ArrowLeft' })
    expect(onSelect).toHaveBeenLastCalledWith(tracks[0], 0)

    fireEvent.keyDown(viewport, { key: 'ArrowRight' })
    expect(onSelect).toHaveBeenLastCalledWith(tracks[1], 1)

    fireEvent.keyDown(viewport, { key: 'Enter' })
    expect(onSelect).toHaveBeenLastCalledWith(tracks[1], 1)
    expect(onSelect).toHaveBeenCalledTimes(3)
  })

  it('拖拽超过阈值切到下一项，拖拽后点击被抑制', () => {
    let now = 0
    vi.spyOn(Date, 'now').mockImplementation(() => now)

    const onSelect = vi.fn()
    renderFlow({ onSelect })
    const viewport = screen.getByTestId('cover-flow-viewport')

    fireEvent.mouseDown(viewport, { clientX: 300 })
    now = 100
    fireEvent.mouseMove(viewport, { clientX: 180 })
    now = 200
    fireEvent.mouseUp(viewport)

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenLastCalledWith(tracks[2], 2)

    fireEvent.click(screen.getByRole('button', { name: '回声 - YYC³' }))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('小幅拖拽停留在当前项', () => {
    let now = 0
    vi.spyOn(Date, 'now').mockImplementation(() => now)

    const onSelect = vi.fn()
    renderFlow({ onSelect })
    const viewport = screen.getByTestId('cover-flow-viewport')

    fireEvent.mouseDown(viewport, { clientX: 300 })
    now = 100
    fireEvent.mouseMove(viewport, { clientX: 280 })
    now = 200
    fireEvent.mouseUp(viewport)

    expect(onSelect).toHaveBeenLastCalledWith(tracks[1], 1)
  })
})

describe('CoverFlow 视觉能力', () => {
  it('getCover 覆盖曲目封面，isLoading 展示加载态', () => {
    renderFlow({
      getCover: (track: CoverFlowTrack) => (track.id === 'a' ? '/override.jpg' : null),
      isLoading: (id: string) => id === 'c',
    })

    expect(screen.getByAltText('星轨').getAttribute('src')).toBe('/override.jpg')
    expect(screen.getByAltText('夜航').getAttribute('src')).toBe('/b.jpg')
    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('showReflection 控制倒影渲染', () => {
    const { container, unmount } = renderFlow()
    const reflections = Array.from(container.querySelectorAll<HTMLDivElement>('div')).filter((el) =>
      el.style.backgroundImage.includes('/b.jpg')
    )
    expect(reflections.length).toBeGreaterThan(0)
    unmount()

    const { container: without } = renderFlow({ showReflection: false })
    const none = Array.from(without.querySelectorAll<HTMLDivElement>('div')).filter((el) =>
      el.style.backgroundImage.includes('/b.jpg')
    )
    expect(none).toHaveLength(0)
  })

  it('响应窗口宽度并在卸载时清理 resize 监听', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 500 })
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = renderFlow()
    const viewport = screen.getByTestId('cover-flow-viewport')
    expect(viewport.style.height).toBe('280px')
    expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function))

    act(() => {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 })
      window.dispatchEvent(new Event('resize'))
    })
    expect(viewport.style.height).toBe('384px')

    unmount()
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function))
  })
})
