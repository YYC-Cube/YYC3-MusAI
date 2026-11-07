/**
 * D-Music 环境变量验证脚本
 *
 * 用途:
 *   - 验证所有必需的环境变量是否已配置
 *   - 检查环境变量的格式和有效性
 *   - 提供详细的验证报告
 *
 * 使用方法:
 *   node verify-env.js
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import pg from 'pg'

// 加载环境变量
config()

console.log('🎵 D-Music 环境变量验证')
console.log('==================================')
console.log('')

// 验证结果
const results = {
  passed: [],
  failed: [],
  warnings: []
}

// 验证函数
function validate(name, value, required = true, validator = null) {
  const status = required ? (value ? '✅' : '❌') : (value ? '✅' : '⚠️ ')

  if (required && !value) {
    results.failed.push({ name, reason: 'Required but missing' })
    console.log(`${status} ${name}: ${value || 'MISSING'}`)
    return false
  }

  if (!required && !value) {
    results.warnings.push({ name, reason: 'Optional but not set' })
    console.log(`${status} ${name}: ${value || 'NOT SET (optional)'}`)
    return true
  }

  if (validator && !validator(value)) {
    results.failed.push({ name, reason: 'Validation failed' })
    console.log(`${status} ${name}: ${value} (INVALID)`)
    return false
  }

  results.passed.push({ name })
  console.log(`${status} ${name}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`)
  return true
}

// 验证 Supabase 配置
console.log('📋 Supabase 配置:')
validate('VITE_SUPABASE_URL', process.env.VITE_SUPABASE_URL, true, (val) => val.startsWith('https://'))
validate('VITE_SUPABASE_ANON_KEY', process.env.VITE_SUPABASE_ANON_KEY, true, (val) => val.startsWith('eyJ'))
validate('SUPABASE_SERVICE_KEY', process.env.SUPABASE_SERVICE_KEY, false, (val) => val.startsWith('eyJ') || val === 'YOUR_SERVICE_ROLE_KEY_HERE')
validate('SUPABASE_PROJECT_ID', process.env.SUPABASE_PROJECT_ID, true, (val) => val.length > 10)
console.log('')

// 验证 PostgreSQL 配置
console.log('📋 PostgreSQL 配置:')
validate('PG_HOST', process.env.PG_HOST, true)
validate('PG_PORT', process.env.PG_PORT, true, (val) => !isNaN(parseInt(val)))
validate('PG_USER', process.env.PG_USER, true)
validate('PG_DATABASE', process.env.PG_DATABASE, true)
validate('PG_ADMIN_DATABASE', process.env.PG_ADMIN_DATABASE, true)
validate('PG_SCHEMA', process.env.PG_SCHEMA, true)
validate('PG_POOL_SIZE', process.env.PG_POOL_SIZE, true, (val) => !isNaN(parseInt(val)))
console.log('')

// 验证 Redis 配置
console.log('📋 Redis 配置:')
validate('REDIS_HOST', process.env.REDIS_HOST, true)
validate('REDIS_PORT', process.env.REDIS_PORT, true, (val) => !isNaN(parseInt(val)))
validate('REDIS_PASSWORD', process.env.REDIS_PASSWORD, true)
validate('REDIS_DB', process.env.REDIS_DB, true, (val) => !isNaN(parseInt(val)))
console.log('')

// 验证应用配置
console.log('📋 应用配置:')
validate('NODE_ENV', process.env.NODE_ENV, true, (val) => ['development', 'staging', 'production'].includes(val))
validate('APP_NAME', process.env.APP_NAME, true)
validate('APP_VERSION', process.env.APP_VERSION, true)
validate('APP_PORT', process.env.APP_PORT, true, (val) => !isNaN(parseInt(val)))
console.log('')

// 测试 Supabase 连接
console.log('🔍 测试 Supabase 连接...')
try {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  )
  const { data, error } = await supabase.from('kv_store_f626b673').select('key').limit(1)

  if (error) {
    console.log(`   ❌ Supabase 连接失败: ${error.message}`)
    results.failed.push({ name: 'Supabase Connection', reason: error.message })
  } else {
    console.log('   ✅ Supabase 连接正常')
    results.passed.push({ name: 'Supabase Connection' })
  }
} catch (error) {
  console.log(`   ❌ Supabase 连接失败: ${error.message}`)
  results.failed.push({ name: 'Supabase Connection', reason: error.message })
}
console.log('')

// 测试 PostgreSQL 连接
console.log('🔍 测试 PostgreSQL 连接...')
try {
  const client = new pg.Client({
    host: process.env.PG_HOST,
    port: parseInt(process.env.PG_PORT),
    user: process.env.PG_USER,
    database: process.env.PG_DATABASE
  })

  await client.connect()
  const result = await client.query('SELECT NOW()')
  await client.end()

  console.log(`   ✅ PostgreSQL 连接正常 (${result.rows[0].now})`)
  results.passed.push({ name: 'PostgreSQL Connection' })
} catch (error) {
  console.log(`   ❌ PostgreSQL 连接失败: ${error.message}`)
  results.failed.push({ name: 'PostgreSQL Connection', reason: error.message })
}
console.log('')

// 输出总结
console.log('==================================')
console.log('📊 验证结果汇总:')
console.log(`   ✅ 通过: ${results.passed.length}`)
console.log(`   ❌ 失败: ${results.failed.length}`)
console.log(`   ⚠️  警告: ${results.warnings.length}`)
console.log('')

if (results.failed.length > 0) {
  console.log('❌ 验证失败 - 以下项目需要修复:')
  results.failed.forEach(item => {
    console.log(`   - ${item.name}: ${item.reason}`)
  })
  console.log('')
  process.exit(1)
}

if (results.warnings.length > 0) {
  console.log('⚠️  警告 - 以下项目建议配置:')
  results.warnings.forEach(item => {
    console.log(`   - ${item.name}: ${item.reason}`)
  })
  console.log('')
}

console.log('✅ 环境变量验证通过!')
console.log('')
console.log('📝 下一步:')
console.log('   1. 启动应用: pnpm dev')
console.log('   2. 访问应用: http://localhost:3198')
console.log('')
