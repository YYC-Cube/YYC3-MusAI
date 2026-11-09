// YYC³ music-design-tokens — 六主题体系测试（注册表 / 应用 / 自定义主题 / 异常与回退分支）
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { THEMES, THEME_IDS, applyTheme, getTheme, loadCustomTheme, saveCustomTheme } from '../src/themes'
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

describe('主题定义完整性（六主题 × 五类 token）', () => {
  const surfaceKeys = ['bg', 'bgPanel', 'bgElevated', 'bgOverlay'] as const
  const textKeys = ['textPrimary', 'textSecondary', 'textTertiary', 'textDisabled', 'textInverse'] as const
  const accentKeys = [
    'glowRgb', 'accentFrom', 'accentTo', 'starRgb', 'selectionBg',
    'headerFrom', 'headerVia', 'progressFrom', 'progressTo',
    'brandFrom', 'brandVia', 'brandTo',
  ] as const
  const semanticKeys = ['success', 'warning', 'error', 'info'] as const
  const interactiveKeys = ['hoverBg', 'activeBg', 'focusRing'] as const
  const borderKeys = ['border', 'borderSubtle', 'borderStrong'] as const
  const shadowKeys = ['shadowSm', 'shadowMd', 'shadowLg'] as const

  const allColorKeys = [
    ...surfaceKeys, ...accentKeys, ...semanticKeys, ...interactiveKeys, ...borderKeys,
  ]

  it('每个主题都具备全部 token 字段且取值非空', () => {
    const all = [
      ...surfaceKeys, ...textKeys, ...accentKeys, ...semanticKeys,
      ...interactiveKeys, ...borderKeys, ...shadowKeys,
    ]
    for (const id of THEME_IDS) {
      const def = THEMES[id] as Record<string, unknown>
      for (const key of all) {
        expect(def[key], `${id}.${key}`).toBeTruthy()
        expect(typeof def[key]).toBe('string')
      }
      expect(def.id).toBe(id)
      expect(def.label).toMatchObject({ zh: expect.any(String), en: expect.any(String) })
      expect(def.description).toMatchObject({ zh: expect.any(String), en: expect.any(String) })
      expect(typeof def.icon).toBe('string')
      expect(typeof def.isDark).toBe('boolean')
    }
  })

  it('颜色 token 均为合法 HEX / rgba / rgb 三元组', () => {
    const hex = /^#[0-9A-Fa-f]{6}$/
    const rgba = /^rgba\(\d{1,3},\d{1,3},\d{1,3},0?\.\d+\)$/
    const rgbTriplet = /^\d{1,3},\d{1,3},\d{1,3}$/
    for (const id of THEME_IDS) {
      const def = THEMES[id] as Record<string, unknown>
      for (const key of allColorKeys) {
        const value = def[key] as string
        expect(
          hex.test(value) || rgba.test(value) || (key.endsWith('Rgb') && rgbTriplet.test(value)),
          `${id}.${key} = ${value}`
        ).toBe(true)
      }
    }
  })

  it('深浅色主题的明暗标记与文字色方向一致', () => {
    const darkThemes = THEME_IDS.filter(id => THEMES[id].isDark && id !== 'custom')
    expect(darkThemes.sort()).toEqual(['aurora', 'deep-space', 'midnight', 'ocean'].sort())
    for (const id of darkThemes) {
      expect(THEMES[id].textPrimary.startsWith('rgba(255,255,255')).toBe(true)
    }
    expect(THEMES.light.isDark).toBe(false)
    expect(THEMES.light.textPrimary.startsWith('rgba(0,0,0')).toBe(true)
  })

  it('custom 预设继承 deep-space 的视觉 token，仅覆盖标识字段', () => {
    const custom = THEMES.custom
    const base = THEMES['deep-space']
    expect(custom.id).toBe('custom')
    expect(custom.icon).toBe('🎨')
    expect(custom.bg).toBe(base.bg)
    expect(custom.accentFrom).toBe(base.accentFrom)
    expect(custom.shadowLg).toBe(base.shadowLg)
    expect(custom.isDark).toBe(base.isDark)
    expect(custom.label).not.toEqual(base.label)
  })
})

describe('applyTheme 变量写入与类名切换', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
    document.documentElement.removeAttribute('data-theme')
  })

  it('非 custom 主题写入四类 CSS 变量并设置 data-theme', () => {
    applyTheme('ocean')
    const root = document.documentElement
    const theme = THEMES.ocean
    expect(root.style.getPropertyValue('--dm-bg-panel')).toBe(theme.bgPanel)
    expect(root.style.getPropertyValue('--dm-bg-elevated')).toBe(theme.bgElevated)
    expect(root.style.getPropertyValue('--dm-bg-overlay')).toBe(theme.bgOverlay)
    expect(root.style.getPropertyValue('--dm-text-primary')).toBe(theme.textPrimary)
    expect(root.style.getPropertyValue('--dm-text-inverse')).toBe(theme.textInverse)
    expect(root.style.getPropertyValue('--dm-accent-from')).toBe(theme.accentFrom)
    expect(root.style.getPropertyValue('--dm-accent-to')).toBe(theme.accentTo)
    expect(root.style.getPropertyValue('--dm-glow-rgb')).toBe(theme.glowRgb)
    expect(root.style.getPropertyValue('--dm-star-rgb')).toBe(theme.starRgb)
    expect(root.style.getPropertyValue('--dm-selection-bg')).toBe(theme.selectionBg)
    expect(root.style.getPropertyValue('--dm-header-from')).toBe(theme.headerFrom)
    expect(root.style.getPropertyValue('--dm-header-via')).toBe(theme.headerVia)
    expect(root.style.getPropertyValue('--dm-progress-from')).toBe(theme.progressFrom)
    expect(root.style.getPropertyValue('--dm-progress-to')).toBe(theme.progressTo)
    expect(root.style.getPropertyValue('--dm-brand-from')).toBe(theme.brandFrom)
    expect(root.style.getPropertyValue('--dm-brand-via')).toBe(theme.brandVia)
    expect(root.style.getPropertyValue('--dm-brand-to')).toBe(theme.brandTo)
    expect(root.style.getPropertyValue('--dm-success')).toBe(theme.success)
    expect(root.style.getPropertyValue('--dm-warning')).toBe(theme.warning)
    expect(root.style.getPropertyValue('--dm-error')).toBe(theme.error)
    expect(root.style.getPropertyValue('--dm-info')).toBe(theme.info)
    expect(root.style.getPropertyValue('--dm-hover-bg')).toBe(theme.hoverBg)
    expect(root.style.getPropertyValue('--dm-active-bg')).toBe(theme.activeBg)
    expect(root.style.getPropertyValue('--dm-focus-ring')).toBe(theme.focusRing)
    expect(root.style.getPropertyValue('--dm-border')).toBe(theme.border)
    expect(root.style.getPropertyValue('--dm-border-subtle')).toBe(theme.borderSubtle)
    expect(root.style.getPropertyValue('--dm-border-strong')).toBe(theme.borderStrong)
    expect(root.style.getPropertyValue('--dm-shadow-sm')).toBe(theme.shadowSm)
    expect(root.style.getPropertyValue('--dm-shadow-md')).toBe(theme.shadowMd)
    expect(root.style.getPropertyValue('--dm-shadow-lg')).toBe(theme.shadowLg)
    expect(root.getAttribute('data-theme')).toBe('ocean')
  })

  it('深色主题添加 dark 类，浅色主题移除 dark 类', () => {
    applyTheme('midnight')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    applyTheme('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('未知主题回退 deep-space 但仍记录原始 id', () => {
    applyTheme('plasma' as any)
    expect(document.documentElement.style.getPropertyValue('--dm-bg')).toBe(THEMES['deep-space'].bg)
    expect(document.documentElement.getAttribute('data-theme')).toBe('plasma')
  })

  it('存在 theme-color meta 时同步更新为当前背景色', () => {
    const meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    meta.setAttribute('content', '#000000')
    document.head.appendChild(meta)
    try {
      applyTheme('aurora')
      expect(meta.getAttribute('content')).toBe(THEMES.aurora.bg)
    } finally {
      meta.remove()
    }
  })

  it('不存在 theme-color meta 时安全跳过', () => {
    expect(document.querySelector('meta[name="theme-color"]')).toBeNull()
    expect(() => applyTheme('deep-space')).not.toThrow()
  })
})

describe('getTheme 与自定义主题派生', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('getTheme 返回预设主题实例', () => {
    expect(getTheme('light')).toBe(THEMES.light)
    expect(getTheme('deep-space')).toBe(THEMES['deep-space'])
  })

  it('getTheme 未知 id 回退 deep-space', () => {
    expect(getTheme('void' as any)).toBe(THEMES['deep-space'])
  })

  it('custom 无配置时返回预设 custom', () => {
    expect(getTheme('custom')).toBe(THEMES.custom)
  })

  it('custom 深色配置：派生 glow/selection/bgElevated/文字色', () => {
    saveCustomTheme(VALID_CUSTOM)
    const theme = getTheme('custom')
    expect(theme.id).toBe('custom')
    expect(theme.isDark).toBe(true)
    expect(theme.bg).toBe('#101014')
    expect(theme.bgPanel).toBe('#17171d')
    expect(theme.bgElevated).toBe('#17171d')
    expect(theme.bgOverlay).toBe('rgba(0,0,0,0.85)')
    expect(theme.glowRgb).toBe('124,58,237')
    expect(theme.starRgb).toBe('124,58,237')
    expect(theme.selectionBg).toBe('rgba(124,58,237,0.3)')
    expect(theme.accentFrom).toBe('#7c3aed')
    expect(theme.accentTo).toBe('#22d3ee')
    expect(theme.progressFrom).toBe('#7c3aed')
    expect(theme.progressTo).toBe('#22d3ee')
    expect(theme.focusRing).toBe('#7c3aed')
    expect(theme.headerFrom).toBe('#101014')
    expect(theme.headerVia).toBe('rgba(0,0,0,0.8)')
    expect(theme.textPrimary).toBe('rgba(255,255,255,0.95)')
    expect(theme.textSecondary).toBe('rgba(255,255,255,0.60)')
    expect(theme.textTertiary).toBe('rgba(255,255,255,0.35)')
    expect(theme.textDisabled).toBe('rgba(255,255,255,0.20)')
    expect(theme.textInverse).toBe('#101014')
    expect(theme.hoverBg).toBe('rgba(255,255,255,0.06)')
    expect(theme.activeBg).toBe('rgba(255,255,255,0.10)')
    expect(theme.border).toBe('rgba(255,255,255,0.10)')
    expect(theme.borderSubtle).toBe('rgba(255,255,255,0.06)')
    expect(theme.borderStrong).toBe('rgba(255,255,255,0.20)')
    expect(theme.label).toEqual(THEMES.custom.label)
  })

  it('custom 浅色配置：走 LIGHT 基底分支', () => {
    const lightConfig: CustomThemeConfig = {
      bg: '#FAFAFA',
      bgPanel: '#FFFFFF',
      accentFrom: '#ff0000',
      accentTo: '#00ff00',
      isDark: false,
    }
    saveCustomTheme(lightConfig)
    const theme = getTheme('custom')
    expect(theme.isDark).toBe(false)
    expect(theme.bg).toBe('#FAFAFA')
    expect(theme.bgOverlay).toBe('rgba(0,0,0,0.4)')
    expect(theme.headerVia).toBe('rgba(255,255,255,0.9)')
    expect(theme.textPrimary).toBe('rgba(0,0,0,0.87)')
    expect(theme.textSecondary).toBe('rgba(0,0,0,0.60)')
    expect(theme.textTertiary).toBe('rgba(0,0,0,0.38)')
    expect(theme.textDisabled).toBe('rgba(0,0,0,0.20)')
    expect(theme.textInverse).toBe('#FFFFFF')
    expect(theme.hoverBg).toBe('rgba(0,0,0,0.04)')
    expect(theme.activeBg).toBe('rgba(0,0,0,0.08)')
    expect(theme.border).toBe('rgba(0,0,0,0.12)')
    expect(theme.borderSubtle).toBe('rgba(0,0,0,0.06)')
    expect(theme.borderStrong).toBe('rgba(0,0,0,0.20)')
    expect(theme.glowRgb).toBe('255,0,0')
    expect(theme.selectionBg).toBe('rgba(255,0,0,0.3)')
  })

  it('applyTheme(custom) 使用浅色配置时移除 dark 类', () => {
    document.documentElement.classList.add('dark')
    saveCustomTheme({
      bg: '#FFFFFF', bgPanel: '#F5F5F5', accentFrom: '#123456', accentTo: '#654321', isDark: false,
    })
    applyTheme('custom')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.style.getPropertyValue('--dm-bg')).toBe('#FFFFFF')
    expect(document.documentElement.style.getPropertyValue('--dm-glow-rgb')).toBe('18,52,86')
  })

  it('saveCustomTheme → loadCustomTheme 往返保持配置', () => {
    saveCustomTheme(VALID_CUSTOM)
    expect(loadCustomTheme()).toEqual(VALID_CUSTOM)
  })
})
