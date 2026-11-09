/**
 * @file PageFlipInteraction 单元测试
 * @description 覆盖页面初始化、鼠标/触摸/键盘手势、翻页边界、动画、logo 集成与大屏同步
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PageFlipInteraction from '../src/PageFlipInteraction.js'

type PageFlipAny = InstanceType<typeof PageFlipInteraction> & {
  pages: HTMLElement[]
  isAnimating: boolean
  bigScreen?: any
  logo?: HTMLElement
  logoOptions: any
}

const createContainer = (pageCount = 3, options: any = {}) => {
  const container = document.createElement('div')
  for (let i = 0; i < pageCount; i++) {
    const page = document.createElement('div')
    page.className = `page-${i}`
    container.appendChild(page)
  }
  document.body.appendChild(container)
  return { container, flip: new PageFlipInteraction(container, options) as PageFlipAny }
}

const touchEvent = (type: string, x: number, y: number) => {
  const event = new Event(type, { cancelable: true, bubbles: true }) as any
  event.touches = [{ clientX: x, clientY: y }]
  return event
}

const flushAnimation = () => vi.advanceTimersByTime(500)

describe('PageFlipInteraction', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    delete (window as any).soundManager
  })

  describe('初始化', () => {
    it('按默认配置初始化页面样式', () => {
      const { container, flip } = createContainer()

      expect(container.children).toHaveLength(3)
      expect(flip.totalPages).toBe(3)
      expect(flip.currentPage).toBe(0)
      expect(flip.pages[0].style.position).toBe('absolute')
      expect(flip.pages[0].style.transform).toBe('translateX(0)')
      expect(flip.pages[1].style.transform).toBe('translateX(100%)')
      expect(flip.pages[0].style.transition).toBe('transform 300ms ease-out')
    })

    it('支持选择器字符串与自定义配置', () => {
      const container = document.createElement('div')
      container.id = 'flip-root'
      container.innerHTML = '<section></section><section></section>'
      document.body.appendChild(container)

      const flip = new PageFlipInteraction('#flip-root', {
        sensitivity: 20,
        animationDuration: 120,
        easing: 'linear',
      }) as PageFlipAny

      expect(flip.container).toBe(container)
      expect(flip.options.sensitivity).toBe(20)
      expect(flip.pages[0].style.transition).toBe('transform 120ms linear')
      expect(flip.totalPages).toBe(2)
    })
  })

  describe('鼠标手势', () => {
    it('向左滑动超过阈值翻到下一页并派发事件', () => {
      const { container, flip } = createContainer()
      const pageChange = vi.fn()
      const pageNext = vi.fn()
      flip.on('pageChange', pageChange)
      flip.on('pageNext', pageNext)

      container.dispatchEvent(new MouseEvent('mousedown', { clientX: 300, clientY: 100 }))
      const move = new MouseEvent('mousemove', { clientX: 100, clientY: 100, cancelable: true })
      container.dispatchEvent(move)
      expect(flip.pages[0].style.transform).toBe('translateX(-200px)')
      expect(flip.pages[1].style.transform).toBe('translateX(-100px)')
      expect(move.defaultPrevented).toBe(true)

      container.dispatchEvent(new MouseEvent('mouseup', { clientX: 100, clientY: 100 }))

      expect(flip.currentPage).toBe(1)
      expect(pageChange).toHaveBeenCalledWith(1)
      expect(pageNext).toHaveBeenCalledWith(1)
      expect(flip.isAnimating).toBe(true)

      flushAnimation()
      expect(flip.isAnimating).toBe(false)
    })

    it('向右滑动返回上一页并派发 pagePrevious', () => {
      const { container, flip } = createContainer()
      flip.goToPage(1)
      flushAnimation()
      const pagePrevious = vi.fn()
      flip.on('pagePrevious', pagePrevious)

      container.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100 }))
      container.dispatchEvent(new MouseEvent('mousemove', { clientX: 400, clientY: 100 }))
      container.dispatchEvent(new MouseEvent('mouseup', { clientX: 400, clientY: 100 }))

      expect(flip.currentPage).toBe(0)
      expect(pagePrevious).toHaveBeenCalledWith(0)
    })

    it('首页向右滑动或末页向左滑动时恢复原位', () => {
      const { container, flip } = createContainer()

      container.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100 }))
      container.dispatchEvent(new MouseEvent('mousemove', { clientX: 300, clientY: 100 }))
      container.dispatchEvent(new MouseEvent('mouseup', { clientX: 300, clientY: 100 }))
      expect(flip.currentPage).toBe(0)

      flip.goToPage(2)
      flushAnimation()

      container.dispatchEvent(new MouseEvent('mousedown', { clientX: 300, clientY: 100 }))
      container.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 100 }))
      container.dispatchEvent(new MouseEvent('mouseup', { clientX: 50, clientY: 100 }))
      expect(flip.currentPage).toBe(2)
    })

    it('位移不足阈值时恢复原位且不翻页', () => {
      const { container, flip } = createContainer()
      const pageChange = vi.fn()
      flip.on('pageChange', pageChange)

      container.dispatchEvent(new MouseEvent('mousedown', { clientX: 200, clientY: 100 }))
      container.dispatchEvent(new MouseEvent('mousemove', { clientX: 220, clientY: 100 }))
      container.dispatchEvent(new MouseEvent('mouseup', { clientX: 220, clientY: 100 }))

      expect(flip.currentPage).toBe(0)
      expect(pageChange).not.toHaveBeenCalled()
      expect(flip.pages[0].style.transform).toBe('translateX(0)')
      expect(flip.pages[1].style.transform).toBe('translateX(100%)')
    })

    it('mouseleave 也会结束手势', () => {
      const { container, flip } = createContainer()

      container.dispatchEvent(new MouseEvent('mousedown', { clientX: 300, clientY: 100 }))
      container.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 100 }))
      container.dispatchEvent(new MouseEvent('mouseleave', { clientX: 50, clientY: 100 }))

      expect(flip.currentPage).toBe(1)
    })

    it('无起始手势或动画中时忽略移动与结束事件', () => {
      const { container, flip } = createContainer()

      container.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 10 }))
      container.dispatchEvent(new MouseEvent('mouseup', { clientX: 50, clientY: 10 }))
      expect(flip.currentPage).toBe(0)

      container.dispatchEvent(new MouseEvent('mousedown', { clientX: 300, clientY: 100 }))
      container.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 100 }))
      container.dispatchEvent(new MouseEvent('mouseup', { clientX: 50, clientY: 100 }))
      expect(flip.currentPage).toBe(1)
      expect(flip.isAnimating).toBe(true)

      // 动画中：起始/移动/结束均被忽略
      container.dispatchEvent(new MouseEvent('mousedown', { clientX: 300, clientY: 100 }))
      container.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 100 }))
      container.dispatchEvent(new MouseEvent('mouseup', { clientX: 50, clientY: 100 }))
      expect(flip.currentPage).toBe(1)
    })
  })

  describe('触摸手势', () => {
    it('touchstart/touchmove/touchend 完成翻页', () => {
      const { container, flip } = createContainer()

      container.dispatchEvent(touchEvent('touchstart', 300, 100))
      const move = touchEvent('touchmove', 80, 120)
      container.dispatchEvent(move)
      expect(move.defaultPrevented).toBe(true)
      expect(flip.pages[0].style.transform).toBe('translateX(-220px)')

      container.dispatchEvent(touchEvent('touchend', 80, 120))
      expect(flip.currentPage).toBe(1)
    })
  })

  describe('键盘导航', () => {
    it('方向键与 PageUp/PageDown 控制翻页', () => {
      const { flip } = createContainer()

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
      expect(flip.currentPage).toBe(1)
      flushAnimation()

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown' }))
      expect(flip.currentPage).toBe(2)
      flushAnimation()

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
      expect(flip.currentPage).toBe(1)
      flushAnimation()

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp' }))
      expect(flip.currentPage).toBe(0)
      flushAnimation()

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
      expect(flip.currentPage).toBe(0)
    })

    it('边界与动画中键盘事件被忽略', () => {
      const { flip } = createContainer()

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp' }))
      expect(flip.currentPage).toBe(0)

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
      expect(flip.currentPage).toBe(1)
      // 动画中
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
      expect(flip.currentPage).toBe(1)
    })
  })

  describe('翻页方法边界', () => {
    it('previousPage 在首页、nextPage 在末页均不动作', () => {
      const { flip } = createContainer()
      const pageChange = vi.fn()
      flip.on('pageChange', pageChange)

      flip.previousPage()
      expect(flip.currentPage).toBe(0)

      flip.goToPage(2)
      flushAnimation()
      pageChange.mockClear()

      flip.nextPage()
      expect(flip.currentPage).toBe(2)
      expect(pageChange).not.toHaveBeenCalled()
    })

    it('goToPage 校验索引并在动画中忽略调用', () => {
      const { flip } = createContainer()
      const pageJump = vi.fn()
      flip.on('pageJump', pageJump)

      flip.goToPage(-1)
      flip.goToPage(3)
      expect(flip.currentPage).toBe(0)
      expect(pageJump).not.toHaveBeenCalled()

      flip.goToPage(2)
      expect(flip.currentPage).toBe(2)
      expect(pageJump).toHaveBeenCalledWith(2)

      flip.goToPage(0)
      expect(flip.currentPage).toBe(2)
    })
  })

  describe('动画', () => {
    it('applyAnimation 对三种动画应用不同样式', () => {
      const { flip, container } = createContainer()
      const page = container.children[0] as HTMLElement

      flip.applyAnimation(page, 'spatialCompression', 0.5)
      expect(page.style.transform).toBe('translateX(0) scale(0.95)')

      flip.applyAnimation(page, 'organicFlow', 0.4)
      expect(page.style.transform).toBe('translateX(0) rotateY(2deg)')

      flip.applyAnimation(page, 'smoothTransition', 0.25)
      expect(page.style.opacity).toBe('0.75')

      flip.applyAnimation(page, 'unknown', 0.5)
      expect(page.style.opacity).toBe('0.75')
    })
  })

  describe('logo 集成', () => {
    it.each([
      ['top-left', 'top', '20px', 'left'],
      ['top-right', 'top', '20px', 'right'],
      ['bottom-left', 'bottom', '20px', 'left'],
      ['bottom-right', 'bottom', '20px', 'right'],
    ])('位置 %s 设置对应方位样式', (position, vertical, offset, horizontal) => {
      const { flip } = createContainer()
      const logo = document.createElement('img')

      flip.integrateLogo(logo, { position, size: '60px' })

      expect(logo.style.position).toBe('absolute')
      expect(logo.style.zIndex).toBe('1000')
      expect(logo.style.width).toBe('60px')
      expect(logo.style.height).toBe('auto')
      expect(logo.style[vertical as any]).toBe(offset)
      expect(logo.style[horizontal as any]).toBe(offset)
    })

    it('默认位置为 top-right，翻页时播放 logo 动画后复位', () => {
      const { flip } = createContainer()
      const logo = document.createElement('img')
      flip.integrateLogo(logo)

      expect(flip.logoOptions.position).toBe('top-right')
      expect(logo.style.top).toBe('20px')
      expect(logo.style.right).toBe('20px')

      flip.nextPage()
      expect(logo.style.transform).toBe('scale(1.1)')
      expect(logo.style.opacity).toBe('0.8')

      flushAnimation()
      expect(logo.style.transform).toBe('scale(1)')
      expect(logo.style.opacity).toBe('1')
    })

    it('未集成 logo 时更新位置与动画安全返回', () => {
      const { flip } = createContainer()

      expect(() => flip.updateLogoPosition()).not.toThrow()
      expect(() => flip.animateLogo()).not.toThrow()
    })
  })

  describe('大屏同步与音效', () => {
    it('翻页时同步页码到大屏对象', () => {
      const { flip } = createContainer()
      const bigScreen = { updatePage: vi.fn() }
      flip.syncToBigScreen(bigScreen)

      flip.nextPage()

      expect(bigScreen.updatePage).toHaveBeenCalledWith(1)
    })

    it('大屏对象缺少 updatePage 时安全忽略', () => {
      const { flip } = createContainer()
      flip.syncToBigScreen({})

      expect(() => flip.nextPage()).not.toThrow()
    })

    it('存在全局 soundManager 时播放翻页音效', () => {
      const { flip } = createContainer()
      const playSound = vi.fn()
      ;(window as any).soundManager = { playSound }

      flip.nextPage()
      flushAnimation()
      flip.previousPage()

      expect(playSound).toHaveBeenCalledTimes(2)
      expect(playSound).toHaveBeenCalledWith('pageFlip')
    })

    it('on/emit 支持多回调与未知事件', () => {
      const { flip } = createContainer()
      const first = vi.fn()
      const second = vi.fn()

      flip.on('custom', first)
      flip.on('custom', second)
      flip.emit('custom', 1)
      flip.emit('missing', 2)

      expect(first).toHaveBeenCalledWith(1)
      expect(second).toHaveBeenCalledWith(1)
    })
  })
})
