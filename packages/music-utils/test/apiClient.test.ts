// YYC³ music-utils — API 传输层测试
// 网络模式（fetch mock：成功/失败/超时重试/429 退避/鉴权头/JSON 解析）+ 本地模式短路 + 会话存储
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

type Mod = typeof import('../src/apiClient')
type SessionMod = typeof import('../src/session')

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

async function loadLocal(): Promise<Mod> {
  vi.resetModules()
  vi.stubEnv('VITE_API_BASE', '')
  return import('../src/apiClient')
}

async function loadRemote(base = 'https://api.example.com/v1/'): Promise<Mod> {
  vi.resetModules()
  vi.stubEnv('VITE_API_BASE', base)
  return import('../src/apiClient')
}

let warnSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  localStorage.clear()
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('本地模式（未配置 VITE_API_BASE）', () => {
  it('API_BASE 为空、LOCAL_MODE 为 true', async () => {
    const mod = await loadLocal()
    expect(mod.API_BASE).toBe('')
    expect(mod.LOCAL_MODE).toBe(true)
  })

  it('apiFetch 短路返回 null 且不发起网络请求', async () => {
    const mod = await loadLocal()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(mod.apiFetch('/likes/s1')).resolves.toBeNull()
    await expect(mod.apiFetch('/likes/s1', { method: 'POST' })).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('apiFetchStrict 抛出 ApiError（网络错误语义）', async () => {
    const mod = await loadLocal()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const err = await mod.apiFetchStrict('/profile/u1').catch(e => e)
    expect(err).toBeInstanceOf(mod.ApiError)
    expect(err.name).toBe('ApiError')
    expect(err.path).toBe('/profile/u1')
    expect(err.isNetworkError).toBe(true)
    expect(err.status).toBe(0)
    expect(err.message).toContain('VITE_API_BASE')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('会话存储', () => {
  it('setSession 后 getSession / getAccessToken 可读回', async () => {
    const session: SessionMod = await import('../src/session')
    session.setSession({ accessToken: 'jwt-1', user: { id: 'u1', email: 'a@b.c' } })

    expect(session.getSession()?.user.id).toBe('u1')
    expect(session.getAccessToken()).toBe('jwt-1')
  })

  it('clearSession 清空会话', async () => {
    const session: SessionMod = await import('../src/session')
    session.setSession({ accessToken: 'jwt-1', user: { id: 'u1' } })
    session.clearSession()

    expect(session.getSession()).toBeNull()
    expect(session.getAccessToken()).toBe('')
  })

  it('过期或损坏的会话视为未登录', async () => {
    const session: SessionMod = await import('../src/session')
    session.setSession({ accessToken: 'jwt-1', user: { id: 'u1' }, expiresAt: Date.now() - 1 })
    expect(session.getSession()).toBeNull()

    localStorage.setItem('yyc3:music:session', '{bad')
    expect(session.getSession()).toBeNull()
  })
})

describe('ApiError 结构化错误', () => {
  it('缺省字段使用安全默认值', async () => {
    const { ApiError } = await loadLocal()
    const err = new ApiError({ message: 'boom', path: '/x' })
    expect(err.status).toBe(0)
    expect(err.statusText).toBe('')
    expect(err.body).toBe('')
    expect(err.data).toBeNull()
    expect(err.isRateLimited).toBe(false)
    expect(err.isNetworkError).toBe(false)
    expect(err instanceof Error).toBe(true)
  })

  it('JSON body 被解析为 data，非 JSON body 保持 null', async () => {
    const { ApiError } = await loadLocal()
    const jsonErr = new ApiError({
      message: 'bad', path: '/x', status: 400, statusText: 'Bad Request',
      body: '{"code":"E1"}', isRateLimited: true,
    })
    expect(jsonErr.data).toEqual({ code: 'E1' })
    expect(jsonErr.isRateLimited).toBe(true)

    const textErr = new ApiError({ message: 'bad', path: '/x', body: 'plain text' })
    expect(textErr.data).toBeNull()
  })
})

describe('网络模式 · 请求构造与鉴权', () => {
  it('API_BASE 去除末尾斜杠并按路径拼接', async () => {
    const mod = await loadRemote('https://api.example.com/v1///')
    expect(mod.API_BASE).toBe('https://api.example.com/v1')
    expect(mod.LOCAL_MODE).toBe(false)
  })

  it('GET 携带 Authorization 与自定义头，返回解析后的 JSON', async () => {
    const mod = await loadRemote()
    const fetchMock = vi.fn().mockResolvedValue(makeResponse({ json: async () => ({ likes: 3 }) }))
    vi.stubGlobal('fetch', fetchMock)

    const data = await mod.apiFetch<{ likes: number }>('/likes/s1', { headers: { 'X-Trace': 't1' } })

    expect(data).toEqual({ likes: 3 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.example.com/v1/likes/s1')
    expect(init.headers).toEqual({ Authorization: 'Bearer ', 'X-Trace': 't1' })
  })

  it('已登录会话注入 access_token 作为 Bearer', async () => {
    const mod = await loadRemote()
    const session: SessionMod = await import('../src/session')
    session.setSession({ accessToken: 'jwt-123', user: { id: 'u1' } })
    const fetchMock = vi.fn().mockResolvedValue(makeResponse())
    vi.stubGlobal('fetch', fetchMock)

    await mod.apiFetch('/x')
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer jwt-123')
  })

  it('会话数据损坏时降级为匿名请求', async () => {
    const mod = await loadRemote()
    localStorage.setItem('yyc3:music:session', '{oops')
    const fetchMock = vi.fn().mockResolvedValue(makeResponse())
    vi.stubGlobal('fetch', fetchMock)

    await mod.apiFetch('/x')
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer ')
  })

  it('POST 原样透传 method/body', async () => {
    const mod = await loadRemote()
    const fetchMock = vi.fn().mockResolvedValue(makeResponse())
    vi.stubGlobal('fetch', fetchMock)

    await mod.apiFetch('/likes/s1', { method: 'POST', body: '{"a":1}' })
    const [, init] = fetchMock.mock.calls[0]
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"a":1}')
  })
})

describe('网络模式 · AbortSignal 取消', () => {
  it('已中止的 signal 不发起请求，apiFetch 返回 null', async () => {
    const mod = await loadRemote()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()
    controller.abort()

    await expect(mod.apiFetch('/x', { signal: controller.signal })).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('已中止的 signal 让 apiFetchStrict 抛出 AbortError', async () => {
    const mod = await loadRemote()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()
    controller.abort()

    const error = await mod.apiFetchStrict('/x', { signal: controller.signal }).catch((e) => e)
    expect(mod.isAbortError(error)).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fetch 以 AbortError 拒绝时不重试、不告警', async () => {
    const mod = await loadRemote()
    const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' })
    const fetchMock = vi.fn().mockRejectedValue(abortError)
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()

    await expect(mod.apiFetch('/x', { signal: controller.signal })).resolves.toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('网络失败后的重试等待期间中止：不再发起第二次请求', async () => {
    vi.useFakeTimers()
    const mod = await loadRemote()
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()

    const promise = mod.apiFetch('/x', { signal: controller.signal })
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    controller.abort()
    await expect(promise).resolves.toBeNull()
    await vi.advanceTimersByTimeAsync(2000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('429 退避等待期间中止：不再发起重试请求', async () => {
    vi.useFakeTimers()
    const mod = await loadRemote()
    const fetchMock = vi.fn().mockResolvedValue(
      makeResponse({ ok: false, status: 429, statusText: 'Too Many Requests' })
    )
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()

    const promise = mod.apiFetch('/x', { signal: controller.signal })
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    controller.abort()
    await expect(promise).resolves.toBeNull()
    await vi.advanceTimersByTimeAsync(5000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('网络模式 · 错误与非 JSON 响应', () => {
  it('非 2xx 响应返回 null 并记录警告', async () => {
    const mod = await loadRemote()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeResponse({ ok: false, status: 500, statusText: 'Internal Server Error', text: async () => 'oops' })
    ))

    await expect(mod.apiFetch('/x')).resolves.toBeNull()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('responded 500'))
  })

  it('读取错误响应体失败时仍返回 null', async () => {
    const mod = await loadRemote()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeResponse({ ok: false, status: 502, statusText: 'Bad Gateway', text: async () => { throw new Error('stream broken') } })
    ))

    await expect(mod.apiFetch('/x')).resolves.toBeNull()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('responded 502'))
  })

  it('响应体非 JSON 时返回 null 并警告', async () => {
    const mod = await loadRemote()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeResponse({ json: async () => { throw new SyntaxError('Unexpected token <') } })
    ))

    await expect(mod.apiFetch('/x')).resolves.toBeNull()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('non-JSON response'))
  })

  it('响应对象自身读取异常时兜底返回 null（非 ApiError 分支）', async () => {
    const mod = await loadRemote()
    const broken: any = makeResponse()
    Object.defineProperty(broken, 'ok', {
      get() { throw new Error('corrupted response') },
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(broken))

    await expect(mod.apiFetch('/x')).resolves.toBeNull()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unexpected error'), expect.any(Error))
  })
})

describe('网络模式 · 网络失败重试', () => {
  it('首次网络失败后 1.5s 重试成功', async () => {
    vi.useFakeTimers()
    const mod = await loadRemote()
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('cold start'))
      .mockResolvedValueOnce(makeResponse({ json: async () => ({ retried: true }) }))
    vi.stubGlobal('fetch', fetchMock)

    const promise = mod.apiFetch('/x')
    await vi.advanceTimersByTimeAsync(1500)
    await expect(promise).resolves.toEqual({ retried: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('两次网络失败：apiFetch 返回 null，apiFetchStrict 抛 ApiError', async () => {
    vi.useFakeTimers()
    const mod = await loadRemote()
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'))
    vi.stubGlobal('fetch', fetchMock)

    const lenient = mod.apiFetch('/x')
    await vi.advanceTimersByTimeAsync(1500)
    await expect(lenient).resolves.toBeNull()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('network error after retry'))

    const strict = mod.apiFetchStrict('/x')
    const assertion = expect(strict).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
      isNetworkError: true,
      path: '/x',
    })
    await vi.advanceTimersByTimeAsync(1500)
    await assertion
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })
})

describe('网络模式 · 429 限流退避', () => {
  function rateLimited(retryAfter: string | null, body = 'rate limited') {
    return makeResponse({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      headers: { get: (name: string) => (name === 'Retry-After' ? retryAfter : null) },
      text: async () => body,
    })
  }

  it('按 Retry-After 秒数退避后重试成功', async () => {
    vi.useFakeTimers()
    const mod = await loadRemote()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(rateLimited('1'))
      .mockResolvedValueOnce(makeResponse({ json: async () => ({ ok: true }) }))
    vi.stubGlobal('fetch', fetchMock)

    const promise = mod.apiFetch('/x')
    await vi.advanceTimersByTimeAsync(999)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    await expect(promise).resolves.toEqual({ ok: true })
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('rate-limited (429)'))
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('1000ms'))
  })

  it('缺少 Retry-After 时默认退避 3s', async () => {
    vi.useFakeTimers()
    const mod = await loadRemote()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(rateLimited(null))
      .mockResolvedValueOnce(makeResponse())
    vi.stubGlobal('fetch', fetchMock)

    const promise = mod.apiFetch('/x')
    await vi.advanceTimersByTimeAsync(3000)
    await promise
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('3000ms'))
  })

  it('Retry-After 非数字时回退 3s', async () => {
    vi.useFakeTimers()
    const mod = await loadRemote()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(rateLimited('soon'))
      .mockResolvedValueOnce(makeResponse())
    vi.stubGlobal('fetch', fetchMock)

    const promise = mod.apiFetch('/x')
    await vi.advanceTimersByTimeAsync(3000)
    await promise
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('Retry-After 过长时被截断到 30s 上限', async () => {
    vi.useFakeTimers()
    const mod = await loadRemote()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(rateLimited('120'))
      .mockResolvedValueOnce(makeResponse())
    vi.stubGlobal('fetch', fetchMock)

    const promise = mod.apiFetch('/x')
    await vi.advanceTimersByTimeAsync(29999)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    await promise
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('30000ms'))
  })

  it('重试后仍 429：apiFetchStrict 抛限流 ApiError 且携带响应体', async () => {
    vi.useFakeTimers()
    const mod = await loadRemote()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(rateLimited('1'))
      .mockResolvedValueOnce(rateLimited('1', 'still limited'))
    vi.stubGlobal('fetch', fetchMock)

    const strict = mod.apiFetchStrict('/x')
    const assertion = expect(strict).rejects.toMatchObject({
      status: 429,
      isRateLimited: true,
      body: 'still limited',
      path: '/x',
    })
    await vi.advanceTimersByTimeAsync(1000)
    await assertion
  })

  it('429 重试期间网络失败：标记 isRateLimited + isNetworkError', async () => {
    vi.useFakeTimers()
    const mod = await loadRemote()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(rateLimited('1'))
      .mockRejectedValueOnce(new Error('link down'))
    vi.stubGlobal('fetch', fetchMock)

    const strict = mod.apiFetchStrict('/x')
    const assertion = expect(strict).rejects.toMatchObject({
      isRateLimited: true,
      isNetworkError: true,
    })
    await vi.advanceTimersByTimeAsync(1000)
    await assertion
  })
})

describe('网络模式 · apiFetchStrict 严格错误', () => {
  it('非 2xx 抛出带状态码与解析后数据的 ApiError', async () => {
    const mod = await loadRemote()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeResponse({ ok: false, status: 400, statusText: 'Bad Request', text: async () => '{"error":"invalid"}' })
    ))

    const err = await mod.apiFetchStrict('/x').catch(e => e)
    expect(err).toBeInstanceOf(mod.ApiError)
    expect(err.status).toBe(400)
    expect(err.statusText).toBe('Bad Request')
    expect(err.body).toBe('{"error":"invalid"}')
    expect(err.data).toEqual({ error: 'invalid' })
    expect(err.message).toContain('responded 400')
  })

  it('错误响应体为空时 body 为空串、data 为 null', async () => {
    const mod = await loadRemote()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeResponse({ ok: false, status: 404, statusText: 'Not Found' })
    ))

    const err = await mod.apiFetchStrict('/missing').catch(e => e)
    expect(err.status).toBe(404)
    expect(err.body).toBe('')
    expect(err.data).toBeNull()
  })

  it('成功响应非 JSON 时抛 ApiError', async () => {
    const mod = await loadRemote()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeResponse({ json: async () => { throw new SyntaxError('bad json') } })
    ))

    const err = await mod.apiFetchStrict('/x').catch(e => e)
    expect(err).toBeInstanceOf(mod.ApiError)
    expect(err.message).toContain('non-JSON response')
    expect(err.body).toBe('')
    expect(err.status).toBe(200)
  })
})
