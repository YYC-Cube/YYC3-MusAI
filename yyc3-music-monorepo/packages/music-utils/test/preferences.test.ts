// YYC³ music-utils — 偏好系统测试（localStorage 同步层 + KV 防抖同步 + KV 拉取合并）
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { loadPrefs, loadPref, savePref, savePrefs, pullPrefsFromKV } from '../src/preferences'

describe('偏好系统 · localStorage 层', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('空存储返回默认偏好', () => {
    const prefs = loadPrefs()
    expect(prefs).toMatchObject({
      lang: 'zh',
      volume: 0.7,
      shuffleEnabled: false,
      repeatMode: 'all',
      mode: 'audio',
      theme: 'deep-space',
    })
  })

  it('savePref / loadPref 单键往返', () => {
    savePref('volume', 0.5)
    expect(loadPref('volume')).toBe(0.5)
    expect(loadPrefs().volume).toBe(0.5)
  })

  it('savePrefs 多键合并且不影响其他键', () => {
    savePref('volume', 0.5)
    savePrefs({ lang: 'en', mode: 'video' })
    expect(loadPref('lang')).toBe('en')
    expect(loadPref('mode')).toBe('video')
    expect(loadPref('volume')).toBe(0.5)
  })

  it('主题键接受全部合法 ThemeId', () => {
    for (const theme of ['aurora', 'ocean', 'light', 'midnight', 'custom'] as const) {
      savePref('theme', theme)
      expect(loadPref('theme')).toBe(theme)
    }
  })

  it('损坏的 localStorage 数据回退到默认偏好', () => {
    localStorage.setItem('dmusic-preferences', '{broken json')
    expect(loadPrefs()).toMatchObject({ lang: 'zh', volume: 0.7 })
  })

  it('读取抛错时回退默认偏好', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(loadPrefs()).toMatchObject({ lang: 'zh', volume: 0.7 })
    spy.mockRestore()
  })

  it('写入抛错时不抛出（配额/隐私模式降级）', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded')
    })
    expect(() => savePref('volume', 0.1)).not.toThrow()
    expect(() => savePrefs({ lang: 'en' })).not.toThrow()
    spy.mockRestore()
  })
})

describe('偏好系统 · KV 防抖同步', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('savePref 携带 kvSync 时 2s 防抖后触发一次 POST', async () => {
    const apiFetch = vi.fn().mockResolvedValue({})
    savePref('volume', 0.42, { apiFetch, userId: 'u1' })
    expect(apiFetch).not.toHaveBeenCalled()
    vi.advanceTimersByTime(2000)
    expect(apiFetch).toHaveBeenCalledTimes(1)
    const [url, init] = apiFetch.mock.calls[0]
    expect(url).toBe('/preferences/u1')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body).volume).toBe(0.42)
  })

  it('连续保存合并为一次同步（防抖去重）', async () => {
    const apiFetch = vi.fn().mockResolvedValue({})
    savePref('volume', 0.1, { apiFetch, userId: 'u2' })
    savePref('volume', 0.2, { apiFetch, userId: 'u2' })
    vi.advanceTimersByTime(2000)
    expect(apiFetch).toHaveBeenCalledTimes(1)
    expect(JSON.parse(apiFetch.mock.calls[0][1].body).volume).toBe(0.2)
  })

  it('KV 同步失败被静默捕获（不抛未处理拒绝）', async () => {
    const apiFetch = vi.fn().mockRejectedValue(new Error('network down'))
    savePref('lang', 'en', { apiFetch, userId: 'u3' })
    vi.advanceTimersByTime(2000)
    await vi.runAllTimersAsync()
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })
})

describe('偏好系统 · pullPrefsFromKV', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('远端偏好合并覆盖本地并落盘', async () => {
    savePref('volume', 0.9)
    const apiFetch = vi.fn().mockResolvedValue({
      preferences: { lang: 'en', theme: 'aurora' },
    })
    const merged = await pullPrefsFromKV(apiFetch, 'u4')
    expect(merged.volume).toBe(0.9)
    expect(merged.lang).toBe('en')
    expect(merged.theme).toBe('aurora')
    expect(loadPref('lang')).toBe('en')
  })

  it('远端无数据时回退本地偏好', async () => {
    savePref('volume', 0.33)
    const apiFetch = vi.fn().mockResolvedValue(null)
    const result = await pullPrefsFromKV(apiFetch, 'u5')
    expect(result.volume).toBe(0.33)
  })

  it('远端请求失败时回退本地偏好', async () => {
    savePref('volume', 0.44)
    const apiFetch = vi.fn().mockRejectedValue(new Error('offline'))
    const result = await pullPrefsFromKV(apiFetch, 'u6')
    expect(result.volume).toBe(0.44)
  })
})
