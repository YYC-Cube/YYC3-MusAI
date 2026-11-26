import { createClient } from '@supabase/supabase-js';

// 终审遗留闭环：凭据 env 注入，源码零字面量（轮换见 deploy/KEY-ROTATION-RUNBOOK.md）
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[script] 缺少 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 环境变量，拒绝运行');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkSupabase() {
  console.log('\n=== Supabase Connection Check ===\n');

  // 1. 检查 KV 表是否存在
  console.log('1. Checking KV table...');
  const { data: kvData, error: kvError } = await supabase
    .from('kv_store_f626b673')
    .select('*')
    .limit(1);

  if (kvError) {
    console.log('   ❌ KV table error:', kvError.message);
  } else {
    console.log('   ✅ KV table exists');
    console.log('   Sample data:', kvData);
  }

  // 2. 统计 KV 表行数
  console.log('\n2. Counting KV rows...');
  const { count, error: countError } = await supabase
    .from('kv_store_f626b673')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.log('   ❌ Count error:', countError.message);
  } else {
    console.log(`   ✅ Total rows: ${count}`);
  }

  // 3. 检查其他表
  console.log('\n3. Checking other tables...');
  const tables = [
    'users',
    'user_social',
    'user_preferences',
    'user_star_power',
    'star_power_transactions',
    'albums',
    'tracks',
    'challenges',
    'challenge_entries',
    'market_listings',
    'market_transactions',
  ];

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`   ❌ ${table}: ${error.message}`);
    } else {
      console.log(`   ✅ ${table}: ${count} rows`);
    }
  }

  // 4. 检查 KV 数据分布
  console.log('\n4. Analyzing KV data distribution...');
  const { data: allKV, error: allKVError } = await supabase
    .from('kv_store_f626b673')
    .select('key');

  if (allKVError) {
    console.log('   ❌ Error fetching all KV:', allKVError.message);
  } else if (allKV && allKV.length > 0) {
    const prefixMap = {};
    allKV.forEach(row => {
      const key = row.key || '';
      const prefix = key.split(':')[0] + ':';
      if (!prefixMap[prefix]) {
        prefixMap[prefix] = 0;
      }
      prefixMap[prefix]++;
    });

    console.log('   KV prefix distribution:');
    Object.entries(prefixMap)
      .sort((a, b) => b[1] - a[1])
      .forEach(([prefix, count]) => {
        console.log(`     ${prefix.padEnd(30)} ${count} rows`);
      });
  } else {
    console.log('   ℹ️  No KV data found');
  }

  console.log('\n=== Check Complete ===\n');
}

checkSupabase().catch(console.error);
