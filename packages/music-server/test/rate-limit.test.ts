/**
 * @file rate-limit 单元测试
 * @description 覆盖滑动窗口计数、超限响应、限流响应头与客户端标识提取
 */
import { describe, expect, it, vi } from 'vitest'
import { RATE_AUTH, RATE_HEAVY, RATE_SENSITIVE, RATE_STANDARD, rateLimit } from '../src/rate-limit'

function createContext(headers: Record<string, string> = {}, path = '/api/test') {
  const responseHeaders: Record<string, string> = {}
  return {
    responseHeaders,
    req: {
      path,
      header: (name: string) => headers[name] ?? headers[name.toLowerCase()],
    },
    header: (name: string, value: string) => {
      responseHeaders[name] = value
    },
    json: (body: any, status: number) => ({ body, status }),
  } as any
}

describe('rate-limit presets', () => {
  it('预置限流配置符合安全基线', () => {
    expect(RATE_STANDARD).toMatchObject({ maxRequests: 30, windowMs: 60_000 })
    expect(RATE_SENSITIVE.maxRequests).toBe(20)
    expect(RATE_HEAVY.maxRequests).toBe(5)
    expect(RATE_AUTH.windowMs).toBe(5 * 60 * 1000)
  })
})

describe('rateLimit middleware', () => {
  it('窗口内放行并设置限流响应头', async () => {
    const middleware = rateLimit({ maxRequests: 2, windowMs: 60_000, keyPrefix: 'pass' })
    const c = createContext({ 'x-forwarded-for': '10.0.0.1' })
    const next = vi.fn().mockResolvedValue(undefined)

    const result = await middleware(c, next)

    expect(result).toBeUndefined()
    expect(next).toHaveBeenCalledTimes(1)
    expect(c.responseHeaders['X-RateLimit-Limit']).toBe('2')
    expect(c.responseHeaders['X-RateLimit-Remaining']).toBe('1')
    expect(Number(c.responseHeaders['X-RateLimit-Reset'])).toBeGreaterThan(0)
  })

  it('超过阈值后返回 429 与 Retry-After', async () => {
    const middleware = rateLimit({ maxRequests: 2, windowMs: 30_000, keyPrefix: 'block' })
    const c = createContext({ 'x-forwarded-for': '10.0.0.2' })
    const next = vi.fn().mockResolvedValue(undefined)
    vi.spyOn(console, 'log').mockImplementation(() => {})

    await middleware(c, next)
    await middleware(c, next)
    const response = await middleware(c, next)

    expect(next).toHaveBeenCalledTimes(2)
    expect(response.status).toBe(429)
    expect(response.body.error).toContain('Too many requests')
    expect(Number(c.responseHeaders['Retry-After'])).toBeGreaterThanOrEqual(0)
    vi.restoreAllMocks()
  })

  it('不同 IP 使用独立计数桶', async () => {
    const middleware = rateLimit({ maxRequests: 1, windowMs: 60_000, keyPrefix: 'bucket' })
    const next = vi.fn().mockResolvedValue(undefined)

    await middleware(createContext({ 'x-forwarded-for': '10.0.0.3' }), next)
    await middleware(createContext({ 'x-forwarded-for': '10.0.0.4' }), next)
    expect(next).toHaveBeenCalledTimes(2)

    const blocked = await middleware(createContext({ 'x-forwarded-for': '10.0.0.3' }), next)
    expect(blocked.status).toBe(429)
  })

  it('优先使用 Authorization 尾段作为用户标识', async () => {
    const middleware = rateLimit({ maxRequests: 1, windowMs: 60_000, keyPrefix: 'user' })
    const next = vi.fn().mockResolvedValue(undefined)
    const headers = { authorization: 'Bearer token-abcdefghijklmnop', 'x-forwarded-for': '10.0.0.5' }

    await middleware(createContext(headers), next)
    const blocked = await middleware(createContext(headers), next)
    expect(blocked.status).toBe(429)
  })

  it('缺少 IP 头时回退 unknown，x-real-ip 可被识别', async () => {
    const middleware = rateLimit({ maxRequests: 2, windowMs: 60_000, keyPrefix: 'fallback' })
    const next = vi.fn().mockResolvedValue(undefined)

    await middleware(createContext({ 'x-real-ip': '192.168.1.9' }), next)
    await middleware(createContext({}), next)
    await middleware(createContext({}), next)

    const blocked = await middleware(createContext({}), next)
    expect(blocked.status).toBe(429)
  })

  it('未指定 keyPrefix 时按路由路径分桶', async () => {
    const middleware = rateLimit({ maxRequests: 1, windowMs: 60_000 })
    const next = vi.fn().mockResolvedValue(undefined)

    await middleware(createContext({ 'x-forwarded-for': '10.0.0.6' }, '/api/a'), next)
    await middleware(createContext({ 'x-forwarded-for': '10.0.0.6' }, '/api/b'), next)
    const blocked = await middleware(createContext({ 'x-forwarded-for': '10.0.0.6' }, '/api/a'), next)
    expect(blocked.status).toBe(429)
  })
})
