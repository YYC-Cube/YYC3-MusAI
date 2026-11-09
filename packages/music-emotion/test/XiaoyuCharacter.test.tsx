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

function stubFetch(impl?: (url: string) => Promise<any>) {
  const fetchMock = vi.fn(impl ?? (async (url: string) => ({
    ok: true,
    status: 200,
    json: async () => ({ animation: url }),
  })))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function getWrapper(): HTMLElement {
  const wrapper = document.querySelector('.xiaoyu-character') as HTMLElement | null
  if (!wrapper) throw new Error('未找到小语角色容器')
  return wrapper
}

describe('XiaoyuCharacter', () => {
  beforeEach(() => {
    stubFetch()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('默认使用内置动画渲染，不依赖远程资源与别名', async () => {
    render(<XiaoyuCharacter userEmotion="happy" />)

    const lottie = await screen.findByTestId('lottie')
    expect(fetch).not.toHaveBeenCalled()
    expect(lottie.getAttribute('data-animation')).toContain('xiaoyu-happy')
    expect(lottie.getAttribute('data-loop')).toBe('true')
    expect(lottie.getAttribute('data-autoplay')).toBe('true')

    const wrapper = getWrapper()
    expect(wrapper.getAttribute('data-emotion')).toBe('happy')
    expect(wrapper.getAttribute('data-fallback')).toBe('true')
  })

  it.each([
    ['anxious', 'xiaoyu-anxious'],
    ['surprised', 'xiaoyu-surprised'],
    ['neutral', 'xiaoyu-neutral'],
  ] as const)('情绪 %s 使用对应的内置动画', async (emotion, name) => {
    render(<XiaoyuCharacter userEmotion={emotion} />)
    const lottie = await screen.findByTestId('lottie')
    expect(lottie.getAttribute('data-animation')).toContain(name)
    expect(getWrapper().getAttribute('data-emotion')).toBe(emotion)
  })

  it('未传情绪时默认 neutral，未知情绪回退 neutral', async () => {
    const { rerender } = render(<XiaoyuCharacter />)
    expect(getWrapper().getAttribute('data-emotion')).toBe('neutral')

    rerender(<XiaoyuCharacter userEmotion={'mystery' as any} />)
    expect(getWrapper().getAttribute('data-emotion')).toBe('neutral')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('animationSrc 按 document.baseURI 解析并加载远程动画', async () => {
    render(<XiaoyuCharacter userEmotion="neutral" animationSrc="/assets/custom.json" />)

    const lottie = await screen.findByTestId('lottie')
    const expected = new URL('/assets/custom.json', document.baseURI).toString()
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(expected, expect.anything()))
    await waitFor(() => expect(lottie.getAttribute('data-animation')).toContain('custom.json'))
    expect(getWrapper().getAttribute('data-fallback')).toBe('false')
  })

  it('animationSrc 支持相对路径', async () => {
    render(<XiaoyuCharacter userEmotion="neutral" animationSrc="assets/relative.json" />)
    const expected = new URL('assets/relative.json', document.baseURI).toString()
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(expected, expect.anything()))
  })

  it('animationData 优先于 animationSrc，且不发起请求', async () => {
    render(
      <XiaoyuCharacter
        userEmotion="happy"
        animationData={{ nm: 'injected' }}
        animationSrc="/assets/should-not-load.json"
      />
    )

    const lottie = await screen.findByTestId('lottie')
    expect(lottie.getAttribute('data-animation')).toContain('injected')
    expect(fetch).not.toHaveBeenCalled()
    expect(getWrapper().getAttribute('data-fallback')).toBe('false')
  })

  it('远程动画失败时回退到内置动画，而非不渲染', async () => {
    stubFetch(async () => {
      throw new Error('network down')
    })
    render(<XiaoyuCharacter userEmotion="surprised" animationSrc="/assets/broken.json" />)

    const lottie = await screen.findByTestId('lottie')
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    await waitFor(() => expect(getWrapper().getAttribute('data-fallback')).toBe('true'))
    expect(lottie.getAttribute('data-animation')).toContain('xiaoyu-surprised')
  })

  it('HTTP 非 2xx 时回退到内置动画', async () => {
    stubFetch(async () => ({ ok: false, status: 404, json: async () => ({}) }))
    render(<XiaoyuCharacter userEmotion="neutral" animationSrc="/assets/missing.json" />)

    await waitFor(() => expect(getWrapper().getAttribute('data-fallback')).toBe('true'))
    expect(screen.getByTestId('lottie')).toBeTruthy()
  })

  it('情绪变化时切换动画', async () => {
    const { rerender } = render(<XiaoyuCharacter userEmotion="happy" />)
    expect(screen.getByTestId('lottie').getAttribute('data-animation')).toContain('xiaoyu-happy')

    rerender(<XiaoyuCharacter userEmotion="anxious" />)
    await waitFor(() => {
      expect(screen.getByTestId('lottie').getAttribute('data-animation')).toContain('xiaoyu-anxious')
    })
    expect(getWrapper().getAttribute('data-emotion')).toBe('anxious')
  })

  it('拖拽更新位置，松开后停止响应移动', async () => {
    render(<XiaoyuCharacter userEmotion="neutral" />)
    const wrapper = getWrapper()

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

  it('拖拽被限制在视口内', async () => {
    render(<XiaoyuCharacter userEmotion="neutral" />)
    const wrapper = getWrapper()

    fireEvent.mouseDown(wrapper, { clientX: 100, clientY: 100 })
    fireEvent.mouseMove(window, { clientX: 5000, clientY: 5000 })
    expect(wrapper.style.right).toBe('0px')
    expect(wrapper.style.bottom).toBe('8px')

    fireEvent.mouseMove(window, { clientX: -5000, clientY: -5000 })
    expect(wrapper.style.right).toBe(`${window.innerWidth - 120 - 8}px`)
    expect(wrapper.style.bottom).toBe(`${window.innerHeight - 120 - 8}px`)

    fireEvent.mouseUp(window)
  })

  it('仅响应鼠标左键拖拽', async () => {
    render(<XiaoyuCharacter userEmotion="neutral" />)
    const wrapper = getWrapper()

    fireEvent.mouseDown(wrapper, { clientX: 100, clientY: 100, button: 2 })
    fireEvent.mouseMove(window, { clientX: 0, clientY: 0 })
    expect(wrapper.style.right).toBe('20px')
    expect(wrapper.style.bottom).toBe('20px')
  })

  it('多个实例拖拽互不影响（不再依赖全局选择器）', async () => {
    render(
      <>
        <XiaoyuCharacter userEmotion="happy" />
        <XiaoyuCharacter userEmotion="neutral" />
      </>
    )
    const wrappers = Array.from(document.querySelectorAll('.xiaoyu-character')) as HTMLElement[]
    expect(wrappers).toHaveLength(2)

    fireEvent.mouseDown(wrappers[1], { clientX: 100, clientY: 100 })
    fireEvent.mouseMove(window, { clientX: 90, clientY: 90 })
    fireEvent.mouseUp(window)

    expect(wrappers[0].style.right).toBe('20px')
    expect(wrappers[0].style.bottom).toBe('20px')
    expect(wrappers[1].style.right).toBe('30px')
    expect(wrappers[1].style.bottom).toBe('30px')
  })

  it('拖拽过程中卸载会移除监听且不报错', async () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render(<XiaoyuCharacter userEmotion="neutral" />)
    const wrapper = getWrapper()

    fireEvent.mouseDown(wrapper, { clientX: 100, clientY: 100 })
    unmount()

    expect(removeSpy).toHaveBeenCalledWith('mousemove', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('mouseup', expect.any(Function))
    expect(() => fireEvent.mouseMove(window, { clientX: 0, clientY: 0 })).not.toThrow()
  })

  it('卸载后异步动画返回不会报错也不会重新渲染', async () => {
    let resolveFetch: (value: any) => void = () => {}
    stubFetch(() => new Promise((resolve) => {
      resolveFetch = resolve
    }))

    const { unmount } = render(<XiaoyuCharacter userEmotion="happy" animationSrc="/assets/slow.json" />)
    expect(getWrapper()).toBeTruthy()

    unmount()
    resolveFetch({ ok: true, status: 200, json: async () => ({ ok: true }) })

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(document.querySelector('.xiaoyu-character')).toBeNull()
  })
})
