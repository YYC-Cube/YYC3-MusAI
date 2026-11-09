/**
 * @file cn 工具函数测试
 * @description 覆盖 clsx 组合与 tailwind-merge 冲突合并
 */
import { describe, expect, it } from 'vitest'
import { cn } from '../src/utils/cn'

describe('cn', () => {
  it('拼接字符串、对象与条件类名', () => {
    expect(cn('text-sm', { 'font-bold': true, hidden: false }, ['px-2', null, undefined])).toBe(
      'text-sm font-bold px-2'
    )
  })

  it('冲突的 Tailwind 工具类保留最后一个', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500')
  })

  it('空输入返回空字符串', () => {
    expect(cn()).toBe('')
  })
})
