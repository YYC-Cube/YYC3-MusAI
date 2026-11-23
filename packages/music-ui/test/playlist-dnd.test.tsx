/**
 * @file PlaylistSortableList / PlaylistItemView 测试（W7 收编组件补测，基于 @dnd-kit v6/v10）
 * @description 覆盖渲染冒烟（条目/序号/aria 可排序角色）、空列表与长列表边界、只读 PlaylistItemView、
 *              拖拽排序回调（DndContext onDragEnd 经 mock 包装捕获后直接调用，覆盖重排/同位/
 *              null over/未知 id 四条分支）、真实 PointerSensor 指针拖拽集成（jsdom PointerEvent stub）。
 */
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'

// RTL 挂载手动清理：源仓 vitest 不依赖 globals auto-cleanup（W7-P2-3 环境自足化）
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

// jsdom 缺失浏览器 API 守卫（W7-P2-3 环境自足化；守卫式，不覆盖宿主已有实现）
if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    })
  }
  if (typeof (globalThis as { ResizeObserver?: unknown }).ResizeObserver === 'undefined') {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub
  }
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
  // jsdom 未实现 PointerEvent：dnd-kit PointerSensor 激活需 isPrimary/button、
  // 坐标需 clientX/clientY。基于 MouseEvent 的守卫式 stub（存在则不覆盖）。
  if (typeof window.PointerEvent === 'undefined') {
    class PointerEventStub extends MouseEvent {
      pointerId: number
      isPrimary: boolean
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init)
        this.pointerId = init.pointerId ?? 1
        this.isPrimary = init.isPrimary ?? true
      }
    }
    ;(window as unknown as { PointerEvent: unknown }).PointerEvent = PointerEventStub
  }
}


import { createElement } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DragEndEvent } from '@dnd-kit/core'
import { PlaylistItemView, PlaylistSortableList } from '../src'

// 直接调用内部回调模拟拖拽：包装真实 DndContext，捕获最新一次渲染的 onDragEnd 供断言调用
const capturedDnd: { onDragEnd?: (event: DragEndEvent) => void } = {}
vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>()
  const { createElement } = await import('react')
  const OriginalDndContext = actual.DndContext
  return {
    ...actual,
    DndContext: (props: Parameters<typeof OriginalDndContext>[0]) => {
      capturedDnd.onDragEnd = props.onDragEnd as (event: DragEndEvent) => void
      return createElement(OriginalDndContext, props)
    },
  }
})

const ITEMS = [
  { id: 'a', title: '晴天', artist: '周杰伦' },
  { id: 'b', title: '七里香', artist: '周杰伦' },
  { id: 'c', title: '夜曲', artist: '周杰伦' },
]

function setup(items = ITEMS, onDragEnd?: (orderedIds: string[]) => void) {
  return render(
    createElement(PlaylistSortableList, { items, onDragEnd: onDragEnd ?? vi.fn() })
  )
}

function findSortableNode(label: string) {
  return screen.getByText(label).closest('div[role="button"]')!
}

/** jsdom 无布局：按条目文本注入非零 rect（dnd-kit rectIntersection 要求重叠面积为正，零矩形永远不碰撞） */
function makeRect(top: number): DOMRect {
  return {
    x: 0,
    y: top,
    top,
    left: 0,
    bottom: top + 100,
    right: 300,
    width: 300,
    height: 100,
    toJSON: () => ({}),
  } as DOMRect
}

beforeEach(() => {
  capturedDnd.onDragEnd = undefined
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: Element
  ) {
    const text = this.textContent ?? ''
    if (text.includes('晴天')) return makeRect(0)
    if (text.includes('七里香')) return makeRect(100)
    if (text.includes('夜曲')) return makeRect(200)
    return makeRect(0)
  })
})

describe('PlaylistSortableList 渲染冒烟', () => {
  it('渲染全部条目：标题/歌手/从 1 开始的序号', () => {
    const { container } = setup()
    expect(screen.getByText('晴天')).toBeInTheDocument()
    expect(screen.getByText('七里香')).toBeInTheDocument()
    expect(screen.getByText('夜曲')).toBeInTheDocument()
    expect(screen.getAllByText('周杰伦')).toHaveLength(3)
    expect(container.textContent).toContain('1')
    expect(container.textContent).toContain('3')
  })

  it('每个条目暴露可排序 aria 角色（role=button + aria-roledescription=sortable）', () => {
    const { container } = setup()
    const nodes = container.querySelectorAll('div[role="button"][aria-roledescription="sortable"]')
    expect(nodes).toHaveLength(3)
    // 拖拽手柄（整行）tabIndex 可聚焦
    expect(nodes[0]).toHaveAttribute('tabindex', '0')
  })

  it('空列表渲染容器不崩溃', () => {
    const { container } = setup([])
    expect(container.querySelector('div')).toBeTruthy()
    expect(container.querySelectorAll('div[role="button"]')).toHaveLength(0)
  })

  it('长列表（30 条）渲染全部条目', () => {
    const longItems = Array.from({ length: 30 }, (_, i) => ({
      id: `t${i}`,
      title: `歌曲${i}`,
      artist: 'Various',
    }))
    const { container } = setup(longItems)
    expect(container.querySelectorAll('div[role="button"]')).toHaveLength(30)
    expect(screen.getByText('歌曲29')).toBeInTheDocument()
  })
})

describe('PlaylistSortableList 拖拽排序回调（直接调用内部 onDragEnd）', () => {
  it('拖到目标位之前：active b → over a，回调得到重排后的 id 顺序', () => {
    const onDragEnd = vi.fn()
    setup(ITEMS, onDragEnd)
    expect(capturedDnd.onDragEnd).toBeTypeOf('function')
    capturedDnd.onDragEnd!({ active: { id: 'b' }, over: { id: 'a' } } as DragEndEvent)
    expect(onDragEnd).toHaveBeenCalledTimes(1)
    expect(onDragEnd).toHaveBeenCalledWith(['b', 'a', 'c'])
  })

  it('拖到目标位之后：active a → over c，回调得到 [b, c, a]', () => {
    const onDragEnd = vi.fn()
    setup(ITEMS, onDragEnd)
    capturedDnd.onDragEnd!({ active: { id: 'a' }, over: { id: 'c' } } as DragEndEvent)
    expect(onDragEnd).toHaveBeenCalledWith(['b', 'c', 'a'])
  })

  it('active 与 over 相同（原位放下）不触发回调', () => {
    const onDragEnd = vi.fn()
    setup(ITEMS, onDragEnd)
    capturedDnd.onDragEnd!({ active: { id: 'b' }, over: { id: 'b' } } as DragEndEvent)
    expect(onDragEnd).not.toHaveBeenCalled()
  })

  it('over 为 null（拖出容器）不触发回调', () => {
    const onDragEnd = vi.fn()
    setup(ITEMS, onDragEnd)
    capturedDnd.onDragEnd!({ active: { id: 'b' }, over: null } as DragEndEvent)
    expect(onDragEnd).not.toHaveBeenCalled()
  })

  it('active/over id 不在 items 中不触发回调', () => {
    const onDragEnd = vi.fn()
    setup(ITEMS, onDragEnd)
    capturedDnd.onDragEnd!({ active: { id: 'x' }, over: { id: 'a' } } as DragEndEvent)
    capturedDnd.onDragEnd!({ active: { id: 'a' }, over: { id: 'y' } } as DragEndEvent)
    expect(onDragEnd).not.toHaveBeenCalled()
  })
})

describe('PlaylistSortableList PointerSensor 指针拖拽集成', () => {
  it('pointerdown → pointermove → pointerup 完整拖拽触发排序回调', () => {
    const onDragEnd = vi.fn()
    setup(ITEMS, onDragEnd)

    const node = findSortableNode('夜曲')
    expect(node).toBeTruthy()

    // 指针起点取在 '夜曲'（rect 200–300）内，上移至 y=50 → 平移后 active rect（0–100）
    // 仅与 '晴天'（rect 0–100）相交 → over='a' → 回调 ['c', 'a', 'b']
    fireEvent.pointerDown(node, {
      button: 0,
      isPrimary: true,
      pointerId: 1,
      clientX: 150,
      clientY: 250,
    })
    fireEvent.pointerMove(document, { pointerId: 1, isPrimary: true, clientX: 150, clientY: 50 })
    fireEvent.pointerUp(document, {
      button: 0,
      isPrimary: true,
      pointerId: 1,
      clientX: 150,
      clientY: 50,
    })

    expect(onDragEnd).toHaveBeenCalledTimes(1)
    expect(onDragEnd).toHaveBeenCalledWith(['c', 'a', 'b'])
  })

  it('拖拽中按下 Escape 取消拖拽，不触发排序回调', () => {
    const onDragEnd = vi.fn()
    setup(ITEMS, onDragEnd)

    const node = findSortableNode('晴天')
    fireEvent.pointerDown(node, {
      button: 0,
      isPrimary: true,
      pointerId: 1,
      clientX: 150,
      clientY: 50,
    })
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
    fireEvent.pointerUp(document, {
      button: 0,
      isPrimary: true,
      pointerId: 1,
      clientX: 150,
      clientY: 50,
    })
    expect(onDragEnd).not.toHaveBeenCalled()
  })
})

describe('PlaylistItemView', () => {
  it('只读展示：序号/标题/歌手且不可拖拽', () => {
    render(
      createElement(PlaylistItemView, { item: ITEMS[1], index: 2 })
    )
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('七里香')).toBeInTheDocument()
    expect(screen.getByText('周杰伦')).toBeInTheDocument()
    expect(document.querySelector('div[role="button"]')).toBeNull()
  })
})
