/**
 * supabase.ts 单元测试 — 惰性 GoTrue 客户端（W8-P0 传输栈统一后）
 *
 * 本文件只测 Supabase 客户端本身的分支：配置判定（SUPABASE_CONFIGURED）、
 * 惰性构建与 window 单例、未配置时的报错指引、env 覆盖。
 * apiFetch/apiFetchStrict/ApiError 行为已归属 './apiClient'（见 apiClient.test.ts）。
 *
 * mock 必须局部于本文件：vi.mock('@supabase/supabase-js') 仅在本模块注册表内生效。
 * 环境变量分支通过 vi.stubEnv + vi.resetModules + 动态 import 重新求值模块。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type AnyRec = Record<string, any>

const supabaseMock = vi.hoisted(() => ({
  createClient: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: supabaseMock.createClient,
  SupabaseClient: class SupabaseClient {},
}))

/** 重新求值模块（隔离 env/单例缓存分支） */
async function loadModule() {
  vi.resetModules()
  return await import('../src/supabase')
}

const GLOBAL_KEY = '__dmusic_supabase__'

beforeEach(() => {
  delete (window as AnyRec)[GLOBAL_KEY]
  supabaseMock.createClient.mockReset()
  // 默认隔离 VITE_* env：主仓根有 .env（vitest 会加载进 import.meta.env），不 stub 会污染「未配置」分支
  vi.stubEnv('VITE_SUPABASE_URL', '')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  delete (window as AnyRec)[GLOBAL_KEY]
})

describe('SUPABASE_CONFIGURED 配置判定', () => {
  it('缺省（未配置）时 SUPABASE_CONFIGURED 为 false 且不调用 createClient', async () => {
    const mod = await loadModule()
    expect(mod.SUPABASE_CONFIGURED).toBe(false)
    expect(supabaseMock.createClient).not.toHaveBeenCalled()
  })

  it('占位符 YOUR_ANON_KEY_HERE 视为未配置（历史兜底值不再生效）', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://proj.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'YOUR_ANON_KEY_HERE')
    const mod = await loadModule()
    expect(mod.SUPABASE_CONFIGURED).toBe(false)
  })

  it('env 齐备时 SUPABASE_CONFIGURED 为 true', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://envproj.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'env-anon-key')
    const mod = await loadModule()
    expect(mod.SUPABASE_CONFIGURED).toBe(true)
  })
})

describe('惰性 GoTrue 客户端', () => {
  it('未配置时访问 supabase 属性抛出带指引的错误，且不发起 createClient', async () => {
    const mod = await loadModule()
    expect(() => (mod.supabase as AnyRec).auth).toThrowError(/Supabase 未配置/)
    expect(supabaseMock.createClient).not.toHaveBeenCalled()
  })

  it('env 覆盖后首次访问构建客户端（createClient 收到 env 值）', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://envproj.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'env-anon-key')
    const client = makeClient()
    supabaseMock.createClient.mockReturnValue(client)
    const mod = await loadModule()

    expect(mod.supabase.auth).toBe(client.auth)
    expect(supabaseMock.createClient).toHaveBeenCalledTimes(1)
    expect(supabaseMock.createClient).toHaveBeenCalledWith('https://envproj.supabase.co', 'env-anon-key')
  })

  it('window 单例命中时不再调用 createClient', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://envproj.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'env-anon-key')
    const sentinel = makeClient()
    ;(window as AnyRec)[GLOBAL_KEY] = sentinel

    const mod = await loadModule()
    expect(mod.supabase.auth).toBe(sentinel.auth)
    expect(supabaseMock.createClient).not.toHaveBeenCalled()
  })

  it('重复访问返回同一实例（模块级缓存）', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://envproj.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'env-anon-key')
    supabaseMock.createClient.mockImplementation(() => makeClient())
    const mod = await loadModule()

    const first = mod.supabase.auth
    const second = mod.supabase.auth
    expect(first).toBe(second)
    expect(supabaseMock.createClient).toHaveBeenCalledTimes(1)
  })
})

type AnyRec2 = Record<string, any>
function makeClient(over: AnyRec2 = {}) {
  return {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null } })),
    },
    ...over,
  }
}
