/**
 * D-Music KV Store CLI Export Tool (Simple Version)
 *
 * Lightweight single-purpose script for quick KV data dumps.
 * For advanced features (stats, pagination, JSON parsing), use export-kv-advanced.js
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY="eyJ..." node export-kv-cli.js
 *   SUPABASE_SERVICE_KEY="eyJ..." node export-kv-cli.js --user abc123
 *   SUPABASE_SERVICE_KEY="eyJ..." node export-kv-cli.js --prefix song:
 *
 * Requirements:
 *   npm install @supabase/supabase-js
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || "https://phgrinrlnxzjyxxhsqry.supabase.co"
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || "YOUR_SERVICE_ROLE_KEY_HERE"
const KV_TABLE = "kv_store_f626b673"
const PAGE_SIZE = 1000

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Parse CLI arguments
const args = process.argv.slice(2)
let userId = null
let prefix = null

args.forEach((arg, i) => {
  if (arg === "--user" && args[i + 1]) userId = args[i + 1]
  if (arg === "--prefix" && args[i + 1]) prefix = args[i + 1]
})

async function exportKV() {
  if (SUPABASE_KEY === "YOUR_SERVICE_ROLE_KEY_HERE") {
    console.error("Please set SUPABASE_SERVICE_KEY environment variable.")
    console.error("Usage: SUPABASE_SERVICE_KEY=\"eyJ...\" node export-kv-cli.js")
    process.exit(1)
  }

  const allRows = []
  let offset = 0
  let hasMore = true

  while (hasMore) {
    let query = supabase
      .from(KV_TABLE)
      .select('key, value')
      .range(offset, offset + PAGE_SIZE - 1)
      .order('key', { ascending: true })

    if (userId) {
      query = query.like('key', `user:${userId}:%`)
    } else if (prefix) {
      query = query.like('key', `${prefix}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error("Export failed:", error.message)
      process.exit(1)
    }

    if (!data || data.length === 0) {
      hasMore = false
    } else {
      allRows.push(...data)
      offset += data.length
      hasMore = data.length === PAGE_SIZE
    }
  }

  if (allRows.length === 0) {
    console.log("No rows found.")
    return
  }

  const filename = userId
    ? `kv_export_user_${userId}.json`
    : prefix
      ? `kv_export_prefix_${prefix.replace(/[:/]/g, '_')}.json`
      : `kv_export_all.json`

  fs.writeFileSync(filename, JSON.stringify(allRows, null, 2), 'utf-8')
  console.log(`Exported ${allRows.length} rows -> ${filename} (${(fs.statSync(filename).size / 1024).toFixed(1)} KB)`)
}

exportKV()
