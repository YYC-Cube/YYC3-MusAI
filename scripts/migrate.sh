#!/usr/bin/env bash
# ==============================================================================
# YYC³ MusAI · 数据库版本化迁移（终审 R3）
#
# 机制：public.schema_migrations 版本表记录已应用文件；按序号顺序在独立事务中
#       执行 database/migrations/NNN_*.sql；失败回滚该版本并以非零退出。
#
# env（默认对齐 NAS 部署形态）：
#   PGHOST（192.168.3.45） PGPORT（5433） PGDATABASE（yyc3_music）
#   PGUSER（musai_owner）   PGPASSWORD / PGPASSFILE
# ==============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."
MIG_DIR="database/migrations"

PGHOST="${PGHOST:-192.168.3.45}"
PGPORT="${PGPORT:-5433}"
PGDATABASE="${PGDATABASE:-yyc3_music}"
PGUSER="${PGUSER:-musai_owner}"
export PGHOST PGPORT PGDATABASE PGUSER

log() { printf '[migrate %s] %s\n' "$(date '+%F %T')" "$*"; }

# 版本表（幂等创建；无 CREATE 权限的角色请由 musai_owner 预先执行本句）
psql -v ON_ERROR_STOP=1 -q <<'SQL'
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version    TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
SQL

applied() {
  psql -tA -c "SELECT version FROM public.schema_migrations"
}

# 收集待应用版本（已应用的跳过；序号排序保证顺序稳定）
PENDING="$(comm -13 <(applied | sort) <(ls -1 "$MIG_DIR" | grep -E '^[0-9]+_.*\.sql$' | sort) || true)"

if [ -z "$PENDING" ]; then
  log "无待应用迁移（$(applied | wc -l | tr -d ' ') 个版本已就位）"
  exit 0
fi

echo "$PENDING" | while IFS= read -r f; do
  version="${f%.sql}"
  log "应用 $version ..."
  # 单版本单事务：BEGIN/COMMIT 由 psql 单会话保证原子性
  psql -v ON_ERROR_STOP=1 -1 -q -f "$MIG_DIR/$f"
  # :'version' 为 psql 变量字面量引用（自动转义，等价参数绑定）
  psql -v ON_ERROR_STOP=1 -q -v version="$version" \
    -c "INSERT INTO public.schema_migrations(version) VALUES (:'version') ON CONFLICT DO NOTHING"
  log "✓ $version 完成"
done

log "迁移全部完成"
