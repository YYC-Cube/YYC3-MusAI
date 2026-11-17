/**
 * 客户端会话存储
 *
 * 登录成功后由业务层写入（setSession），apiClient 读取 accessToken 注入
 * Authorization 头。浏览器端持久化到 localStorage，SSR / 测试环境退回内存。
 * 无后端时会话恒为空，调用方按匿名请求处理，不做任何网络探测。
 */

export interface SessionUser {
  id: string
  email?: string
  /** 兼容既有 UI 对 user_metadata.name 的读取 */
  user_metadata?: { name?: string; [key: string]: unknown }
  [key: string]: unknown
}

export interface ClientSession {
  accessToken: string
  user: SessionUser
  /** 过期时间（毫秒时间戳）；缺省视为不过期 */
  expiresAt?: number
}

const SESSION_KEY = 'yyc3:music:session'

/** SSR / 无 localStorage 环境的内存兜底 */
let memorySession: ClientSession | null = null

function getStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

function isSession(value: unknown): value is ClientSession {
  const candidate = value as ClientSession | null
  return !!candidate
    && typeof candidate.accessToken === 'string'
    && !!candidate.user
    && typeof candidate.user.id === 'string'
}

function isExpired(session: ClientSession): boolean {
  return typeof session.expiresAt === 'number' && session.expiresAt <= Date.now()
}

/** 读取当前会话；已过期或结构损坏时清理并返回 null */
export function getSession(): ClientSession | null {
  let raw: string | null = null
  const storage = getStorage()
  if (storage) {
    try {
      raw = storage.getItem(SESSION_KEY)
    } catch {
      raw = null
    }
  }
  if (raw === null) return memorySession

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isSession(parsed) || isExpired(parsed)) {
      clearSession()
      return null
    }
    return parsed
  } catch {
    clearSession()
    return null
  }
}

/** 写入会话；传 null 等价于清除 */
export function setSession(session: ClientSession | null): void {
  if (!session) {
    clearSession()
    return
  }
  memorySession = session
  const storage = getStorage()
  if (!storage) return
  try {
    storage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // 存储不可用时仅保留内存副本
  }
}

/** 清除会话（登出 / 过期 / 数据损坏） */
export function clearSession(): void {
  memorySession = null
  try {
    getStorage()?.removeItem(SESSION_KEY)
  } catch {
    // 存储不可用时内存副本已清除
  }
}

/** 当前 access token；无会话返回空串 */
export function getAccessToken(): string {
  return getSession()?.accessToken ?? ''
}
