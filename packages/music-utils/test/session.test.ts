/**
 * session.ts 单元测试 — 会话存取、过期/损坏数据分支、存储不可用兜底
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSession, getAccessToken, getSession, setSession } from '../src/session'

type AnyRec = Record<string, any>

const SESSION_KEY = 'yyc3:music:session'

const session = (over: AnyRec = {}) => ({
  accessToken: 'tok-1',
  user: { id: 'u1', user_metadata: { name: 'Alice' } },
  ...over,
})

/** 构造可控的伪 Storage 桩 */
function stubStorage(impl: Partial<Storage>) {
  vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    ...impl,
  } as unknown as Storage)
}

beforeEach(() => {
  localStorage.clear()
  clearSession()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('session 基本存取', () => {
  it('写入后可读回并取到 access token', () => {
    setSession(session())
    expect(getSession()).toEqual(session())
    expect(getAccessToken()).toBe('tok-1')
  })

  it('setSession(null) 等价于清除', () => {
    setSession(session())
    setSession(null)
    expect(getSession()).toBeNull()
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('clearSession 后内存与存储均为空', () => {
    setSession(session())
    clearSession()
    expect(getSession()).toBeNull()
    expect(getAccessToken()).toBe('')
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('未过期会话正常返回', () => {
    setSession(session({ expiresAt: Date.now() + 60_000 }))
    expect(getSession()?.accessToken).toBe('tok-1')
  })
})

describe('session 过期与损坏数据分支', () => {
  it('过期会话读取时清理并返回 null', () => {
    setSession(session({ expiresAt: Date.now() - 1000 }))
    expect(getSession()).toBeNull()
    // 过期数据已被清出存储
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('损坏 JSON 清理后返回 null', () => {
    localStorage.setItem(SESSION_KEY, '{not-valid-json')
    expect(getSession()).toBeNull()
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('结构不完整（缺 token 或 user.id）按损坏处理', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ accessToken: 42, user: null }))
    expect(getSession()).toBeNull()

    localStorage.setItem(SESSION_KEY, JSON.stringify({ accessToken: 't', user: {} }))
    expect(getSession()).toBeNull()
  })

  it('存储无记录且无内存会话时返回 null', () => {
    expect(getSession()).toBeNull()
  })
})

describe('session 存储不可用兜底', () => {
  it('localStorage 未定义时退回内存副本', () => {
    vi.stubGlobal('localStorage', undefined)
    setSession(session())
    expect(getSession()).toEqual(session())
    expect(getAccessToken()).toBe('tok-1')

    clearSession()
    expect(getSession()).toBeNull()
  })

  it('访问 localStorage 抛异常时同样退回内存副本', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError')
      },
    })
    try {
      setSession(session({ accessToken: 'mem-tok' }))
      expect(getSession()?.accessToken).toBe('mem-tok')

      clearSession()
      expect(getSession()).toBeNull()
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original)
      else delete (globalThis as AnyRec).localStorage
    }
  })

  it('getItem 抛异常时读取内存副本', () => {
    setSession(session({ accessToken: 'mem-only' }))
    stubStorage({ getItem: vi.fn(() => { throw new Error('blocked') }) })
    expect(getSession()?.accessToken).toBe('mem-only')
  })

  it('setItem 抛异常时仅保留内存副本且不抛出', () => {
    stubStorage({ setItem: vi.fn(() => { throw new Error('quota') }) })
    expect(() => setSession(session())).not.toThrow()
    expect(getSession()?.accessToken).toBe('tok-1')
  })

  it('removeItem 抛异常时清理内存副本且不抛出', () => {
    setSession(session())
    stubStorage({ removeItem: vi.fn(() => { throw new Error('blocked') }) })
    expect(() => clearSession()).not.toThrow()
    expect(getSession()).toBeNull()
  })
})
