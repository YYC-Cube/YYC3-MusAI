// YYC³ music-emotion — XiaoyuController 接口控制器测试
import { describe, it, expect, vi } from 'vitest'
import {
  XiaoyuController,
  ValidationError,
  XIAOYU_EMOTIONS,
  type XiaoyuServiceLike,
} from '../src/controllers/xiaoyu.controller'

const USER_ID = '123e4567-e89b-12d3-a456-426614174000'

function makeService(overrides: Partial<XiaoyuServiceLike> = {}): XiaoyuServiceLike {
  return {
    getChatReply: vi.fn(async () => ({
      xiaoyuText: '小语来啦',
      emotion: 'happy' as const,
      needVoice: true,
    })),
    generateVoice: vi.fn(async () => ({ audioBuffer: new Uint8Array([1, 2, 3]) })),
    getEmotionHistory: vi.fn(async () => [{ id: 'h1' }]),
    ...overrides,
  }
}

function makeRes() {
  const res = {
    status: vi.fn(() => res),
    json: vi.fn(),
    setHeader: vi.fn(),
    send: vi.fn(),
  }
  return res
}

describe('XiaoyuController', () => {
  describe('chat', () => {
    it('校验通过时返回对话结果', async () => {
      const service = makeService()
      const controller = new XiaoyuController(service)
      const res = makeRes()
      const next = vi.fn()

      await controller.chat(
        { body: { userText: '你好', userId: USER_ID, userEmotion: 'happy' } },
        res,
        next
      )

      expect(service.getChatReply).toHaveBeenCalledWith({
        userText: '你好',
        userId: USER_ID,
        userEmotion: 'happy',
      })
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { xiaoyuText: '小语来啦', emotion: 'happy', needVoice: true },
      })
      expect(next).not.toHaveBeenCalled()
    })

    it.each([
      ['缺少 body', {} as any],
      ['空文本', { userText: '', userId: USER_ID, userEmotion: 'happy' }],
      ['文本过长', { userText: 'a'.repeat(201), userId: USER_ID, userEmotion: 'happy' }],
      ['非字符串文本', { userText: 123, userId: USER_ID, userEmotion: 'happy' }],
      ['非法 uuid', { userText: 'hi', userId: 'not-a-uuid', userEmotion: 'happy' }],
      ['非法情绪', { userText: 'hi', userId: USER_ID, userEmotion: 'angry' }],
    ])('%s 时传递给 next 校验错误', async (_label, body) => {
      const controller = new XiaoyuController(makeService())
      const res = makeRes()
      const next = vi.fn()

      await controller.chat({ body }, res, next)

      expect(next).toHaveBeenCalledTimes(1)
      expect(next.mock.calls[0][0]).toBeInstanceOf(ValidationError)
      expect(res.status).not.toHaveBeenCalled()
    })

    it('服务异常时传递给 next', async () => {
      const error = new Error('service down')
      const controller = new XiaoyuController(
        makeService({ getChatReply: vi.fn(async () => { throw error }) })
      )
      const res = makeRes()
      const next = vi.fn()

      await controller.chat(
        { body: { userText: 'hi', userId: USER_ID, userEmotion: 'neutral' } },
        res,
        next
      )

      expect(next).toHaveBeenCalledWith(error)
    })
  })

  describe('generateTTS', () => {
    it('生成音频并设置响应头', async () => {
      const service = makeService()
      const controller = new XiaoyuController(service)
      const res = makeRes()
      const next = vi.fn()

      await controller.generateTTS({ body: { text: '你好呀', emotion: 'anxious' } }, res, next)

      expect(service.generateVoice).toHaveBeenCalledWith('你好呀', 'anxious')
      expect(res.setHeader).toHaveBeenNthCalledWith(1, 'Content-Type', 'audio/wav')
      expect(res.setHeader).toHaveBeenNthCalledWith(
        2,
        'Content-Disposition',
        'attachment; filename="xiaoyu-anxious.wav"'
      )
      expect(res.send).toHaveBeenCalledTimes(1)
      expect(next).not.toHaveBeenCalled()
    })

    it.each([
      ['空文本', { text: '', emotion: 'happy' }],
      ['文本过长', { text: 'a'.repeat(151), emotion: 'happy' }],
      ['非法情绪', { text: 'hi', emotion: 'sleepy' }],
      ['缺少 body', undefined],
    ])('%s 时返回校验错误', async (_label, body) => {
      const controller = new XiaoyuController(makeService())
      const next = vi.fn()

      await controller.generateTTS({ body }, makeRes(), next)

      expect(next.mock.calls[0][0]).toBeInstanceOf(ValidationError)
    })

    it('语音服务异常时传递给 next', async () => {
      const error = new Error('tts failed')
      const controller = new XiaoyuController(
        makeService({ generateVoice: vi.fn(async () => { throw error }) })
      )
      const next = vi.fn()

      await controller.generateTTS({ body: { text: 'hi', emotion: 'happy' } }, makeRes(), next)
      expect(next).toHaveBeenCalledWith(error)
    })
  })

  describe('getEmotionHistory', () => {
    it('使用查询参数中的 limit', async () => {
      const service = makeService()
      const controller = new XiaoyuController(service)
      const res = makeRes()
      const next = vi.fn()

      await controller.getEmotionHistory({ query: { userId: USER_ID, limit: '25' } }, res, next)

      expect(service.getEmotionHistory).toHaveBeenCalledWith(USER_ID, 25)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: 'h1' }] })
    })

    it('缺少 limit 时默认 10', async () => {
      const service = makeService()
      const controller = new XiaoyuController(service)

      await controller.getEmotionHistory({ query: { userId: USER_ID } }, makeRes(), vi.fn())

      expect(service.getEmotionHistory).toHaveBeenCalledWith(USER_ID, 10)
    })

    it('空字符串 limit 使用默认值', async () => {
      const service = makeService()
      const controller = new XiaoyuController(service)

      await controller.getEmotionHistory({ query: { userId: USER_ID, limit: '' } }, makeRes(), vi.fn())

      expect(service.getEmotionHistory).toHaveBeenCalledWith(USER_ID, 10)
    })

    it.each([
      ['缺少 query', undefined],
      ['非法 uuid', { userId: 'abc' }],
      ['limit 过小', { userId: USER_ID, limit: 0 }],
      ['limit 过大', { userId: USER_ID, limit: 101 }],
      ['limit 非整数', { userId: USER_ID, limit: 1.5 }],
      ['limit 非数字', { userId: USER_ID, limit: 'abc' }],
    ])('%s 时返回校验错误', async (_label, query) => {
      const controller = new XiaoyuController(makeService())
      const next = vi.fn()

      await controller.getEmotionHistory({ query }, makeRes(), next)

      expect(next.mock.calls[0][0]).toBeInstanceOf(ValidationError)
    })

    it('历史服务异常时传递给 next', async () => {
      const error = new Error('db down')
      const controller = new XiaoyuController(
        makeService({ getEmotionHistory: vi.fn(async () => { throw error }) })
      )
      const next = vi.fn()

      await controller.getEmotionHistory({ query: { userId: USER_ID } }, makeRes(), next)
      expect(next).toHaveBeenCalledWith(error)
    })
  })

  it('导出支持的情绪枚举', () => {
    expect(XIAOYU_EMOTIONS).toEqual(['neutral', 'happy', 'anxious', 'surprised'])
  })
})
