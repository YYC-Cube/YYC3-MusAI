import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://phgrinrlnxzjyxxhsqry.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoZ3JpbnJsbnh6anl4eGhzcXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzgzNDEsImV4cCI6MjA4NTI1NDM0MX0.bNn7XeoXmFD0dGIXIkh_YzQw-i-IqWW4x5gvl8nMcDA";

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
