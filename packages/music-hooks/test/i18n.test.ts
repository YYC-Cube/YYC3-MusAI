// YYC³ music-hooks — i18n 翻译完整性测试（对应 core-tests §8.4 双语键完整性的 Vitest 化）
import { describe, it, expect } from 'vitest'
import { translations } from '../src/i18n-translations'

describe('i18n 翻译完整性', () => {
  it('翻译键数量充足（>100）', () => {
    expect(Object.keys(translations).length).toBeGreaterThan(100)
  })

  it('每个键的 zh 与 en 均为非空字符串', () => {
    for (const [key, value] of Object.entries(translations)) {
      expect(typeof value.zh, `key=${key} zh`).toBe('string')
      expect(value.zh.length, `key=${key} zh`).toBeGreaterThan(0)
      expect(typeof value.en, `key=${key} en`).toBe('string')
      expect(value.en.length, `key=${key} en`).toBeGreaterThan(0)
    }
  })

  it('品牌与核心导航键存在', () => {
    expect(translations['brand.name']).toBeTruthy()
    expect(translations['header.community']).toBeTruthy()
    expect(translations['header.signIn']).toBeTruthy()
  })
})
