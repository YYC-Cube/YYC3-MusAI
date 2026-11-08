/**
 * D-Music KV Store Advanced Export Tool
 *
 * Features:
 *   - Full pagination (handles >1000 rows)
 *   - Filter by userId, prefix, or custom key pattern
 *   - JSON value auto-parsing
 *   - Summary statistics by key prefix
 *   - Environment variable support for credentials
 *
 * Usage:
 *   1. Set environment variables (or edit SUPABASE_URL/SUPABASE_KEY below):
 *      export SUPABASE_URL="https://xxxxx.supabase.co"
 *      export SUPABASE_SERVICE_KEY="eyJ..."
 *
 *   2. Run:
 *      node export-kv-advanced.js
 *
 *   3. Programmatic usage (import as module):
 *      import { exportKV } from './export-kv-advanced.js'
 *      await exportKV()                          // export all
 *      await exportKV({ userId: "abc123" })      // export user data
 *      await exportKV({ prefix: "song:" })       // export by prefix
 *      await exportKV({ stats: true })           // only print stats
 *
 * Requirements:
 *   npm install @supabase/supabase-js
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// ---------------------------------------------------------------------------
// Configuration — prefer environment variables, fall back to hardcoded values
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL || "https://phgrinrlnxzjyxxhsqry.supabase.co"
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || "YOUR_SERVICE_ROLE_KEY_HERE"
const KV_TABLE = "kv_store_f626b673"
const PAGE_SIZE = 1000 // Supabase max per request

// ---------------------------------------------------------------------------
// Initialize Supabase client
// ---------------------------------------------------------------------------
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ---------------------------------------------------------------------------
// Paginated fetch — handles tables with >1000 rows
// ---------------------------------------------------------------------------
async function fetchAllRows(filterFn) {
  const allRows = []
  let offset = 0
  let hasMore = true

  while (hasMore) {
    let query = supabase
      .from(KV_TABLE)
      .select('key, value')
      .range(offset, offset + PAGE_SIZE - 1)
      .order('key', { ascending: true })

    if (filterFn) {
      query = filterFn(query)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Supabase query failed at offset ${offset}: ${error.message}`)
    }

    if (!data || data.length === 0) {
      hasMore = false
    } else {
      allRows.push(...data)
      offset += data.length
      hasMore = data.length === PAGE_SIZE
      if (hasMore) {
        process.stdout.write(`\r  Fetched ${allRows.length} rows...`)
      }
    }
  }

  if (allRows.length > PAGE_SIZE) {
    process.stdout.write(`\r  Fetched ${allRows.length} rows total.\n`)
  }

  return allRows
}

// ---------------------------------------------------------------------------
// Compute prefix statistics
// ---------------------------------------------------------------------------
function computeStats(rows) {
  const prefixMap = {}
  let totalValueBytes = 0

  for (const row of rows) {
    const key = row.key || ''
    // Extract prefix: everything before the first ":" segment that looks like an ID
    const parts = key.split(':')
    let prefix = parts[0] + ':'
    if (parts.length >= 3) {
      // e.g. "user:abc:starpower" → "user:*:starpower"
      // e.g. "song:track-1:likes" → "song:*:likes"
      // e.g. "notifications:user:abc" → "notifications:user:*"
      // Heuristic: if second part looks like an ID, wildcard it
      prefix = parts.length === 2
        ? `${parts[0]}:*`
        : `${parts[0]}:*:${parts.slice(2).join(':')}`
    }

    if (!prefixMap[prefix]) {
      prefixMap[prefix] = { count: 0, totalBytes: 0 }
    }
    prefixMap[prefix].count++
    const valStr = typeof row.value === 'string' ? row.value : JSON.stringify(row.value)
    const bytes = Buffer.byteLength(valStr, 'utf-8')
    prefixMap[prefix].totalBytes += bytes
    totalValueBytes += bytes
  }

  // Sort by count descending
  const sorted = Object.entries(prefixMap)
    .map(([prefix, stats]) => ({ prefix, ...stats }))
    .sort((a, b) => b.count - a.count)

  return { prefixStats: sorted, totalRows: rows.length, totalValueBytes }
}

// ---------------------------------------------------------------------------
// Parse JSON values safely
// ---------------------------------------------------------------------------
function parseValues(rows) {
  return rows.map(row => {
    let parsed = row.value
    if (typeof row.value === 'string') {
      try { parsed = JSON.parse(row.value) } catch { /* keep as string */ }
    }
    return { key: row.key, value: parsed }
  })
}

// ---------------------------------------------------------------------------
// Main export function
// ---------------------------------------------------------------------------
/**
 * Export KV data with flexible filtering
 * @param {Object} [options]
 * @param {string} [options.userId] - Filter by user ID (matches `user:{userId}:*`)
 * @param {string} [options.prefix] - Filter by key prefix (e.g. "song:", "notifications:")
 * @param {string} [options.pattern] - Custom LIKE pattern (e.g. "%:starpower")
 * @param {boolean} [options.stats] - Only print statistics, don't save file
 * @param {boolean} [options.parseJson] - Parse JSON values (default: true)
 * @param {string} [options.output] - Custom output filename
 */
export async function exportKV(options = {}) {
  const { userId, prefix, pattern, stats, parseJson = true, output } = options

  console.log('\n=== D-Music KV Export Tool ===\n')

  // Validate credentials
  if (SUPABASE_KEY === "YOUR_SERVICE_ROLE_KEY_HERE") {
    console.error('  Please set SUPABASE_SERVICE_KEY environment variable or edit the script.')
    console.error('  Usage: SUPABASE_SERVICE_KEY="eyJ..." node export-kv-advanced.js')
    process.exit(1)
  }

  // Build filter
  let filterFn = null
  let filterDesc = 'all rows'

  if (userId) {
    filterFn = (q) => q.like('key', `user:${userId}:%`)
    filterDesc = `user:${userId}:*`
  } else if (prefix) {
    filterFn = (q) => q.like('key', `${prefix}%`)
    filterDesc = `${prefix}*`
  } else if (pattern) {
    filterFn = (q) => q.like('key', pattern)
    filterDesc = `pattern: ${pattern}`
  }

  console.log(`  Filter: ${filterDesc}`)
  console.log(`  Table:  ${KV_TABLE}`)
  console.log('')

  try {
    const startTime = Date.now()
    const rows = await fetchAllRows(filterFn)
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)

    if (rows.length === 0) {
      console.log('  No rows found matching filter.')
      return { rows: [], stats: null }
    }

    // Compute statistics
    const statsResult = computeStats(rows)
    console.log(`\n  Total rows: ${statsResult.totalRows}`)
    console.log(`  Total value size: ${(statsResult.totalValueBytes / 1024).toFixed(1)} KB`)
    console.log(`  Fetch time: ${elapsed}s`)
    console.log(`\n  --- Prefix Statistics ---`)
    for (const s of statsResult.prefixStats) {
      const sizeStr = s.totalBytes > 1024
        ? `${(s.totalBytes / 1024).toFixed(1)} KB`
        : `${s.totalBytes} B`
      console.log(`  ${s.prefix.padEnd(40)} ${String(s.count).padStart(6)} rows  ${sizeStr.padStart(10)}`)
    }

    if (stats) {
      console.log('\n  Stats-only mode, no file saved.')
      return { rows, stats: statsResult }
    }

    // Parse and save
    const exportData = parseJson ? parseValues(rows) : rows
    const filename = output || (
      userId ? `kv_export_user_${userId}.json`
        : prefix ? `kv_export_prefix_${prefix.replace(/[:/]/g, '_')}.json`
        : `kv_export_all_${new Date().toISOString().slice(0, 10)}.json`
    )

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      filter: filterDesc,
      totalRows: rows.length,
      totalValueBytes: statsResult.totalValueBytes,
      prefixStats: statsResult.prefixStats,
      data: exportData
    }

    fs.writeFileSync(filename, JSON.stringify(exportPayload, null, 2), 'utf-8')
    console.log(`\n  Saved to: ${filename}`)
    console.log(`  File size: ${(fs.statSync(filename).size / 1024).toFixed(1)} KB`)

    return { rows: exportData, stats: statsResult }
  } catch (err) {
    console.error(`\n  Export failed: ${err.message}`)
    process.exit(1)
  }
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------
const isMainModule = process.argv[1] && (
  process.argv[1].endsWith('export-kv-advanced.js') ||
  process.argv[1].endsWith('export-kv-advanced.mjs')
)

if (isMainModule) {
  // Parse CLI args
  const args = process.argv.slice(2)
  const opts = {}

  args.forEach((arg, i) => {
    if (arg === '--user' && args[i + 1]) opts.userId = args[i + 1]
    if (arg === '--prefix' && args[i + 1]) opts.prefix = args[i + 1]
    if (arg === '--pattern' && args[i + 1]) opts.pattern = args[i + 1]
    if (arg === '--output' && args[i + 1]) opts.output = args[i + 1]
    if (arg === '--stats') opts.stats = true
    if (arg === '--raw') opts.parseJson = false
    if (arg === '--help' || arg === '-h') {
      console.log(`
D-Music KV Export Tool (Advanced)

Usage:
  node export-kv-advanced.js [options]

Options:
  --user <userId>     Export data for a specific user
  --prefix <prefix>   Export keys matching a prefix (e.g. "song:", "notifications:")
  --pattern <pattern> Custom SQL LIKE pattern (e.g. "%:starpower")
  --stats             Only print statistics, don't save file
  --raw               Don't parse JSON values
  --output <file>     Custom output filename
  --help              Show this help

Environment:
  SUPABASE_URL            Supabase project URL
  SUPABASE_SERVICE_KEY    Service role key (required for full access)

Examples:
  node export-kv-advanced.js                           # Export all
  node export-kv-advanced.js --stats                   # Stats only
  node export-kv-advanced.js --user abc123             # Export user data
  node export-kv-advanced.js --prefix "song:"          # Export songs
  node export-kv-advanced.js --pattern "%:starpower"   # All starpower keys
`)
      process.exit(0)
    }
  })

  exportKV(opts)
}
