// YYC³ music-hooks — usePWA 检测 / 安装提示 / Service Worker 测试
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePWA } from '../src/usePWA'

const UA_DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36'
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'
const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36'

function setUA(ua: string) {
  Object.defineProperty(navigator, 'userAgent', { configurable: true, get: () => ua })
}

function setOnline(online: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => online })
}

function setStandalone(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('standalone') ? matches : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as any
}

function setInnerWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width })
}

function setServiceWorker(register: any) {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { register },
  })
}

function removeServiceWorker() {
  try {
    delete (navigator as any).serviceWorker
  } catch {
    // ignore
  }
}

describe('usePWA', () => {
  beforeEach(() => {
    setUA(UA_DESKTOP)
    setOnline(true)
    setStandalone(false)
    setInnerWidth(1280)
    removeServiceWorker()
    sessionStorage.clear()
    ;(URL as any).createObjectURL = vi.fn(() => 'blob:mock-url')
    ;(URL as any).revokeObjectURL = vi.fn()
    delete (window as any).MSStream
  })

  afterEach(() => {
    document.querySelectorAll('meta[name], link[rel="manifest"]').forEach((el) => el.remove())
    document.querySelectorAll('meta[name="viewport"]').forEach((el) => el.remove())
    vi.useRealTimers()
  })

  it('桌面浏览器：非 standalone、在线、非 iOS、非移动端', () => {
    const { result } = renderHook(() => usePWA())

    expect(result.current.isStandalone).toBe(false)
    expect(result.current.isOnline).toBe(true)
    expect(result.current.isIOS).toBe(false)
    expect(result.current.isMobile).toBe(false)
    expect(result.current.canInstall).toBe(false)
    expect(result.current.showInstallHint).toBe(false)
  })

  it('注入 PWA meta 标签与 manifest，卸载时清理创建的 meta', () => {
    const { unmount } = renderHook(() => usePWA())

    for (const name of [
      'apple-mobile-web-app-capable',
      'apple-mobile-web-app-status-bar-style',
      'apple-mobile-web-app-title',
      'theme-color',
      'mobile-web-app-capable',
    ]) {
      expect(document.querySelector(`meta[name="${name}"]`)).toBeTruthy()
    }
    expect(document.querySelector('link[rel="manifest"]')?.getAttribute('href')).toBe('blob:mock-url')

    unmount()
    expect(document.querySelector('meta[name="theme-color"]')).toBeNull()
  })

  it('已存在的 meta / manifest 不会重复创建', () => {
    const existing = document.createElement('meta')
    existing.name = 'theme-color'
    existing.content = 'red'
    document.head.appendChild(existing)

    const link = document.createElement('link')
    link.rel = 'manifest'
    link.href = '/manifest.webmanifest'
    document.head.appendChild(link)

    renderHook(() => usePWA())

    const metas = document.querySelectorAll('meta[name="theme-color"]')
    expect(metas).toHaveLength(1)
    expect(metas[0].getAttribute('content')).toBe('red')
    expect(document.querySelectorAll('link[rel="manifest"]')).toHaveLength(1)
  })

  it('已存在的 viewport meta 会被更新', () => {
    const viewport = document.createElement('meta')
    viewport.name = 'viewport'
    viewport.content = 'width=device-width'
    document.head.appendChild(viewport)

    renderHook(() => usePWA())

    expect(viewport.getAttribute('content')).toContain('user-scalable=no')
    expect(viewport.getAttribute('content')).toContain('viewport-fit=cover')
  })

  it('iOS 设备识别（含 MSStream 排除）', () => {
    setUA(UA_IPHONE)
    setInnerWidth(390)
    const first = renderHook(() => usePWA())
    expect(first.result.current.isIOS).toBe(true)
    expect(first.result.current.isMobile).toBe(true)

    ;(window as any).MSStream = {}
    const second = renderHook(() => usePWA())
    expect(second.result.current.isIOS).toBe(false)
  })

  it('Android 设备识别为移动端', () => {
    setUA(UA_ANDROID)
    setInnerWidth(1280)
    const { result } = renderHook(() => usePWA())
    expect(result.current.isMobile).toBe(true)
  })

  it('窄窗口视为移动端', () => {
    setInnerWidth(500)
    const { result } = renderHook(() => usePWA())
    expect(result.current.isMobile).toBe(true)
  })

  it('standalone 模式识别为已安装', () => {
    setStandalone(true)
    const { result } = renderHook(() => usePWA())
    expect(result.current.isStandalone).toBe(true)
  })

  it('navigator.standalone 也能识别为已安装', () => {
    ;(navigator as any).standalone = true
    const { result } = renderHook(() => usePWA())
    expect(result.current.isStandalone).toBe(true)
    delete (navigator as any).standalone
  })

  it('online / offline 事件切换连接状态', () => {
    const { result } = renderHook(() => usePWA())

    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(result.current.isOnline).toBe(false)

    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(result.current.isOnline).toBe(true)
  })

  it('offline 状态下初始 isOnline 为 false', () => {
    setOnline(false)
    const { result } = renderHook(() => usePWA())
    expect(result.current.isOnline).toBe(false)
  })

  it('beforeinstallprompt 设置 canInstall，安装成功后清除状态', async () => {
    const { result } = renderHook(() => usePWA())
    expect(result.current.canInstall).toBe(false)

    const prompt = vi.fn()
    const event = new Event('beforeinstallprompt', { cancelable: true }) as any
    event.prompt = prompt
    event.userChoice = Promise.resolve({ outcome: 'accepted' })
    const preventDefault = vi.spyOn(event, 'preventDefault')

    act(() => {
      window.dispatchEvent(event)
    })
    expect(preventDefault).toHaveBeenCalled()
    expect(result.current.canInstall).toBe(true)

    await act(async () => {
      await result.current.installApp()
    })
    expect(prompt).toHaveBeenCalledTimes(1)
    expect(result.current.canInstall).toBe(false)
  })

  it('用户拒绝安装时保留 canInstall', async () => {
    const { result } = renderHook(() => usePWA())

    const event = new Event('beforeinstallprompt', { cancelable: true }) as any
    event.prompt = vi.fn()
    event.userChoice = Promise.resolve({ outcome: 'dismissed' })

    act(() => {
      window.dispatchEvent(event)
    })

    await act(async () => {
      await result.current.installApp()
    })
    expect(result.current.canInstall).toBe(true)
  })

  it('没有 deferred prompt 时 installApp 为 no-op', async () => {
    const { result } = renderHook(() => usePWA())
    await act(async () => {
      await result.current.installApp()
    })
    expect(result.current.canInstall).toBe(false)
  })

  it('移动端且未安装时 30 秒后显示安装提示', () => {
    vi.useFakeTimers()
    setUA(UA_ANDROID)
    const { result } = renderHook(() => usePWA())

    expect(result.current.showInstallHint).toBe(false)
    act(() => {
      vi.advanceTimersByTime(29999)
    })
    expect(result.current.showInstallHint).toBe(false)

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current.showInstallHint).toBe(true)
  })

  it('已忽略安装提示时不再显示（sessionStorage 标记）', () => {
    vi.useFakeTimers()
    setUA(UA_ANDROID)
    sessionStorage.setItem('d-music-install-dismissed', '1')
    const { result } = renderHook(() => usePWA())

    act(() => {
      vi.advanceTimersByTime(30000)
    })
    expect(result.current.showInstallHint).toBe(false)
  })

  it('standalone 或非移动端不会显示安装提示', () => {
    vi.useFakeTimers()
    setStandalone(true)
    setUA(UA_ANDROID)
    const first = renderHook(() => usePWA())
    act(() => {
      vi.advanceTimersByTime(30000)
    })
    expect(first.result.current.showInstallHint).toBe(false)
    first.unmount()

    setStandalone(false)
    setUA(UA_DESKTOP)
    setInnerWidth(1280)
    const second = renderHook(() => usePWA())
    act(() => {
      vi.advanceTimersByTime(30000)
    })
    expect(second.result.current.showInstallHint).toBe(false)
  })

  it('dismissInstall 隐藏提示并写入 sessionStorage', () => {
    vi.useFakeTimers()
    setUA(UA_ANDROID)
    const { result } = renderHook(() => usePWA())
    act(() => {
      vi.advanceTimersByTime(30000)
    })
    expect(result.current.showInstallHint).toBe(true)

    act(() => {
      result.current.dismissInstall()
    })
    expect(result.current.showInstallHint).toBe(false)
    expect(sessionStorage.getItem('d-music-install-dismissed')).toBe('1')
  })

  it('注册 Service Worker', () => {
    const register = vi.fn().mockResolvedValue({ scope: '/' })
    setServiceWorker(register)
    renderHook(() => usePWA())

    expect(register).toHaveBeenCalledTimes(1)
    const [url, options] = register.mock.calls[0]
    expect(url).toBe('blob:mock-url')
    expect(options).toEqual({ scope: '/' })
  })

  it('Service Worker 注册失败被静默处理', async () => {
    const register = vi.fn().mockRejectedValue(new Error('denied'))
    setServiceWorker(register)
    expect(() => renderHook(() => usePWA())).not.toThrow()
    await act(async () => {
      await Promise.resolve()
    })
    expect(register).toHaveBeenCalled()
  })

  it('Service Worker 注册同步抛错被静默处理', () => {
    const register = vi.fn(() => {
      throw new Error('unsupported')
    })
    setServiceWorker(register)
    expect(() => renderHook(() => usePWA())).not.toThrow()
  })
})
