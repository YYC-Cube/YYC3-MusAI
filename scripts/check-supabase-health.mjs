#!/usr/bin/env node
/**
 * @file check-supabase-health.mjs
 * @description Supabase 生产链路四项健康检查：REST / Auth / Storage / KV 表
 * @author YYC³ Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-11-09
 * @status stable
 *
 * 用法：
 *   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... node scripts/check-supabase-health.mjs
 *
 * 退出码：0 = 全部通过；1 = 存在失败项；2 = 未配置凭据（不伪造通过）
 */

const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '')
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
const kvTable = process.env.SUPABASE_KV_TABLE || 'kv_store_f626b673'

if (!url || !anonKey) {
  console.error('未配置 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY，跳过检查（状态：未验证）')
  console.error('请在具备真实凭据的环境中运行，禁止以 mock 结果替代。')
  process.exit(2)
}

const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` }
const results = []

async function check(name, path, { method = 'GET', expect = [200], note = '' } = {}) {
  const started = Date.now()
  try {
    const res = await fetch(`${url}${path}`, { method, headers })
    const ok = expect.includes(res.status)
    results.push({ name, ok, status: res.status, ms: Date.now() - started, note })
  } catch (error) {
    results.push({ name, ok: false, status: 'ERR', ms: Date.now() - started, note: error.message })
  }
}

await check('REST（PostgREST）', '/rest/v1/', { note: 'OpenAPI 根路径' })
await check('Auth', '/auth/v1/health', { note: '认证服务健康' })
await check('Storage', '/storage/v1/bucket', { expect: [200, 401, 403], note: '200/401/403 视为可达' })
await check('KV 表读取', `/rest/v1/${kvTable}?select=key&limit=1`, { note: kvTable })

let failed = 0
console.log(`\nSupabase 健康检查 — ${url}\n`)
for (const r of results) {
  if (!r.ok) failed += 1
  const mark = r.ok ? '✓' : '✗'
  console.log(`${mark} ${r.name.padEnd(18)} HTTP ${String(r.status).padEnd(4)} ${String(r.ms).padStart(5)}ms  ${r.note}`)
}

console.log(`\n结果：${results.length - failed}/${results.length} 通过`)
process.exit(failed === 0 ? 0 : 1)
