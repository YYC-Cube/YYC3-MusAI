import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://phgrinrlnxzjyxxhsqry.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoZ3JpbnJsbnh6anl4eGhzcXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzgzNDEsImV4cCI6MjA4NTI1NDM0MX0.bNn7XeoXmFD0dGIXIkh_YzQw-i-IqWW4x5gvl8nMcDA";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkTables() {
  console.log('\n=== Supabase Table Structure Check ===\n');

  // 查询所有表
  console.log('=== All Tables ===');
  const { data: tables, error: tablesError } = await supabase
    .rpc('get_tables');

  if (tablesError) {
    console.error('Error fetching tables:', tablesError.message);
  } else {
    console.log('Tables:', tables);
  }

  // 直接查询 KV 表
  console.log('\n=== KV Table Sample ===');
  const { data: kvData, error: kvError } = await supabase
    .from('kv_store_f626b673')
    .select('*')
    .limit(1);

  if (kvError) {
    console.error('Error fetching KV data:', kvError.message);
  } else {
    console.log('KV Data:', kvData);
  }

  // 直接查询 users 表
  console.log('\n=== Users Table Sample ===');
  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('*')
    .limit(1);

  if (usersError) {
    console.error('Error fetching users data:', usersError.message);
  } else {
    console.log('Users Data:', usersData);
  }

  // 尝试查询其他表
  const tablesToCheck = [
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

  console.log('\n=== Table Existence Check ===');
  for (const tableName of tablesToCheck) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      console.log(`  ❌ ${tableName}: ${error.message}`);
    } else {
      console.log(`  ✅ ${tableName}: exists`);
    }
  }

  console.log('\n=== Complete ===\n');
}

checkTables().catch(console.error);
