/**
 * D-Music Supabase 连接测试脚本
 *
 * 用途:
 *   - 测试 Supabase 连接是否正常
 *   - 验证 KV Store 表结构
 *   - 检查数据访问权限
 *
 * 使用方法:
 *   node test-supabase-connection.js
 *
 * 环境变量:
 *   VITE_SUPABASE_URL - Supabase 项目 URL
 *   VITE_SUPABASE_ANON_KEY - Supabase 公开密钥
 */

import { createClient } from '@supabase/supabase-js'

// 从环境变量读取配置
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://phgrinrlnxzjyxxhsqry.supabase.co'
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoZ3JpbnJsbnh6anl4eGhzcXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzgzNDEsImV4cCI6MjA4NTI1NDM0MX0.bNn7XeoXmFD0dGIXIkh_YzQw-i-IqWW4x5gvl8nMcDA'

const KV_TABLE = "kv_store_f626b673"

console.log('🎵 D-Music Supabase 连接测试')
console.log('==================================')
console.log('')

// 创建 Supabase 客户端
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testConnection() {
  console.log('📋 配置信息:')
  console.log(`   URL: ${SUPABASE_URL}`)
  console.log(`   Project ID: ${SUPABASE_URL.replace('https://', '').replace('.supabase.co', '')}`)
  console.log(`   KV Table: ${KV_TABLE}`)
  console.log('')

  try {
    // 测试 1: 检查 KV Store 表是否存在
    console.log('🔍 测试 1: 检查 KV Store 表结构...')
    const { data: tableData, error: tableError } = await supabase
      .from(KV_TABLE)
      .select('key, value')
      .limit(1)

    if (tableError) {
      console.log(`   ❌ 表访问失败: ${tableError.message}`)
      console.log(`   错误代码: ${tableError.code}`)
      console.log(`   错误详情: ${JSON.stringify(tableError, null, 2)}`)
      return false
    }

    console.log('   ✅ KV Store 表访问正常')
    console.log('')

    // 测试 2: 检查数据数量
    console.log('🔍 测试 2: 检查数据数量...')
    const { count, error: countError } = await supabase
      .from(KV_TABLE)
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.log(`   ⚠️  无法获取数据数量: ${countError.message}`)
    } else {
      console.log(`   ✅ 数据总数: ${count}`)
    }
    console.log('')

    // 测试 3: 检查数据样本
    console.log('🔍 测试 3: 检查数据样本...')
    const { data: sampleData, error: sampleError } = await supabase
      .from(KV_TABLE)
      .select('key, value')
      .limit(5)
      .order('key', { ascending: true })

    if (sampleError) {
      console.log(`   ⚠️  无法获取数据样本: ${sampleError.message}`)
    } else {
      console.log(`   ✅ 数据样本 (${sampleData.length} 条):`)
      sampleData.forEach((row, index) => {
        const valuePreview = typeof row.value === 'string'
          ? row.value.substring(0, 50) + (row.value.length > 50 ? '...' : '')
          : JSON.stringify(row.value).substring(0, 50) + '...'
        console.log(`     ${index + 1}. ${row.key}: ${valuePreview}`)
      })
    }
    console.log('')

    // 测试 4: 检查数据分布
    console.log('🔍 测试 4: 检查数据分布（按前缀）...')
    const { data: allData, error: allError } = await supabase
      .from(KV_TABLE)
      .select('key')
      .limit(1000)

    if (allError) {
      console.log(`   ⚠️  无法获取数据分布: ${allError.message}`)
    } else {
      const prefixMap = {}
      allData.forEach(row => {
        const key = row.key || ''
        const prefix = key.split(':')[0] + ':'
        prefixMap[prefix] = (prefixMap[prefix] || 0) + 1
      })

      console.log(`   ✅ 数据分布 (${Object.keys(prefixMap).length} 个前缀):`)
      Object.entries(prefixMap)
        .sort((a, b) => b[1] - a[1])
        .forEach(([prefix, count]) => {
          console.log(`     ${prefix}: ${count} 条`)
        })
    }
    console.log('')

    console.log('==================================')
    console.log('✅ Supabase 连接测试通过!')
    console.log('')
    console.log('📊 测试结果汇总:')
    console.log('   ✅ KV Store 表访问正常')
    console.log('   ✅ 数据读取正常')
    console.log('   ✅ 权限配置正确')
    console.log('')
    console.log('📝 下一步:')
    console.log('   1. 使用 Supabase-export-kv-cli.js 导出数据')
    console.log('   2. 使用 Supabase-export-kv-advanced.js 进行高级导出')
    console.log('')

    return true

  } catch (error) {
    console.log('==================================')
    console.log('❌ Supabase 连接测试失败!')
    console.log('')
    console.log('📊 错误详情:')
    console.log(`   错误类型: ${error.name}`)
    console.log(`   错误信息: ${error.message}`)
    console.log('')

    if (error.message.includes('Failed to fetch')) {
      console.log('💡 可能的原因:')
      console.log('   1. 网络连接问题')
      console.log('   2. Supabase 服务暂时不可用')
      console.log('   3. 防火墙阻止了连接')
      console.log('')
      console.log('🔧 解决方案:')
      console.log('   1. 检查网络连接')
      console.log('   2. 尝试访问 https://supabase.com/status')
      console.log('   3. 检查防火墙设置')
    } else if (error.message.includes('JWT') || error.message.includes('token')) {
      console.log('💡 可能的原因:')
      console.log('   1. API 密钥无效或已过期')
      console.log('   2. 密钥权限不足')
      console.log('')
      console.log('🔧 解决方案:')
      console.log('   1. 检查 VITE_SUPABASE_ANON_KEY 配置')
      console.log('   2. 在 Supabase 控制台重新生成密钥')
    } else if (error.message.includes('relation') || error.message.includes('table')) {
      console.log('💡 可能的原因:')
      console.log('   1. KV Store 表不存在')
      console.log('   2. 表名称配置错误')
      console.log('')
      console.log('🔧 解决方案:')
      console.log('   1. 检查 KV_TABLE 配置')
      console.log('   2. 在 Supabase 控制台创建表')
    }

    console.log('')
    return false
  }
}

// 执行测试
testConnection()
