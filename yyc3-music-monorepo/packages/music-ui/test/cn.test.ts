// YYC³ music-ui — cn 工具函数测试（clsx + tailwind-merge）
import { describe, it, expect } from 'vitest'
import { cn } from '../src/ui/utils'

describe('cn 类名合并', () => {
  it('拼接多个类名', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('忽略 falsy 值', () => {
    const disabled = false
    expect(cn('a', disabled && 'b', undefined, null, 'c')).toBe('a c')
  })

  it('支持条件对象与数组', () => {
    expect(cn('base', { active: true, disabled: false }, ['x', 'y'])).toBe('base active x y')
  })

  it('tailwind 冲突类后者胜出', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
    expect(cn('text-sm', 'text-lg')).toBe('text-lg')
  })
})
