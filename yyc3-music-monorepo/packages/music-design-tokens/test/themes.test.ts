// YYC³ music-design-tokens — 六主题体系测试（注册表 / 应用 / 自定义主题 / 异常与回退分支）
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { THEMES, THEME_IDS, applyTheme, loadCustomTheme, saveCustomTheme } from '../src/themes'
import type { CustomThemeConfig } from '../src/themes'

const VALID_CUSTOM: CustomThemeConfig = {
  bg: '#101014',
  bgPanel: '#17171d',
  accentFrom: '#7c3aed',
  accentTo: '#22d3ee',
  isDark: true,
}

describe('主题注册表', () => {
  it('包含 6 个主题', () => {
    expect(THEME_IDS).toHaveLength(6)
    expect(THEME_IDS).toContain('deep-space')
    expect(THEME_IDS).toContain('aurora')
    expect(THEME_IDS).toContain('ocean')
    expect(THEME_IDS).toContain('light')
    expect(THEME_IDS).toContain('midnight')
    expect(THEMES.custom).toBeTruthy()
  })

  it('THEMES 记录与 THEME_IDS 一致', () => {
    expect(Object.keys(THEMES).sort()).toEqual([...THEME_IDS].sort())
  })

  it('每个主题定义非空对象', () => {
    for (const id of THEME_IDS) {
      const def = THEMES[id]
      expect(def).toBeTruthy()
      expect(Object.keys(def).length).toBeGreaterThan(0)
    }
  })
})

describe('主题应用', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('applyTheme 对全部预设主题不抛错', () => {
    for (const id of THEME_IDS) {
      if (id === 'custom') continue
      expect(() => applyTheme(id)).not.toThrow()
    }
  })

  it('applyTheme 写入 CSS 变量', () => {
    applyTheme('light')
    const bg = document.documentElement.style.getPropertyValue('--dm-bg')
    expect(bg).toBe(THEMES.light.bg)
    expect(bg.length).toBeGreaterThan(0)
  })

  it('未知主题 id 回退到 deep-space', () => {
    applyTheme('nonexistent' as any)
    expect(document.documentElement.style.getPropertyValue('--dm-bg')).toBe(THEMES['deep-space'].bg)
  })

  it('custom 主题：已保存配置时走 buildCustomTheme 分支', () => {
    saveCustomTheme(VALID_CUSTOM)
    applyTheme('custom')
    const bg = document.documentElement.style.getPropertyValue('--dm-bg')
    expect(bg).toBeTruthy()
    expect(bg).not.toBe(THEMES.custom.bg)
  })

  it('custom 主题：无配置时保持预设 custom 定义', () => {
    applyTheme('custom')
    expect(document.documentElement.style.getPropertyValue('--dm-bg')).toBe(THEMES.custom.bg)
  })

  it('主题切换的过渡类在动画后被移除（rAF 清理分支）', async () => {
    applyTheme('light')
    expect(document.documentElement.classList.contains('theme-transitioning')).toBe(true)
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 400)))
    expect(document.documentElement.classList.contains('theme-transitioning')).toBe(false)
  })
})

describe('异常与回退分支（存储不可用时静默降级）', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('saveCustomTheme 在存储抛错时不抛出', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded')
    })
    expect(() => saveCustomTheme(VALID_CUSTOM)).not.toThrow()
  })

  it('loadCustomTheme 在存储抛错时返回 null', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(loadCustomTheme()).toBeNull()
  })

  it('loadCustomTheme 对损坏数据返回 null', () => {
    localStorage.setItem('dmusic-custom-theme', '{broken')
    expect(loadCustomTheme()).toBeNull()
  })
})
