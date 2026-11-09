// YYC³ music-hooks — useI18n Provider / Hook 测试
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, renderHook } from '@testing-library/react'
import { I18nProvider, useI18n } from '../src/useI18n'
import { translations } from '../src/i18n-translations'

const Consumer: React.FC<{ onKey?: (t: (k: any) => string) => void }> = ({ onKey }) => {
  const { lang, setLang, toggleLang, t } = useI18n()
  onKey?.(t)
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="brand">{t('brand.name')}</span>
      <button data-testid="toggle" onClick={toggleLang}>toggle</button>
      <button data-testid="set-en" onClick={() => setLang('en')}>en</button>
      <button data-testid="set-zh" onClick={() => setLang('zh')}>zh</button>
    </div>
  )
}

describe('useI18n', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('无 Provider 时返回默认上下文', () => {
    const result = renderHookOutside()
    expect(result.lang).toBe('zh')
    expect(result.t('brand.name')).toBe('brand.name')
    expect(() => result.setLang('en')).not.toThrow()
    expect(() => result.toggleLang()).not.toThrow()
  })

  it('默认语言为 zh，并能翻译品牌名', () => {
    render(
      <I18nProvider>
        <Consumer />
      </I18nProvider>
    )
    expect(screen.getByTestId('lang').textContent).toBe('zh')
    expect(screen.getByTestId('brand').textContent).toBe(translations['brand.name'].zh)
  })

  it('toggleLang 在 zh / en 之间切换并持久化', () => {
    render(
      <I18nProvider>
        <Consumer />
      </I18nProvider>
    )

    fireEvent.click(screen.getByTestId('toggle'))
    expect(screen.getByTestId('lang').textContent).toBe('en')
    expect(screen.getByTestId('brand').textContent).toBe(translations['brand.name'].en)

    const prefs = JSON.parse(localStorage.getItem('dmusic-prefs') as string)
    expect(prefs.lang).toBe('en')
    expect(localStorage.getItem('d-music-lang')).toBe('en')

    fireEvent.click(screen.getByTestId('toggle'))
    expect(screen.getByTestId('lang').textContent).toBe('zh')
  })

  it('setLang 直接设置语言并写入 legacy key', () => {
    render(
      <I18nProvider>
        <Consumer />
      </I18nProvider>
    )
    fireEvent.click(screen.getByTestId('set-en'))
    expect(screen.getByTestId('lang').textContent).toBe('en')
    expect(localStorage.getItem('d-music-lang')).toBe('en')

    fireEvent.click(screen.getByTestId('set-zh'))
    expect(screen.getByTestId('lang').textContent).toBe('zh')
  })

  it('启动时从本地偏好恢复语言', () => {
    localStorage.setItem('dmusic-prefs', JSON.stringify({ lang: 'en' }))
    render(
      <I18nProvider>
        <Consumer />
      </I18nProvider>
    )
    expect(screen.getByTestId('lang').textContent).toBe('en')
  })

  it('缺失的翻译键原样返回 key', () => {
    let tFn: ((k: any) => string) | undefined
    render(
      <I18nProvider>
        <Consumer onKey={(t) => { tFn = t }} />
      </I18nProvider>
    )
    expect(tFn!('not.a.real.key')).toBe('not.a.real.key')
    expect(tFn!('brand.name' as any)).toBeTruthy()
  })

  it('localStorage 写入抛错时不影响语言切换', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    render(
      <I18nProvider>
        <Consumer />
      </I18nProvider>
    )
    expect(() => fireEvent.click(screen.getByTestId('set-en'))).not.toThrow()
    expect(screen.getByTestId('lang').textContent).toBe('en')
    spy.mockRestore()
  })
})

// 在不使用 Provider 的情况下调用 hook
function renderHookOutside() {
  const { result } = renderHook(() => useI18n())
  return result.current
}
