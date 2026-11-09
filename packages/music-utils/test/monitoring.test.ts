// YYC³ music-utils — 监控模块测试
// 覆盖错误捕获 / 全局错误处理器 / 性能与事件采集 / 健康检查 / 生产上报 / 数量上限 / 初始化分支
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

type Mon = typeof import('../src/monitoring.js')

const TIMING = {
  navigationStart: 1000,
  loadEventEnd: 2500,
  domainLookupStart: 1100,
  domainLookupEnd: 1150,
  connectStart: 1200,
  connectEnd: 1300,
  requestStart: 1400,
  responseStart: 1500,
  responseEnd: 1700,
  domInteractive: 1800,
  domComplete: 2400,
}

const originalPerformance = window.performance

interface LoadOptions {
  env?: string
  readyState?: 'loading' | 'complete'
  timing?: typeof TIMING
}

async function load(opts: LoadOptions = {}): Promise<Mon> {
  vi.resetModules()
  vi.stubEnv('NODE_ENV', opts.env ?? 'test')

  if (opts.timing) {
    Object.defineProperty(window, 'performance', {
      value: { timing: opts.timing },
      configurable: true,
      writable: true,
    })
  }

  Object.defineProperty(document, 'readyState', {
    value: opts.readyState ?? 'loading',
    configurable: true,
  })

  const mod = await import('../src/monitoring.js')
  // 清除自动初始化注册的 60s 健康检查定时器
  vi.clearAllTimers()
  return mod
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true })
  Object.defineProperty(window, 'performance', {
    value: originalPerformance,
    configurable: true,
    writable: true,
  })
})

describe('错误监控', () => {
  it('captureError 记录错误结构、上下文并打印', async () => {
    const mod = await load()
    const error = new Error('boom')
    mod.captureError(error, { foo: 'bar' })

    const data = mod.exportMonitoringData()
    expect(data.data.errors).toHaveLength(1)
    const record = data.data.errors[0]
    expect(record.id).toMatch(/^\d+-[a-z0-9]+$/)
    expect(record.timestamp).toBe(new Date().toISOString())
    expect(record.type).toBe('Error')
    expect(record.message).toBe('boom')
    expect(record.stack).toContain('boom')
    expect(record.context).toMatchObject({
      url: window.location.href,
      userAgent: navigator.userAgent,
      foo: 'bar',
    })
    expect(data.summary.errors).toBe(1)
    expect(console.error).toHaveBeenCalledWith('[Monitoring] Error captured:', record)
  })

  it('captureError 兼容非 Error 值', async () => {
    const mod = await load()
    mod.captureError('plain failure' as any)
    mod.captureError({ code: 500 } as any)

    const errors = mod.exportMonitoringData().data.errors
    expect(errors).toHaveLength(2)
    expect(errors[0]).toMatchObject({ type: 'Error', message: 'plain failure', stack: undefined })
    expect(errors[1].message).toBe('[object Object]')
  })

  it('错误数量超过上限时丢弃最旧记录', async () => {
    const mod = await load()
    for (let i = 0; i < 55; i++) {
      mod.captureError(new Error(`e${i}`))
    }
    const errors = mod.exportMonitoringData().data.errors
    expect(errors).toHaveLength(50)
    expect(errors[0].message).toBe('e5')
    expect(errors[49].message).toBe('e54')
  })

  it('全局 error 事件被转发并附带定位信息', async () => {
    const mod = await load()
    window.dispatchEvent(new ErrorEvent('error', {
      error: new Error('global boom'),
      message: 'global boom',
      filename: 'app.js',
      lineno: 11,
      colno: 22,
    }))

    const errors = mod.exportMonitoringData().data.errors
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatchObject({
      message: 'global boom',
      context: { filename: 'app.js', lineno: 11, colno: 22 },
    })
  })

  it('unhandledrejection 事件被转发并标记 promise', async () => {
    const mod = await load()
    const ev = new Event('unhandledrejection') as any
    ev.reason = new Error('rejected')
    window.dispatchEvent(ev)

    const errors = mod.exportMonitoringData().data.errors
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toBe('rejected')
    expect(errors[0].context.promise).toBe(true)
  })
})

describe('性能监控', () => {
  it('trackPerformance 记录名称、耗时与元数据', async () => {
    const mod = await load()
    mod.trackPerformance('render', 42, { component: 'Canvas' })

    const perf = mod.exportMonitoringData().data.performance
    expect(perf).toHaveLength(1)
    expect(perf[0]).toMatchObject({
      name: 'render',
      duration: 42,
      metadata: { component: 'Canvas' },
    })
    expect(console.log).toHaveBeenCalledWith('[Monitoring] Performance tracked:', perf[0])
  })

  it('性能记录超过上限时丢弃最旧记录', async () => {
    const mod = await load()
    for (let i = 0; i < 105; i++) mod.trackPerformance(`p${i}`, i)
    const perf = mod.exportMonitoringData().data.performance
    expect(perf).toHaveLength(100)
    expect(perf[0].name).toBe('p5')
  })

  it('trackPageLoad 由 performance.timing 计算各阶段耗时', async () => {
    const mod = await load({ timing: TIMING })
    mod.trackPageLoad()

    const perf = mod.exportMonitoringData().data.performance
    expect(perf).toHaveLength(1)
    expect(perf[0].name).toBe('page_load')
    expect(perf[0].duration).toBe(1500)
    expect(perf[0].metadata).toEqual({
      dns: 50,
      tcp: 100,
      ttfb: 100,
      download: 200,
      domProcessing: 600,
    })
  })

  it('缺少 window.performance 时 trackPageLoad 安全跳过', async () => {
    const mod = await load()
    Object.defineProperty(window, 'performance', { value: undefined, configurable: true, writable: true })
    expect(() => mod.trackPageLoad()).not.toThrow()
    expect(mod.getMonitoringSummary().performance).toBe(0)
  })

  it('trackApiCall 依据状态码标记成功/失败', async () => {
    const mod = await load()
    mod.trackApiCall('/api/a', 12, 200)
    mod.trackApiCall('/api/b', 20, 304)
    mod.trackApiCall('/api/c', 30, 404)
    mod.trackApiCall('/api/d', 40, 500)

    const perf = mod.exportMonitoringData().data.performance
    expect(perf.map(p => p.metadata)).toEqual([
      { url: '/api/a', status: 200, success: true },
      { url: '/api/b', status: 304, success: true },
      { url: '/api/c', status: 404, success: false },
      { url: '/api/d', status: 500, success: false },
    ])
  })
})

describe('事件监控', () => {
  it('trackEvent 记录事件与属性', async () => {
    const mod = await load()
    mod.trackEvent('song_play', { songId: 's1' })

    const events = mod.exportMonitoringData().data.events
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ name: 'song_play', properties: { songId: 's1' } })
    expect(console.log).toHaveBeenCalledWith('[Monitoring] Event tracked:', events[0])
  })

  it('trackUserAction 附带动作、目标与当前 URL', async () => {
    const mod = await load()
    mod.trackUserAction('click', 'play-button')

    const event = mod.exportMonitoringData().data.events[0]
    expect(event.name).toBe('user_action')
    expect(event.properties).toEqual({
      action: 'click',
      target: 'play-button',
      url: window.location.href,
    })
  })

  it('事件记录超过上限时丢弃最旧记录', async () => {
    const mod = await load()
    for (let i = 0; i < 105; i++) mod.trackEvent(`ev${i}`)
    const events = mod.exportMonitoringData().data.events
    expect(events).toHaveLength(100)
    expect(events[0].name).toBe('ev5')
  })
})

describe('健康检查', () => {
  it('连接正常时返回 healthy 并记录检查结果', async () => {
    const mod = await load()
    const result = await mod.performHealthCheck()

    expect(result.status).toBe('healthy')
    expect(result.checks).toEqual({ supabase: true, database: true, api: true })
    const summary = mod.getMonitoringSummary()
    expect(summary.healthChecks).toBe(1)
    expect(summary.lastHealthCheck).toEqual(result)
    expect(console.log).toHaveBeenCalledWith('[Monitoring] Health check:', result)
  })

  it('查询抛错时返回 unhealthy 并捕获异常', async () => {
    const mod = await load()
    const { supabase } = await import('../src/supabase.js')
    vi.spyOn(supabase, 'from').mockImplementation(() => {
      throw new Error('db down')
    })

    const result = await mod.performHealthCheck()
    expect(result.status).toBe('unhealthy')
    expect(result.checks).toEqual({ supabase: false, database: false, api: false })

    const summary = mod.getMonitoringSummary()
    expect(summary.errors).toBe(1)
    const record = mod.exportMonitoringData().data.errors[0]
    expect(record.message).toBe('db down')
    expect(record.context.context).toBe('health_check')
  })

  it('健康检查记录上限为 10 条', async () => {
    const mod = await load()
    for (let i = 0; i < 12; i++) await mod.performHealthCheck()
    expect(mod.getMonitoringSummary().healthChecks).toBe(10)
  })

  it('定期健康检查按间隔重复执行', async () => {
    const mod = await load()
    mod.startPeriodicHealthChecks(1000)
    expect(mod.getMonitoringSummary().healthChecks).toBe(0)

    await vi.advanceTimersByTimeAsync(1000)
    expect(mod.getMonitoringSummary().healthChecks).toBe(1)

    await vi.advanceTimersByTimeAsync(2000)
    expect(mod.getMonitoringSummary().healthChecks).toBe(3)
  })
})

describe('生产环境上报', () => {
  it('production 时将事件写入 monitoring_events 表', async () => {
    const mod = await load({ env: 'production' })
    const { supabase } = await import('../src/supabase.js')
    const insert = vi.fn()
    const fromSpy = vi.spyOn(supabase, 'from').mockReturnValue({ insert } as any)

    mod.trackEvent('purchase', { amount: 1 })
    await Promise.resolve()
    await Promise.resolve()

    expect(fromSpy).toHaveBeenCalledWith('monitoring_events')
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ name: 'purchase' }))
  })

  it('上报写入失败时记录错误但不抛出', async () => {
    const mod = await load({ env: 'production' })
    const { supabase } = await import('../src/supabase.js')
    vi.spyOn(supabase, 'from').mockReturnValue({
      insert: () => { throw new Error('insert failed') },
    } as any)

    expect(() => mod.trackEvent('purchase')).not.toThrow()
    await Promise.resolve()
    await Promise.resolve()

    expect(console.error).toHaveBeenCalledWith(
      '[Monitoring] Failed to send to Supabase:',
      expect.any(Error)
    )
  })

  it('非 production 环境不发起 Supabase 写入', async () => {
    const mod = await load({ env: 'development' })
    const { supabase } = await import('../src/supabase.js')
    const fromSpy = vi.spyOn(supabase, 'from')

    mod.trackEvent('e')
    await Promise.resolve()
    await Promise.resolve()

    expect(fromSpy).not.toHaveBeenCalled()
  })
})

describe('初始化与导出', () => {
  it('初始化时记录配置、环境与摘要结构', async () => {
    const mod = await load({ env: 'staging' })
    const data = mod.exportMonitoringData()
    expect(data.config).toMatchObject({
      enabled: true,
      environment: 'staging',
      sampleRate: 1.0,
      maxErrors: 50,
      maxEvents: 100,
      flushInterval: 5000,
    })
    expect(data.summary).toEqual({
      errors: 0,
      events: 0,
      performance: 0,
      healthChecks: 0,
      lastHealthCheck: undefined,
    })
    expect(data.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(console.log).toHaveBeenCalledWith('[Monitoring] Initializing monitoring system...')
    expect(console.log).toHaveBeenCalledWith('[Monitoring] Monitoring system initialized')
  })

  it('document 已加载完成时立即采集页面加载性能', async () => {
    const mod = await load({ readyState: 'complete', timing: TIMING })
    const perf = mod.exportMonitoringData().data.performance
    expect(perf).toHaveLength(1)
    expect(perf[0].name).toBe('page_load')
    expect(perf[0].duration).toBe(1500)
  })

  it('document 未加载完成时监听 load 事件后再采集', async () => {
    const mod = await load({ readyState: 'loading', timing: TIMING })
    expect(mod.getMonitoringSummary().performance).toBe(0)

    window.dispatchEvent(new Event('load'))

    const perf = mod.exportMonitoringData().data.performance
    expect(perf).toHaveLength(1)
    expect(perf[0].name).toBe('page_load')
  })
})
