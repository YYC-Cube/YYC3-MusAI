/**
 * @file validation 单元测试
 * @description 覆盖 Zod schema 默认值、边界、枚举与 validate 错误包装
 */
import { describe, expect, it } from 'vitest'
import {
  albumCreateSchema,
  annotationSchema,
  commentSchema,
  danmakuSchema,
  marketListSchema,
  profileUpdateSchema,
  shareWorkSchema,
  spaceTimeMessageSchema,
  starPowerAddSchema,
  timelineCommentSchema,
  validate,
} from '../src/validation'

describe('validation schemas', () => {
  it('shareWorkSchema 为可选字段填充默认值', () => {
    const parsed = shareWorkSchema.parse({ workId: 'w1', title: '作品' })
    expect(parsed).toMatchObject({
      workId: 'w1',
      title: '作品',
      theme: 'happy',
      lyrics: [],
      mode: 'quick',
      userId: 'anon',
      userName: 'Creator',
    })
  })

  it('safeText 拒绝空白与超长文本', () => {
    expect(commentSchema.safeParse({ userName: '  ', text: '内容' }).success).toBe(false)
    expect(commentSchema.safeParse({ userName: 'A', text: '   ' }).success).toBe(false)
    expect(commentSchema.safeParse({ userName: 'A', text: 'x'.repeat(1001) }).success).toBe(false)
    expect(commentSchema.safeParse({ userName: 'A', text: '正常内容' }).success).toBe(true)
  })

  it('annotationSchema 校验行号与情感枚举', () => {
    expect(annotationSchema.safeParse({ lineIndex: 0, emotion: 'happy' }).success).toBe(true)
    expect(annotationSchema.safeParse({ lineIndex: -1, emotion: 'happy' }).success).toBe(false)
    expect(annotationSchema.safeParse({ lineIndex: 1.5, emotion: 'happy' }).success).toBe(false)
    expect(annotationSchema.safeParse({ lineIndex: 1, emotion: 'unknown' }).success).toBe(false)
  })

  it('starPowerAddSchema 限制整数金额上限 10000', () => {
    expect(starPowerAddSchema.safeParse({ amount: 100, reason: '签到' }).success).toBe(true)
    expect(starPowerAddSchema.safeParse({ amount: 0, reason: '签到' }).success).toBe(false)
    expect(starPowerAddSchema.safeParse({ amount: 10001, reason: '签到' }).success).toBe(false)
    expect(starPowerAddSchema.safeParse({ amount: 1.5, reason: '签到' }).success).toBe(false)
  })

  it('danmakuSchema 默认弹幕颜色并限制长度', () => {
    const parsed = danmakuSchema.parse({ userId: 'u1', text: '好听' })
    expect(parsed.color).toBe('#FFD700')
    expect(parsed.userName).toBe('User')
    expect(danmakuSchema.safeParse({ userId: 'u1', text: 'x'.repeat(101) }).success).toBe(false)
  })

  it('spaceTimeMessageSchema 校验经纬度范围', () => {
    const base = { content: '来自未来', songId: null }
    expect(
      spaceTimeMessageSchema.safeParse({
        ...base,
        targetLocation: { lat: 30, lng: 120, label: '上海' },
      }).success
    ).toBe(true)
    expect(
      spaceTimeMessageSchema.safeParse({ ...base, targetLocation: { lat: 91, lng: 0 } }).success
    ).toBe(false)
    expect(
      spaceTimeMessageSchema.safeParse({ ...base, targetLocation: { lat: 0, lng: 181 } }).success
    ).toBe(false)
  })

  it('timelineCommentSchema 要求时间戳与歌曲 ID', () => {
    expect(
      timelineCommentSchema.safeParse({
        userName: 'A',
        text: '这里高潮',
        timestamp: 12.5,
        songId: 's1',
      }).success
    ).toBe(true)
    expect(
      timelineCommentSchema.safeParse({ userName: 'A', text: 'x', timestamp: -1, songId: 's1' }).success
    ).toBe(false)
    expect(timelineCommentSchema.safeParse({ userName: 'A', text: 'x', timestamp: 1 }).success).toBe(
      false
    )
  })

  it('marketListSchema 限制价格上限 100000', () => {
    expect(
      marketListSchema.safeParse({ userId: 'u', albumId: 'a', price: 100000 }).success
    ).toBe(true)
    expect(
      marketListSchema.safeParse({ userId: 'u', albumId: 'a', price: 100001 }).success
    ).toBe(false)
  })

  it('albumCreateSchema 要求至少 1 首曲目并填充默认值', () => {
    const parsed = albumCreateSchema.safeParse({
      creatorId: 'u1',
      title: '专辑',
      tracks: [{ title: '曲目一' }],
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.genre).toBe('Other')
      expect(parsed.data.price).toBe(100)
      expect(parsed.data.tracks[0].duration).toBe(180)
      expect(parsed.data.tags).toEqual([])
    }
    expect(
      albumCreateSchema.safeParse({ creatorId: 'u1', title: '专辑', tracks: [] }).success
    ).toBe(false)
  })

  it('profileUpdateSchema 支持邮箱/URL 校验与额外字段透传', () => {
    expect(profileUpdateSchema.safeParse({ email: 'a@b.com', avatar: 'https://x.com/a.png' }).success).toBe(true)
    expect(profileUpdateSchema.safeParse({ email: 'not-an-email' }).success).toBe(false)
    expect(profileUpdateSchema.safeParse({ avatar: 'not-a-url' }).success).toBe(false)
    expect(profileUpdateSchema.safeParse({ email: '' }).success).toBe(true)

    const parsed = profileUpdateSchema.parse({ displayName: 'YYC', customField: 1 })
    expect((parsed as any).customField).toBe(1)
  })
})

describe('validate helper', () => {
  it('校验通过时返回数据', () => {
    const result = validate(danmakuSchema, { userId: 'u1', text: '好听' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.color).toBe('#FFD700')
  })

  it('校验失败时返回带字段路径的错误信息', () => {
    const result = validate(starPowerAddSchema, { amount: -1, reason: 'x' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Validation failed')
      expect(result.error).toContain('amount')
    }
  })
})
