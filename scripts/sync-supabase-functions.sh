#!/usr/bin/env bash
# 同步 packages/music-server/src → supabase/functions/server（Edge Functions 部署副本）
# 用法：bash scripts/sync-supabase-functions.sh
# 说明：--delete 保证旧文件不残留（曾经的无删除同步导致加固未随部署生效）
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/packages/music-server/src"
DST="$ROOT/supabase/functions/server"

rsync -rc --delete \
  --exclude=node_modules --exclude=.mimosa --exclude=.DS_Store \
  "$SRC/" "$DST/"

echo "已同步 music-server/src → supabase/functions/server（含删除语义）"
echo "提示：部署前可在源仓先行验证：deno check src/ && deno task test"
