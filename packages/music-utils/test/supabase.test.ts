/**
 * supabase.ts 单元测试 — 客户端工厂单例 + apiFetch/apiFetchStrict/ApiError
 *
 * mock 必须局部于本文件：vi.mock('@supabase/supabase-js') 仅在本模块注册表内生效，
 * 不影响同 project 其他测试文件对真实 supabase 栈的使用。
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

const DEFAULT_URL = 'https://phgrinrlnxzjyxxhsqry.supabase.co'
const DEFAULT_KEY = 'YOUR_ANON_KEY_HERE'
const API_BASE_SUFFIX = '/functions/v1/make-server-f626b673'

/** 构造带 auth 会话桩的伪 SupabaseClient */
function makeClient(over: AnyRec = {}) {
  return {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null } })),
    },
    ...over,
  }
}

/** 构造 Response 形状的最小桩 */
function makeRes(over: {
  status?: number
  ok?: boolean
  statusText?: string
  headers?: Record<string, string>
  json?: AnyRec
  text?: string
  jsonThrows?: boolean
} = {}): Response {
  const status = over.status ?? 200
  return {
    ok: over.ok ?? (status >= 200 && status < 300),
    status,
    statusText: over.statusText ?? '',
    headers: { get: (name: string) => over.headers?.[name] ?? null },
    json: async () => {
      if (over.jsonThrows) throw new Error('bad json')
      return over.json ?? { ok: 1 }
    },
    text: async () => over.text ?? '',
  } as unknown as Response
}

/** 重新求值模块（隔离 env/单例缓存分支） */
async function loadModule() {
  vi.resetModules()
  return await import('../src/supabase')
}

const GLOBAL_KEY = '__dmusic_supabase__'

beforeEach(() => {
  delete (window as AnyRec)[GLOBAL_KEY]
  supabaseMock.createClient.mockReset()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  // 默认隔离 VITE_* env：主仓根有 .env（vitest 会加载进 import.meta.env），不 stub 会污染「缺省」分支。
  // 空串为 falsy → 触发代码内回退常量；覆盖用例在用例内重新 stubEnv 即可后胜。
  vi.stubEnv('VITE_SUPABASE_URL', '')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
  delete (window as AnyRec)[GLOBAL_KEY]
})

describe('supabase 客户端工厂与单例', () => {
  it('缺省环境变量时回退源仓默认项目配置并推导 API_BASE', async () => {
    const mod = await loadModule()
    expect(supabaseMock.createClient).toHaveBeenCalledTimes(1)
    expect(supabaseMock.createClient).toHaveBeenCalledWith(DEFAULT_URL, DEFAULT_KEY)
    expect(mod.API_BASE).toBe(`${DEFAULT_URL}${API_BASE_SUFFIX}`)
    expect(mod.supabase).toBe(supabaseMock.createClient.mock.results[0].value)
  })

  it('环境变量覆盖默认项目配置', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://envproj.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'env-anon-key')
    const mod = await loadModule()
    expect(supabaseMock.createClient).toHaveBeenCalledWith('https://envproj.supabase.co', 'env-anon-key')
    expect(mod.API_BASE).toBe(`https://envproj.supabase.co${API_BASE_SUFFIX}`)
  })

  it('window 单例命中时不再调用 createClient', async () => {
    const sentinel = makeClient()
    ;(window as AnyRec)[GLOBAL_KEY] = sentinel
    const mod = await loadModule()
    expect(supabaseMock.createClient).not.toHaveBeenCalled()
    expect(mod.supabase).toBe(sentinel)
  })

  it('首次创建后写入 window 缓存供 HMR 复用', async () => {
    const client = makeClient()
    supabaseMock.createClient.mockReturnValue(client)
    const mod = await loadModule()
    expect(mod.supabase).toBe(client)
    expect((window as AnyRec)[GLOBAL_KEY]).toBe(client)
  })
})

describe('ApiError', () => {
  it('JSON 响应体解析为 data 且携带状态字段', async () => {
    const mod = await loadModule()
    const err = new mod.ApiError({
      message: 'boom',
      status: 502,
      statusText: 'Bad Gateway',
      body: '{"code":"E14"}',
      path: '/likes',
    })
    expect(err.name).toBe('ApiError')
    expect(err.status).toBe(502)
    expect(err.statusText).toBe('Bad Gateway')
    expect(err.body).toBe('{"code":"E14"}')
    expect(err.path).toBe('/likes')
    expect(err.data).toEqual({ code: 'E14' })
    expect(err.isRateLimited).toBe(false)
    expect(err.isNetworkError).toBe(false)
  })

  it('非 JSON 响应体与缺省字段安全回退', async () => {
    const mod = await loadModule()
    const err = new mod.ApiError({ message: 'm', path: '/p' })
    expect(err.status).toBe(0)
    expect(err.statusText).toBe('')
    expect(err.body).toBe('')
    expect(err.data).toBeNull()
    expect(err.isRateLimited).toBe(false)
    expect(err.isNetworkError).toBe(false)

    const bad = new mod.ApiError({ message: 'm', path: '/p', body: 'not-json{' })
    expect(bad.data).toBeNull()
  })
})

describe('apiFetch', () => {
  async function setup(clientOver: AnyRec = {}) {
    const client = makeClient(clientOver)
    supabaseMock.createClient.mockReturnValue(client)
    const mod = await loadModule()
    return { mod, client }
  }

  it('携带会话 token 请求并返回 JSON', async () => {
    const { mod } = await setup({
      auth: { getSession: vi.fn(async () => ({ data: { session: { access_token: 'tok-1' } } })) },
    })
    const fetchMock = vi.fn(async () => makeRes({ json: { likes: 7 } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(mod.apiFetch('/likes/s1')).resolves.toEqual({ likes: 7 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${DEFAULT_URL}${API_BASE_SUFFIX}/likes/s1`)
    expect(init.headers).toEqual({ Authorization: 'Bearer tok-1' })
  })

  it('会话异常或缺失时回退 anon key', async () => {
    const { mod, client } = await setup({
      auth: { getSession: vi.fn(async () => { throw new Error('auth down') }) },
    })
    const fetchMock = vi.fn(async () => makeRes({}))
    vi.stubGlobal('fetch', fetchMock)

    await expect(mod.apiFetch('/ping')).resolves.toEqual({ ok: 1 })
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ Authorization: `Bearer ${DEFAULT_KEY}` })

    // session 为 null 同样回退
    client.auth.getSession = vi.fn(async () => ({ data: { session: null } }))
    await expect(mod.apiFetch('/ping')).resolves.toEqual({ ok: 1 })
    expect(fetchMock.mock.calls[1][1].headers).toEqual({ Authorization: `Bearer ${DEFAULT_KEY}` })
  })

  it('透传额外请求头与请求体', async () => {
    const { mod } = await setup()
    const fetchMock = vi.fn(async () => makeRes({}))
    vi.stubGlobal('fetch', fetchMock)

    await mod.apiFetch('/live-session/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"userId":"u1"}',
    })
    const [, init] = fetchMock.mock.calls[0]
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"userId":"u1"}')
    expect(init.headers).toEqual({
      Authorization: `Bearer ${DEFAULT_KEY}`,
      'Content-Type': 'application/json',
    })
  })

  it('非 2xx 响应返回 null 并告警', async () => {
    const { mod } = await setup()
    vi.stubGlobal('fetch', vi.fn(async () => makeRes({ status: 500, statusText: 'ISE', text: 'boom' })))

    await expect(mod.apiFetch('/x')).resolves.toBeNull()
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('[apiFetch] /x responded 500 ISE'),
    )
  })

  it('非 JSON 响应返回 null', async () => {
    const { mod } = await setup()
    vi.stubGlobal('fetch', vi.fn(async () => makeRes({ jsonThrows: true })))

    await expect(mod.apiFetch('/x')).resolves.toBeNull()
    expect(console.warn).toHaveBeenCalledWith('[apiFetch] /x returned non-JSON response')
  })

  it('网络错误重试一次后成功', async () => {
    const { mod } = await setup()
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('cold start'))
      .mockResolvedValueOnce(makeRes({ json: { retried: true } }))
    vi.stubGlobal('fetch', fetchMock)
    vi.useFakeTimers()

    const pending = mod.apiFetch('/retry')
    await vi.advanceTimersByTimeAsync(1600)
    await expect(pending).resolves.toEqual({ retried: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('重试仍失败时返回 null 并告警网络错误', async () => {
    const { mod } = await setup()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    vi.useFakeTimers()

    const pending = mod.apiFetch('/retry')
    await vi.advanceTimersByTimeAsync(1600)
    await expect(pending).resolves.toBeNull()
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('/retry network error after retry'),
    )
  })

  it('429 按 Retry-After 退避后重试成功', async () => {
    const { mod } = await setup()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeRes({ status: 429, headers: { 'Retry-After': '1' } }))
      .mockResolvedValueOnce(makeRes({ json: { ok: 'after-429' } }))
    vi.stubGlobal('fetch', fetchMock)
    vi.useFakeTimers()

    const pending = mod.apiFetch('/limited')
    await vi.advanceTimersByTimeAsync(1100)
    await expect(pending).resolves.toEqual({ ok: 'after-429' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('429 缺少 Retry-After 时按 3 秒退避', async () => {
    const { mod } = await setup()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeRes({ status: 429 }))
      .mockResolvedValueOnce(makeRes({ json: { ok: 'default-backoff' } }))
    vi.stubGlobal('fetch', fetchMock)
    vi.useFakeTimers()

    const pending = mod.apiFetch('/limited')
    // 3 秒内不应已重试
    await vi.advanceTimersByTimeAsync(2000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1200)
    await expect(pending).resolves.toEqual({ ok: 'default-backoff' })
  })

  it('429 Retry-After 非数字时按 3 秒退避', async () => {
    const { mod } = await setup()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeRes({ status: 429, headers: { 'Retry-After': 'soon' } }))
      .mockResolvedValueOnce(makeRes({ json: { ok: 'nan-backoff' } }))
    vi.stubGlobal('fetch', fetchMock)
    vi.useFakeTimers()

    const pending = mod.apiFetch('/limited')
    await vi.advanceTimersByTimeAsync(3100)
    await expect(pending).resolves.toEqual({ ok: 'nan-backoff' })
  })

  it('429 Retry-After 超长时退避封顶 30 秒', async () => {
    const { mod } = await setup()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeRes({ status: 429, headers: { 'Retry-After': '9999' } }))
      .mockResolvedValueOnce(makeRes({ json: { ok: 'capped' } }))
    vi.stubGlobal('fetch', fetchMock)
    vi.useFakeTimers()

    const pending = mod.apiFetch('/limited')
    await vi.advanceTimersByTimeAsync(29900)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(200)
    await expect(pending).resolves.toEqual({ ok: 'capped' })
  })

  it('429 重试后仍限流时返回 null（ApiError 分支）', async () => {
    const { mod } = await setup()
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(makeRes({ status: 429, headers: { 'Retry-After': '0' } }))
        .mockResolvedValueOnce(makeRes({ status: 429, statusText: 'Too Many Requests', text: 'rl' })),
    )
    vi.useFakeTimers()

    const pending = mod.apiFetch('/still-limited')
    await vi.advanceTimersByTimeAsync(100)
    await expect(pending).resolves.toBeNull()
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('/still-limited still rate-limited (429) after retry'),
    )
  })
})

describe('apiFetchStrict', () => {
  async function setup() {
    supabaseMock.createClient.mockReturnValue(makeClient())
    return await loadModule()
  }

  it('成功时返回 JSON 并携带会话 token', async () => {
    const mod = await setup()
    const client = mod.supabase as unknown as ReturnType<typeof makeClient>
    client.auth.getSession = vi.fn(async () => ({ data: { session: { access_token: 'tok-9' } } }))
    const fetchMock = vi.fn(async () => makeRes({ json: { strict: true } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(mod.apiFetchStrict('/likes')).resolves.toEqual({ strict: true })
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ Authorization: 'Bearer tok-9' })
  })

  it('非 2xx 时抛出结构化 ApiError', async () => {
    const mod = await setup()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => makeRes({ status: 403, statusText: 'Forbidden', text: '{"code":"E9"}' })),
    )

    const err = await mod.apiFetchStrict('/secret').catch((e: AnyRec) => e)
    expect(err).toBeInstanceOf(mod.ApiError)
    expect(err.message).toContain('[apiFetchStrict] /secret responded 403 Forbidden')
    expect(err.status).toBe(403)
    expect(err.body).toBe('{"code":"E9"}')
    expect(err.data).toEqual({ code: 'E9' })
    expect(err.path).toBe('/secret')
  })

  it('非 JSON 响应抛出 ApiError', async () => {
    const mod = await setup()
    vi.stubGlobal('fetch', vi.fn(async () => makeRes({ status: 200, jsonThrows: true })))

    await expect(mod.apiFetchStrict('/x')).rejects.toThrow('[apiFetchStrict] /x returned non-JSON response')
  })

  it('网络错误重试失败时抛出网络类 ApiError', async () => {
    const mod = await setup()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    vi.useFakeTimers()

    const pending = mod.apiFetchStrict('/retry').catch((e: AnyRec) => e)
    await vi.advanceTimersByTimeAsync(1600)
    const err = await pending
    expect(err).toBeInstanceOf(mod.ApiError)
    expect(err.isNetworkError).toBe(true)
    expect(err.isRateLimited).toBe(false)
    expect(err.status).toBe(0)
  })

  it('429 重试后仍限流时抛出 isRateLimited 的 ApiError', async () => {
    const mod = await setup()
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(makeRes({ status: 429, headers: { 'Retry-After': '0' } }))
        .mockResolvedValueOnce(makeRes({ status: 429, statusText: 'Too Many Requests', text: 'rl' })),
    )
    vi.useFakeTimers()

    const pending = mod.apiFetchStrict('/still-limited').catch((e: AnyRec) => e)
    await vi.advanceTimersByTimeAsync(100)
    const err = await pending
    expect(err).toBeInstanceOf(mod.ApiError)
    expect(err.status).toBe(429)
    expect(err.isRateLimited).toBe(true)
    expect(err.body).toBe('rl')
  })

  it('429 重试期间网络失败时同时标记限流与网络错误', async () => {
    const mod = await setup()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeRes({ status: 429, headers: { 'Retry-After': '0' } }))
      .mockRejectedValueOnce(new Error('dropped'))
    vi.stubGlobal('fetch', fetchMock)
    vi.useFakeTimers()

    const pending = mod.apiFetchStrict('/limited-drop').catch((e: AnyRec) => e)
    await vi.advanceTimersByTimeAsync(100)
    const err = await pending
    expect(err).toBeInstanceOf(mod.ApiError)
    expect(err.isRateLimited).toBe(true)
    expect(err.isNetworkError).toBe(true)
  })
})
