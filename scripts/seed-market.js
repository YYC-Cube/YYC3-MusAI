/**
 * D-Music Seed Market Script
 * 创建测试市场数据
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://phgrinrlnxzjyxxhsqry.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoZ3JpbnJsbnh6anl4eGhzcXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzgzNDEsImV4cCI6MjA4NTI1NDM0MX0.bNn7XeoXmFD0dGIXIkh_YzQw-i-IqWW4x5gvl8nMcDA";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 测试市场挂牌数据
const testMarketListings = [
  {
    id: 'listing-001',
    song_id: 'song-001',
    seller_id: 'user-002',
    price: 100,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'listing-002',
    song_id: 'song-002',
    seller_id: 'user-002',
    price: 150,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'listing-003',
    song_id: 'song-003',
    seller_id: 'user-002',
    price: 200,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'listing-004',
    song_id: 'song-004',
    seller_id: 'user-002',
    price: 300,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'listing-005',
    song_id: 'song-005',
    seller_id: 'user-002',
    price: 250,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// 测试市场交易数据
const testMarketTransactions = [
  {
    id: 'transaction-001',
    listing_id: 'listing-001',
    song_id: 'song-001',
    buyer_id: 'user-001',
    seller_id: 'user-002',
    price: 100,
    status: 'completed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'transaction-002',
    listing_id: 'listing-002',
    song_id: 'song-002',
    buyer_id: 'user-003',
    seller_id: 'user-002',
    price: 150,
    status: 'completed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'transaction-003',
    listing_id: 'listing-003',
    song_id: 'song-003',
    buyer_id: 'user-001',
    seller_id: 'user-002',
    price: 200,
    status: 'completed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'transaction-004',
    listing_id: 'listing-004',
    song_id: 'song-004',
    buyer_id: 'user-003',
    seller_id: 'user-002',
    price: 300,
    status: 'completed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'transaction-005',
    listing_id: 'listing-005',
    song_id: 'song-005',
    buyer_id: 'user-001',
    seller_id: 'user-002',
    price: 250,
    status: 'completed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

async function seedMarket() {
  console.log('\n=== D-Music Seed Market ===\n');

  let successCount = 0;
  let failCount = 0;

  // 创建市场挂牌
  console.log('Creating market listings...\n');
  for (const listing of testMarketListings) {
    try {
      console.log(`Creating listing: ${listing.id}`);

      const { data: listingData, error: listingError } = await supabase
        .from('market_listings')
        .insert({
          id: listing.id,
          song_id: listing.song_id,
          seller_id: listing.seller_id,
          price: listing.price,
          status: listing.status,
          created_at: listing.created_at,
          updated_at: listing.updated_at,
        })
        .select();

      if (listingError) {
        console.error(`  ❌ Error creating listing: ${listingError.message}`);
        failCount++;
        continue;
      }

      console.log(`  ✅ Listing created: ${listing.id}`);
      successCount++;
    } catch (error) {
      console.error(`  ❌ Exception: ${error.message}`);
      failCount++;
    }
  }

  // 创建市场交易
  console.log('\nCreating market transactions...\n');
  for (const transaction of testMarketTransactions) {
    try {
      console.log(`Creating transaction: ${transaction.id}`);

      const { data: transactionData, error: transactionError } = await supabase
        .from('market_transactions')
        .insert({
          id: transaction.id,
          listing_id: transaction.listing_id,
          song_id: transaction.song_id,
          buyer_id: transaction.buyer_id,
          seller_id: transaction.seller_id,
          price: transaction.price,
          status: transaction.status,
          created_at: transaction.created_at,
          updated_at: transaction.updated_at,
        })
        .select();

      if (transactionError) {
        console.error(`  ❌ Error creating transaction: ${transactionError.message}`);
        failCount++;
        continue;
      }

      console.log(`  ✅ Transaction created: ${transaction.id}`);
      successCount++;
    } catch (error) {
      console.error(`  ❌ Exception: ${error.message}`);
      failCount++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Total listings: ${testMarketListings.length}`);
  console.log(`  Total transactions: ${testMarketTransactions.length}`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Failed: ${failCount}`);
  console.log(`\n=== Complete ===\n`);
}

seedMarket().catch(console.error);
