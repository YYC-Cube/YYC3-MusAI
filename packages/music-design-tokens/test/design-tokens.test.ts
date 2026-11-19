/**
 * W1 新增令牌测试 — SCROLL 滚动令牌 + 阴影/主题分支
 */
import { describe, expect, it } from 'vitest';

import { ANIMATION, COMPONENT_TOKENS, SCROLL, SHADOWS, SPACING, WCAG, Z_INDEX } from '../src/design-tokens';
import { applyTheme, getTheme, loadCustomTheme, saveCustomTheme, THEME_IDS } from '../src/themes';

describe('SCROLL 滚动令牌（W1 新增）', () => {
  it('Lenis 时长与 lerp 在合理区间', () => {
    expect(SCROLL.duration).toBeGreaterThanOrEqual(300);
    expect(SCROLL.duration).toBeLessThanOrEqual(1500);
    expect(SCROLL.lerp).toBeGreaterThan(0);
    expect(SCROLL.lerp).toBeLessThanOrEqual(0.3);
  });

  it('指示器与自动隐藏配置为合法值', () => {
    expect(SCROLL.indicatorHeight).toMatch(/^\d+px$/);
    expect(SCROLL.autohideDelay).toBeGreaterThan(0);
  });

  it('与既有动效/间距令牌并存导出（回归保护）', () => {
    expect(ANIMATION.duration.fast).toBe('150ms');
    expect(SPACING[4]).toBe('16px');
    expect(Z_INDEX.toast).toBe(80);
  });
});

describe('阴影 / 组件令牌', () => {
  it('五级阴影 + 内阴影 + glow 函数', () => {
    expect(SHADOWS.none).toBe('none');
    expect(SHADOWS.sm).toContain('1px');
    expect(SHADOWS.md).toBeTruthy();
    expect(SHADOWS.lg).toBeTruthy();
    expect(SHADOWS.xl).toBeTruthy();
    expect(SHADOWS.inner).toContain('inset');
    expect(SHADOWS.glow('#667eea')).toContain('#667eea40');
  });

  it('组件预设与 WCAG 常量', () => {
    expect(COMPONENT_TOKENS.button.heightMd).toBe('40px');
    expect(COMPONENT_TOKENS.modal.radius).toBeTruthy();
    expect(WCAG.minContrastNormalText).toBe(4.5);
    expect(WCAG.minTouchTarget).toBe('44px');
  });
});

describe('custom 主题配置分支（load/save/apply/get）', () => {
  it('保存自定义主题后 getTheme 合并配置', () => {
    saveCustomTheme({ bg: '#101010', bgPanel: '#181818', accentFrom: '#ff0000', accentTo: '#00ff00', isDark: true });
    const theme = getTheme('custom');
    expect(theme.bg).toBe('#101010');
    expect(theme.bgPanel).toBe('#181818');
    expect(theme.accentFrom).toBe('#ff0000');
    expect(theme.isDark).toBe(true);
    // RGB 提取用于 glow/star
    expect(theme.glowRgb).toBe('255,0,0');
    // 清理
    try {
      window.localStorage.removeItem('dmusic-custom-theme');
    } catch { /* ignore */ }
    expect(loadCustomTheme()).toBeNull();
  });

  it('applyTheme 接受全部主题 ID 并设置 data-theme', () => {
    for (const id of THEME_IDS) {
      expect(() => applyTheme(id)).not.toThrow();
    }
    expect(document.documentElement.getAttribute('data-theme')).toBe('custom');
  });

  it('getTheme 未知 ID 回退到 deep-space', () => {
    expect(getTheme('nonexistent' as any).id).toBe('deep-space');
  });

  it('浅色自定义主题走 light 基座分支', () => {
    saveCustomTheme({ bg: '#fafafa', bgPanel: '#ffffff', accentFrom: '#3366ff', accentTo: '#33ccff', isDark: false });
    const theme = getTheme('custom');
    expect(theme.isDark).toBe(false);
    expect(theme.textPrimary).toContain('0.87');
    expect(theme.hoverBg).toBe('rgba(0,0,0,0.04)');
    try {
      window.localStorage.removeItem('dmusic-custom-theme');
    } catch { /* ignore */ }
  });

  it('applyTheme 更新 meta theme-color（PWA）', () => {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    applyTheme('ocean');
    expect(meta.getAttribute('content')).toBe(getTheme('ocean').bg);
    document.documentElement.classList.remove('dark');
  });
});
