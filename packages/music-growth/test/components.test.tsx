/**
 * @file 成长组件渲染冒烟测试
 * @description 以 SSR 渲染星能面板/商店/排行榜/成就/IP 矩阵，验证展开态渲染契约
 */
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  AchievementsPanel,
  IPMatrixPanel,
  LeaderboardPanel,
  StarPowerPanel,
  StarPowerShop,
} from '../src'

const user = { id: 'u1', name: 'Tester', email: 't@example.com' }
const noop = () => {}

describe('music-growth 组件渲染', () => {
  it('StarPowerPanel 渲染星能余额', () => {
    const html = renderToString(
      createElement(StarPowerPanel, {
        isOpen: true,
        onClose: noop,
        user,
        starPower: 3200,
        onStarPowerUpdate: noop,
        onOpenShop: noop,
      })
    )
    expect(html.length).toBeGreaterThan(0)
  })

  it('StarPowerShop 渲染商品列表', () => {
    const html = renderToString(
      createElement(StarPowerShop, {
        isOpen: true,
        onClose: noop,
        user,
        starPower: 6400,
        onStarPowerUpdate: noop,
      })
    )
    expect(html.length).toBeGreaterThan(0)
  })

  it('LeaderboardPanel 渲染榜单', () => {
    const html = renderToString(
      createElement(LeaderboardPanel, {
        isOpen: true,
        onClose: noop,
        onSelectTrack: noop,
        user,
        starPower: 100,
        onStarPowerUpdate: noop,
      })
    )
    expect(html.length).toBeGreaterThan(0)
  })

  it('AchievementsPanel 渲染成就统计', () => {
    const html = renderToString(
      createElement(AchievementsPanel, {
        isOpen: true,
        onClose: noop,
        user,
        starPower: 900,
      })
    )
    expect(html.length).toBeGreaterThan(0)
  })

  it('IPMatrixPanel 在没有档案时渲染空态', () => {
    const html = renderToString(
      createElement(IPMatrixPanel, {
        isOpen: true,
        onClose: noop,
        user,
        profile: null,
        starPower: 0,
        onOpenCreationStudio: noop,
      })
    )
    expect(html.length).toBeGreaterThan(0)
  })

  it('全部面板关闭时输出为空', () => {
    const elements = [
      createElement(StarPowerPanel, { isOpen: false, onClose: noop, user, starPower: 0, onStarPowerUpdate: noop }),
      createElement(StarPowerShop, { isOpen: false, onClose: noop, user, starPower: 0, onStarPowerUpdate: noop }),
      createElement(LeaderboardPanel, { isOpen: false, onClose: noop }),
      createElement(AchievementsPanel, { isOpen: false, onClose: noop, user }),
      createElement(IPMatrixPanel, {
        isOpen: false,
        onClose: noop,
        user,
        profile: null,
        starPower: 0,
        onOpenCreationStudio: noop,
      }),
    ]
    elements.forEach((element) => expect(renderToString(element)).toBe(''))
  })
})
