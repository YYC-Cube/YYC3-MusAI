// YYC³ music-emotion — XiaoyuCharacter 角色组件测试
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import XiaoyuCharacter from '../src/components/xiaoyu/XiaoyuCharacter'

vi.mock('lottie-react', () => ({
  default: (props: any) =>
    React.createElement('div', {
      'data-testid': 'lottie',
      'data-animation': JSON.stringify(props.animationData),
      'data-loop': String(props.loop),
      'data-autoplay': String(props.autoplay),
    }),
}))

function mockFetchSuccess() {
  const fetchMock = vi.fn(async (url: string) => ({
    json: async () => ({ animation: url }),
  }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('XiaoyuCharacter', () => {
  beforeEach(() => {
    mockFetchSuccess()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('加载对应情绪的动画并渲染 Lottie', async () => {
    render(<XiaoyuCharacter userEmotion="happy" />)

    const lottie = await screen.findByTestId('lottie')
    expect(fetch).toHaveBeenCalledWith('/assets/animations/xiaoyu-happy.json')
    expect(lottie.getAttribute('data-animation')).toContain('xiaoyu-happy.json')
    expect(lottie.getAttribute('data-loop')).toBe('true')
    expect(lottie.getAttribute('data-autoplay')).toBe('true')
    expect(document.querySelector('.xiaoyu-character')).toBeTruthy()
  })

  it.each([
    ['anxious', '/assets/animations/xiaoyu-anxious.json'],
    ['surprised', '/assets/animations/xiaoyu-surprised.json'],
    ['neutral', '/assets/animations/xiaoyu-neutral.json'],
  ] as const)('情绪 %s 使用对应动画地址', async (emotion, path) => {
    render(<XiaoyuCharacter userEmotion={emotion} />)
    await screen.findByTestId('lottie')
    expect(fetch).toHaveBeenCalledWith(path)
  })

  it('未传情绪时默认使用 neutral 动画', async () => {
    render(<XiaoyuCharacter userEmotion={undefined as any} />)
    await screen.findByTestId('lottie')
    expect(fetch).toHaveBeenCalledWith('/assets/animations/xiaoyu-neutral.json')
  })

  it('未知情绪回退到 neutral 动画地址', async () => {
    render(<XiaoyuCharacter userEmotion={'mystery' as any} />)
    await screen.findByTestId('lottie')
    expect(fetch).toHaveBeenCalledWith('/assets/animations/xiaoyu-neutral.json')
  })

  it('动画加载失败时不渲染角色', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network down')
    }))
    const { container } = render(<XiaoyuCharacter userEmotion="happy" />)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(container.querySelector('.xiaoyu-character')).toBeNull()
    })
  })

  it('情绪变化时重新加载动画', async () => {
    const { rerender } = render(<XiaoyuCharacter userEmotion="happy" />)
    await screen.findByTestId('lottie')

    rerender(<XiaoyuCharacter userEmotion="anxious" />)
    await waitFor(() => {
      expect(fetch).toHaveBeenLastCalledWith('/assets/animations/xiaoyu-anxious.json')
    })
  })

  it('拖拽更新位置，松开后停止响应移动', async () => {
    render(<XiaoyuCharacter userEmotion="neutral" />)
    const wrapper = (await screen.findByTestId('lottie')).parentElement as HTMLElement

    expect(wrapper.style.right).toBe('20px')
    expect(wrapper.style.bottom).toBe('20px')

    fireEvent.mouseDown(wrapper, { clientX: 100, clientY: 100 })
    fireEvent.mouseMove(window, { clientX: 80, clientY: 70 })

    expect(wrapper.style.right).toBe('40px')
    expect(wrapper.style.bottom).toBe('50px')

    fireEvent.mouseUp(window)
    fireEvent.mouseMove(window, { clientX: 0, clientY: 0 })
    expect(wrapper.style.right).toBe('40px')
    expect(wrapper.style.bottom).toBe('50px')
  })

  it('卸载后异步动画返回不会报错', async () => {
    let resolveFetch: (value: any) => void = () => {}
    vi.stubGlobal('fetch', vi.fn(() => new Promise((resolve) => {
      resolveFetch = resolve
    })))

    const { unmount } = render(<XiaoyuCharacter userEmotion="happy" />)
    unmount()
    resolveFetch({ json: async () => ({ ok: true }) })

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled()
    })
    expect(document.querySelector('.xiaoyu-character')).toBeNull()
  })
})
