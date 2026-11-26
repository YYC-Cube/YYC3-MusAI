import { createClient } from '@supabase/supabase-js';

// 终审遗留闭环：凭据 env 注入，源码零字面量（轮换见 deploy/KEY-ROTATION-RUNBOOK.md）
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[script] 缺少 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 环境变量，拒绝运行');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkKVStructure() {
  console.log('\n=== KV Table Structure Check ===\n');

  // 查询 KV 表的所有列
  const { data: columns, error: columnsError } = await supabase
    .rpc('get_columns', { table_name: 'kv_store_f626b673' });

  if (columnsError) {
    console.error('Error fetching KV columns:', columnsError.message);
  } else {
    console.log('KV Columns:', columns);
  }

  // 尝试插入一条测试数据
  console.log('\n=== Test KV Insert ===\n');
  const { data: testData, error: testError } = await supabase
    .from('kv_store_f626b673')
    .insert({
      key: 'test-key',
      value: { test: 'data' },
    })
    .select();

  if (testError) {
    console.error('Error inserting test data:', testError.message);
  } else {
    console.log('Test data inserted:', testData);
  }

  // 查询测试数据
  const { data: queryData, error: queryError } = await supabase
    .from('kv_store_f626b673')
    .select('*')
    .eq('key', 'test-key');

  if (queryError) {
    console.error('Error querying test data:', queryError.message);
  } else {
    console.log('Test data queried:', queryData);
  }

  console.log('\n=== Complete ===\n');
}

checkKVStructure().catch(console.error);
