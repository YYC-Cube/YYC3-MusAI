// YYC³ music-design-tokens — 设计 Token 体系测试
// 覆盖颜色/排版/间距/圆角/阴影/动画/断点/层级/组件预设/无障碍阈值的完整性与一致性
import { describe, it, expect } from 'vitest'
import {
  COLOR_ROLES,
  DATA_VIZ_COLORS,
  EMOTION_COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  ANIMATION,
  BREAKPOINTS,
  Z_INDEX,
  COMPONENT_TOKENS,
  WCAG,
} from '../src/design-tokens'

const HEX6 = /^#[0-9A-Fa-f]{6}$/
const RGBA = /^rgba\(\d{1,3},\d{1,3},\d{1,3},0?\.\d+\)$/

describe('色彩系统', () => {
  it('COLOR_ROLES 全部映射到 --dm-* CSS 变量且无重复', () => {
    const values = Object.values(COLOR_ROLES)
    expect(values.length).toBeGreaterThan(20)
    for (const v of values) {
      expect(v).toMatch(/^--dm-[a-z-]+$/)
    }
    expect(new Set(values).size).toBe(values.length)
  })

  it('COLOR_ROLES 覆盖表面/文字/语义/交互/边框关键角色', () => {
    expect(COLOR_ROLES).toMatchObject({
      background: '--dm-bg',
      backgroundPanel: '--dm-bg-panel',
      textPrimary: '--dm-text-primary',
      accentFrom: '--dm-accent-from',
      success: '--dm-success',
      warning: '--dm-warning',
      error: '--dm-error',
      info: '--dm-info',
      hoverBg: '--dm-hover-bg',
      focusRing: '--dm-focus-ring',
      borderDefault: '--dm-border',
    })
  })

  it('DATA_VIZ_COLORS 含 8 个互不相同的 6 位 HEX', () => {
    const values = Object.values(DATA_VIZ_COLORS)
    expect(values).toHaveLength(8)
    for (const v of values) expect(v).toMatch(HEX6)
    expect(new Set(values).size).toBe(8)
  })

  it('EMOTION_COLORS 每个情绪包含合法 primary/secondary/glow', () => {
    const entries = Object.entries(EMOTION_COLORS)
    expect(entries).toHaveLength(10)
    expect(Object.keys(EMOTION_COLORS)).toEqual(
      expect.arrayContaining(['happy', 'sad', 'energetic', 'calm', 'neutral'])
    )
    for (const [, colors] of entries) {
      expect(colors.primary).toMatch(HEX6)
      expect(colors.secondary).toMatch(HEX6)
      expect(colors.glow).toMatch(RGBA)
    }
  })
})

describe('排版系统', () => {
  it('字体族包含 display/body/mono/cjk 且声明了回退字体', () => {
    expect(Object.keys(TYPOGRAPHY.fontFamily)).toEqual(
      expect.arrayContaining(['display', 'body', 'mono', 'cjk'])
    )
    for (const key of ['display', 'body', 'cjk'] as const) {
      expect(TYPOGRAPHY.fontFamily[key]).toContain('sans-serif')
    }
    expect(TYPOGRAPHY.fontFamily.mono).toContain('monospace')
  })

  it('字重按 light→bold 递增', () => {
    const weights = Object.values(TYPOGRAPHY.fontWeight)
    expect(weights).toEqual([300, 400, 500, 600, 700])
  })

  it('字号按 rem 递增且包含 base=1rem', () => {
    const sizes = Object.values(TYPOGRAPHY.fontSize).map(v => parseFloat(v))
    const sorted = [...sizes].sort((a, b) => a - b)
    expect(sizes).toEqual(sorted)
    expect(TYPOGRAPHY.fontSize.base).toBe('1rem')
    for (const v of Object.values(TYPOGRAPHY.fontSize)) expect(v).toMatch(/rem$/)
  })

  it('行高按 tight→loose 递增', () => {
    const heights = Object.values(TYPOGRAPHY.lineHeight)
    expect([...heights].sort((a, b) => a - b)).toEqual(heights)
  })

  it('字距包含负值与正值两端', () => {
    expect(parseFloat(TYPOGRAPHY.letterSpacing.tighter)).toBeLessThan(0)
    expect(parseFloat(TYPOGRAPHY.letterSpacing.widest)).toBeGreaterThan(0)
    expect(TYPOGRAPHY.letterSpacing.normal).toBe('0em')
  })
})

describe('间距 / 圆角 / 阴影', () => {
  it('SPACING 严格遵循 4px 基准网格', () => {
    for (const [key, value] of Object.entries(SPACING)) {
      expect(value).toBe(`${Number(key) * 4}px`)
    }
    expect(SPACING[4]).toBe('16px')
    expect(SPACING[0.5]).toBe('2px')
  })

  it('RADIUS 数值递增并以 full=9999px 收尾', () => {
    const values = Object.values(RADIUS).map(v => parseInt(v, 10))
    expect([...values].sort((a, b) => a - b)).toEqual(values)
    expect(RADIUS.full).toBe('9999px')
    expect(RADIUS.none).toBe('0px')
  })

  it('SHADOWS 阴影层级与 glow 动态生成', () => {
    expect(SHADOWS.none).toBe('none')
    expect(SHADOWS.sm).toContain('rgba(0,0,0,0.3)')
    expect(SHADOWS.md).toContain('rgba(0,0,0,0.35)')
    expect(SHADOWS.lg).toContain('rgba(0,0,0,0.4)')
    expect(SHADOWS.xl).toContain('rgba(0,0,0,0.5)')
    expect(SHADOWS.inner).toMatch(/^inset/)

    const glow = SHADOWS.glow('#8B5CF6')
    expect(glow).toBe('0 0 20px #8B5CF640, 0 0 60px #8B5CF620')
    expect(SHADOWS.glow('#22C55E')).toContain('#22C55E')
  })
})

describe('动画系统', () => {
  it('时长按 instant→slowest 递增（毫秒）', () => {
    const durations = Object.values(ANIMATION.duration).map(v => parseInt(v, 10))
    expect([...durations].sort((a, b) => a - b)).toEqual(durations)
    expect(ANIMATION.duration.fast).toBe('150ms')
    expect(ANIMATION.duration.slowest).toBe('1000ms')
  })

  it('缓动曲线合法（cubic-bezier 或 linear）', () => {
    for (const v of Object.values(ANIMATION.easing)) {
      expect(v === 'linear' || v.startsWith('cubic-bezier(')).toBe(true)
    }
    expect(ANIMATION.easing.spring).toBe('cubic-bezier(0.34, 1.56, 0.64, 1)')
  })

  it('motion variants 均定义 initial/animate/exit', () => {
    const variants = Object.entries(ANIMATION.variants)
    expect(variants.length).toBeGreaterThanOrEqual(5)
    for (const [, variant] of variants) {
      expect(variant).toHaveProperty('initial')
      expect(variant).toHaveProperty('animate')
      expect(variant).toHaveProperty('exit')
      expect(variant.initial.opacity).toBe(0)
      expect(variant.animate.opacity).toBe(1)
    }
    expect(ANIMATION.variants.slideUp.initial.y).toBe(20)
    expect(ANIMATION.variants.slideDown.initial.y).toBe(-20)
    expect(ANIMATION.variants.panelSlide.transition).toMatchObject({ type: 'spring', damping: 30 })
  })
})

describe('断点与层级', () => {
  it('BREAKPOINTS 严格递增且覆盖移动到桌面', () => {
    const values = Object.values(BREAKPOINTS)
    expect(values).toHaveLength(6)
    expect([...values].sort((a, b) => a - b)).toEqual(values)
    expect(BREAKPOINTS.xs).toBe(320)
    expect(BREAKPOINTS['2xl']).toBe(1536)
  })

  it('Z_INDEX 严格递增并保留预留给 PerfMonitor / 最大遮罩的槽位', () => {
    const values = Object.values(Z_INDEX)
    expect([...values].sort((a, b) => a - b)).toEqual(values)
    expect(Z_INDEX.base).toBe(0)
    expect(Z_INDEX.perfMonitor).toBeLessThan(Z_INDEX.maxOverlay)
    expect(Z_INDEX.modal).toBeLessThan(Z_INDEX.toast)
  })
})

describe('组件预设与无障碍阈值', () => {
  it('按钮预设引用全局圆角与动效 token', () => {
    const button = COMPONENT_TOKENS.button
    expect(button.radius).toBe(RADIUS.lg)
    expect(button.transition).toBe(
      `all ${ANIMATION.duration.fast} ${ANIMATION.easing.standard}`
    )
    expect(button.heightSm).toBe('32px')
    expect(button.heightMd).toBe('40px')
    expect(button.heightLg).toBe('48px')
    expect(button.paddingX.lg).toBe(SPACING[6])
  })

  it('输入/卡片/弹窗/面板预设尺寸与圆角引用有效 token', () => {
    expect(COMPONENT_TOKENS.input.radius).toBe(RADIUS.lg)
    expect(COMPONENT_TOKENS.input.fontSize).toBe(TYPOGRAPHY.fontSize.sm)
    expect(COMPONENT_TOKENS.card.radius).toBe(RADIUS.xl)
    expect(COMPONENT_TOKENS.modal.radius).toBe(RADIUS['2xl'])
    expect(COMPONENT_TOKENS.panel.radius).toBe(RADIUS.xl)
    expect(COMPONENT_TOKENS.modal.backdropBlur).toBe('12px')
    expect(COMPONENT_TOKENS.panel.width).toBe('400px')
  })

  it('WCAG 阈值符合 2.1 AA 规范', () => {
    expect(WCAG.minContrastNormalText).toBe(4.5)
    expect(WCAG.minContrastLargeText).toBe(3.0)
    expect(WCAG.minContrastUI).toBe(3.0)
    expect(parseInt(WCAG.minTouchTarget, 10)).toBeGreaterThanOrEqual(44)
    expect(WCAG.focusIndicatorWidth).toBe('2px')
  })
})
