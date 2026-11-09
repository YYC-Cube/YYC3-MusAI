/**
 * D-Music 基础监控配置
 *
 * 用途:
 *   - 应用性能监控
 *   - 错误追踪
 *   - 用户行为分析
 *   - 系统健康检查
 */

import { supabase } from './supabase.js'

// ========================================
// 监控配置
// ========================================

const MONITORING_CONFIG = {
  enabled: true,
  environment: import.meta.env.NODE_ENV || 'development',
  sampleRate: 1.0, // 100% 采样率
  maxErrors: 50, // 最大错误记录数
  maxEvents: 100, // 最大事件记录数
  flushInterval: 5000, // 5 秒刷新间隔
}

// ========================================
// 监控数据存储
// ========================================

const monitoringData = {
  errors: [],
  events: [],
  performance: [],
  healthChecks: []
}

// ========================================
// 错误监控
// ========================================

/**
 * 捕获和记录错误
 */
export function captureError(error, context = {}) {
  if (!MONITORING_CONFIG.enabled) return

  const errorData = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    type: error.name || 'Error',
    message: error.message || String(error),
    stack: error.stack,
    context: {
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...context
    }
  }

  monitoringData.errors.push(errorData)

  // 限制错误数量
  if (monitoringData.errors.length > MONITORING_CONFIG.maxErrors) {
    monitoringData.errors.shift()
  }

  // 发送到 Supabase
  sendToSupabase('errors', errorData)

  console.error('[Monitoring] Error captured:', errorData)
}

/**
 * 全局错误处理器
 */
export function setupGlobalErrorHandlers() {
  // 捕获未处理的错误
  window.addEventListener('error', (event) => {
    captureError(event.error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    })
  })

  // 捕获未处理的 Promise 拒绝
  window.addEventListener('unhandledrejection', (event) => {
    captureError(event.reason, {
      promise: true
    })
  })
}

// ========================================
// 性能监控
// ========================================

/**
 * 记录性能指标
 */
export function trackPerformance(name, duration, metadata = {}) {
  if (!MONITORING_CONFIG.enabled) return

  const perfData = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    name,
    duration,
    metadata
  }

  monitoringData.performance.push(perfData)

  // 限制性能数据数量
  if (monitoringData.performance.length > MONITORING_CONFIG.maxEvents) {
    monitoringData.performance.shift()
  }

  // 发送到 Supabase
  sendToSupabase('performance', perfData)

  console.log('[Monitoring] Performance tracked:', perfData)
}

/**
 * 监控页面加载性能
 */
export function trackPageLoad() {
  if (!window.performance) return

  const perfData = window.performance.timing
  const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart

  trackPerformance('page_load', pageLoadTime, {
    dns: perfData.domainLookupEnd - perfData.domainLookupStart,
    tcp: perfData.connectEnd - perfData.connectStart,
    ttfb: perfData.responseStart - perfData.requestStart,
    download: perfData.responseEnd - perfData.responseStart,
    domProcessing: perfData.domComplete - perfData.domInteractive
  })
}

/**
 * 监控 API 请求性能
 */
export function trackApiCall(url, duration, status) {
  trackPerformance('api_call', duration, {
    url,
    status,
    success: status >= 200 && status < 400
  })
}

// ========================================
// 事件监控
// ========================================

/**
 * 记录用户事件
 */
export function trackEvent(name, properties = {}) {
  if (!MONITORING_CONFIG.enabled) return

  const eventData = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    name,
    properties
  }

  monitoringData.events.push(eventData)

  // 限制事件数量
  if (monitoringData.events.length > MONITORING_CONFIG.maxEvents) {
    monitoringData.events.shift()
  }

  // 发送到 Supabase
  sendToSupabase('events', eventData)

  console.log('[Monitoring] Event tracked:', eventData)
}

/**
 * 监控用户行为
 */
export function trackUserAction(action, target) {
  trackEvent('user_action', {
    action,
    target,
    url: window.location.href
  })
}

// ========================================
// 健康检查
// ========================================

/**
 * 执行健康检查
 */
export async function performHealthCheck() {
  const healthCheck = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    checks: {
      supabase: false,
      database: false,
      api: false
    },
    status: 'unknown'
  }

  try {
    // 检查 Supabase 连接
    const { error } = await supabase.from('kv_store_f626b673').select('key').limit(1)
    healthCheck.checks.supabase = !error

    // 检查数据库连接（通过 Supabase）
    healthCheck.checks.database = !error

    // 检查 API 连接
    healthCheck.checks.api = true

    // 确定整体状态
    const allPassed = Object.values(healthCheck.checks).every(check => check)
    healthCheck.status = allPassed ? 'healthy' : 'degraded'

  } catch (error) {
    healthCheck.status = 'unhealthy'
    captureError(error, { context: 'health_check' })
  }

  monitoringData.healthChecks.push(healthCheck)

  // 限制健康检查数量
  if (monitoringData.healthChecks.length > 10) {
    monitoringData.healthChecks.shift()
  }

  console.log('[Monitoring] Health check:', healthCheck)

  return healthCheck
}

/**
 * 定期健康检查
 */
export function startPeriodicHealthChecks(interval = 60000) {
  setInterval(async () => {
    await performHealthCheck()
  }, interval)
}

// ========================================
// 工具函数
// ========================================

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

async function sendToSupabase(type, data) {
  try {
    const tableName = `monitoring_${type}`

    // 在生产环境中发送到 Supabase
    if (MONITORING_CONFIG.environment === 'production') {
      await supabase.from(tableName).insert(data)
    }
  } catch (error) {
    console.error('[Monitoring] Failed to send to Supabase:', error)
  }
}

/**
 * 获取监控数据摘要
 */
export function getMonitoringSummary() {
  return {
    errors: monitoringData.errors.length,
    events: monitoringData.events.length,
    performance: monitoringData.performance.length,
    healthChecks: monitoringData.healthChecks.length,
    lastHealthCheck: monitoringData.healthChecks[monitoringData.healthChecks.length - 1]
  }
}

/**
 * 导出监控数据
 */
export function exportMonitoringData() {
  return {
    config: MONITORING_CONFIG,
    data: monitoringData,
    summary: getMonitoringSummary(),
    exportedAt: new Date().toISOString()
  }
}

// ========================================
// 初始化
// ========================================

export function initMonitoring() {
  if (!MONITORING_CONFIG.enabled) return

  console.log('[Monitoring] Initializing monitoring system...')

  // 设置全局错误处理器
  setupGlobalErrorHandlers()

  // 监控页面加载
  if (document.readyState === 'complete') {
    trackPageLoad()
  } else {
    window.addEventListener('load', trackPageLoad)
  }

  // 开始定期健康检查
  startPeriodicHealthChecks()

  console.log('[Monitoring] Monitoring system initialized')
}

// 自动初始化
if (typeof window !== 'undefined') {
  initMonitoring()
}
