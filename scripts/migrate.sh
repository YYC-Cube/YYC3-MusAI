#!/usr/bin/env bash
# ==============================================================================
# YYC³ MusAI · 数据库版本化迁移（终审 R3）
#
# 机制：musai.musai_migrations 版本表记录已应用文件；按序号顺序在独立事务中
# （演练实测：musai.schema_migrations 已被既有工具占用且列结构不同，故用独立表名）
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
# 基线 DDL 未带 schema 前缀——统一导到 musai（演练实测默认会落 public）
export PGOPTIONS='-c search_path=musai,public'

log() { printf '[migrate %s] %s\n' "$(date '+%F %T')" "$*"; }

# 版本表（幂等创建；无 CREATE 权限的角色请由 musai_owner 预先执行本句）
# 演练实测发现：NAS 库为多项目共享，public.schema_migrations 已被占用——
# 版本表放 musai schema（与 002 审计表同域，账号边界内）
psql -v ON_ERROR_STOP=1 -q <<'SQL'
CREATE SCHEMA IF NOT EXISTS musai;
CREATE TABLE IF NOT EXISTS musai.musai_migrations (
  version    TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
SQL

applied() {
  psql -tA -c "SELECT version FROM musai.musai_migrations"
}

# 收集待应用版本（已应用的跳过；序号排序保证顺序稳定）
# 演练实测：两侧比较键须一致——统一去掉 .sql 后缀（version 形态）
PENDING="$(comm -13 <(applied | sort) <(ls -1 "$MIG_DIR" | grep -E '^[0-9]+_.*\.sql$' | sed 's/\.sql$//' | sort) || true)"

if [ -z "$PENDING" ]; then
  log "无待应用迁移（$(applied | wc -l | tr -d ' ') 个版本已就位）"
  exit 0
fi

echo "$PENDING" | while IFS= read -r version; do
  log "应用 $version ..."
  # 单版本单事务：BEGIN/COMMIT 由 psql 单会话保证原子性
  psql -v ON_ERROR_STOP=1 -1 -q -f "$MIG_DIR/$version.sql"
  # :'version' 为 psql 变量字面量引用（自动转义，等价参数绑定）；
  # 演练实测：-c 参数不展开 psql 变量，须走 stdin heredoc
  psql -v ON_ERROR_STOP=1 -q -v version="$version" <<'SQL'
INSERT INTO musai.musai_migrations(version) VALUES (:'version') ON CONFLICT DO NOTHING;
SQL
  log "✓ $version 完成"
done

log "迁移全部完成"
