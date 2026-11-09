// YYC³ music-utils — 本地模式数据契约测试
// 覆盖缓存读写、未命中/损坏数据、DELETE 幂等、模式开关、远端失败降级、中止与统计
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

type LocalMod = typeof import('../src/localMode')
type SupabaseMod = typeof import('../src/supabase')

interface MockResponse {
  ok: boolean
  status: number
  statusText: string
  headers: { get(name: string): string | null }
  json: () => Promise<any>
  text: () => Promise<string>
}

function makeResponse(partial: Partial<MockResponse> = {}): MockResponse {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: { get: () => null },
    json: async () => ({}),
    text: async () => '',
    ...partial,
  }
}

/** 以远端模式加载模块，确保 apiFetch 具备网络分支 */
async function loadModules(apiBase = 'https://api.example.com/v1'): Promise<{
  local: LocalMod
  supabase: SupabaseMod
}> {
  vi.resetModules()
  vi.stubEnv('VITE_API_BASE', apiBase)
  const local = await import('../src/localMode')
  const supabase = await import('../src/supabase')
  return { local, supabase }
}

let warnSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  localStorage.clear()
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('本地缓存读写契约', () => {
  it('POST 写入后 GET 可读回，且自动补齐 id', async () => {
    const { local } = await loadModules()

    const saved = await local.localApiFetch<{ title: string; id: string }>('/songs/s1', {
      method: 'POST',
      body: JSON.stringify({ title: '夜航' }),
    })
    expect(saved).toEqual({ title: '夜航', id: expect.any(String) })
    await expect(local.localApiFetch('/songs/s1')).resolves.toEqual(saved)
  })

  it('相同 path 重复写入幂等：id 稳定、不重复追加条目', async () => {
    const { local } = await loadModules()

    const first = await local.localApiFetch<{ id: string; likes: number }>('/likes/s1', {
      method: 'POST',
      body: JSON.stringify({ likes: 1 }),
    })
    const second = await local.localApiFetch<{ id: string; likes: number }>('/likes/s1', {
      method: 'POST',
      body: JSON.stringify({ likes: 1 }),
    })
    expect(second).toEqual(first)
    expect(local.getLocalStats().entries).toBe(1)
  })

  it('GET 未命中返回 null', async () => {
    const { local } = await loadModules()
    await expect(local.localApiFetch('/missing')).resolves.toBeNull()
  })

  it('损坏 JSON 视为未命中，不抛异常', async () => {
    const { local } = await loadModules()
    localStorage.setItem('yyc3:music:local:%2Fbad', '{oops')

    await expect(local.localApiFetch('/bad')).resolves.toBeNull()
  })

  it('DELETE 幂等：删除后返回成功，重复删除与不存在均成功', async () => {
    const { local } = await loadModules()
    await local.localApiFetch('/comments/c1', {
      method: 'POST',
      body: JSON.stringify({ content: 'hi' }),
    })

    await expect(local.localApiFetch('/comments/c1', { method: 'DELETE' })).resolves.toEqual({ success: true })
    await expect(local.localApiFetch('/comments/c1')).resolves.toBeNull()
    await expect(local.localApiFetch('/comments/c1', { method: 'DELETE' })).resolves.toEqual({ success: true })
    await expect(local.localApiFetch('/comments/never', { method: 'DELETE' })).resolves.toEqual({ success: true })
  })

  it('非浏览器环境（无 localStorage）使用内存兜底', async () => {
    vi.stubGlobal('localStorage', undefined)
    const { local } = await loadModules()

    await local.localApiFetch('/ssr/item', { method: 'POST', body: JSON.stringify({ v: 1 }) })
    await expect(local.localApiFetch('/ssr/item')).resolves.toEqual({ v: 1, id: expect.any(String) })
    expect(local.getLocalStats().entries).toBe(1)
  })
})

describe('模式开关与 apiFetch 降级', () => {
  it('setLocalMode(true) 后 apiFetch 不发网络请求，读写全部走本地', async () => {
    const { local, supabase } = await loadModules()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    local.setLocalMode(true)
    expect(local.isLocalMode()).toBe(true)

    const created = await supabase.apiFetch<{ id: string; n: number }>('/likes/s1', {
      method: 'POST',
      body: JSON.stringify({ n: 1 }),
    })
    expect(created).toEqual({ n: 1, id: expect.any(String) })
    await expect(supabase.apiFetch('/likes/s1')).resolves.toEqual(created)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('远端失败（非中止）时命中本地缓存', async () => {
    const { local, supabase } = await loadModules()
    local.setLocalMode(false)

    await local.localApiFetch('/likes/s1', { method: 'POST', body: JSON.stringify({ likes: 7 }) })
    const fetchMock = vi.fn().mockResolvedValue(
      makeResponse({ ok: false, status: 500, statusText: 'Internal Server Error', text: async () => 'oops' })
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(supabase.apiFetch('/likes/s1')).resolves.toEqual({ likes: 7, id: expect.any(String) })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('responded 500'))
  })

  it('远端失败且无缓存时维持返回 null', async () => {
    const { supabase } = await loadModules()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeResponse({ ok: false, status: 503, statusText: 'Service Unavailable' })
    ))

    await expect(supabase.apiFetch('/likes/unknown')).resolves.toBeNull()
  })

  it('4xx 属确定性错误，有缓存也不降级', async () => {
    const { local, supabase } = await loadModules()
    local.setLocalMode(false)
    await local.localApiFetch('/likes/s2', { method: 'POST', body: JSON.stringify({ likes: 1 }) })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeResponse({ ok: false, status: 401, statusText: 'Unauthorized', text: async () => 'denied' })
    ))

    await expect(supabase.apiFetch('/likes/s2')).resolves.toBeNull()
  })

  it('apiFetchStrict 不降级：有缓存仍抛 ApiError', async () => {
    const { local, supabase } = await loadModules()
    local.setLocalMode(false)
    await local.localApiFetch('/likes/s1', { method: 'POST', body: JSON.stringify({ likes: 7 }) })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeResponse({ ok: false, status: 500, statusText: 'Internal Server Error' })
    ))

    const err = await supabase.apiFetchStrict('/likes/s1').catch((e) => e)
    expect(err).toBeInstanceOf(supabase.ApiError)
    expect(err.status).toBe(500)
  })
})

describe('中止与统计', () => {
  it('已中止的 signal 让 localApiFetch 抛 AbortError', async () => {
    const { local } = await loadModules()
    const controller = new AbortController()
    controller.abort()

    const err = await local.localApiFetch('/x', { signal: controller.signal }).catch((e) => e)
    expect(err.name).toBe('AbortError')
  })

  it('getLocalStats 汇总条目数、字节数、键名与模式；clearLocalData 仅清数据', async () => {
    const { local } = await loadModules()
    local.setLocalMode(true)
    await local.localApiFetch('/a', { method: 'POST', body: JSON.stringify({ v: 1 }) })
    await local.localApiFetch('/b', { method: 'PUT', body: JSON.stringify({ v: 2 }) })

    const stats = local.getLocalStats()
    expect(stats.entries).toBe(2)
    expect(stats.keys).toHaveLength(2)
    expect(stats.bytes).toBeGreaterThan(0)
    expect(stats.mode).toBe(true)

    local.clearLocalData()
    expect(local.getLocalStats().entries).toBe(0)
    expect(local.isLocalMode()).toBe(true)
  })
})
