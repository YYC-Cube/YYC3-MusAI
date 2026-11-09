/**
 * @file 商业组件渲染冒烟测试
 * @description 以 SSR 渲染专辑商店/二级市场/版权面板，验证展开态渲染契约
 */
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AlbumStore, CopyrightPanel, SecondaryMarket } from '../src'

const user = { id: 'u1', name: 'Tester', email: 't@example.com', avatar: '' }
const noop = () => {}

describe('music-commerce 组件渲染', () => {
  it('AlbumStore 展开时渲染商店内容', () => {
    const html = renderToString(
      createElement(AlbumStore, {
        isOpen: true,
        onClose: noop,
        user,
        starPower: 1200,
        onStarPowerUpdate: noop,
      })
    )
    expect(html.length).toBeGreaterThan(0)
  })

  it('SecondaryMarket 展开时渲染市场内容', () => {
    const html = renderToString(
      createElement(SecondaryMarket, {
        isOpen: true,
        onClose: noop,
        user,
        starPower: 800,
        onStarPowerUpdate: noop,
      })
    )
    expect(html.length).toBeGreaterThan(0)
  })

  it('CopyrightPanel 展开时渲染版权信息', () => {
    const html = renderToString(
      createElement(CopyrightPanel, { isOpen: true, onClose: noop, user })
    )
    expect(html.length).toBeGreaterThan(0)
  })

  it('三个面板关闭时均不渲染内容', () => {
    const closed = [
      createElement(AlbumStore, { isOpen: false, onClose: noop, user, starPower: 0, onStarPowerUpdate: noop }),
      createElement(SecondaryMarket, { isOpen: false, onClose: noop, user, starPower: 0, onStarPowerUpdate: noop }),
      createElement(CopyrightPanel, { isOpen: false, onClose: noop, user }),
    ]
    closed.forEach((element) => expect(renderToString(element)).toBe(''))
  })
})
