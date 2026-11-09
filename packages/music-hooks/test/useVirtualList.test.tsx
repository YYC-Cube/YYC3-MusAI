// YYC³ music-hooks — useVirtualList 增量渲染测试
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { useVirtualList } from '../src/useVirtualList'

type ObserverCb = (entries: Array<{ isIntersecting: boolean }>) => void

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = []
  callback: ObserverCb
  options: IntersectionObserverInit
  observed: Element[] = []
  disconnect = vi.fn()
  observe = vi.fn((el: Element) => {
    this.observed.push(el)
  })
  unobserve = vi.fn()
  takeRecords = vi.fn(() => [])

  constructor(cb: ObserverCb, options: IntersectionObserverInit = {}) {
    this.callback = cb
    this.options = options
    MockIntersectionObserver.instances.push(this)
  }
}

function setVisible(el: Element | null) {
  act(() => {
    MockIntersectionObserver.instances.forEach((o) => o.callback([{ isIntersecting: true }]))
  })
  void el
}

describe('useVirtualList', () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = []
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver as any)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function Probe({
    totalCount,
    initialCount,
    increment,
  }: {
    totalCount: number
    initialCount?: number
    increment?: number
  }) {
    const { visibleCount, sentinelRef, hasMore, reset } = useVirtualList(totalCount, {
      initialCount,
      increment,
    })
    return (
      <div>
        <span data-testid="visible">{visibleCount}</span>
        <span data-testid="more">{String(hasMore)}</span>
        <button data-testid="reset" onClick={reset}>reset</button>
        <div data-testid="sentinel" ref={sentinelRef} />
      </div>
    )
  }

  it('初始渲染数量为 initialCount，并在哨兵可见时按增量加载', () => {
    render(<Probe totalCount={100} initialCount={20} increment={15} />)
    expect(screen.getByTestId('visible').textContent).toBe('20')
    expect(screen.getByTestId('more').textContent).toBe('true')

    expect(MockIntersectionObserver.instances).toHaveLength(1)
    expect(MockIntersectionObserver.instances[0].observe).toHaveBeenCalledTimes(1)
    expect(MockIntersectionObserver.instances[0].options.rootMargin).toBe('200px')

    setVisible(null)
    expect(screen.getByTestId('visible').textContent).toBe('35')

    setVisible(null)
    expect(screen.getByTestId('visible').textContent).toBe('50')
  })

  it('加载到 totalCount 后 hasMore 为 false 且不会越界', () => {
    render(<Probe totalCount={50} initialCount={40} increment={15} />)
    expect(screen.getByTestId('visible').textContent).toBe('40')

    setVisible(null)
    expect(screen.getByTestId('visible').textContent).toBe('50')
    expect(screen.getByTestId('more').textContent).toBe('false')

    setVisible(null)
    expect(screen.getByTestId('visible').textContent).toBe('50')
  })

  it('totalCount 小于 initialCount 时初始值为 totalCount', () => {
    render(<Probe totalCount={5} initialCount={20} />)
    expect(screen.getByTestId('visible').textContent).toBe('5')
    expect(screen.getByTestId('more').textContent).toBe('false')
  })

  it('reset 重置为初始数量', () => {
    render(<Probe totalCount={100} initialCount={10} increment={10} />)
    setVisible(null)
    expect(screen.getByTestId('visible').textContent).toBe('20')

    act(() => {
      screen.getByTestId('reset').click()
    })
    expect(screen.getByTestId('visible').textContent).toBe('10')
  })

  it('totalCount 变化时收敛到新上限', () => {
    const { rerender } = render(<Probe totalCount={100} initialCount={20} increment={15} />)
    setVisible(null)
    expect(screen.getByTestId('visible').textContent).toBe('35')

    rerender(<Probe totalCount={10} initialCount={20} increment={15} />)
    expect(screen.getByTestId('visible').textContent).toBe('10')

    rerender(<Probe totalCount={0} initialCount={20} increment={15} />)
    expect(screen.getByTestId('visible').textContent).toBe('0')
  })

  it('卸载时断开 observer', () => {
    const { unmount } = render(<Probe totalCount={100} initialCount={20} increment={15} />)
    const observer = MockIntersectionObserver.instances[0]
    unmount()
    expect(observer.disconnect).toHaveBeenCalled()
  })

  it('根元素可见时才触发加载（isIntersecting=false 不加载）', () => {
    render(<Probe totalCount={100} initialCount={20} increment={15} />)
    expect(screen.getByTestId('visible').textContent).toBe('20')

    act(() => {
      MockIntersectionObserver.instances[0].callback([{ isIntersecting: false }])
    })
    expect(screen.getByTestId('visible').textContent).toBe('20')
  })

  it('无哨兵元素时不创建 observer', () => {
    function NoSentinel() {
      const { visibleCount } = useVirtualList(50)
      return <span data-testid="v">{visibleCount}</span>
    }
    render(<NoSentinel />)
    expect(screen.getByTestId('v').textContent).toBe('20')
    expect(MockIntersectionObserver.instances).toHaveLength(0)
  })
})
