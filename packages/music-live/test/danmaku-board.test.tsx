/**
 * @file DanmakuBoard 并发逻辑 smoke — 100 条并发注入（W8 §量化验收 — 离线可测部分）
 * @description 宿主联调阶段才验证的弹幕高频注入指标固化为一等测试：
 *              100 条全部入场渲染（低于内部 200 条环形上限）、去重不崩溃、无 React key 告警
 */
import '@testing-library/jest-dom/vitest'
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DanmakuBoard } from '../src'

type DanmakuMessage = Parameters<typeof DanmakuBoard>[0]['messages'][number]

const MESSAGES_100: DanmakuMessage[] = Array.from({ length: 100 }, (_, i) => ({
  id: `dm-${i}`,
  type: 'danmaku' as const,
  text: `弹幕 ${i}`,
  user: i % 2 === 0 ? `用户${i}` : null,
  ts: Date.now() + i,
}))

let errorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  // React key 告警走 console.error：spy 收集后断言无 key 相关告警（真实报错仍可通过 mock.calls 观测）
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const keyWarnings = () =>
  errorSpy.mock.calls.filter(args =>
    args.some(a => typeof a === 'string' && /unique "key" prop|Each child in a list/.test(a))
  )

describe('DanmakuBoard 并发 smoke（100 条）', () => {
  it('100 条并发注入全部入场渲染且无 React key 告警', () => {
    const { container } = render(<DanmakuBoard messages={MESSAGES_100} />)

    // 全部入场：弹幕条目节点数 = 100（低于内部 200 条上限，不应淘汰）
    const entries = container.querySelectorAll('div.absolute')
    expect(entries).toHaveLength(100)
    expect(container.textContent).toContain('弹幕 0')
    expect(container.textContent).toContain('弹幕 99')

    // 无 React key 相关告警
    expect(keyWarnings()).toEqual([])
  })

  it('重复 id 去重 + 追加新消息不崩溃，key 告警持续为零', () => {
    const { container, rerender } = render(<DanmakuBoard messages={MESSAGES_100} />)
    expect(container.querySelectorAll('div.absolute')).toHaveLength(100)

    // 重放 50 条旧消息 + 5 条新消息：旧 id 去重，只追加新条目
    const replay = [
      ...MESSAGES_100.slice(50).map(m => ({ ...m, ts: Date.now() })),
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `dm-new-${i}`,
        type: 'danmaku' as const,
        text: `追加弹幕 ${i}`,
        user: null,
        ts: Date.now(),
      })),
    ]
    rerender(<DanmakuBoard messages={replay} />)

    expect(container.querySelectorAll('div.absolute')).toHaveLength(105)
    expect(container.textContent).toContain('追加弹幕 4')
    expect(keyWarnings()).toEqual([])
    expect(errorSpy.mock.calls).toEqual([])
  })
})
